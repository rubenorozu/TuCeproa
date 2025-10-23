import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from '@/lib/auth';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma'; // Import singleton Prisma client


interface UserPayload {
  userId: string;
  role: string;
  iat: number;
  exp: number;
}

export async function GET() {
  const cookieStore = cookies();
  const tokenCookie = cookieStore.get('session');

  if (!tokenCookie) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  let userId: string;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify<UserPayload>(tokenCookie.value, secret);
    userId = payload.userId;
  } catch (err) {
    return NextResponse.json({ error: 'La sesión no es válida.' }, { status: 401 });
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(notifications, { status: 200 });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'No se pudieron obtener las notificaciones.' }, { status: 500 });
  }
}