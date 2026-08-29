import { login } from "./actions";

const inputClass =
  "w-full rounded-md border border-black/[.12] bg-white px-3 py-2 text-sm text-black outline-none focus:border-black/40 dark:border-white/[.2] dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-white/40";

const labelClass = "mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="w-full max-w-sm rounded-lg border border-black/[.08] bg-white p-8 shadow-sm dark:border-white/[.145] dark:bg-zinc-950">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Entrar</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Acesse o controle de gastos
        </p>

        <form action={login} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="username" className={labelClass}>
              Usuário
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              autoFocus
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="password" className={labelClass}>
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={inputClass}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-500">
              Usuário ou senha incorretos.
            </p>
          )}

          <button
            type="submit"
            className="mt-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
