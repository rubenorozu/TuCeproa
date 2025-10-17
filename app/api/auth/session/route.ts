
import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  try {
    // Obtener más detalles del usuario desde la base de datos si es necesario
    const userDetails = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, firstName: true, lastName: true, role: true }, // Seleccionar los campos necesarios
    });

    if (!userDetails) {
      // Esto no debería pasar si la sesión es válida, pero es una buena comprobación
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({ user: userDetails }, { status: 200 });
  } catch (error) {
    console.error('Error al obtener detalles del usuario para la sesión:', error);
    return NextResponse.json({ error: 'Error al obtener la sesión del usuario.' }, { status: 500 });
  }
}
