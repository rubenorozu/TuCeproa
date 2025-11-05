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

  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  const where: any = { userId };

  if (start && end) {
    where.startTime = { gte: new Date(start) };
    where.endTime = { lte: new Date(end) };
  }

  try {
    const reservations = await prisma.reservation.findMany({
      where,
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

import { generateDisplayId } from '@/lib/displayId';

export async function POST(request: Request) {
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
    const body = await request.json();
    const { items, startTime, endTime, justification, subject, coordinator, teacher } = body;

    if (!items || items.length === 0 || !startTime || !endTime || !justification || !subject || !coordinator || !teacher) {
      return NextResponse.json({ message: 'Faltan campos requeridos o el carrito está vacío.' }, { status: 400 });
    }

    const createdReservations = await prisma.$transaction(async (tx) => {
      const displayId = await generateDisplayId(tx, userId);
      const cartSubmissionId = crypto.randomUUID(); // Generate this on the server

      const reservationPromises = items.map((item: { id: string, type: string }) => {
        const data: any = {
          displayId,
          cartSubmissionId,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          justification,
          subject,
          coordinator,
          teacher,
          status: 'PENDING',
          userId: userId,
        };

        if (item.type === 'space') {
          data.spaceId = item.id;
        } else {
          data.equipmentId = item.id;
        }
        
        return tx.reservation.create({ data });
      });

      return Promise.all(reservationPromises);
    });

    return NextResponse.json(createdReservations, { status: 201 });

  } catch (error) {
    console.error("Error creating user reservation batch:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
