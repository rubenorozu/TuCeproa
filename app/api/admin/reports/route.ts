import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session || (session.user.role !== 'SUPERUSER' && session.user.role !== 'ADMIN_RESOURCE')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const searchTerm = searchParams.get('search') || '';

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const whereClause: any = {};
    if (searchTerm) {
      whereClause.OR = [
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { space: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { equipment: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { workshop: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { user: { firstName: { contains: searchTerm, mode: 'insensitive' } } },
        { user: { lastName: { contains: searchTerm, mode: 'insensitive' } } },
      ];
    }

    const [reports, totalReports] = await prisma.$transaction([
      prisma.report.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take,
        select: {
          id: true,
          reportIdCode: true,
          description: true,
          createdAt: true,
          status: true,
          space: {
            select: {
              name: true,
            },
          },
          equipment: {
            select: {
              name: true,
            },
          },
          workshop: {
            select: {
              name: true,
            },
          },
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.report.count({ where: whereClause }),
    ]);

    const formattedReports = reports.map(report => ({
      ...report,
      resource: report.space || report.equipment || report.workshop,
    }));

    return NextResponse.json({
      reports: formattedReports,
      totalReports,
      currentPage: page,
      pageSize,
    });
  } catch (error) {
    console.error('Error al obtener los reportes:', error);
    return NextResponse.json({ error: 'No se pudieron obtener los reportes.' }, { status: 500 });
  }
}
