import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import path from 'path';
import * as fs from 'fs/promises';
import { getServerSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
    }
    const userId = session.user.id;

    const formData = await req.formData();
    const spaceId = formData.get('spaceId') as string | null;
    const equipmentId = formData.get('equipmentId') as string | null;
    const cartSubmissionId = formData.get('cartSubmissionId') as string | null;
    const startTime = formData.get('startTime') as string;
    const endTime = formData.get('endTime') as string;
    const justification = formData.get('justification') as string;
    const subject = formData.get('subject') as string | null;
    const coordinator = formData.get('coordinator') as string | null;
    const teacher = formData.get('teacher') as string | null;

    if ((!spaceId && !equipmentId) || !startTime || !endTime || !justification) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const documentData: { fileName: string; filePath: string }[] = [];

    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file_') && value instanceof File) {
        const fileItem = value;
        const bytes = await fileItem.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filename = `${Date.now()}-${fileItem.name}`;
        const uploadDir = path.join(process.cwd(), 'public/uploads');
        await fs.mkdir(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, filename);
        await fs.writeFile(filePath, buffer);
        documentData.push({
          fileName: fileItem.name,
          filePath: `/uploads/${filename}`,
        });
      }
    }

    let responsibleUserEmail: string | undefined;
    let resourceName: string = '';

    if (spaceId) {
      const space = await prisma.space.findUnique({
        where: { id: spaceId },
        include: { responsibleUser: true },
      });
      if (space?.responsibleUser?.email) {
        responsibleUserEmail = space.responsibleUser.email;
        resourceName = space.name;
      }
    } else if (equipmentId) {
      const equipment = await prisma.equipment.findUnique({
        where: { id: equipmentId },
        include: { responsibleUser: true },
      });
      if (equipment?.responsibleUser?.email) {
        responsibleUserEmail = equipment.responsibleUser.email;
        resourceName = equipment.name;
      }
    }

    const reservation = await prisma.$transaction(async (tx) => {
      let displayId: string;

      if (cartSubmissionId) {
        const existingReservation = await tx.reservation.findFirst({
          where: { cartSubmissionId },
          select: { displayId: true },
        });

        if (existingReservation && existingReservation.displayId) {
          displayId = existingReservation.displayId;
        } else {
          // Generate new displayId for the first item in the cart
          const now = new Date();
          const year = String(now.getFullYear()).slice(-2);
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const datePart = `${year}${month}${day}`;

          const user = await tx.user.findUnique({ where: { id: userId } });
          const lastNamePart = user?.lastName.split(' ')[0].toUpperCase() || 'USER';

          const todayString = now.toISOString().split('T')[0]; // YYYY-MM-DD
          const counter = await tx.reservationCounter.findUnique({
            where: { date: todayString },
          });

          let nextNumber;
          if (counter) {
            nextNumber = counter.lastNumber + 1;
            await tx.reservationCounter.update({
              where: { date: todayString },
              data: { lastNumber: nextNumber },
            });
          } else {
            nextNumber = 1;
            await tx.reservationCounter.create({
              data: { date: todayString, lastNumber: nextNumber },
            });
          }

          const numberPart = String(nextNumber).padStart(4, '0');
          displayId = `${datePart}_${lastNamePart}_${numberPart}`;
        }
      } else {
        // For single reservations not from a cart
        const now = new Date();
        const year = String(now.getFullYear()).slice(-2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const datePart = `${year}${month}${day}`;

        const user = await tx.user.findUnique({ where: { id: userId } });
        const lastNamePart = user?.lastName.split(' ')[0].toUpperCase() || 'USER';

        const todayString = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const counter = await tx.reservationCounter.findUnique({
          where: { date: todayString },
        });

        let nextNumber;
        if (counter) {
          nextNumber = counter.lastNumber + 1;
          await tx.reservationCounter.update({
            where: { date: todayString },
            data: { lastNumber: nextNumber },
          });
        } else {
          nextNumber = 1;
          await tx.reservationCounter.create({
            data: { date: todayString, lastNumber: nextNumber },
          });
        }

        const numberPart = String(nextNumber).padStart(4, '0');
        displayId = `${datePart}_${lastNamePart}_${numberPart}`;
      }

      const newReservation = await tx.reservation.create({
        data: {
          displayId,
          userId,
          cartSubmissionId: cartSubmissionId,
          spaceId: spaceId || undefined,
          equipmentId: equipmentId || undefined,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          justification,
          subject,
          coordinator,
          teacher,
          documents: {
            createMany: {
              data: documentData,
            },
          },
        },
      });

      return newReservation;
    });

    // Simulate email to responsible user
    if (responsibleUserEmail) {
      console.log(`\n--- SIMULATED EMAIL (to Responsible User) ---\n`);
      console.log(`To: ${responsibleUserEmail}`);
      console.log(`Subject: Nueva Solicitud de Reserva para ${resourceName}`);
      console.log(`Se ha solicitado una reserva para ${resourceName}. Por favor, revísala.`);
      if (documentData.length > 0) {
        console.log('\nDocumentos adjuntos:');
        documentData.forEach(doc => {
          console.log(`- ${doc.fileName} (Enlace: ${doc.filePath})`);
        });
      }
      console.log(`\n-------------------------------------\n`);
    }

    // Create a notification for superusers
    const requestingUser = await prisma.user.findUnique({ where: { id: userId } });
    const requestingUserName = requestingUser ? `${requestingUser.firstName} ${requestingUser.lastName}` : 'Usuario desconocido';

    const consolidatedMessage = `Nueva solicitud de reserva de ${requestingUserName} para ${resourceName}.`;

    const admins = await prisma.user.findMany({ where: { OR: [{ role: 'SUPERUSER' }, { role: 'ADMIN_RESERVATION' }, { role: 'ADMIN_RESOURCE' }] } });
    console.log(`Found ${admins.length} admins.`); // DEBUG

    const notificationsToCreate = admins.map(admin => ({
      recipientId: admin.id,
      message: consolidatedMessage,
      reservationId: reservation.id,
    }));

    if (notificationsToCreate.length > 0) {
      await prisma.notification.createMany({
        data: notificationsToCreate,
      });
      console.log(`Notifications created for ${notificationsToCreate.length} admins.`); // DEBUG
    }

    for (const admin of admins) {
      // Simulate sending an email
      console.log(`\n--- SIMULATED EMAIL (to Admin) ---\n`);
      console.log(`To: ${admin.email}`);
      console.log(`Subject: Nueva Solicitud de Reserva`);
      console.log(`Un usuario ha solicitado una nueva reserva: ${consolidatedMessage}. Por favor, revísala en el panel de administración.`);
      if (documentData.length > 0) {
        console.log('\nDocumentos adjuntos:');
        documentData.forEach(doc => {
          console.log(`- ${doc.fileName} (Enlace: ${doc.filePath})`);
        });
      }
      console.log(`\n-------------------------------------\n`);
    }

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    console.error('Error creating reservation:', error);
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Something went wrong' }, { status: 500 });
  }
}
