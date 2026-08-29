import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

// Next.js 16 renomeou "Middleware" para "Proxy" (mesmo conceito, mesmo
// comportamento) — este arquivo roda antes de cada rota renderizar.
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = token ? await verifySessionToken(token) : false;

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Roda em tudo, exceto: /login, a API de importação (protegida só por
    // x-api-key) e os arquivos estáticos/internos do Next.js.
    "/((?!login|api/transactions/import|_next/static|_next/image|favicon.ico).*)",
  ],
};
