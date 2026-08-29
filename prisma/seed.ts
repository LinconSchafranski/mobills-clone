import { prisma } from "../src/lib/prisma";

async function main() {
  await prisma.transaction.deleteMany();
  await prisma.category.deleteMany();

  const categories = await Promise.all([
    prisma.category.create({
      data: { name: "Alimentação", type: "EXPENSE", color: "#F97316" },
    }),
    prisma.category.create({
      data: { name: "Transporte", type: "EXPENSE", color: "#3B82F6" },
    }),
    prisma.category.create({
      data: { name: "Moradia", type: "EXPENSE", color: "#8B5CF6" },
    }),
    prisma.category.create({
      data: { name: "Salário", type: "INCOME", color: "#22C55E" },
    }),
    prisma.category.create({
      data: { name: "Lazer", type: "EXPENSE", color: "#EC4899" },
    }),
  ]);

  const [alimentacao, transporte, moradia, salario, lazer] = categories;

  await prisma.transaction.createMany({
    data: [
      {
        description: "Supermercado do mês",
        amount: 452.3,
        date: new Date("2026-08-01"),
        type: "EXPENSE",
        categoryId: alimentacao.id,
      },
      {
        description: "Restaurante com a família",
        amount: 98.5,
        date: new Date("2026-08-05"),
        type: "EXPENSE",
        categoryId: alimentacao.id,
      },
      {
        description: "Abastecimento do carro",
        amount: 180,
        date: new Date("2026-08-03"),
        type: "EXPENSE",
        categoryId: transporte.id,
      },
      {
        description: "Aplicativo de transporte",
        amount: 42.9,
        date: new Date("2026-08-10"),
        type: "EXPENSE",
        categoryId: transporte.id,
      },
      {
        description: "Aluguel",
        amount: 1500,
        date: new Date("2026-08-05"),
        type: "EXPENSE",
        categoryId: moradia.id,
      },
      {
        description: "Conta de energia elétrica",
        amount: 210.75,
        date: new Date("2026-08-08"),
        type: "EXPENSE",
        categoryId: moradia.id,
      },
      {
        description: "Salário mensal",
        amount: 5200,
        date: new Date("2026-08-05"),
        type: "INCOME",
        categoryId: salario.id,
      },
      {
        description: "Cinema com amigos",
        amount: 65,
        date: new Date("2026-08-15"),
        type: "EXPENSE",
        categoryId: lazer.id,
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
