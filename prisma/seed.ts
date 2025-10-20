import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs'; // Importar bcryptjs

const prisma = new PrismaClient();

async function main() {
  const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com';
  const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'password123';
  const defaultAdminFirstName = process.env.DEFAULT_ADMIN_FIRST_NAME || 'Super';
  const defaultAdminLastName = process.env.DEFAULT_ADMIN_LAST_NAME || 'Admin';

  // Verificar si ya existe un superusuario con el email predeterminado
  const existingAdmin = await prisma.user.findUnique({
    where: { email: defaultAdminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(defaultAdminPassword, 10);

    await prisma.user.create({
      data: {
        email: defaultAdminEmail,
        password: hashedPassword,
        firstName: defaultAdminFirstName,
        lastName: defaultAdminLastName,
        role: Role.SUPERUSER,
        isVerified: true, // Asumimos que el admin por defecto está verificado
        identifier: defaultAdminEmail,
      },
    });
    console.log(`Superusuario creado: ${defaultAdminEmail}`);
  } else {
    console.log(`Superusuario ya existe: ${defaultAdminEmail}`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });