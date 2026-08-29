import { prisma } from "@/lib/prisma";
import { TransactionsPanel } from "@/components/TransactionsPanel";
import { ExpensesByCategoryChart } from "@/components/charts/ExpensesByCategoryChart";
import { MonthlyIncomeExpenseChart } from "@/components/charts/MonthlyIncomeExpenseChart";
import { CategoryEvolutionChart } from "@/components/charts/CategoryEvolutionChart";
import { logout } from "@/app/login/actions";

// Página lê o banco a cada requisição — nunca deve ser pré-renderizada
// estaticamente no build (que roda antes das migrations serem aplicadas).
export const dynamic = "force-dynamic";

const monthAbbreviationFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  timeZone: "UTC",
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

export default async function Home() {
  const [transactions, categories, topExpenses] = await Promise.all([
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

  const balance = transactions.reduce((total, transaction) => {
    const amount = Number(transaction.amount);
    return transaction.type === "INCOME" ? total + amount : total - amount;
  }, 0);

  const serializedTransactions = transactions.map((transaction) => ({
    id: transaction.id,
    description: transaction.description,
    amount: Number(transaction.amount),
    date: transaction.date.toISOString().slice(0, 10),
    categoryId: transaction.categoryId,
    type: transaction.type,
    category: {
      id: transaction.category.id,
      name: transaction.category.name,
      color: transaction.category.color,
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
        color: transaction.category.color,
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
        color: transaction.category.color,
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

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-5xl flex-col gap-8 px-6 py-16">
        <form action={logout} className="flex justify-end">
          <button
            type="submit"
            className="text-sm font-medium text-zinc-600 transition-colors hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            Sair
          </button>
        </form>

        <div>
          <h2 className="text-lg font-semibold tracking-tight text-black dark:text-zinc-50">
            Dashboard
          </h2>
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

          <div className="mt-6 overflow-x-auto rounded-lg border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-950">
            <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Maiores gastos individuais
            </h3>
            <table className="mt-3 w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/[.08] text-zinc-600 dark:border-white/[.145] dark:text-zinc-400">
                  <th className="py-2 pr-4 font-medium">Data</th>
                  <th className="py-2 pr-4 font-medium">Descrição</th>
                  <th className="py-2 pr-4 font-medium">Estabelecimento</th>
                  <th className="py-2 pr-4 font-medium">Categoria</th>
                  <th className="py-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {topExpenses.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-b border-black/[.06] last:border-0 dark:border-white/[.08]"
                  >
                    <td className="py-3 pr-4 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                      {dateFormatter.format(transaction.date)}
                    </td>
                    <td className="py-3 pr-4 text-black dark:text-zinc-50">
                      {transaction.subcategoria || transaction.description}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                      {transaction.nomeEmissor ?? "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{
                          backgroundColor: `${transaction.category.color}1a`,
                          color: transaction.category.color,
                        }}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: transaction.category.color }}
                        />
                        {transaction.category.name}
                      </span>
                    </td>
                    <td className="py-3 text-right font-medium tabular-nums whitespace-nowrap text-red-600 dark:text-red-500">
                      {currencyFormatter.format(Number(transaction.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <TransactionsPanel
          balance={balance}
          transactions={serializedTransactions}
          categories={categories}
        />
      </main>
    </div>
  );
}
