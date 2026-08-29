import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

const navLinkClass =
  "text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2a78d6] rounded";

export function AppHeader({ active }: { active: "dashboard" | "produtos" }) {
  return (
    <header className="w-full border-b border-black/[.08] bg-white dark:border-white/[.145] dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2a78d6] rounded">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2a78d6] text-sm font-bold text-white dark:bg-[#3987e5]">
              G
            </span>
            <span className="text-base font-semibold tracking-tight text-black dark:text-zinc-50">
              Gastos
            </span>
          </Link>

          <Link
            href="/produtos"
            className={`${navLinkClass} ${
              active === "produtos"
                ? "text-black dark:text-zinc-50"
                : "text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
            }`}
          >
            Produtos
          </Link>
        </div>

        <LogoutButton />
      </div>
    </header>
  );
}
