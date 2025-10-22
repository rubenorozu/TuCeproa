import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSupabaseSession } from '@/lib/supabase/utils';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { user } = await getSupabaseSession();

  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: { recipientId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(notifications, { status: 200 });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'No se pudieron obtener las notificaciones.' }, { status: 500 });
  }
}