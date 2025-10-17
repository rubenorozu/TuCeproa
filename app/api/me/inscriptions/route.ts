
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Debes iniciar sesión para ver tus inscripciones.' }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    const inscriptions = await prisma.inscription.findMany({
      where: { userId },
      include: {
        workshop: {
          include: {
            images: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(inscriptions, { status: 200 });

  } catch (error) {
    console.error('Error al obtener las inscripciones:', error);
    return NextResponse.json({ error: 'No se pudieron obtener las inscripciones.' }, { status: 500 });
  }
}
