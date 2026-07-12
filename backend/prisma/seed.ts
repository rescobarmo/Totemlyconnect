import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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

  console.log("\n✅ Seed completado");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
