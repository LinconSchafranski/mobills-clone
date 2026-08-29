import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_CATEGORY_COLOR = "#6B7280";

type ImportPayload = {
  nome_emissor?: unknown;
  cnpj_emissor?: unknown;
  data_compra?: unknown;
  chave_acesso?: unknown;
  codigo_item?: unknown;
  descricao_item?: unknown;
  quantidade?: unknown;
  unidade_medida?: unknown;
  valor_unitario_item?: unknown;
  valor_total_item?: unknown;
  categoria?: unknown;
  subcategoria?: unknown;
  ncm_code?: unknown;
};

function optionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function optionalNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.N8N_API_KEY) {
    return NextResponse.json({ error: "API key inválida ou ausente." }, { status: 401 });
  }

  let payload: ImportPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição não é um JSON válido." }, { status: 400 });
  }

  const descricaoItem = optionalString(payload.descricao_item);
  const categoria = optionalString(payload.categoria);
  const valorTotalItem = optionalNumber(payload.valor_total_item);
  const dataCompra =
    typeof payload.data_compra === "string" ? new Date(payload.data_compra) : null;

  const missing: string[] = [];
  if (!descricaoItem) missing.push("descricao_item");
  if (!categoria) missing.push("categoria");
  if (valorTotalItem === null || valorTotalItem <= 0) missing.push("valor_total_item");
  if (!dataCompra || Number.isNaN(dataCompra.getTime())) missing.push("data_compra");

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Payload inválido ou incompleto. Campos ausentes/inválidos: ${missing.join(", ")}.` },
      { status: 400 },
    );
  }

  const category =
    (await prisma.category.findFirst({ where: { name: categoria! } })) ??
    (await prisma.category.create({
      data: { name: categoria!, type: "EXPENSE", color: DEFAULT_CATEGORY_COLOR },
    }));

  const transaction = await prisma.transaction.create({
    data: {
      description: descricaoItem!,
      amount: valorTotalItem!,
      date: dataCompra!,
      type: "EXPENSE",
      categoryId: category.id,
      nomeEmissor: optionalString(payload.nome_emissor),
      cnpjEmissor: optionalString(payload.cnpj_emissor),
      chaveAcesso: optionalString(payload.chave_acesso),
      codigoItem: optionalString(payload.codigo_item),
      quantidade: optionalNumber(payload.quantidade),
      unidadeMedida: optionalString(payload.unidade_medida),
      subcategoria: optionalString(payload.subcategoria),
      ncmCode: optionalString(payload.ncm_code),
    },
    include: { category: true },
  });

  return NextResponse.json(
    {
      ...transaction,
      amount: Number(transaction.amount),
    },
    { status: 201 },
  );
}
