async function main() {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.com', password: '123456' })
  });
  const login = await loginRes.json();
  const token = login.data.token;
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  // Create new order
  const iniRes = await fetch('http://localhost:3000/api/pedidos/iniciar', {
    method: 'POST', headers,
    body: JSON.stringify({ mesa_id: 11 })
  });
  const iniText = await iniRes.text();
  console.log('Init raw:', iniText.substring(0, 300));
  const ini = JSON.parse(iniText);
  const pedidoId = ini.data?.id || ini.data?.pedido?.id;
  console.log('New pedido ID:', pedidoId);

  // Add item
  const addRes = await fetch('http://localhost:3000/api/pedidos/agregar-item', {
    method: 'POST', headers,
    body: JSON.stringify({ pedido_id: pedidoId, producto_id: 26, cantidad: 2 })
  });
  const add = await addRes.json();
  console.log('Item added. Total: $' + add.data.total);

  // Mark as delivered (needed before payment)
  const entRes = await fetch('http://localhost:3000/api/pedidos/entregar', {
    method: 'POST', headers,
    body: JSON.stringify({ pedido_id: pedidoId })
  });
  const ent = await entRes.json();
  console.log('Delivered:', ent.data.estado);

  // Divide into 3 personas
  const divRes = await fetch('http://localhost:3000/api/pagos/dividir-equitativo', {
    method: 'POST', headers,
    body: JSON.stringify({ pedido_id: pedidoId, personas: 3, metodo: 'efectivo', propina_pct: 10 })
  });
  const text = await divRes.text();
  console.log('Division raw:', text.substring(0, 500));
  const div = JSON.parse(text);
  console.log('Success:', div.success);
  if (div.success) {
    console.log('  Pagos created:', div.data.pagos.length);
    div.data.pagos.forEach((p, i) => console.log(`  Pago ${i+1}: id=${p.id} monto=${p.monto}`));
    console.log('  Subtotal:', div.data.subtotal, 'Tip:', div.data.propina, 'Total:', div.data.total);
  }
}
main();