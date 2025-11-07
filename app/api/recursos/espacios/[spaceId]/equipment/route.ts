import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: { spaceId: string } }) {
  const { spaceId } = params;

  if (!spaceId) {
    return NextResponse.json({ error: 'Space ID is required' }, { status: 400 });
  }

  try {
    const equipmentInSpace = await prisma.equipment.findMany({
      where: {
        spaceId: spaceId,
      },
      include: {
        images: true, // Include images so the cards can display them
      },
              orderBy: {
                name: 'asc', // Sort by name in ascending order
              },
            });
            console.log('--- API BACKEND: Sending equipment data ---', equipmentInSpace);
            return NextResponse.json(equipmentInSpace);  } catch (error) {
    console.error(`Error fetching equipment for space ${spaceId}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
