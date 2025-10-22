import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs'; // Importar bcryptjs

const prisma = new PrismaClient();

async function main() {
  const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com';
  const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'password123';
  const defaultAdminFirstName = process.env.DEFAULT_ADMIN_FIRST_NAME || 'Super';
  const defaultAdminLastName = process.env.DEFAULT_ADMIN_LAST_NAME || 'Admin';
  const defaultAdminIdentifier = process.env.DEFAULT_ADMIN_IDENTIFIER;
  const defaultAdminPhoneNumber = process.env.DEFAULT_ADMIN_PHONE_NUMBER;

  // Verificar si ya existe un superusuario con el email proporcionado en las variables de entorno
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
        identifier: defaultAdminIdentifier || defaultAdminEmail,
        phoneNumber: defaultAdminPhoneNumber,
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