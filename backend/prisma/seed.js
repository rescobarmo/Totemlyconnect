const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const categoriasData = [
  { nombre: "Bebidas", icono: "🥤" },
  { nombre: "Comidas", icono: "🍔" },
  { nombre: "Postres", icono: "🍰" },
  { nombre: "Cafetería", icono: "☕" },
];

const productosData = [
  { categoria: "Bebidas", nombre: "Coca Cola", precio: 1500 },
  { categoria: "Bebidas", nombre: "Sprite", precio: 1500 },
  { categoria: "Bebidas", nombre: "Jugo Natural", precio: 2500 },
  { categoria: "Bebidas", nombre: "Agua Mineral", precio: 1000 },
  { categoria: "Bebidas", nombre: "Cerveza", precio: 3000 },
  { categoria: "Comidas", nombre: "Hamburguesa", precio: 6500 },
  { categoria: "Comidas", nombre: "Pizza Personal", precio: 5500 },
  { categoria: "Comidas", nombre: "Completo", precio: 3500 },
  { categoria: "Comidas", nombre: "Sandwich", precio: 4500 },
  { categoria: "Comidas", nombre: "Papas Fritas", precio: 3000 },
  { categoria: "Postres", nombre: "Helado", precio: 2500 },
  { categoria: "Postres", nombre: "Pastel", precio: 3500 },
  { categoria: "Postres", nombre: "Flan", precio: 2500 },
  { categoria: "Cafetería", nombre: "Café Americano", precio: 2000 },
  { categoria: "Cafetería", nombre: "Café Latte", precio: 2500 },
  { categoria: "Cafetería", nombre: "Té", precio: 1500 },
  { categoria: "Cafetería", nombre: "Capuccino", precio: 2800 },
];

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@minifood.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@minifood.com",
      password: await bcrypt.hash("123456", 10),
      role: "admin",
    },
  });
  console.log("Admin creado:", admin.email);

  const mesero = await prisma.user.upsert({
    where: { email: "mesero@minifood.com" },
    update: {},
    create: {
      name: "Mesero Demo",
      email: "mesero@minifood.com",
      password: await bcrypt.hash("123456", 10),
      role: "mesero",
    },
  });
  console.log("Mesero creado:", mesero.email);

  for (let i = 1; i <= 10; i++) {
    await prisma.mesa.upsert({
      where: { numero: i },
      update: {},
      create: { numero: i, estado: "libre" },
    });
  }
  console.log("10 mesas creadas");

  const catCount = await prisma.categoria.count();
  if (catCount === 0) {
    for (const cat of categoriasData) {
      const created = await prisma.categoria.create({
        data: { nombre: cat.nombre, icono: cat.icono, activo: true },
      });
      console.log(`Categoría creada: ${created.nombre}`);

      const prods = productosData.filter((p) => p.categoria === cat.nombre);
      for (const prod of prods) {
        await prisma.producto.create({
          data: {
            categoriaId: created.id,
            nombre: prod.nombre,
            precio: prod.precio,
            activo: true,
          },
        });
        console.log(`  Producto: ${prod.nombre} $${prod.precio}`);
      }
    }
  } else {
    console.log("Categorías y productos ya existen, se omite creación.");
  }

  console.log("\nSeed completado");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
