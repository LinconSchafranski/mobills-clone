"use client";

import { CategoryBadge } from "./CategoryBadge";

export type TableRow = {
  id: string;
  date: string; // "YYYY-MM-DD"
  description: string;
  nomeEmissor: string | null;
  codigoItem?: string | null;
  quantidade?: number | null;
  unidadeMedida?: string | null;
  category: { name: string; color: string };
  type: "INCOME" | "EXPENSE";
  amount: number;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const quantityFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });

// "1,305 Kg", "3 UN", só o número se não tiver unidade, "—" se não tiver nem quantidade
// (transações lançadas manualmente pelo modal não têm esses dois campos).
function formatQuantity(quantidade?: number | null, unidadeMedida?: string | null): string {
  if (quantidade == null) return "—";
  const amount = quantityFormatter.format(quantidade);
  return unidadeMedida ? `${amount} ${unidadeMedida}` : amount;
}

// Preço por unidade = valor total dividido pela quantidade (não temos o
// valor unitário da nota salvo à parte). "—" quando não há quantidade.
function formatUnitPrice(amount: number, quantidade?: number | null, unidadeMedida?: string | null): string {
  if (!quantidade) return "—";
  const perUnit = currencyFormatter.format(amount / quantidade);
  return unidadeMedida ? `${perUnit}/${unidadeMedida}` : perUnit;
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

function handleRowKeyDown(event: React.KeyboardEvent, onActivate: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onActivate();
  }
}

/**
 * Tabela normal em telas >= sm; cards empilhados abaixo disso, pra que Data,
 * Descrição, Categoria, Tipo e Valor nunca fiquem cortados da viewport (o
 * problema original era a tabela só ter scroll horizontal, sem indicação
 * visual, e o Valor — a informação mais importante — ficar fora da tela).
 */
export function TransactionsTable({
  transactions,
  onRowClick,
  showType = true,
  showCode = false,
  showQuantity = false,
  showUnitPrice = false,
}: {
  transactions: TableRow[];
  onRowClick?: (transaction: TableRow) => void;
  showType?: boolean;
  showCode?: boolean;
  showQuantity?: boolean;
  showUnitPrice?: boolean;
}) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-black/[.08] sm:block dark:border-white/[.145]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/[.08] text-zinc-600 dark:border-white/[.145] dark:text-zinc-400">
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Descrição</th>
              <th className="px-4 py-3 font-medium">Estabelecimento</th>
              {showCode && <th className="px-4 py-3 font-medium">Código</th>}
              <th className="px-4 py-3 font-medium">Categoria</th>
              {showType && <th className="px-4 py-3 font-medium">Tipo</th>}
              {showUnitPrice && <th className="px-4 py-3 text-right font-medium">Preço/Unid.</th>}
              <th className="px-4 py-3 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => {
              const isIncome = transaction.type === "INCOME";
              return (
                <tr
                  key={transaction.id}
                  onClick={onRowClick ? () => onRowClick(transaction) : undefined}
                  onKeyDown={
                    onRowClick ? (event) => handleRowKeyDown(event, () => onRowClick(transaction)) : undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? "button" : undefined}
                  className={`border-b border-black/[.06] last:border-0 dark:border-white/[.08] ${
                    onRowClick
                      ? "cursor-pointer hover:bg-black/[.03] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#2a78d6] dark:hover:bg-white/[.05]"
                      : ""
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                    {dateFormatter.format(new Date(transaction.date))}
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-black dark:text-zinc-50">
                    {transaction.description}
                  </td>
                  <td
                    className="max-w-[160px] truncate px-4 py-3 text-zinc-600 dark:text-zinc-400"
                    title={transaction.nomeEmissor ?? undefined}
                  >
                    {transaction.nomeEmissor ?? "—"}
                  </td>
                  {showCode && (
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-zinc-500 dark:text-zinc-400">
                      {transaction.codigoItem ?? "—"}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <CategoryBadge name={transaction.category.name} color={transaction.category.color} />
                  </td>
                  {showType && (
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                      {isIncome ? "Receita" : "Despesa"}
                    </td>
                  )}
                  {showUnitPrice && (
                    <td className="px-4 py-3 text-right whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                      {formatUnitPrice(transaction.amount, transaction.quantidade, transaction.unidadeMedida)}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span
                      className={`font-medium tabular-nums ${
                        isIncome ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
                      }`}
                    >
                      {isIncome ? "+" : "-"}
                      {currencyFormatter.format(transaction.amount)}
                    </span>
                    {showQuantity && (
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {formatQuantity(transaction.quantidade, transaction.unidadeMedida)}
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 sm:hidden">
        {transactions.map((transaction) => {
          const isIncome = transaction.type === "INCOME";
          return (
            <div
              key={transaction.id}
              onClick={onRowClick ? () => onRowClick(transaction) : undefined}
              onKeyDown={
                onRowClick ? (event) => handleRowKeyDown(event, () => onRowClick(transaction)) : undefined
              }
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? "button" : undefined}
              className={`rounded-lg border border-black/[.08] bg-white p-3 dark:border-white/[.145] dark:bg-zinc-950 ${
                onRowClick
                  ? "cursor-pointer active:bg-black/[.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2a78d6] dark:active:bg-white/[.05]"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 text-sm font-medium text-black dark:text-zinc-50">
                  {transaction.description}
                </p>
                <span className="shrink-0 text-right">
                  <span
                    className={`block text-sm font-semibold tabular-nums ${
                      isIncome ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
                    }`}
                  >
                    {isIncome ? "+" : "-"}
                    {currencyFormatter.format(transaction.amount)}
                  </span>
                  {showQuantity && (
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                      {formatQuantity(transaction.quantidade, transaction.unidadeMedida)}
                    </span>
                  )}
                  {showUnitPrice && (
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                      {formatUnitPrice(transaction.amount, transaction.quantidade, transaction.unidadeMedida)}
                    </span>
                  )}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <CategoryBadge name={transaction.category.name} color={transaction.category.color} />
                <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                  {dateFormatter.format(new Date(transaction.date))}
                  {showType && <> · {isIncome ? "Receita" : "Despesa"}</>}
                </span>
              </div>

              {transaction.nomeEmissor && (
                <p className="mt-1.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {transaction.nomeEmissor}
                </p>
              )}

              {showCode && transaction.codigoItem && (
                <p className="mt-1 truncate font-mono text-xs text-zinc-400 dark:text-zinc-500">
                  Cód. {transaction.codigoItem}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
