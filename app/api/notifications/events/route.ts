import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const session = await getServerSession();

  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      let lastChecked = new Date();

      const sendNotifications = async () => {
        const notifications = await prisma.notification.findMany({
          where: {
            recipientId: session.user.id,
            createdAt: {
              gt: lastChecked,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        if (notifications.length > 0) {
          controller.enqueue(`data: ${JSON.stringify(notifications)}

`);
          lastChecked = new Date();
        }
      };

      const intervalId = setInterval(sendNotifications, 5000); // Poll every 5 seconds

      request.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}