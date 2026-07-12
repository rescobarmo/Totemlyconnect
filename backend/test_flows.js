const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
  console.log("--- SEEDING DATA ---");
  const passwordHash = await bcrypt.hash('123456', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: { password: passwordHash, role: 'admin' },
    create: { name: 'Admin Test', email: 'admin@test.com', password: passwordHash, role: 'admin' }
  });
  console.log("Admin user ready:", admin.email);

  let category = await prisma.categoria.findFirst({ where: { nombre: 'Test Category' } });
  if (!category) {
    category = await prisma.categoria.create({ data: { nombre: 'Test Category', activo: true } });
  }

  let product = await prisma.producto.findFirst({ where: { nombre: 'Test Burger' } });
  if (!product) {
    product = await prisma.producto.create({
      data: { nombre: 'Test Burger', precio: 5000, categoriaId: category.id, activo: true }
    });
  }
  console.log("Product ready:", product.nombre, "($", product.precio, ")");

  let mesa = await prisma.mesa.findUnique({ where: { numero: 999 } });
  if (!mesa) {
    mesa = await prisma.mesa.create({ data: { numero: 999, estado: 'libre' } });
  } else {
    // reset if not free
    await prisma.mesa.update({ where: { id: mesa.id }, data: { estado: 'libre' } });
  }
  console.log("Mesa ready:", mesa.numero);
  
  await prisma.$disconnect();

  console.log("\n--- TESTING API FLOWS ---");
  const BASE_URL = 'http://localhost:3000/api';
  let token = '';

  const request = async (endpoint, method = 'GET', body = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    
    const res = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(`API Error [${method} ${endpoint}]: ${JSON.stringify(data)}`);
    }
    return data.data;
  };

  try {
    // 1. Login
    console.log("1. Logging in...");
    const loginRes = await request('/auth/login', 'POST', { email: 'admin@test.com', password: '123456' });
    token = loginRes.token;
    console.log("   Token received!");

    // 2. Start Order
    console.log("2. Starting order for Mesa 999...");
    const order = await request('/pedidos/iniciar', 'POST', { mesa_id: mesa.id });
    console.log("   Order created/found:", order.id);

    // 3. Add Item
    console.log("3. Adding 'Test Burger' to order...");
    const addRes = await request('/pedidos/agregar-item', 'POST', { 
      pedido_id: order.id, 
      producto_id: product.id, 
      cantidad: 2 
    });
    console.log(`   Added item. New total: $${addRes.total}`);

    // 4. Deliver Order
    console.log("4. Marking order as delivered...");
    const deliverRes = await request('/pedidos/entregar', 'POST', { pedido_id: order.id });
    console.log(`   Order status: ${deliverRes.estado}`);

    // 5. Make Payment (División equitativa 1 persona)
    console.log("5. Registering payment (dividir equitativo - 1 person)...");
    const divRes = await request('/pagos/dividir-equitativo', 'POST', { 
      pedido_id: order.id, 
      personas: 1, 
      metodo: 'efectivo',
      propina_pct: 10
    });
    console.log(`   Divided into ${divRes.pagos.length} payment(s).`);

    // Procesar el primer pago
    const pagoId = divRes.pagos[0].id;
    console.log(`   Processing payment ID ${pagoId}...`);
    const procesarRes = await request('/pagos/procesar', 'POST', { pago_id: pagoId });
    console.log(`   Payment processed: ${procesarRes.estado}`);

    // Cerrar cuenta
    console.log("   Closing order...");
    const cerrarRes = await request('/pagos/cerrar-cuenta', 'POST', { pedido_id: order.id });
    console.log(`   Order status after closing: ${cerrarRes.estado}`);

    // 6. Check Admin Sales
    console.log("6. Checking sales report...");
    const salesRes = await request('/pedidos/ventas', 'GET');
    console.log(`   Total sales found: ${salesRes.cantidad} orders, Total revenue: $${salesRes.total_ventas}`);

    console.log("\n✅ ALL TESTS PASSED SUCCESSFULLY!");

  } catch (err) {
    console.error("\n❌ TEST FAILED:");
    console.error(err.message);
  }
}

main();