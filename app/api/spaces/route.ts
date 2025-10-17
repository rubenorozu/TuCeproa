import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const whereClause: Prisma.SpaceWhereInput = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { displayId: { not: null, contains: search } },
      ];
    }

    const spaces = await prisma.space.findMany({
      where: whereClause,
      include: { images: true }, // Incluir las imágenes relacionadas
    });
    return NextResponse.json(spaces);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
}
