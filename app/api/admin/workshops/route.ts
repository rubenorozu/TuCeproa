
import { NextResponse } from 'next/server';
import { PrismaClient, Role, Prisma } from '@prisma/client';
import { getServerSession } from '@/lib/auth';

const prisma = new PrismaClient();

// Helper function to generate a random alphanumeric string
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// GET: Listar todos los talleres
export async function GET(request: Request) {
  const session = await getServerSession();

  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario o Administrador de Recursos.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const whereClause: Prisma.WorkshopWhereInput = {};

    if (session.user.role === Role.ADMIN_RESOURCE) {
      whereClause.responsibleUserId = session.user.id;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { teacher: { contains: search } },
        { displayId: { not: null, contains: search } },
        {
          responsibleUser: {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
            ],
          },
        },
      ];
    }

    const workshops = await prisma.workshop.findMany({
      where: whereClause,
      include: {
        images: true,
        responsibleUser: {
          select: {
            firstName: true,
            lastName: true,
          }
        },
        sessions: true, // Incluir las sesiones relacionadas
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(workshops, { status: 200 });
  } catch (error) {
    console.error('Error al obtener los talleres:', error);
    return NextResponse.json({ error: 'No se pudo obtener la lista de talleres.' }, { status: 500 });
  }
}

import * as fs from 'fs/promises';
import path from 'path';

// POST: Crear un nuevo taller
export async function POST(request: Request) {
  const session = await getServerSession();

  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario o Administrador de Recursos.' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const capacity = parseInt(formData.get('capacity') as string || '0', 10);
    const availableFrom = formData.get('availableFrom') as string;
    const teacher = formData.get('teacher') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const inscriptionsStartDate = formData.get('inscriptionsStartDate') as string;
    const parsedInscriptionsStartDate = inscriptionsStartDate ? new Date(inscriptionsStartDate) : null;
    const now = new Date();
    const calculatedInscriptionsOpen = parsedInscriptionsStartDate ? parsedInscriptionsStartDate <= now : true;
    let responsibleUserId = formData.get('responsibleUserId') as string;
    const sessionsData = JSON.parse(formData.get('sessions') as string || '[]');
    const newImageFiles = formData.getAll('newImages') as File[];

    if (session.user.role === Role.ADMIN_RESOURCE) {
      responsibleUserId = session.user.id;
    }

    if (!name) {
      return NextResponse.json({ error: 'El nombre del taller es obligatorio.' }, { status: 400 });
    }

    let displayId: string;
    let isUnique = false;
    do {
      const randomPart = generateRandomString(5);
      displayId = `TA_${randomPart}`;
      const existingWorkshop = await prisma.workshop.findUnique({
        where: { displayId },
      });
      if (!existingWorkshop) {
        isUnique = true;
      }
    } while (!isUnique);

    const uploadedImageUrls: { url: string }[] = [];
    if (newImageFiles && newImageFiles.length > 0) {
      for (const file of newImageFiles) {
        if (file.size === 0) continue;
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filename = `${Date.now()}-${file.name}`;
        const uploadDir = path.join(process.cwd(), 'public/uploads/workshops');
        await fs.mkdir(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, filename);
        await fs.writeFile(filePath, buffer);
        uploadedImageUrls.push({ url: `/uploads/workshops/${filename}` });
      }
    }

    const newWorkshop = await prisma.workshop.create({
      data: {
        displayId,
        name,
        description,
        capacity: capacity || 0,
        availableFrom: availableFrom ? new Date(availableFrom) : null,
        teacher,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        inscriptionsStartDate: parsedInscriptionsStartDate,
        inscriptionsOpen: calculatedInscriptionsOpen,
        images: {
          create: uploadedImageUrls,
        },
        sessions: {
          create: sessionsData.map((session: { dayOfWeek: number; timeStart: string; timeEnd: string; room?: string }) => ({
            dayOfWeek: session.dayOfWeek,
            timeStart: session.timeStart,
            timeEnd: session.timeEnd,
            room: session.room,
          })),
        },
        responsibleUser: responsibleUserId ? { connect: { id: responsibleUserId } } : undefined,
      },
      include: { images: true, sessions: true },
    });

    return NextResponse.json(newWorkshop, { status: 201 });
  } catch (error) {
    console.error('Error al crear el taller:', error);
    return NextResponse.json({ error: 'No se pudo crear el taller.' }, { status: 500 });
  }
}
