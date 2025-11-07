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
      include: { 
        images: true, 
        _count: { select: { equipments: true } } 
      }, // Incluir imágenes y contador de equipos
    });
    console.log('--- API SPACES: Fetched spaces ---', spaces.length);
    return NextResponse.json(spaces);
  } catch (error) {
    console.error('--- API SPACES: CATCH BLOCK ---', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
}
