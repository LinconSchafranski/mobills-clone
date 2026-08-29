"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

function parseTransactionInput(formData: FormData): {
  description: string;
  amount: number;
  date: Date;
  categoryId: string;
  type: "INCOME" | "EXPENSE";
} {
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const date = String(formData.get("date") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  const type = formData.get("type");

  if (type !== "INCOME" && type !== "EXPENSE") {
    throw new Error("Selecione o tipo da transação.");
  }

  if (!description) {
    throw new Error("Informe a descrição.");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Informe um valor válido.");
  }

  if (!date) {
    throw new Error("Informe a data.");
  }

  if (!categoryId) {
    throw new Error("Selecione a categoria.");
  }

  return { description, amount, date: new Date(date), categoryId, type };
}

export async function createTransaction(formData: FormData) {
  const data = parseTransactionInput(formData);

  await prisma.transaction.create({ data });

  revalidatePath("/");
}

export async function updateTransaction(id: string, formData: FormData) {
  const data = parseTransactionInput(formData);

  await prisma.transaction.update({ where: { id }, data });

  revalidatePath("/");
}

export async function deleteTransaction(id: string) {
  await prisma.transaction.delete({ where: { id } });

  revalidatePath("/");
}
