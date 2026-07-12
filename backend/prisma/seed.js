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
  // Crear restaurante demo
  const restaurant = await prisma.restaurant.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, nombre: "MiniFood Demo", direccion: "Av. Principal 123", telefono: "+56 9 1234 5678" },
  });
  console.log("Restaurante creado:", restaurant.nombre);

  // Migrar datos existentes (de schema anterior sin restaurante) al restaurante demo
  const { count: mesasMigrated } = await prisma.mesa.updateMany({
    where: { restaurantId: null },
    data: { restaurantId: restaurant.id },
  });
  if (mesasMigrated > 0) console.log(`Mesas migradas: ${mesasMigrated}`);

  const { count: catsMigrated } = await prisma.categoria.updateMany({
    where: { restaurantId: null },
    data: { restaurantId: restaurant.id },
  });
  if (catsMigrated > 0) console.log(`Categorías migradas: ${catsMigrated}`);

  const { count: prodsMigrated } = await prisma.producto.updateMany({
    where: { restaurantId: null },
    data: { restaurantId: restaurant.id },
  });
  if (prodsMigrated > 0) console.log(`Productos migrados: ${prodsMigrated}`);

  const { count: pedidosMigrated } = await prisma.pedido.updateMany({
    where: { restaurantId: null },
    data: { restaurantId: restaurant.id },
  });
  if (pedidosMigrated > 0) console.log(`Pedidos migrados: ${pedidosMigrated}`);

  const { count: usersMigrated } = await prisma.user.updateMany({
    where: { restaurantId: null },
    data: { restaurantId: restaurant.id },
  });
  if (usersMigrated > 0) console.log(`Usuarios migrados: ${usersMigrated}`);

  const admin = await prisma.user.upsert({
    where: { restaurantId_email: { restaurantId: restaurant.id, email: "admin@minifood.com" } },
    update: {},
    create: {
      name: "Admin",
      email: "admin@minifood.com",
      password: await bcrypt.hash("123456", 10),
      role: "admin",
      restaurantId: restaurant.id,
    },
  });
  console.log("Admin creado:", admin.email);

  const mesero = await prisma.user.upsert({
    where: { restaurantId_email: { restaurantId: restaurant.id, email: "mesero@minifood.com" } },
    update: {},
    create: {
      name: "Mesero Demo",
      email: "mesero@minifood.com",
      password: await bcrypt.hash("123456", 10),
      role: "mesero",
      restaurantId: restaurant.id,
    },
  });
  console.log("Mesero creado:", mesero.email);

  for (let i = 1; i <= 10; i++) {
    await prisma.mesa.upsert({
      where: { restaurantId_numero: { restaurantId: restaurant.id, numero: i } },
      update: {},
      create: { numero: i, estado: "libre", restaurantId: restaurant.id },
    });
  }
  console.log("10 mesas creadas");

  const catCount = await prisma.categoria.count({ where: { restaurantId: restaurant.id } });
  if (catCount === 0) {
    for (const cat of categoriasData) {
      const created = await prisma.categoria.create({
        data: { nombre: cat.nombre, icono: cat.icono, activo: true, restaurantId: restaurant.id },
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
            restaurantId: restaurant.id,
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
