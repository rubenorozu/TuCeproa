import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

export const dynamic = 'force-dynamic';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Authorization token missing or invalid' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { payload } = await jwtVerify(token, secret);
    const userRole = payload.role as string;

    if (userRole !== 'SUPERUSER') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const reservations = await prisma.reservation.findMany({
      where: {
        status: {
          in: ['APPROVED', 'REJECTED', 'PARTIALLY_APPROVED'],
        },
      },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
        space: true,
        equipment: true,
        approvedByUser: { select: { firstName: true, lastName: true, email: true } },
        documents: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(reservations);
  } catch (error) {
    console.error('Error fetching reviewed reservations:', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
}
