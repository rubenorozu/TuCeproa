import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Esta ruta obtiene los recursos que el usuario puede ver según las políticas de RLS (comportamiento original).
// Sirve como respaldo si la ruta privilegiada (/api/admin/all-resources) falla.
export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Estas consultas utilizan el cliente de Prisma estándar y respetarán el RLS.
    const spaces = await prisma.space.findMany({
      orderBy: { name: 'asc' },
    });
    const equipment = await prisma.equipment.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ spaces, equipment });
  } catch (error) {
    console.error("Error fetching standard resources (fallback):", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
