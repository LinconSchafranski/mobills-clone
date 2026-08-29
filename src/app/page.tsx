import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { TransactionsPanel } from "@/components/TransactionsPanel";
import { FiltersPanel } from "@/components/FiltersPanel";
import { TransactionsTable } from "@/components/TransactionsTable";
import { ExpensesByCategoryChart } from "@/components/charts/ExpensesByCategoryChart";
import { MonthlyIncomeExpenseChart } from "@/components/charts/MonthlyIncomeExpenseChart";
import { CategoryEvolutionChart } from "@/components/charts/CategoryEvolutionChart";
import { logout } from "@/app/login/actions";
import { buildCategoryColorMap, HIDDEN_CATEGORY_NAMES } from "@/lib/categoryColors";

// Página lê o banco a cada requisição — nunca deve ser pré-renderizada
// estaticamente no build (que roda antes das migrations serem aplicadas).
export const dynamic = "force-dynamic";

const monthAbbreviationFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  timeZone: "UTC",
});

function startOfUTCMonth(date: Date, monthOffset = 0): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + monthOffset, 1));
}

type SearchParams = {
  periodo?: string;
  categorias?: string;
  tipo?: string;
  busca?: string;
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const filters = await searchParams;

  const [transactions, allCategories, topExpenses] = await Promise.all([
    prisma.transaction.findMany({
      include: { category: true },
      orderBy: { date: "desc" },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.transaction.findMany({
      where: { type: "EXPENSE" },
      orderBy: { amount: "desc" },
      take: 10,
      include: { category: true },
    }),
  ]);

  // Paleta categórica atribuída na apresentação (não mexe em Category.color no
  // banco — várias categorias em produção foram criadas automaticamente pela
  // importação e ficaram todas com o mesmo cinza, indistinguíveis nos gráficos).
  const categoryColor = buildCategoryColorMap(allCategories);

  // "Teste API" é uma categoria de teste que vazou pra produção — continua
  // existindo no banco (histórico não é apagado), mas não deve aparecer como
  // opção pra escolher em filtros nem no formulário de nova/editar transação.
  const categories = allCategories
    .filter((category) => !HIDDEN_CATEGORY_NAMES.has(category.name))
    .map((category) => ({ ...category, color: categoryColor.get(category.id) ?? category.color }));

  // Filtros da tabela de transações (não afetam os gráficos do dashboard,
  // que sempre usam `transactions` — o histórico completo, sem filtro).
  // "Mês atual"/"mês anterior" são calculados a partir da data mais recente
  // que existe no banco (transactions já vem ordenado por date desc), não
  // da data real de hoje.
  const referenceDate = transactions[0]?.date ?? new Date();
  const periodo = filters.periodo ?? "mes-atual";

  let dateFilter: { gte: Date; lt: Date } | undefined;
  if (periodo === "mes-atual") {
    dateFilter = { gte: startOfUTCMonth(referenceDate, 0), lt: startOfUTCMonth(referenceDate, 1) };
  } else if (periodo === "mes-anterior") {
    dateFilter = { gte: startOfUTCMonth(referenceDate, -1), lt: startOfUTCMonth(referenceDate, 0) };
  } else if (periodo === "ultimos-3-meses") {
    dateFilter = { gte: startOfUTCMonth(referenceDate, -2), lt: startOfUTCMonth(referenceDate, 1) };
  }
  // periodo === "historico" -> dateFilter fica undefined (sem filtro de data)

  const tipo = filters.tipo ?? "todos";
  const typeFilter = tipo === "despesa" ? "EXPENSE" : tipo === "receita" ? "INCOME" : undefined;

  const categoriaIds = filters.categorias ? filters.categorias.split(",").filter(Boolean) : [];

  const busca = (filters.busca ?? "").trim();

  const filteredTransactions = await prisma.transaction.findMany({
    where: {
      ...(dateFilter ? { date: dateFilter } : {}),
      ...(typeFilter ? { type: typeFilter } : {}),
      ...(categoriaIds.length > 0 ? { categoryId: { in: categoriaIds } } : {}),
      ...(busca
        ? {
            OR: [
              { description: { contains: busca } },
              { subcategoria: { contains: busca } },
              { nomeEmissor: { contains: busca } },
            ],
          }
        : {}),
    },
    include: { category: true },
    orderBy: { date: "desc" },
  });

  // Saldo reflete o filtro ativo (mesmo conjunto que alimenta a tabela) —
  // diferente dos gráficos do dashboard, que sempre usam `transactions` cheio.
  const balance = filteredTransactions.reduce((total, transaction) => {
    const amount = Number(transaction.amount);
    return transaction.type === "INCOME" ? total + amount : total - amount;
  }, 0);

  const serializedTransactions = filteredTransactions.map((transaction) => ({
    id: transaction.id,
    description: transaction.description,
    amount: Number(transaction.amount),
    date: transaction.date.toISOString().slice(0, 10),
    categoryId: transaction.categoryId,
    type: transaction.type,
    category: {
      id: transaction.category.id,
      name: transaction.category.name,
      color: categoryColor.get(transaction.categoryId) ?? transaction.category.color,
    },
    subcategoria: transaction.subcategoria,
    nomeEmissor: transaction.nomeEmissor,
  }));

  // Gráfico de barras: total de receitas x despesas, agrupado por mês, considerando todo o histórico.
  const monthlyTotalsByKey = new Map<string, { income: number; expense: number }>();
  for (const transaction of transactions) {
    const monthKey = transaction.date.toISOString().slice(0, 7);
    const amount = Number(transaction.amount);
    const entry = monthlyTotalsByKey.get(monthKey) ?? { income: 0, expense: 0 };
    if (transaction.type === "INCOME") entry.income += amount;
    else entry.expense += amount;
    monthlyTotalsByKey.set(monthKey, entry);
  }

  const monthlyTotals = Array.from(monthlyTotalsByKey.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, totals]) => {
      const [year] = month.split("-");
      const label = `${monthAbbreviationFormatter.format(new Date(`${month}-01T00:00:00Z`)).replace(".", "")}/${year}`;
      return { month, label, income: totals.income, expense: totals.expense };
    });

  // Gráfico de pizza: despesas por categoria no mês atual.
  const now = new Date();
  const currentMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  const expensesByCategoryMap = new Map<string, { name: string; color: string; total: number }>();
  for (const transaction of transactions) {
    if (transaction.type !== "EXPENSE") continue;
    if (transaction.date.toISOString().slice(0, 7) !== currentMonthKey) continue;

    const existing = expensesByCategoryMap.get(transaction.categoryId);
    const amount = Number(transaction.amount);
    if (existing) {
      existing.total += amount;
    } else {
      expensesByCategoryMap.set(transaction.categoryId, {
        name: transaction.category.name,
        color: categoryColor.get(transaction.categoryId) ?? transaction.category.color,
        total: amount,
      });
    }
  }

  const expensesByCategory = Array.from(expensesByCategoryMap.entries())
    .map(([categoryId, value]) => ({ categoryId, ...value }))
    .sort((a, b) => b.total - a.total);

  // Gráfico de linhas: evolução das despesas por categoria, mês a mês, em todo o histórico.
  const MAX_CATEGORY_SERIES = 6;
  const OTHER_SERIES_KEY = "other";
  const OTHER_SERIES_COLOR = "#71717a";

  // 1) Total gasto acumulado por categoria (todo o histórico), para decidir o Top 6.
  const totalExpenseByCategoryId = new Map<string, { name: string; color: string; total: number }>();
  for (const transaction of transactions) {
    if (transaction.type !== "EXPENSE") continue;
    const amount = Number(transaction.amount);
    const existing = totalExpenseByCategoryId.get(transaction.categoryId);
    if (existing) {
      existing.total += amount;
    } else {
      totalExpenseByCategoryId.set(transaction.categoryId, {
        name: transaction.category.name,
        color: categoryColor.get(transaction.categoryId) ?? transaction.category.color,
        total: amount,
      });
    }
  }

  const topCategoryIds = new Set(
    Array.from(totalExpenseByCategoryId.entries())
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, MAX_CATEGORY_SERIES)
      .map(([categoryId]) => categoryId),
  );

  // 2) Soma por mês x série (categorias do Top 6 pelo id; o resto cai em "Outras").
  const expenseByMonthAndSeries = new Map<string, Map<string, number>>();
  for (const transaction of transactions) {
    if (transaction.type !== "EXPENSE") continue;

    const monthKey = transaction.date.toISOString().slice(0, 7);
    const seriesKey = topCategoryIds.has(transaction.categoryId)
      ? transaction.categoryId
      : OTHER_SERIES_KEY;

    const monthMap = expenseByMonthAndSeries.get(monthKey) ?? new Map<string, number>();
    monthMap.set(seriesKey, (monthMap.get(seriesKey) ?? 0) + Number(transaction.amount));
    expenseByMonthAndSeries.set(monthKey, monthMap);
  }

  // 3) Definição das séries (id, rótulo, cor), ordenadas por gasto total, "Outras" por último.
  const categorySeries = Array.from(totalExpenseByCategoryId.entries())
    .filter(([categoryId]) => topCategoryIds.has(categoryId))
    .sort(([, a], [, b]) => b.total - a.total)
    .map(([categoryId, { name, color }]) => ({ key: categoryId, label: name, color }));

  const hasOtherSeries = Array.from(expenseByMonthAndSeries.values()).some((monthMap) =>
    monthMap.has(OTHER_SERIES_KEY),
  );
  if (hasOtherSeries) {
    categorySeries.push({ key: OTHER_SERIES_KEY, label: "Outras", color: OTHER_SERIES_COLOR });
  }

  // 4) Um ponto por mês, com 0 para série sem gasto naquele mês (linha contínua, sem buracos).
  const categoryEvolutionData = Array.from(expenseByMonthAndSeries.keys())
    .sort((a, b) => a.localeCompare(b))
    .map((month) => {
      const [year] = month.split("-");
      const label = `${monthAbbreviationFormatter.format(new Date(`${month}-01T00:00:00Z`)).replace(".", "")}/${year}`;
      const monthMap = expenseByMonthAndSeries.get(month)!;

      const point: { month: string; label: string; [seriesKey: string]: string | number } = {
        month,
        label,
      };
      for (const series of categorySeries) {
        point[series.key] = monthMap.get(series.key) ?? 0;
      }
      return point;
    });

  const topExpensesRows = topExpenses.map((transaction) => ({
    id: transaction.id,
    date: transaction.date.toISOString().slice(0, 10),
    description: transaction.subcategoria || transaction.description,
    nomeEmissor: transaction.nomeEmissor,
    category: {
      name: transaction.category.name,
      color: categoryColor.get(transaction.categoryId) ?? transaction.category.color,
    },
    type: transaction.type,
    amount: Number(transaction.amount),
  }));

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <header className="w-full border-b border-black/[.08] bg-white dark:border-white/[.145] dark:bg-zinc-950">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2a78d6] text-sm font-bold text-white dark:bg-[#3987e5]">
              G
            </span>
            <span className="text-base font-semibold tracking-tight text-black dark:text-zinc-50">
              Gastos
            </span>
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-full border border-black/[.12] px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:text-zinc-300 dark:hover:bg-white/[.08]"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      <main className="flex w-full max-w-5xl flex-col gap-10 px-6 py-10">
        <section id="dashboard">
          <h2 className="text-lg font-semibold tracking-tight text-black dark:text-zinc-50">
            Dashboard
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Visão consolidada de receitas, despesas e categorias — sempre com o histórico completo,
            independente dos filtros abaixo.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-950">
              <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Despesas por categoria (mês atual)
              </h3>
              <ExpensesByCategoryChart data={expensesByCategory} />
            </div>
            <div className="rounded-lg border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-950">
              <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Receitas x despesas por mês
              </h3>
              <MonthlyIncomeExpenseChart data={monthlyTotals} />
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-950">
            <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Evolução por categoria
            </h3>
            <CategoryEvolutionChart data={categoryEvolutionData} series={categorySeries} />
          </div>

          <div className="mt-6 rounded-lg border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-950">
            <h3 className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Maiores gastos individuais
            </h3>
            <TransactionsTable transactions={topExpensesRows} showType={false} />
          </div>
        </section>

        <section
          id="transacoes"
          className="flex flex-col gap-4 border-t border-black/[.08] pt-8 dark:border-white/[.145]"
        >
          <Suspense fallback={null}>
            <FiltersPanel categories={categories} />
          </Suspense>

          <Suspense fallback={null}>
            <TransactionsPanel
              balance={balance}
              transactions={serializedTransactions}
              categories={categories}
            />
          </Suspense>
        </section>
      </main>
    </div>
  );
}
