import { prisma } from "@/lib/prisma";
import { TransactionsPanel } from "@/components/TransactionsPanel";
import { ExpensesByCategoryChart } from "@/components/charts/ExpensesByCategoryChart";
import { MonthlyIncomeExpenseChart } from "@/components/charts/MonthlyIncomeExpenseChart";

const monthAbbreviationFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  timeZone: "UTC",
});

export default async function Home() {
  const [transactions, categories] = await Promise.all([
    prisma.transaction.findMany({
      include: { category: true },
      orderBy: { date: "desc" },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
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

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-5xl flex-col gap-8 px-6 py-16">
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
