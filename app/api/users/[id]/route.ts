import { NextResponse } from 'next/server';
import { Role } from '@prisma/client'; // Keep Role import
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma'; // Import singleton Prisma client

interface UserPayload {
  userId: string;
  role: string;
  iat: number;
  exp: number;
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const tokenCookie = cookieStore.get('session');

  if (!tokenCookie) {
    return NextResponse.json({ error: 'Acceso denegado. Se requiere autenticación.' }, { status: 401 });
  }

  let userPayload: UserPayload;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify<UserPayload>(tokenCookie.value, secret);
    userPayload = payload;
  } catch (err) {
    return NextResponse.json({ error: 'La sesión no es válida.' }, { status: 401 });
  }

  if (userPayload.role !== Role.SUPERUSER) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario.' }, { status: 403 });
  }

  const userIdToDelete = params.id;

  if (userPayload.userId === userIdToDelete) {
    return NextResponse.json({ error: 'Un superusuario no puede eliminarse a sí mismo.' }, { status: 400 });
  }

  try {
    await prisma.user.delete({
      where: {
        id: userIdToDelete,
      },
    });

    return NextResponse.json({ message: 'Usuario eliminado correctamente.' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar el usuario:', error);
    return NextResponse.json({ error: 'No se pudo eliminar el usuario. Es posible que tenga registros asociados (como reservas) que deben ser eliminados o reasignados primero.' }, { status: 500 });
  }
}