
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

// GET: Listar todos los espacios
export async function GET(request: Request) {
  const session = await getServerSession();

  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario o Administrador de Recursos.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const whereClause: Prisma.SpaceWhereInput = {};

    if (session.user.role === Role.ADMIN_RESOURCE) {
      whereClause.responsibleUserId = session.user.id;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
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

    console.log('DEBUG API: Ejecutando prisma.space.findMany...');
    const spaces = await prisma.space.findMany({
      where: whereClause,
      include: {
        images: true,
        responsibleUser: {
          select: {
            firstName: true,
            lastName: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    console.log('DEBUG API: Datos de espacios devueltos:', spaces);
    return NextResponse.json(spaces, { status: 200 });
  } catch (error) {
    console.error('Error al obtener los espacios:', error);
    return NextResponse.json({ error: 'No se pudo obtener la lista de espacios.' }, { status: 500 });
  }
}

// POST: Crear un nuevo espacio
export async function POST(request: Request) {
  const session = await getServerSession();

  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario o Administrador de Recursos.' }, { status: 403 });
  }

  try {
    const { name, description, images, responsibleUserId } = await request.json(); // Añadir 'images'

    if (!name) {
      return NextResponse.json({ error: 'El nombre del espacio es obligatorio.' }, { status: 400 });
    }

    let finalResponsibleUserId = responsibleUserId;
    if (session.user.role === Role.ADMIN_RESOURCE) {
      finalResponsibleUserId = session.user.id;
    }

    let displayId: string;
    let isUnique = false;
    do {
      const randomPart = generateRandomString(5);
      displayId = `ES_${randomPart}`;
      const existingSpace = await prisma.space.findUnique({
        where: { displayId },
      });
      if (!existingSpace) {
        isUnique = true;
      }
    } while (!isUnique);

    const newSpace = await prisma.space.create({
      data: {
        displayId,
        name,
        description,
        responsibleUserId: finalResponsibleUserId || null,
        images: {
          create: images.map((img: { url: string }) => ({ url: img.url })),
        },
      },
      include: { images: true }, // Incluir las imágenes en la respuesta
    });

    return NextResponse.json(newSpace, { status: 201 });
  } catch (error) {
    console.error('Error al crear el espacio:', error);
    return NextResponse.json({ error: 'No se pudo crear el espacio.' }, { status: 500 });
  }
}
