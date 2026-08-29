import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // better-sqlite3 e o driver adapter do Prisma usam um binário nativo (.node);
  // mantê-los fora do bundle do Next.js evita que o bundler tente empacotá-los
  // e garante que o binário seja copiado corretamente para a build "standalone".
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
};

export default nextConfig;
