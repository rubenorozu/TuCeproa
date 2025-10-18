import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
    }

    const userId = session.user.id;

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