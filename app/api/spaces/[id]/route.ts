import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params; // Await params as per Next.js docs

    const space = await prisma.space.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        images: true,
        reservationLeadTime: true, // NEW: Include reservationLeadTime
        requiresSpaceReservationWithEquipment: true, // NEW: Include this field
        responsibleUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!space) {
      return NextResponse.json({ message: 'Space not found' }, { status: 404 });
    }

    return NextResponse.json(space);
  } catch (error: unknown) {
    console.error('Error fetching space details:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
}