
import { Role, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma'; // Import singleton Prisma client


// Helper function to generate a random alphanumeric string
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// GET: Listar todos los equipos
export async function GET(request: Request) {
  const session = await getServerSession();
  console.log('DEBUG API /api/admin/equipment: Session:', session);

  if (!session) {
    console.log('DEBUG API /api/admin/equipment: No session found.');
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const userRole = session.user.role; // Get role from session, not header
  console.log('DEBUG API /api/admin/equipment: User Role from Session:', userRole);

  if (userRole !== Role.SUPERUSER && userRole !== Role.ADMIN_RESOURCE) {
    console.log('DEBUG API /api/admin/equipment: Acceso denegado para rol:', userRole);
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario o Administrador de Recursos.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const whereClause: Prisma.EquipmentWhereInput = {};

    if (userRole === Role.ADMIN_RESOURCE) {
      whereClause.responsibleUserId = session.user.id;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { serialNumber: { contains: search } },
        { fixedAssetId: { contains: search } },
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

    const equipment = await prisma.equipment.findMany({
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
    return NextResponse.json(equipment, { status: 200 });
  } catch (error) {
    console.error('Error fetching equipment:', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
}

// POST: Crear un nuevo equipo
export async function POST(request: Request) {
  const session = await getServerSession();

  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario o Administrador de Recursos.' }, { status: 403 });
  }

  try {
    const { name, description, serialNumber, fixedAssetId, images, responsibleUserId } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'El nombre del equipo es obligatorio.' }, { status: 400 });
    }

    let finalResponsibleUserId = responsibleUserId;
    if (session.user.role === Role.ADMIN_RESOURCE) {
      finalResponsibleUserId = session.user.id;
    }

    let displayId: string;
    let isUnique = false;
    do {
      const randomPart = generateRandomString(5);
      displayId = `EQ_${randomPart}`;
      const existingEquipment = await prisma.equipment.findUnique({
        where: { displayId },
      });
      if (!existingEquipment) {
        isUnique = true;
      }
    } while (!isUnique);

    const newEquipment = await prisma.equipment.create({
      data: {
        displayId,
        name,
        description,
        serialNumber,
        fixedAssetId,
        responsibleUserId: finalResponsibleUserId || null,
        images: {
          create: images.map((img: { url: string }) => ({ url: img.url })),
        },
      },
      include: { images: true }, // Incluir las imágenes en la respuesta
    });

    return NextResponse.json(newEquipment, { status: 201 });
  } catch (error) {
    console.error('Error al crear el equipo:', error);
    return NextResponse.json({ error: 'No se pudo crear el equipo.' }, { status: 500 });
  }
}
