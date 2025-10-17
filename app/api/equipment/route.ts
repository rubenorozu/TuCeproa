import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const whereClause: Prisma.EquipmentWhereInput = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { serialNumber: { contains: search } },
        { fixedAssetId: { contains: search } },
        { displayId: { not: null, contains: search } },
      ];
    }

    const equipment = await prisma.equipment.findMany({
      where: whereClause,
      include: { images: true }, // Incluir las imágenes relacionadas
    });
    console.log('DEBUG API: Datos de equipos devueltos:', equipment);
    return NextResponse.json(equipment);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
}
