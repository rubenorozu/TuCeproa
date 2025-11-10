
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import readline from 'readline';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno desde .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => {
  return new Promise(resolve => rl.question(query, resolve));
};

async function main() {
  console.log('--- Creación de Superusuario ---');

  const firstName = await askQuestion('Nombre: ');
  if (!firstName) {
    console.error('El nombre es obligatorio.');
    rl.close();
    return;
  }

  const lastName = await askQuestion('Apellidos: ');
  if (!lastName) {
    console.error('Los apellidos son obligatorios.');
    rl.close();
    return;
  }

  const email = await askQuestion('Email: ');
  if (!email) {
    console.error('El email es obligatorio.');
    rl.close();
    return;
  }

  const password = await askQuestion('Contraseña: ');
  if (!password) {
    console.error('La contraseña es obligatoria.');
    rl.close();
    return;
  }

  const identifier = await askQuestion('Identificador (DNI/CUI): ');
  if (!identifier) {
    console.error('El identificador es obligatorio.');
    rl.close();
    return;
  }

  rl.close();

  try {
    console.log('Creando usuario...');

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        identifier,
        role: 'SUPERUSER',
        isVerified: true, // Superusers should be verified by default
      },
    });

    console.log('✅ ¡Superusuario creado exitosamente!');
    console.log(JSON.stringify(user, null, 2));

  } catch (error) {
    console.error('❌ Error al crear el superusuario:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
        console.error('El correo electrónico ya está en uso.');
    } else if (error.code === 'P2002' && error.meta?.target?.includes('identifier')) {
        console.error('El identificador ya está en uso.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
