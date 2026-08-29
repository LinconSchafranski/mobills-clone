"use client";

import { useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type CategoryOption = { id: string; name: string; color: string };

const PERIOD_OPTIONS = [
  { value: "mes-atual", label: "Mês atual" },
  { value: "mes-anterior", label: "Mês anterior" },
  { value: "ultimos-3-meses", label: "Últimos 3 meses" },
  { value: "historico", label: "Todo o histórico" },
];

const TYPE_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "despesa", label: "Só despesas" },
  { value: "receita", label: "Só receitas" },
];

const selectClass =
  "rounded-md border border-black/[.12] bg-white px-3 py-2 text-sm text-black outline-none focus:border-black/40 dark:border-white/[.2] dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-white/40";

const inputClass =
  "w-full rounded-md border border-black/[.12] bg-white px-3 py-2 text-sm text-black outline-none focus:border-black/40 dark:border-white/[.2] dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-white/40";

const labelClass = "mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400";

export function FiltersPanel({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentPeriod = searchParams.get("periodo") ?? "mes-atual";
  const currentType = searchParams.get("tipo") ?? "todos";
  const currentSearch = searchParams.get("busca") ?? "";
  const categoriasParam = searchParams.get("categorias");
  const selectedCategoryIds = categoriasParam
    ? categoriasParam.split(",").filter(Boolean)
    : categories.map((c) => c.id);

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  function toggleCategory(id: string) {
    const next = selectedCategoryIds.includes(id)
      ? selectedCategoryIds.filter((categoryId) => categoryId !== id)
      : [...selectedCategoryIds, id];
    const isAllOrNone = next.length === 0 || next.length === categories.length;
    updateParams({ categorias: isAllOrNone ? null : next.join(",") });
  }

  function handleSearchChange(value: string) {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      updateParams({ busca: value.trim() === "" ? null : value.trim() });
    }, 400);
  }

  const hasActiveFilters =
    currentPeriod !== "mes-atual" ||
    currentType !== "todos" ||
    currentSearch !== "" ||
    categoriasParam !== null;

  return (
    <div className="rounded-lg border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-950">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className={labelClass}>Período</label>
          <select
            value={currentPeriod}
            onChange={(event) =>
              updateParams({ periodo: event.target.value === "mes-atual" ? null : event.target.value })
            }
            className={selectClass}
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Tipo</label>
          <div className="flex gap-1 rounded-md border border-black/[.12] p-0.5 dark:border-white/[.2]">
            {TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => updateParams({ tipo: option.value === "todos" ? null : option.value })}
                className={`rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  currentType === option.value
                    ? "bg-foreground text-background"
                    : "text-zinc-600 hover:bg-black/[.04] dark:text-zinc-400 dark:hover:bg-white/[.08]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-[220px] flex-1">
          <label className={labelClass}>Buscar</label>
          <input
            type="text"
            defaultValue={currentSearch}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Descrição, subcategoria ou estabelecimento..."
            className={inputClass}
          />
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => router.replace(pathname)}
            className="pb-2 text-sm font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="mt-4">
        <label className={labelClass}>Categorias</label>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const isSelected = selectedCategoryIds.includes(category.id);
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => toggleCategory(category.id)}
                aria-pressed={isSelected}
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity"
                style={{
                  borderColor: category.color,
                  backgroundColor: isSelected ? `${category.color}1a` : "transparent",
                  color: category.color,
                  opacity: isSelected ? 1 : 0.4,
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />
                {category.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
