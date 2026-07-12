async function main() {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.com', password: '123456' })
  });
  const login = await loginRes.json();
  const token = login.data.token;

  const res = await fetch('http://localhost:3000/api/pedidos/2', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const text = await res.text();
  console.log('STATUS:', res.status);
  console.log('TEXT:', text.substring(0, 500));
}
main();