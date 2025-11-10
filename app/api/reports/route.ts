import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { description, resourceId, resourceType, userId } = await request.json();

    if (!description || !resourceId || !resourceType || !userId) {
      return NextResponse.json({ error: 'Faltan datos en la solicitud' }, { status: 400 });
    }

    if (session.user.id !== userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Generate reportIdCode
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const datePart = `${year}${month}${day}`;

    // Fetch user's last name from the database
    const reportingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { lastName: true },
    });

    const userLastName = reportingUser?.lastName?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'UNKNOWN';

    // Get and increment daily report counter
    const reportCounter = await prisma.reportCounter.upsert({
      where: { date: datePart },
      update: { lastNumber: { increment: 1 } },
      create: { date: datePart, lastNumber: 1 },
    });

    const sequenceNumber = reportCounter.lastNumber.toString().padStart(4, '0');

    const reportIdCode = `RP_${datePart}_${userLastName}_${sequenceNumber}`;

    let data: any = {
      description,
      userId,
      reportIdCode, // Add the generated code
    };

    if (resourceType === 'space') {
      data.spaceId = resourceId;
    } else if (resourceType === 'equipment') {
      data.equipmentId = resourceId;
    } else if (resourceType === 'workshop') {
      data.workshopId = resourceId;
    } else {
      return NextResponse.json({ error: 'Tipo de recurso inválido' }, { status: 400 });
    }

    const report = await prisma.report.create({ data });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error('Error al crear el reporte:', error);
    return NextResponse.json({ error: 'No se pudo crear el reporte.' }, { status: 500 });
  }
}