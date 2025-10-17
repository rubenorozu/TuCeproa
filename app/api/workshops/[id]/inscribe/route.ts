import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { InscriptionStatus } from '@prisma/client';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
  }

  const userId = session.user.id;
  const workshopId = params.id;

  try {
    // Check if the user is already inscribed in this workshop
    const existingInscription = await prisma.inscription.findFirst({
      where: {
        userId: userId,
        workshopId: workshopId,
      },
    });

    if (existingInscription) {
      return NextResponse.json({ message: 'Ya estás inscrito en este taller.' }, { status: 409 });
    }

    // Create the inscription
    const inscription = await prisma.inscription.create({
      data: {
        userId: userId,
        workshopId: workshopId,
        status: InscriptionStatus.PENDING, // Default status
      },
    });

    return NextResponse.json(inscription, { status: 201 });
  } catch (error) {
    console.error('Error al inscribirse en el taller:', error);
    return NextResponse.json({ message: 'Algo salió mal al inscribirse en el taller.' }, { status: 500 });
  }
}
