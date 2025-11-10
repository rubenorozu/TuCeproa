import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function GET() {
  try {
    const settings = await prisma.systemSettings.findMany();
    const settingsObject = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as { [key: string]: string });
    return NextResponse.json(settingsObject);
  } catch (error) {
    console.error('Error al obtener la configuración:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'No se pudo obtener la configuración. Por favor, revisa la conexión a la base de datos.', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session || session.user.role !== Role.SUPERUSER) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const body = await request.json();
  const { extraordinaryInscriptionLimit, reservationLeadTime } = body;

  try {
    if (extraordinaryInscriptionLimit !== undefined) {
      await prisma.systemSettings.upsert({
        where: { key: 'extraordinaryInscriptionLimit' },
        update: { value: extraordinaryInscriptionLimit.toString() },
        create: { key: 'extraordinaryInscriptionLimit', value: extraordinaryInscriptionLimit.toString() },
      });
    }

    if (reservationLeadTime !== undefined) {
      await prisma.systemSettings.upsert({
        where: { key: 'reservationLeadTime' },
        update: { value: reservationLeadTime.toString() },
        create: { key: 'reservationLeadTime', value: reservationLeadTime.toString() },
      });
    }

    return NextResponse.json({ message: 'Configuración actualizada correctamente.' });
  } catch (error) {
    console.error('Error al actualizar la configuración:', error);
    return NextResponse.json({ error: 'No se pudo actualizar la configuración.' }, { status: 500 });
  }
}
