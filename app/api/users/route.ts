import { NextResponse } from 'next/server';
import { PrismaClient, Role } from '@prisma/client';
import { getServerSession } from '@/lib/auth'; // CAMBIO AQUÍ

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const session = await getServerSession(); // CAMBIO AQUÍ

  if (!session || session.user.role !== Role.SUPERUSER) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    console.error('Error al obtener los usuarios:', error);
    return NextResponse.json({ error: 'No se pudo obtener la lista de usuarios.' }, { status: 500 });
  }
}