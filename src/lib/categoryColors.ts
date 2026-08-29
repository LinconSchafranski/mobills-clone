// Paleta categórica validada (8 matizes, ordem fixa, checada para
// daltonismo/contraste) — usada em vez da coluna Category.color, porque em
// produção várias categorias foram criadas automaticamente pela importação
// (rota /api/transactions/import) e todas compartilham o mesmo cinza-padrão,
// tornando-as indistinguíveis nos gráficos e nas tags. Isso não altera nada
// no banco — é só a cor exibida na interface.
const CATEGORY_PALETTE = [
  "#2a78d6", // azul
  "#eb6834", // laranja
  "#1baf7a", // água
  "#eda100", // amarelo
  "#e87ba4", // magenta
  "#008300", // verde
  "#4a3aa7", // violeta
  "#e34948", // vermelho
];

export const HIDDEN_CATEGORY_NAMES = new Set(["Teste API"]);

/**
 * Mapa categoryId -> cor, atribuída por posição na lista recebida (mesma
 * ordem = mesma cor sempre, já que `categories` é buscado com orderBy name
 * asc). Isso garante cores distintas entre as categorias atuais em todos os
 * gráficos e tags, sem precisar editar a cor salva em cada Category.
 */
export function buildCategoryColorMap(categories: { id: string }[]): Map<string, string> {
  const map = new Map<string, string>();
  categories.forEach((category, index) => {
    map.set(category.id, CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]);
  });
  return map;
}
