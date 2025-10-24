import { jwtVerify } from 'jose';
import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers'; // Add missing import
import { getServerSession } from '@/lib/auth'; // Fix syntax error
import { prisma } from '@/lib/prisma'; // Import singleton Prisma client

interface UserPayload {
  userId: string;
  role: string;
  iat: number;
  exp: number;
}

export async function GET(request: Request) {
  const cookieStore = cookies();
  const tokenCookie = cookieStore.get('session');

  if (!tokenCookie) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 401 });
  }

  let userPayload: UserPayload;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify<UserPayload>(tokenCookie.value, secret);
    userPayload = payload;
  } catch (err) {
    return NextResponse.json({ error: 'La sesión no es válida.' }, { status: 401 });
  }

  if (userPayload.role !== Role.SUPERUSER) {
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