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
    await prisma.$transaction(async (tx) => {
      // Nullify responsible user fields
      await tx.space.updateMany({
        where: { responsibleUserId: userIdToDelete },
        data: { responsibleUserId: null },
      });
      await tx.equipment.updateMany({
        where: { responsibleUserId: userIdToDelete },
        data: { responsibleUserId: null },
      });
      await tx.workshop.updateMany({
        where: { responsibleUserId: userIdToDelete },
        data: { responsibleUserId: null },
      });

      // Delete dependent records
      await tx.notification.deleteMany({
        where: { recipientId: userIdToDelete },
      });
      await tx.inscription.deleteMany({
        where: { userId: userIdToDelete },
      });
      await tx.reservation.deleteMany({
        where: { userId: userIdToDelete },
      });
      
      // Finally, delete the user
      await tx.user.delete({
        where: { id: userIdToDelete },
      });
    });

    return NextResponse.json({ message: 'Usuario y todos sus registros asociados han sido eliminados correctamente.' }, { status: 200 });

  } catch (error) {
    console.error('Error al eliminar el usuario y sus registros asociados:', error);
    if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code === 'P2003') {
         return NextResponse.json({ error: 'Error de integridad de datos. No se pudieron eliminar todos los registros asociados.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'No se pudo completar la eliminación del usuario.' }, { status: 500 });
  }
}