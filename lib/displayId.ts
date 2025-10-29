
import { PrismaClient, Prisma } from '@prisma/client';

export async function generateDisplayId(tx: Prisma.TransactionClient, userId: string): Promise<string> {
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
  return `${datePart}_${lastNamePart}_${numberPart}`;
}
