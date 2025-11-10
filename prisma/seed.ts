import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs'; // Importar bcryptjs
import * as dotenv from 'dotenv'; // Importar dotenv

dotenv.config({ path: '.env.local' }); // Cargar variables de entorno desde .env.local

const prisma = new PrismaClient();

async function main() {
  const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com';
  const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'password123';
  const defaultAdminFirstName = process.env.DEFAULT_ADMIN_FIRST_NAME || 'Super';
  const defaultAdminLastName = process.env.DEFAULT_ADMIN_LAST_NAME || 'Admin';
  const defaultAdminIdentifier = process.env.DEFAULT_ADMIN_IDENTIFIER;
  const defaultAdminPhoneNumber = process.env.DEFAULT_ADMIN_PHONE_NUMBER;

  console.log('--- Iniciando script de seed ---');
  console.log(`DATABASE_URL en seed: ${process.env.DATABASE_URL ? 'Cargada' : 'NO CARGADA'}`);
  console.log(`Intentando crear/verificar superusuario con email: ${defaultAdminEmail}`);
  console.log(`Contraseña (sin hash): ${defaultAdminPassword}`);

  try {
    // Verificar si ya existe un superusuario con el email proporcionado en las variables de entorno
    const existingAdmin = await prisma.user.findUnique({
      where: { email: defaultAdminEmail },
    });

    if (!existingAdmin) {
      console.log('Superusuario no encontrado, procediendo a crear...');
      const hashedPassword = await bcrypt.hash(defaultAdminPassword, 10);
      console.log(`Contraseña hasheada: ${hashedPassword}`);

      const user = await prisma.user.create({
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
      console.log(`Superusuario '${user.email}' creado exitosamente.`);
    } else {
      console.log(`Superusuario '${existingAdmin.email}' ya existe.`);
    }

    // Crear o actualizar el tiempo de antelación de la reserva
    await prisma.systemSettings.upsert({
      where: { key: 'reservationLeadTime' },
      update: {},
      create: {
        key: 'reservationLeadTime',
        value: '24', // en horas
      },
    });

    console.log('Ajuste de tiempo de antelación de reserva asegurado.');
  } catch (e: any) {
    console.error('Error durante la ejecución del seed:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();