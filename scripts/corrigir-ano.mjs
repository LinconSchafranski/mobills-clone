// Corrige transações lançadas com o ano errado (anterior a 2026) por causa de
// um bug na extração de nota fiscal — mantém mês/dia/hora, troca só o ano.
//
// Pensado pra rodar contra uma CÓPIA do banco de produção (não contra o
// container ao vivo): copie o arquivo com `docker compose cp`, aponte
// DATABASE_URL pra essa cópia, rode aqui, confira, e só depois copie de volta.
//
// Uso:
//   DATABASE_URL="file:/caminho/para/copia-producao.db" npx tsx scripts/corrigir-ano.mjs             # dry-run (padrão)
//   DATABASE_URL="file:/caminho/para/copia-producao.db" npx tsx scripts/corrigir-ano.mjs --apply      # aplica de verdade

import { prisma } from "../src/lib/prisma";

const CUTOFF = new Date("2026-01-01T00:00:00.000Z");
const isApply = process.argv.includes("--apply");

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function withYear2026(date) {
  const fixed = new Date(date.getTime());
  fixed.setUTCFullYear(2026);
  return fixed;
}

function formatDate(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

async function main() {
  const affected = await prisma.transaction.findMany({
    where: { date: { lt: CUTOFF } },
    orderBy: { date: "asc" },
  });

  console.log(`Transações com data anterior a 01/01/2026: ${affected.length}`);

  if (affected.length === 0) {
    console.log("Nada para corrigir.");
    return;
  }

  const corrections = affected.map((transaction) => {
    const newDate = withYear2026(transaction.date);
    const monthRolledOver = newDate.getUTCMonth() !== transaction.date.getUTCMonth();
    return { transaction, newDate, monthRolledOver };
  });

  const rollovers = corrections.filter((c) => c.monthRolledOver);
  if (rollovers.length > 0) {
    console.log(
      `\n⚠ ${rollovers.length} caso(s) onde a troca de ano muda o mês também (provavelmente 29/02 em ano bissexto virando 2026, que não é bissexto) — revise a amostra abaixo com atenção.`,
    );
  }

  console.log(`\nAmostra (${Math.min(10, corrections.length)} de ${corrections.length}):`);
  for (const { transaction, newDate, monthRolledOver } of corrections.slice(0, 10)) {
    const flag = monthRolledOver ? "  ⚠ mês mudou" : "";
    console.log(
      `  ${formatDate(transaction.date)} → ${formatDate(newDate)}  |  ${transaction.description}  |  ${currencyFormatter.format(Number(transaction.amount))}${flag}`,
    );
  }

  if (!isApply) {
    console.log("\n--dry-run (padrão): nenhuma alteração foi feita. Rode com --apply para corrigir de verdade.");
    return;
  }

  console.log(`\nAplicando correção em ${corrections.length} transação(ões)...`);

  let updated = 0;
  for (const { transaction, newDate } of corrections) {
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { date: newDate },
    });
    updated++;
  }

  console.log(`\n${updated} transação(ões) corrigida(s) com sucesso.`);
}

main()
  .catch((err) => {
    console.error("Erro fatal:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
