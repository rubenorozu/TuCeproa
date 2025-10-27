
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { InscriptionStatus } from '@prisma/client';

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Debes iniciar sesión para inscribirte.' }, { status: 401 });
  }

  try {
    const { workshopId, isExtraordinary } = await req.json();
    const userId = session.user.id;

    const workshop = await prisma.workshop.findUnique({
      where: { id: workshopId },
      include: { _count: { select: { inscriptions: true } } },
    });

    if (!workshop) {
      return NextResponse.json({ error: 'Taller no encontrado.' }, { status: 404 });
    }

    // Verificar si las inscripciones están abiertas según inscriptionsStartDate
    if (workshop.inscriptionsStartDate && new Date() < new Date(workshop.inscriptionsStartDate)) {
      return NextResponse.json({ error: 'Las inscripciones para este taller aún no han comenzado.' }, { status: 403 });
    }

    // Verificar capacidad
    if (workshop.capacity > 0 && workshop._count.inscriptions >= workshop.capacity) {
      return NextResponse.json({ error: 'El taller ya ha alcanzado su capacidad máxima.' }, { status: 409 });
    }

    // Verificar si el usuario ya está inscrito
    const existingInscription = await prisma.inscription.findUnique({
      where: { workshopId_userId: { workshopId, userId } },
    });

    if (existingInscription) {
      return NextResponse.json({ error: 'Ya estás inscrito en este taller.' }, { status: 409 });
    }

    // Verificar el límite de inscripciones activas
    const activeInscriptions = await prisma.inscription.findMany({
      where: {
        userId,
        status: {
          in: [InscriptionStatus.PENDING, InscriptionStatus.APPROVED],
        },
      },
      include: {
        workshop: {
          select: {
            endDate: true,
          },
        },
      },
    });

    const now = new Date();
    const currentActiveInscriptionsCount = activeInscriptions.filter(inscription => {
      // Si el estado es PENDING, siempre está activo.
      if (inscription.status === InscriptionStatus.PENDING) {
        return true;
      }
      // Si el estado es APPROVED, está activo solo si la fecha de fin del taller está en el futuro o es nula.
      if (inscription.status === InscriptionStatus.APPROVED) {
        return !inscription.workshop.endDate || new Date(inscription.workshop.endDate) > now;
      }
      return false; // No debería ocurrir
    }).length;

    if (currentActiveInscriptionsCount >= 3) {
      if (isExtraordinary) {
        const limitSetting = await prisma.systemSettings.findUnique({
          where: { key: 'extraordinaryInscriptionLimit' },
        });
        const limit = limitSetting ? parseInt(limitSetting.value, 10) : 0;

        const extraordinaryInscriptionsCount = await prisma.inscription.count({
          where: {
            userId,
            status: InscriptionStatus.PENDING_EXTRAORDINARY,
          },
        });

        if (extraordinaryInscriptionsCount >= limit) {
          return NextResponse.json({ error: `Ya has alcanzado el límite de ${limit} solicitudes de inscripción extraordinarias.` }, { status: 403 });
        }

        const inscription = await prisma.inscription.create({
          data: {
            workshopId,
            userId,
            status: InscriptionStatus.PENDING_EXTRAORDINARY,
          },
        });
        return NextResponse.json(inscription, { status: 201 });
      }
      return NextResponse.json({ error: 'Ya tienes el máximo de 3 inscripciones activas (pendientes o aprobadas). Por favor, espera a que se resuelvan las actuales.', limitReached: true }, { status: 403 });
    }

    // Crear la inscripción
    const inscription = await prisma.inscription.create({
      data: {
        workshopId,
        userId,
      },
    });

    return NextResponse.json(inscription, { status: 201 });

  } catch (error) {
    console.error('Error al crear la inscripción:', error);
    return NextResponse.json({ error: 'No se pudo procesar la inscripción.' }, { status: 500 });
  }
}
