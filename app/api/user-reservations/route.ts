import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSupabaseSession } from '@/lib/supabase/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { user } = await getSupabaseSession(req);
    if (!user) {
      return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
    }

    const userId = user.id;

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