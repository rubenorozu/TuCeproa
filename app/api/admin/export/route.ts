import { NextResponse } from 'next/server';
import { PrismaClient, Role } from '@prisma/client';
import { getServerSession } from '@/lib/auth';

const prisma = new PrismaClient();

// Helper function to convert JSON to CSV
function jsonToCsv(jsonData: any[]): string {
  if (!jsonData || jsonData.length === 0) {
    return '';
  }

  const keys = Object.keys(jsonData[0]);
  const header = keys.join(',') + '\n';

  const rows = jsonData.map(row => {
    return keys.map(key => {
      let cell = row[key] === null || row[key] === undefined ? '' : row[key];
      cell = String(cell).replace(/"/g, '""'); // Escape double quotes
      if (String(cell).includes(',') || String(cell).includes('" ') || String(cell).includes('\n')) {
        cell = `"${cell}"`;
      }
      return cell;
    }).join(',');
  }).join('\n');

  return header + rows;
}

export async function GET(request: Request) {
  const session = await getServerSession();

  if (!session || session.user.role !== Role.SUPERUSER) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const model = searchParams.get('model');

  let data: any[] = [];
  let fileName = 'export.csv';

  try {
    switch (model) {
      case 'users':
        data = await prisma.user.findMany({
          select: {
            displayId: true,
            firstName: true,
            lastName: true,
            email: true,
            identifier: true,
            role: true,
            isVerified: true,
            createdAt: true,
          }
        });
        fileName = 'Usuarios_TuCeproa.csv';
        break;
      case 'spaces':
        data = await prisma.space.findMany({
          select: {
            displayId: true,
            name: true,
            description: true,
            responsibleUserId: true,
            createdAt: true,
          }
        });
        fileName = 'Espacios_TuCeproa.csv';
        break;
      case 'equipment':
        data = await prisma.equipment.findMany({
          select: {
            displayId: true,
            name: true,
            description: true,
            serialNumber: true,
            fixedAssetId: true,
            responsibleUserId: true,
            createdAt: true,
          }
        });
        fileName = 'Equipos_TuCeproa.csv';
        break;
      case 'workshops':
        data = await prisma.workshop.findMany({
          select: {
            displayId: true,
            name: true,
            description: true,
            capacity: true,
            teacher: true,
            createdAt: true,
          }
        });
        fileName = 'Talleres_TuCeproa.csv';
        break;
      default:
        return NextResponse.json({ error: 'Modelo no válido.' }, { status: 400 });
    }

    const csv = jsonToCsv(data);

    return new NextResponse(csv, {
           status: 200,
           headers: {
             'Content-Type': 'text/csv',
             'Content-Disposition': `attachment; filename="${fileName}"`,
           },
         });
     
       } catch (error) {
        console.error(`Error al exportar el modelo ${model}:`, error);
        return NextResponse.json({ error: `No se pudieron exportar los datos para ${model}.` }, {
      status: 500 });
      }
    }
