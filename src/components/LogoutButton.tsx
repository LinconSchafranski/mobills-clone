"use client";

import { logout } from "@/app/login/actions";

export function LogoutButton() {
  return (
    <form
      action={logout}
      onSubmit={(event) => {
        if (!window.confirm("Sair da sua conta?")) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="flex items-center gap-1.5 rounded-full border border-black/[.12] px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-black/[.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2a78d6] dark:border-white/[.2] dark:text-zinc-300 dark:hover:bg-white/[.08]"
      >
        Sair
      </button>
    </form>
  );
}
