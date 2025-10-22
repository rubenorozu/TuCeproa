import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSupabaseSession } from '@/lib/supabase/utils';

export async function PUT() {
  try {
    const { user } = await getSupabaseSession(request);
    if (!user) {
      return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
    }
    const userId = user.id;

    await prisma.notification.updateMany({
      where: {
        recipientId: userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    return NextResponse.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
}