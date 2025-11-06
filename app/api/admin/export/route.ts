import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma'; // Import singleton Prisma client


export async function GET(request: Request) {
  const session = await getServerSession();

  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const model = searchParams.get('model');
  console.log('Received model:', model); // Debug log

  try {
    switch (model) {
      case 'users':
        const users = await prisma.user.findMany({
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            identifier: true,
            phoneNumber: true,
          }
        });
        const userFileName = 'Usuarios_TuCeproa.csv';

        const userCsvRows = [];
        userCsvRows.push('"ID del usuario","Nombre","Apellidos","Email","Matrícula","Teléfono"');
        for (const user of users) {
          userCsvRows.push(
            `"${user.id}",` +
            `"${(user.firstName || '').replace(/"/g, '""')}",` +
            `"${(user.lastName || '').replace(/"/g, '""')}",` +
            `"${user.email.replace(/"/g, '""')}",` +
            `"${(user.identifier || 'N/A').replace(/"/g, '""')}",` +
            `"${(user.phoneNumber || 'N/A').replace(/"/g, '""')}"`
          );
        }
        const userCsv = userCsvRows.join('\n');
        return new Response(userCsv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${userFileName}"`,
          },
        });
      case 'spaces':
        const spaces = await prisma.space.findMany({
          select: {
            id: true,
            name: true,
            responsibleUser: {
              select: {
                firstName: true,
                lastName: true,
              }
            },
          }
        });
        const spaceFileName = 'Espacios_TuCeproa.csv';

        const spaceCsvRows = [];
        spaceCsvRows.push('"ID del espacio","Nombre del espacio","Encargado"');
        for (const space of spaces) {
          const responsibleName = space.responsibleUser ? `${space.responsibleUser.firstName} ${space.responsibleUser.lastName}` : 'N/A';
          spaceCsvRows.push(
            `"${space.id}",` +
            `"${space.name.replace(/"/g, '""')}",` +
            `"${responsibleName.replace(/"/g, '""')}"`
          );
        }
        const spaceCsv = spaceCsvRows.join('\n');
        console.log('Returning CSV for spaces.'); // Debug log
        return new Response(spaceCsv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${spaceFileName}"`,
          },
        });
      case 'equipment':
        const equipmentList = await prisma.equipment.findMany({
          select: {
            id: true,
            name: true,
            serialNumber: true,
            fixedAssetId: true,
            responsibleUser: {
              select: {
                firstName: true,
                lastName: true,
              }
            },
          }
        });
        const equipmentFileName = 'Equipos_TuCeproa.csv';

        const equipmentCsvRows = [];
        equipmentCsvRows.push('"ID del equipo","Nombre","Número de serie","Activo fijo","Responsable"');
        for (const equipment of equipmentList) {
          const responsibleName = equipment.responsibleUser ? `${equipment.responsibleUser.firstName} ${equipment.responsibleUser.lastName}` : 'N/A';
          equipmentCsvRows.push(
            `"${equipment.id}",` +
            `"${equipment.name.replace(/"/g, '""')}",` +
            `"${(equipment.serialNumber || 'N/A').replace(/"/g, '""')}",` +
            `"${(equipment.fixedAssetId || 'N/A').replace(/"/g, '""')}",` +
            `"${responsibleName.replace(/"/g, '""')}"`
          );
        }
        const equipmentCsv = equipmentCsvRows.join('\n');
        return new Response(equipmentCsv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${equipmentFileName}"`,
          },
        });
      case 'workshops':
        const workshopsList = await prisma.workshop.findMany({
          select: {
            id: true,
            name: true,
            description: true,
            teacher: true,
            startDate: true,
            endDate: true,
            responsibleUser: {
              select: {
                firstName: true,
                lastName: true,
              }
            },
            sessions: {
              select: {
                dayOfWeek: true,
                timeStart: true,
                timeEnd: true,
                room: true,
              }
            },
          }
        });
        const workshopFileName = 'Talleres_TuCeproa.csv';

        const workshopCsvRows = [];
        workshopCsvRows.push('"ID del taller","Nombre del taller","Responsable","Maestro","Descripción","Fecha de inicio","Fecha de finalización","Sesiones"');
        for (const workshop of workshopsList) {
          const responsibleName = workshop.responsibleUser ? `${workshop.responsibleUser.firstName} ${workshop.responsibleUser.lastName}` : 'N/A';
          const sessions = workshop.sessions.map(session => {
            const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
            return `${days[session.dayOfWeek]} ${session.timeStart}-${session.timeEnd}${session.room ? ` (${session.room})` : ''}`;
          }).join('; ');

          workshopCsvRows.push(
            `"${workshop.id}",` +
            `"${workshop.name.replace(/"/g, '""')}",` +
            `"${responsibleName.replace(/"/g, '""')}",` +
            `"${(workshop.teacher || 'N/A').replace(/"/g, '""')}",` +
            `"${(workshop.description || 'N/A').replace(/"/g, '""')}",` +
            `"${workshop.startDate ? new Date(workshop.startDate).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' }) : 'N/A'}",` +
            `"${workshop.endDate ? new Date(workshop.endDate).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' }) : 'N/A'}",` +
            `"${sessions.replace(/"/g, '""')}"`
          );
        }
        const workshopCsv = workshopCsvRows.join('\n');
        return new Response(workshopCsv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${workshopFileName}"`,
          },
        });
      default:
        return NextResponse.json({ error: 'Modelo no válido.' }, { status: 400 });
    }

       } catch (error) {
        console.error(`Error al exportar el modelo ${model}:`, error);
        return NextResponse.json({ error: `No se pudieron exportar los datos para ${model}.` }, {
      status: 500 });
      }
    }
