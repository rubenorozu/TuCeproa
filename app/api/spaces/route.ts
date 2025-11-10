import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  console.log('--- API SPACES: Request received ---');
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    console.log('--- API SPACES: Search term ---', search);

    const whereClause: Prisma.SpaceWhereInput = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { displayId: { not: null, contains: search } },
      ];
    }
    console.log('--- API SPACES: Where clause ---', whereClause);

    const spaces = await prisma.space.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        description: true,
        displayId: true,
        images: true, // This is a relation, so it's fine here
        reservationLeadTime: true, // Now correctly selected as a scalar field
        requiresSpaceReservationWithEquipment: true, // NEW: Include this field
        _count: { select: { equipments: true } }, // This is also fine here
      },
    });
    console.log('--- API SPACES: Fetched spaces ---', spaces.length);
    return NextResponse.json(spaces);
  } catch (error) {
    console.error('--- API SPACES: CATCH BLOCK ---', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
}
