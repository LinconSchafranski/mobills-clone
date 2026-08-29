export function CategoryBadge({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex max-w-full items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: `${color}1a`, color }}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="truncate">{name}</span>
    </span>
  );
}
