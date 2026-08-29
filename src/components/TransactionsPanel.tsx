"use client";

import { useState } from "react";
import { TransactionFormModal } from "./TransactionFormModal";
import type { Category } from "@/generated/prisma/client";

export type SerializedTransaction = {
  id: string;
  description: string;
  amount: number;
  date: string;
  categoryId: string;
  type: "INCOME" | "EXPENSE";
  category: { id: string; name: string; color: string };
};

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

type ModalState = { mode: "create" } | { mode: "edit"; transaction: SerializedTransaction };

export function TransactionsPanel({
  balance,
  transactions,
  categories,
}: {
  balance: number;
  transactions: SerializedTransaction[];
  categories: Category[];
}) {
  const [modal, setModal] = useState<ModalState | null>(null);

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Visão geral
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Saldo total
          </p>
          <p
            className={`mt-1 text-4xl font-bold tabular-nums ${
              balance >= 0
                ? "text-green-600 dark:text-green-500"
                : "text-red-600 dark:text-red-500"
            }`}
          >
            {currencyFormatter.format(balance)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModal({ mode: "create" })}
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Nova transação
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-black/[.08] dark:border-white/[.145]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/[.08] text-zinc-600 dark:border-white/[.145] dark:text-zinc-400">
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Descrição</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => {
              const isIncome = transaction.type === "INCOME";

              return (
                <tr
                  key={transaction.id}
                  onClick={() => setModal({ mode: "edit", transaction })}
                  className="cursor-pointer border-b border-black/[.06] last:border-0 hover:bg-black/[.03] dark:border-white/[.08] dark:hover:bg-white/[.05]"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                    {dateFormatter.format(new Date(transaction.date))}
                  </td>
                  <td className="px-4 py-3 text-black dark:text-zinc-50">
                    {transaction.description}
                  </td>
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                    {isIncome ? "Receita" : "Despesa"}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-medium tabular-nums whitespace-nowrap ${
                      isIncome
                        ? "text-green-600 dark:text-green-500"
                        : "text-red-600 dark:text-red-500"
                    }`}
                  >
                    {isIncome ? "+" : "-"}
                    {currencyFormatter.format(transaction.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <TransactionFormModal
          key={modal.mode === "edit" ? modal.transaction.id : "create"}
          categories={categories}
          transaction={modal.mode === "edit" ? modal.transaction : undefined}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
