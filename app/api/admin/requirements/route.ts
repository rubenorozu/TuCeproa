
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function GET() {
  const session = await getServerSession();

  if (!session || session.user.role !== Role.SUPERUSER) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  try {
    const requirements = await prisma.requirement.findMany();
    return NextResponse.json(requirements);
  } catch (error) {
    console.error('Error al obtener los requisitos:', error);
    return NextResponse.json({ error: 'No se pudieron obtener los requisitos.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession();

  if (!session || session.user.role !== Role.SUPERUSER) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const body = await request.json();
  const { name } = body;

  if (!name) {
    return NextResponse.json({ error: 'El nombre es requerido.' }, { status: 400 });
  }

  try {
    const requirement = await prisma.requirement.create({
      data: { name },
    });
    return NextResponse.json(requirement, { status: 201 });
  } catch (error) {
    console.error('Error al crear el requisito:', error);
    return NextResponse.json({ error: 'No se pudo crear el requisito.' }, { status: 500 });
  }
}
