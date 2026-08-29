"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { TransactionFormModal } from "./TransactionFormModal";
import { TransactionsTable } from "./TransactionsTable";
import type { Category } from "@/generated/prisma/client";

export type SerializedTransaction = {
  id: string;
  description: string;
  amount: number;
  date: string;
  categoryId: string;
  type: "INCOME" | "EXPENSE";
  category: { id: string; name: string; color: string };
  subcategoria: string | null;
  nomeEmissor: string | null;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const PAGE_SIZE = 20;

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
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const searchParams = useSearchParams();

  // Sempre que o conjunto filtrado muda (nova busca/filtro), volta pra
  // primeira página em vez de manter uma contagem "carregar mais" antiga.
  // Ajuste de estado durante a renderização (não em useEffect) — é o padrão
  // recomendado pelo React para "resetar estado quando uma prop muda".
  const [trackedTransactions, setTrackedTransactions] = useState(transactions);
  if (trackedTransactions !== transactions) {
    setTrackedTransactions(transactions);
    setVisibleCount(PAGE_SIZE);
  }

  const busca = searchParams.get("busca");
  const hasFilters =
    searchParams.get("periodo") ||
    searchParams.get("tipo") ||
    searchParams.get("categorias") ||
    busca;

  const visibleTransactions = transactions.slice(0, visibleCount);
  const hasMore = transactions.length > visibleCount;

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-black dark:text-zinc-50">
            Visão geral
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Saldo do período filtrado</p>
          <p
            className={`mt-1 text-4xl font-bold tabular-nums ${
              balance >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
            }`}
          >
            {currencyFormatter.format(balance)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModal({ mode: "create" })}
          className="rounded-full bg-[#2a78d6] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2166b8] dark:bg-[#3987e5] dark:hover:bg-[#2a78d6]"
        >
          Nova transação
        </button>
      </div>

      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        {transactions.length === 0
          ? "Nenhuma transação encontrada"
          : `${transactions.length} ${transactions.length === 1 ? "transação encontrada" : "transações encontradas"}`}
        {busca && (
          <>
            {" "}
            para <span className="font-medium text-black dark:text-zinc-50">&quot;{busca}&quot;</span>
          </>
        )}
        {hasFilters && " (com filtro aplicado)"}
      </p>

      <div className="mt-2">
        {transactions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-black/[.12] p-10 text-center dark:border-white/[.2]">
            <p className="text-sm font-medium text-black dark:text-zinc-50">
              {hasFilters ? "Nenhum resultado para esse filtro" : "Nenhuma transação ainda"}
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {hasFilters
                ? "Tente ajustar o período, a categoria ou o texto buscado."
                : "Clique em \"Nova transação\" para lançar a primeira."}
            </p>
          </div>
        ) : (
          <>
            <TransactionsTable
              transactions={visibleTransactions.map((transaction) => ({
                id: transaction.id,
                date: transaction.date,
                description: transaction.subcategoria || transaction.description,
                nomeEmissor: transaction.nomeEmissor,
                category: transaction.category,
                type: transaction.type,
                amount: transaction.amount,
              }))}
              onRowClick={(row) => {
                const original = transactions.find((t) => t.id === row.id);
                if (original) setModal({ mode: "edit", transaction: original });
              }}
            />

            {hasMore && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  className="rounded-full border border-black/[.12] px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:text-zinc-300 dark:hover:bg-white/[.08]"
                >
                  Carregar mais ({transactions.length - visibleCount} restantes)
                </button>
              </div>
            )}
          </>
        )}
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
