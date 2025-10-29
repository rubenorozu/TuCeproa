import { NextResponse } from 'next/server';
import { Prisma, Role, ReservationStatus } from '@prisma/client';
import { getServerSession } from '@/lib/auth';

import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await getServerSession();

  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESERVATION && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const whereClause: Prisma.ReservationWhereInput = {};

    // Apply status filter directly in Prisma query if possible
    if (statusFilter && statusFilter !== 'all') {
      const filterValue = statusFilter.toUpperCase();
      if (filterValue === 'PENDING') {
        whereClause.status = 'PENDING';
      } else if (filterValue === 'APPROVED') {
        whereClause.status = 'APPROVED';
      } else if (filterValue === 'REJECTED') {
        whereClause.status = 'REJECTED';
      }
      // 'PARTIALLY_APPROVED' and 'all' will be handled after grouping
    }

    // Fetch reservations with pagination
    const reservations = await prisma.reservation.findMany({
      where: whereClause,
      select: { 
        id: true,
        displayId: true,
        cartSubmissionId: true,
        startTime: true,
        endTime: true,
        justification: true,
        subject: true,
        coordinator: true,
        teacher: true,
        status: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        space: { select: { id: true, name: true, responsibleUserId: true } },
        equipment: { select: { id: true, name: true, responsibleUserId: true } },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take,
    });

    // Get total count for pagination metadata
    const totalReservations = await prisma.reservation.count({ where: whereClause });

    const grouped: { [key: string]: GroupedReservation } = {};

    for (const r of reservations) {
      const groupId = r.cartSubmissionId || `single-${r.id}`;

      if (!grouped[groupId]) {
        grouped[groupId] = {
          cartSubmissionId: groupId,
          items: [],
          overallStatus: 'PENDING', 
        };
      }

      const userName = `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim() || null;

      grouped[groupId].items.push({
        ...r,
        startTime: r.startTime.toISOString(), // Convertir a string
        endTime: r.endTime.toISOString(),     // Convertir a string
        user: {
          id: r.user.id,
          email: r.user.email,
          name: userName,
        },
        subject: r.subject || null,
        coordinator: r.coordinator || null,
        teacher: r.teacher || null,
      });
    }

    Object.values(grouped).forEach(group => {
      const statuses = new Set(group.items.map(item => item.status));
      if (statuses.size === 1) {
        group.overallStatus = statuses.values().next().value as string;
      } else {
        group.overallStatus = 'PARTIALLY_APPROVED';
      }
    });

    let finalResult = Object.values(grouped);

    // Re-apply filter for 'PARTIALLY_APPROVED' and 'all' if not applied in whereClause
    if (statusFilter && statusFilter !== 'all' && statusFilter.toUpperCase() === 'PARTIALLY_APPROVED') {
      finalResult = finalResult.filter(group => group.overallStatus === 'PARTIALLY_APPROVED');
    }

    return NextResponse.json({
      data: finalResult,
      pagination: {
        total: totalReservations,
        page,
        pageSize,
        pageCount: Math.ceil(totalReservations / pageSize),
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error al obtener reservaciones:', error);
    return NextResponse.json({ error: 'No se pudieron obtener las reservaciones.' }, { status: 500 });
  }
}

interface GroupedReservation {
  cartSubmissionId: string;
  items: ReservationItem[];
  overallStatus: string;
}

interface ReservationItem {
  id: string;
  displayId: string | null;
  startTime: string;
  endTime: string;
  justification: string;
  subject: string | null;
  coordinator: string | null;
  teacher: string | null;
  status: ReservationStatus;
  user: { id: string; name: string | null; email: string };
  space?: { id: string; name: string } | null;
  equipment?: { id: string; name: string } | null;
  workshop?: { id: string; name: string } | null;
}