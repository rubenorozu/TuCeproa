
import { Role } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma'; // Import singleton Prisma client

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();

  if (!session || session.user.role !== Role.SUPERUSER) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario.' }, { status: 403 });
  }

  const userIdToReset = params.id;

  try {
    const { newPassword } = await request.json();

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedUser = await prisma.user.update({
      where: { id: userIdToReset },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ message: `Contraseña del usuario ${updatedUser.email} restablecida correctamente.` }, { status: 200 });
  } catch (error) {
    console.error('Error al restablecer la contraseña:', error);
    if (typeof error === 'object' && error !== null && 'code' in error && (error as PrismaClientKnownRequestError).code === 'P2025') {
      return NextResponse.json({ error: 'Usuario no encontrado para restablecer la contraseña.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'No se pudo restablecer la contraseña.' }, { status: 500 });
  }
}
