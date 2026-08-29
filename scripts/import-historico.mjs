// Importa em massa linhas históricas da planilha "base_dados_extracao_notas_fiscais.xlsx"
// para a API de produção, via POST /api/transactions/import.
//
// Uso:
//   node scripts/import-historico.mjs --dry-run   # só conta/mostra o que seria enviado
//   node scripts/import-historico.mjs              # roda de verdade contra produção
//
// Só processa linhas em que a coluna "subcategoria" não está vazia.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ExcelJS from "exceljs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

const XLSX_PATH = path.join(PROJECT_ROOT, "base_dados_extracao_notas_fiscais.xlsx");
const ENV_N8N_PATH = path.join(PROJECT_ROOT, ".env.n8n");
const SHEET_NAME = "Página1";
const IMPORT_URL = "https://gastos.srv1112349.hstgr.cloud/api/transactions/import";
const DELAY_BETWEEN_REQUESTS_MS = 100;
const FAILURES_LOG_PATH = path.join(PROJECT_ROOT, "scripts", "import-historico-falhas.json");

const isDryRun = process.argv.includes("--dry-run");

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const rowLimit = limitArg ? Number(limitArg.slice("--limit=".length)) : undefined;
if (limitArg && (!Number.isInteger(rowLimit) || rowLimit <= 0)) {
  console.error(`Valor inválido para --limit: "${limitArg}". Use um inteiro positivo, ex: --limit=10`);
  process.exit(1);
}

