import { NextResponse } from 'next/server';
import { PrismaClient, Role } from '@prisma/client';
import { getSupabaseSession } from '@/lib/supabase/utils';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { user } = await getSupabaseSession(request); // CAMBIO AQUÍ

  if (!user || user.role !== Role.SUPERUSER) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
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