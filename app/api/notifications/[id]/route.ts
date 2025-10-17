import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
    }
    const userId = session.user.id;
    const { id } = params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.recipientId !== userId) {
      return NextResponse.json({ message: 'Notification not found or access denied' }, { status: 404 });
    }

    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return NextResponse.json(updatedNotification);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
}