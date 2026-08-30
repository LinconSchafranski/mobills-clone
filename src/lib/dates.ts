/** Início (UTC) do mês de `date`, com deslocamento opcional em meses. */
export function startOfUTCMonth(date: Date, monthOffset = 0): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + monthOffset, 1));
}
