"use client";

import { useEffect, useRef, useState } from "react";
import { createTransaction, deleteTransaction, updateTransaction } from "@/app/actions";
import type { Category } from "@/generated/prisma/client";
import type { SerializedTransaction } from "./TransactionsPanel";

const inputClass =
  "w-full rounded-md border border-black/[.12] bg-white px-3 py-2 text-sm text-black outline-none focus:border-black/40 dark:border-white/[.2] dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-white/40";

const labelClass =
  "mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function centsToDisplay(cents: number): string {
  return currencyFormatter.format(cents / 100);
}

export function TransactionFormModal({
  categories,
  transaction,
  onClose,
}: {
  categories: Category[];
  transaction?: SerializedTransaction;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [amountCents, setAmountCents] = useState(() =>
    transaction ? Math.round(transaction.amount * 100) : 0,
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const isEditing = Boolean(transaction);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function handleAmountChange(event: React.ChangeEvent<HTMLInputElement>) {
    const digitsOnly = event.target.value.replace(/\D/g, "");
    setAmountCents(digitsOnly === "" ? 0 : Number(digitsOnly));
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      if (transaction) {
        await updateTransaction(transaction.id, formData);
      } else {
        await createTransaction(formData);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a transação.");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!transaction) return;

    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }

    setPending(true);
    setError(null);
    try {
      await deleteTransaction(transaction.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir a transação.");
      setPending(false);
      setConfirmingDelete(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(event) => {
        if (!dialogRef.current?.contains(event.target as Node)) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-modal-title"
        className="w-full max-w-md rounded-lg border border-black/[.08] bg-white p-6 shadow-lg dark:border-white/[.145] dark:bg-zinc-950"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="transaction-modal-title"
            className="text-lg font-semibold text-black dark:text-zinc-50"
          >
            {isEditing ? "Editar transação" : "Nova transação"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full p-1 text-zinc-500 hover:bg-black/[.06] hover:text-black dark:text-zinc-400 dark:hover:bg-white/[.08] dark:hover:text-zinc-50"
          >
            ✕
          </button>
        </div>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="description" className={labelClass}>
              Descrição
            </label>
            <input
              id="description"
              name="description"
              type="text"
              required
              defaultValue={transaction?.description}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="amount" className={labelClass}>
                Valor
              </label>
              <input
                id="amount"
                type="text"
                inputMode="decimal"
                required
                value={centsToDisplay(amountCents)}
                onChange={handleAmountChange}
                className={inputClass}
              />
              <input type="hidden" name="amount" value={(amountCents / 100).toFixed(2)} />
            </div>
            <div>
              <label htmlFor="date" className={labelClass}>
                Data
              </label>
              <input
                id="date"
                name="date"
                type="date"
                defaultValue={transaction?.date ?? today}
                required
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="categoryId" className={labelClass}>
                Categoria
              </label>
              <select
                id="categoryId"
                name="categoryId"
                required
                defaultValue={transaction?.categoryId ?? ""}
                className={inputClass}
              >
                <option value="" disabled>
                  Selecione
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="type" className={labelClass}>
                Tipo
              </label>
              <select
                id="type"
                name="type"
                required
                defaultValue={transaction?.type ?? "EXPENSE"}
                className={inputClass}
              >
                <option value="EXPENSE">Despesa</option>
                <option value="INCOME">Receita</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-500">{error}</p>
          )}

          {confirmingDelete && (
            <p className="rounded-md bg-red-600/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              Tem certeza? Essa ação não pode ser desfeita.
            </p>
          )}

          <div className="mt-2 flex items-center gap-3">
            {!confirmingDelete && (
              <button
                type="submit"
                disabled={pending}
                className="flex-1 rounded-full bg-[#2a78d6] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2166b8] disabled:opacity-50 dark:bg-[#3987e5] dark:hover:bg-[#2a78d6]"
              >
                {pending ? "Salvando..." : isEditing ? "Salvar alterações" : "Salvar"}
              </button>
            )}

            {isEditing && confirmingDelete && (
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={pending}
                className="flex-1 rounded-full border border-black/[.12] px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-black/[.04] disabled:opacity-50 dark:border-white/[.2] dark:text-zinc-300 dark:hover:bg-white/[.08]"
              >
                Cancelar
              </button>
            )}

            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                  confirmingDelete
                    ? "flex-1 border-red-600 bg-red-600 text-white hover:bg-red-700 dark:border-red-500 dark:bg-red-500 dark:hover:bg-red-600"
                    : "border-red-600 text-red-600 hover:bg-red-600 hover:text-white dark:border-red-500 dark:text-red-500 dark:hover:bg-red-500 dark:hover:text-white"
                }`}
              >
                {pending ? "Excluindo..." : confirmingDelete ? "Confirmar exclusão" : "Excluir"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