function readEnvFile(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Arquivo de variáveis não encontrado: ${filePath}`);
  }
  const env = {};
  for (const line of readFileSync(filePath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Excel pode entregar texto, número ou Date para o mesmo tipo de coluna
// dependendo de como a célula foi formatada — normalizamos tudo aqui.
function toStringOrUndefined(value) {
  if (value === null || value === undefined) return undefined;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const str = String(value).trim();
  return str === "" ? undefined : str;
}

function toNumberOrUndefined(value) {
  if (value === null || value === undefined || value === "") return undefined;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function toDateStringOrUndefined(value) {
  if (value === null || value === undefined) return undefined;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const str = String(value).trim();
  return str === "" ? undefined : str;
}

async function loadRows() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(XLSX_PATH);

  const sheet = workbook.getWorksheet(SHEET_NAME);
  if (!sheet) {
    throw new Error(`Aba "${SHEET_NAME}" não encontrada em ${XLSX_PATH}`);
  }

  // Monta coluna -> nome do campo a partir do cabeçalho real, em vez de
  // assumir letras fixas (mais resistente a colunas reordenadas).
  const columnByField = {};
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const field = String(cell.value ?? "").trim();
    if (field) columnByField[field] = colNumber;
  });

  const requiredColumns = ["subcategoria"];
  for (const col of requiredColumns) {
    if (!columnByField[col]) {
      throw new Error(`Coluna obrigatória "${col}" não encontrada no cabeçalho da planilha.`);
    }
  }

  function cell(row, field) {
    const colNumber = columnByField[field];
    return colNumber ? row.getCell(colNumber).value : undefined;
  }

  const allRows = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // cabeçalho
    allRows.push({ rowNumber, row });
  });

  const filtered = allRows.filter(({ row }) => {
    const subcategoria = cell(row, "subcategoria");
    return subcategoria !== null && subcategoria !== undefined && String(subcategoria).trim() !== "";
  });

  const payloads = filtered.map(({ rowNumber, row }) => ({
    rowNumber,
    payload: {
      nome_emissor: toStringOrUndefined(cell(row, "nome_emissor")),
      cnpj_emissor: toStringOrUndefined(cell(row, "cnpj_emissor")),
      data_compra: toDateStringOrUndefined(cell(row, "data_compra")),
      chave_acesso: toStringOrUndefined(cell(row, "chave_acesso")),
      codigo_item: toStringOrUndefined(cell(row, "codigo_item")),
      descricao_item: toStringOrUndefined(cell(row, "descricao_item")),
      quantidade: toNumberOrUndefined(cell(row, "quantidade")),
      unidade_medida: toStringOrUndefined(cell(row, "unidade_medida")),
      valor_unitario_item: toNumberOrUndefined(cell(row, "valor_unitario_item")),
      valor_total_item: toNumberOrUndefined(cell(row, "valor_total_item")),
      categoria: toStringOrUndefined(cell(row, "categoria")),
      subcategoria: toStringOrUndefined(cell(row, "subcategoria")),
      ncm_code: toStringOrUndefined(cell(row, "ncm_code")),
      valor_total: toNumberOrUndefined(cell(row, "valor_total")),
    },
  }));

  return { totalRows: allRows.length, payloads };
}

async function postTransaction(apiKey, payload) {
  const response = await fetch(IMPORT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return { status: response.status, body };
}

async function main() {
  // --dry-run só lê/filtra a planilha e não faz nenhuma requisição, então não
  // precisa da API key — assim dá pra conferir a contagem antes de configurá-la.
  let apiKey;
  if (!isDryRun) {
    const env = readEnvFile(ENV_N8N_PATH);
    apiKey = env.N8N_API_KEY_APP;
    if (!apiKey) {
      console.error(
        `Variável N8N_API_KEY_APP não encontrada em ${ENV_N8N_PATH}. Adicione-a antes de rodar o script.`,
      );
      process.exit(1);
    }
  }

  const { totalRows, payloads: allPayloads } = await loadRows();
  const payloads = rowLimit ? allPayloads.slice(0, rowLimit) : allPayloads;

  console.log(`Linhas de dados na planilha: ${totalRows}`);
  console.log(`Linhas com "subcategoria" preenchida: ${allPayloads.length}`);
  if (rowLimit) {
    console.log(`--limit=${rowLimit}: processando só as primeiras ${payloads.length} dessas linhas.`);
  }

  if (isDryRun) {
    console.log("\n--dry-run: nenhuma requisição será enviada. Amostra das 3 primeiras linhas:");
    console.log(JSON.stringify(payloads.slice(0, 3), null, 2));
    return;
  }

  const failures = [];
  const successes = [];

  for (let i = 0; i < payloads.length; i++) {
    const { rowNumber, payload } = payloads[i];

    try {
      const { status, body } = await postTransaction(apiKey, payload);
      if (status === 201) {
        successes.push({ rowNumber, transaction: body });
      } else {
        failures.push({
          rowNumber,
          status,
          error: body?.error ?? `HTTP ${status} sem corpo de erro reconhecível`,
          payload,
        });
      }
    } catch (err) {
      failures.push({
        rowNumber,
        status: null,
        error: err instanceof Error ? err.message : String(err),
        payload,
      });
    }

    if ((i + 1) % 100 === 0 || i === payloads.length - 1) {
      console.log(`Progresso: ${i + 1}/${payloads.length}`);
    }

    if (i < payloads.length - 1) {
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
    }
  }

  console.log("\n===== Resumo da importação =====");
  console.log(`Processadas: ${payloads.length}`);
  console.log(`Sucesso (201): ${successes.length}`);
  console.log(`Falhas: ${failures.length}`);

  if (successes.length > 0) {
    console.log("\nTransações criadas com sucesso:");
    for (const { rowNumber, transaction } of successes) {
      const estabelecimento = transaction?.nomeEmissor ?? "—";
      const descricao = transaction?.subcategoria || transaction?.description;
      console.log(
        `  linha ${rowNumber} | id ${transaction?.id} | ${transaction?.date?.slice(0, 10)} | ` +
          `${descricao} | ${estabelecimento} | R$ ${transaction?.amount}`,
      );
    }
  }

  if (failures.length > 0) {
    console.log("\nPrimeiras falhas:");
    for (const failure of failures.slice(0, 20)) {
      console.log(`  linha ${failure.rowNumber} | status ${failure.status} | ${failure.error}`);
    }
    writeFileSync(FAILURES_LOG_PATH, JSON.stringify(failures, null, 2));
    console.log(`\nDetalhes completos de todas as falhas salvos em: ${FAILURES_LOG_PATH}`);
  }
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
