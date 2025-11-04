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
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

    const whereClause: Prisma.UserWhereInput = {};

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { identifier: { contains: search, mode: 'insensitive' } },
        { displayId: { not: null, contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * pageSize;

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
      skip,
      take: pageSize,
    });

    const totalUsers = await prisma.user.count({ where: whereClause });

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

    return NextResponse.json({ users: safeUsers, totalUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
}