import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const userRole = req.headers.get('x-user-role');

    // Only SUPERUSER or ADMIN_RESOURCE should be able to fetch users for assignment
    if (userRole !== 'SUPERUSER' && userRole !== 'ADMIN_RESOURCE') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    const whereClause: Prisma.UserWhereInput = {};

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { identifier: { contains: search } },
        { displayId: { not: null, contains: search } },
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        displayId: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        identifier: true,
        isVerified: true,
        createdAt: true,
      },
      orderBy: { firstName: 'asc' },
    });

    const safeUsers = users.map(user => ({
      id: user.id,
      displayId: user.displayId,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role,
      identifier: user.identifier,
      isVerified: user.isVerified,
      createdAt: user.createdAt.toISOString(),
    }));

    return NextResponse.json(safeUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
}