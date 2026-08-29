import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { TransactionsTable } from "@/components/TransactionsTable";
import { ProductMonthlyChart } from "@/components/charts/ProductMonthlyChart";
import { buildCategoryColorMap } from "@/lib/categoryColors";

// Lê o banco a cada requisição, com base no termo buscado na URL.
export const dynamic = "force-dynamic";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const monthAbbreviationFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  timeZone: "UTC",
});

const quantityFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });

const inputClass =
  "w-full rounded-md border border-black/[.12] bg-white px-4 py-3 text-base text-black outline-none focus:border-black/40 dark:border-white/[.2] dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-white/40";

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const allCategories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  const categoryColor = buildCategoryColorMap(allCategories);

  const matches = query
    ? await prisma.transaction.findMany({
        where: {
          type: "EXPENSE",
          OR: [
            { description: { contains: query } },
            { subcategoria: { contains: query } },
            { codigoItem: { contains: query } },
          ],
        },
        include: { category: true },
        orderBy: { date: "desc" },
      })
    : [];

  const totalGasto = matches.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const quantidadeCompras = matches.length;
  const precoMedio = quantidadeCompras > 0 ? totalGasto / quantidadeCompras : 0;

  // Quantidade total comprada, agrupada por unidade de medida — não dá pra
  // somar "Kg" com "UN" num número só, então cada unidade vira um grupo à parte.
  // Normaliza a caixa (a extração da nota às vezes salva "KG" e outras "Kg"
  // pro mesmo produto) senão a mesma unidade vira grupos duplicados.
  const quantityByUnit = new Map<string, number>();
  for (const transaction of matches) {
    if (transaction.quantidade == null) continue;
    const unit = transaction.unidadeMedida?.toUpperCase() ?? "";
    quantityByUnit.set(unit, (quantityByUnit.get(unit) ?? 0) + transaction.quantidade);
  }
  const quantidadeTotalLabel =
    quantityByUnit.size === 0
      ? "—"
      : Array.from(quantityByUnit.entries())
          .map(([unit, total]) => (unit ? `${quantityFormatter.format(total)} ${unit}` : quantityFormatter.format(total)))
          .join(" + ");

  const monthlyTotalsByKey = new Map<string, number>();
  for (const transaction of matches) {
    const monthKey = transaction.date.toISOString().slice(0, 7);
    monthlyTotalsByKey.set(monthKey, (monthlyTotalsByKey.get(monthKey) ?? 0) + Number(transaction.amount));
  }
  const monthlyData = Array.from(monthlyTotalsByKey.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => {
      const [year] = month.split("-");
      const label = `${monthAbbreviationFormatter.format(new Date(`${month}-01T00:00:00Z`)).replace(".", "")}/${year}`;
      return { month, label, total };
    });

  const tableRows = matches.map((transaction) => ({
    id: transaction.id,
    date: transaction.date.toISOString().slice(0, 10),
    description: transaction.subcategoria || transaction.description,
    nomeEmissor: transaction.nomeEmissor,
    codigoItem: transaction.codigoItem,
    quantidade: transaction.quantidade,
    unidadeMedida: transaction.unidadeMedida,
    category: {
      name: transaction.category.name,
      color: categoryColor.get(transaction.categoryId) ?? transaction.category.color,
    },
    type: transaction.type,
    amount: Number(transaction.amount),
  }));

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <AppHeader active="produtos" />

      <main className="flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-black dark:text-zinc-50">
            Produtos
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Busque o histórico de gastos por item, independente do estabelecimento onde foi comprado.
          </p>

          <form action="/produtos" method="GET" className="mt-4 flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Digite o nome de um produto, ex: gasolina"
              autoFocus
              className={inputClass}
            />
            <button
              type="submit"
              className="shrink-0 rounded-md bg-[#2a78d6] px-5 py-3 text-sm font-medium whitespace-nowrap text-white transition-colors hover:bg-[#2166b8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2a78d6] dark:bg-[#3987e5] dark:hover:bg-[#2a78d6]"
            >
              Buscar
            </button>
          </form>
        </div>

        {!query && (
          <div className="rounded-lg border border-dashed border-black/[.12] p-12 text-center dark:border-white/[.2]">
            <p className="text-sm font-medium text-black dark:text-zinc-50">
              Digite o nome de um produto para ver o histórico de preços
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Ex: &quot;gasolina&quot;, &quot;iogurte&quot;, &quot;streaming&quot;, ou o código de barras do
              produto... A busca olha a descrição, a subcategoria e o código do item, não importa o
              estabelecimento.
            </p>
          </div>
        )}

        {query && quantidadeCompras === 0 && (
          <div className="rounded-lg border border-dashed border-black/[.12] p-12 text-center dark:border-white/[.2]">
            <p className="text-sm font-medium text-black dark:text-zinc-50">
              Nenhum resultado para &quot;{query}&quot;
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Tente outro termo, ou verifique se o item já foi lançado como despesa.
            </p>
          </div>
        )}

        {query && quantidadeCompras > 0 && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-950">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Total gasto</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-red-600 dark:text-red-500">
                  {currencyFormatter.format(totalGasto)}
                </p>
              </div>
              <div className="rounded-lg border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-950">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Quantidade de compras</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-black dark:text-zinc-50">
                  {quantidadeCompras}
                </p>
              </div>
              <div className="rounded-lg border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-950">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Preço médio por compra</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-black dark:text-zinc-50">
                  {currencyFormatter.format(precoMedio)}
                </p>
              </div>
              <div className="rounded-lg border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-950">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Quantidade total</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-black dark:text-zinc-50">
                  {quantidadeTotalLabel}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-950">
              <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Total gasto por mês
              </h3>
              <ProductMonthlyChart data={monthlyData} />
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                {quantidadeCompras} {quantidadeCompras === 1 ? "compra encontrada" : "compras encontradas"}
              </h3>
              <TransactionsTable transactions={tableRows} showType={false} showCode showQuantity />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
