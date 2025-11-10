import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { Role } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns'; // Import date-fns utilities

export async function GET(request: Request) {
  const session = await getServerSession();

  if (!session || session.user.role !== Role.SUPERUSER) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const recurringBlockIdsParam = searchParams.get('recurringBlockIds'); // Changed to recurringBlockIds
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  const where: any = {};
  if (recurringBlockIdsParam) {
    const recurringBlockIds = recurringBlockIdsParam.split(',');
    where.recurringBlockId = { in: recurringBlockIds }; // Use 'in' for multiple IDs
  }
  if (start && end) {
    where.exceptionDate = {
      gte: startOfDay(new Date(start)), // Use startOfDay
      lte: endOfDay(new Date(end)),     // Use endOfDay
    };
  }

  try {
    const exceptions = await prisma.recurringBlockException.findMany({
      where,
    });
    return NextResponse.json(exceptions);
  } catch (error) {
    console.error('Error al obtener las excepciones de bloqueo recurrente:', error);
    return NextResponse.json({ error: 'No se pudieron obtener las excepciones de bloqueo recurrente.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession();

  if (!session || session.user.role !== Role.SUPERUSER) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const body = await request.json();
  const { recurringBlockId, exceptionDate, exceptionStartTime, exceptionEndTime } = body;

  if (!recurringBlockId || !exceptionDate || !exceptionStartTime || !exceptionEndTime) {
    return NextResponse.json({ error: 'Faltan campos requeridos para la excepción.' }, { status: 400 });
  }

  try {
    const newException = await prisma.recurringBlockException.create({
      data: {
        recurringBlockId,
        exceptionDate: new Date(exceptionDate),
        exceptionStartTime,
        exceptionEndTime,
      },
    });
    return NextResponse.json(newException, { status: 201 });
  } catch (error) {
    console.error('Error al crear la excepción de bloqueo recurrente:', error);
    return NextResponse.json({ error: 'No se pudo crear la excepción de bloqueo recurrente.' }, { status: 500 });
  }
}
