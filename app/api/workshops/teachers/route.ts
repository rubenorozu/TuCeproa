import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { Role } from '@prisma/client';

const allowedAdminRoles: Role[] = [Role.SUPERUSER, Role.ADMIN_RESOURCE, Role.ADMIN_RESERVATION];

export async function GET() {
  const session = await getServerSession();
  if (!session || !allowedAdminRoles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const teachers = await prisma.workshop.findMany({
      distinct: ['teacher'],
      where: {
        AND: [
          { teacher: { not: null } },
          { teacher: { not: '' } }
        ]
      },
      select: {
        teacher: true,
      },
      orderBy: {
        teacher: 'asc',
      },
    });

    const teacherNames = teachers.map(t => t.teacher);

    return NextResponse.json(teacherNames);
  } catch (error) {
    console.error("Error fetching workshop teachers:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
