import { NextResponse } from 'next/server';
import { PrismaClient, Role } from '@prisma/client';
import { getServerSession } from '@/lib/auth';
import * as fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

// GET: Obtener un taller por ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();

  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario o Administrador de Recursos.' }, { status: 403 });
  }

  const workshopId = params.id;

  try {
    const workshop = await prisma.workshop.findUnique({
      where: { id: workshopId },
      include: { images: true, sessions: true },
    });

    if (!workshop) {
      return NextResponse.json({ error: 'Taller no encontrado.' }, { status: 404 });
    }

    if (session.user.role === Role.ADMIN_RESOURCE && workshop.responsibleUserId !== session.user.id) {
      return NextResponse.json({ error: 'Acceso denegado. No eres responsable de este taller.' }, { status: 403 });
    }

    return NextResponse.json(workshop, { status: 200 });
  } catch (error) {
    console.error('Error al obtener el taller:', error);
    return NextResponse.json({ error: 'No se pudo obtener el taller.' }, { status: 500 });
  }
}

// PUT: Actualizar un taller existente
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try { // Wrap the entire function logic in a try-catch
    const session = await getServerSession();

    if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESOURCE)) {
      return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario o Administrador de Recursos.' }, { status: 403 });
    }

    const { id } = params;

    const existingWorkshop = await prisma.workshop.findUnique({
      where: { id },
    });

    if (!existingWorkshop) {
      return NextResponse.json({ message: 'Taller no encontrado.' }, { status: 404 });
    }

    if (session.user.role === Role.ADMIN_RESOURCE && existingWorkshop.responsibleUserId !== session.user.id) {
      return NextResponse.json({ error: 'Acceso denegado. No eres responsable de este taller.' }, { status: 403 });
    }

    const contentType = request.headers.get('content-type');

    if (!contentType || !contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: `Invalid Content-Type: ${contentType}. Expected multipart/form-data.` }, { status: 400 });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const availableFrom = formData.get('availableFrom') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const teacher = formData.get('teacher') as string;
    const responsibleUserId = formData.get('responsibleUserId') as string;
    const existingImageUrls = formData.getAll('existingImages[]') as string[];
    const newImageFiles = formData.getAll('newImages') as File[];
    const sessionsData = JSON.parse(formData.get('sessions') as string || '[]') as { dayOfWeek: number; timeStart: string; timeEnd: string; room?: string }[];
    const inscriptionsStartDate = formData.get('inscriptionsStartDate') as string;
    const parsedInscriptionsStartDate = inscriptionsStartDate ? new Date(inscriptionsStartDate) : null;
    const now = new Date();
    const calculatedInscriptionsOpen = parsedInscriptionsStartDate ? parsedInscriptionsStartDate <= now : true;

    if (!name) {
      return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });
    }

    // Lógica para subir nuevas imágenes (RESTAURADA)
    const uploadedNewImageUrls: { url: string }[] = [];
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
        uploadedNewImageUrls.push({ url: `/uploads/workshops/${filename}` });
      }
    }

    // Combinar URLs existentes con las nuevas subidas (RESTAURADA)
    const finalImageUrls = [...existingImageUrls.map(url => ({ url })), ...uploadedNewImageUrls];

    // Obtener el taller actual para comparar imágenes y sesiones
    const currentWorkshop = await prisma.workshop.findUnique({
      where: { id },
      include: { images: true, sessions: true },
    });

    if (!currentWorkshop) {
      return NextResponse.json({ message: 'Taller no encontrado.' }, { status: 404 });
    }

    // Eliminar imágenes que ya no están en existingImageUrls (RESTAURADA)
    const imagesToDelete = currentWorkshop.images.filter(img => !existingImageUrls.includes(img.url));
    for (const img of imagesToDelete) {
      const imagePath = path.join(process.cwd(), 'public', img.url);
      try {
        await fs.unlink(imagePath);
      } catch (unlinkError) {
        console.warn(`No se pudo eliminar el archivo de imagen: ${imagePath}`, unlinkError);
      }
      await prisma.image.delete({ where: { id: img.id } });
    }

    // Actualizar el taller y sus sesiones
    const updatedWorkshop = await prisma.workshop.update({
      where: { id },
      data: {
        name,
        description,
        availableFrom: availableFrom ? new Date(availableFrom) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        inscriptionsStartDate: parsedInscriptionsStartDate,
        inscriptionsOpen: calculatedInscriptionsOpen,
        teacher,
        responsibleUser: responsibleUserId ? { connect: { id: responsibleUserId } } : undefined,
        images: {
          deleteMany: {},
          create: finalImageUrls,
        },
        sessions: {
          deleteMany: {},
          create: sessionsData.map(session => ({
            dayOfWeek: session.dayOfWeek,
            timeStart: session.timeStart,
            timeEnd: session.timeEnd,
            room: session.room,
          })),
        },
      },
      include: { images: true, sessions: true },
    });

    return NextResponse.json(updatedWorkshop, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar el taller:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    return NextResponse.json({ error: `No se pudo actualizar el taller: ${errorMessage}` }, { status: 500 });
  }
}

// DELETE: Eliminar un taller
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  try {
    const { id } = params;

    const existingWorkshop = await prisma.workshop.findUnique({
      where: { id },
    });

    if (!existingWorkshop) {
      return NextResponse.json({ message: 'Taller no encontrado.' }, { status: 404 });
    }

    if (session.user.role === Role.ADMIN_RESOURCE && existingWorkshop.responsibleUserId !== session.user.id) {
      return NextResponse.json({ error: 'Acceso denegado. No eres responsable de este taller.' }, { status: 403 });
    }

    // Eliminar imágenes asociadas primero
    await prisma.image.deleteMany({ where: { workshopId: id } });
    
    // Eliminar el taller
    await prisma.workshop.delete({ where: { id } });

    return NextResponse.json({ message: 'Taller eliminado correctamente.' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar el taller:', error);
    return NextResponse.json({ error: 'No se pudo eliminar el taller.' }, { status: 500 });
  }
}