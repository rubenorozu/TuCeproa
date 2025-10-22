import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

interface UserPayload {
  userId: string;
  role: string;
  iat: number;
  exp: number;
}

export async function GET(req: Request) {
  const cookieStore = cookies();
  const tokenCookie = cookieStore.get('session');

  if (!tokenCookie) {
    return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
  }

  let userId: string;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify<UserPayload>(tokenCookie.value, secret);
    userId = payload.userId;
  } catch (err) {
    return NextResponse.json({ message: 'La sesión no es válida.' }, { status: 401 });
  }

  try {
    const reservations = await prisma.reservation.findMany({
      where: { userId },
      include: {
        space: {
          select: { name: true }
        },
        equipment: {
          select: { name: true }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(reservations);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
}