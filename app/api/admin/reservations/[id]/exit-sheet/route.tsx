import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();

  const allowedRoles = [Role.SUPERUSER, Role.ADMIN_RESERVATION, Role.ADMIN_RESOURCE];
  if (!session || !allowedRoles.some(role => role === session.user.role)) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const cartSubmissionId = params.id;

  try {
    // 1. Fetch ALL reservations for the submission ID to check their statuses
    const allItemsInCart = await prisma.reservation.findMany({
        where: { cartSubmissionId: cartSubmissionId },
        select: { status: true }
    });

    // 2. Check if any item is still pending
    const isAnyItemPending = allItemsInCart.some(item => item.status === 'PENDING');

    if (isAnyItemPending) {
        return NextResponse.json({ error: 'No se puede generar la hoja de salida. Hay artículos en la solicitud que aún están pendientes de aprobación o rechazo.' }, { status: 400 });
    }

    // 3. If all items are settled, proceed with the original logic to get the APPROVED ones for the PDF
    const reservations = await prisma.reservation.findMany({
      where: {
        cartSubmissionId: cartSubmissionId,
        equipmentId: { not: null },
        status: 'APPROVED',
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        displayId: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            identifier: true,
            phoneNumber: true,
          },
        },
        equipment: {
          select: {
            name: true,
            serialNumber: true,
            fixedAssetId: true,
          },
        },
        checkedOutAt: true,
        checkedInAt: true,
        checkedOutByUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        checkedInByUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    console.log('--- PDF Generation: Fetched reservations from DB ---');

    if (!reservations || reservations.length === 0) {
      return NextResponse.json({ error: 'No se encontraron reservaciones de equipo aprobadas para esta solicitud.' }, { status: 404 });
    }

    const firstReservation = reservations[0];

    const normalizeText = (text: string | null | undefined): string => {
      if (!text) return '';
      return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    const pdfData = {
      reservationId: firstReservation.id,
      displayId: firstReservation.displayId || firstReservation.id,
      userName: normalizeText(`${firstReservation.user.firstName || ''} ${firstReservation.user.lastName || ''}`.trim() || firstReservation.user.email),
      userIdentifier: normalizeText(firstReservation.user.identifier || 'N/A'),
      userPhoneNumber: normalizeText(firstReservation.user.phoneNumber || 'N/A'),
      startTime: firstReservation.startTime,
      endTime: firstReservation.endTime,
      equipment: reservations.map(res => ({
        name: normalizeText(res.equipment?.name || 'N/A'),
        serialNumber: normalizeText(res.equipment?.serialNumber || 'N/A'),
        fixedAssetId: normalizeText(res.equipment?.fixedAssetId || 'N/A'),
      })),
      checkedOutAt: firstReservation.checkedOutAt,
      checkedInAt: firstReservation.checkedInAt,
      checkedOutByUserName: normalizeText(firstReservation.checkedOutByUser 
        ? `${firstReservation.checkedOutByUser.firstName || ''} ${firstReservation.checkedOutByUser.lastName || ''}`.trim() 
        : ''),
      checkedInByUserName: normalizeText(firstReservation.checkedInByUser
        ? `${firstReservation.checkedInByUser.firstName || ''} ${firstReservation.checkedInByUser.lastName || ''}`.trim()
        : ''),
    };
    console.log('--- PDF Generation: Prepared pdfData object ---');

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const univaLogoBytes = await fs.readFile(path.join(process.cwd(), 'public/assets/UNIVA.png'));
    console.log('--- PDF Generation: Read UNIVA.png file ---');
    const ceproaLogoBytes = await fs.readFile(path.join(process.cwd(), 'public/assets/Ceproa.png'));
    console.log('--- PDF Generation: Read Ceproa.png file ---');
    const univaLogo = await pdfDoc.embedPng(univaLogoBytes);
    console.log('--- PDF Generation: Embedded UNIVA logo ---');
    const ceproaLogo = await pdfDoc.embedPng(ceproaLogoBytes);
    console.log('--- PDF Generation: Embedded Ceproa logo ---');

    const drawHalfSheet = (page: PDFPage, data: any, isTopHalf: boolean) => {
      console.log(`--- PDF Generation: Starting drawHalfSheet for ${isTopHalf ? 'top' : 'bottom'} half ---`);
      const { width, height } = page.getSize();
      const margin = 30;
      const halfHeight = height / 2;
      const topHalfBottomY = halfHeight + margin;
      const bottomHalfTopY = halfHeight - margin;

      const currentHalfStartY = isTopHalf ? height - margin : bottomHalfTopY;
      const currentHalfEndY = isTopHalf ? topHalfBottomY : margin;

      page.drawRectangle({
        x: margin,
        y: currentHalfEndY,
        width: width - 2 * margin,
        height: currentHalfStartY - currentHalfEndY,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });

      const maxLogoHeight = 35;
      const univaScale = maxLogoHeight / univaLogo.height;
      const ceproaScale = maxLogoHeight / ceproaLogo.height;
      const logoY = currentHalfStartY - 10 - maxLogoHeight;

      page.drawImage(univaLogo, { x: margin + 5, y: logoY, width: univaLogo.width * univaScale, height: univaLogo.height * univaScale });
      page.drawImage(ceproaLogo, { x: width - margin - (ceproaLogo.width * ceproaScale) - 5, y: logoY, width: ceproaLogo.width * ceproaScale, height: ceproaLogo.height * ceproaScale });

      const observationsBoxX = margin + 200;
      const observationsBoxY = currentHalfStartY - 143;
      const observationsBoxWidth = width - 2 * margin - 200 - 10;
      const observationsBoxHeight = 100;

      page.drawRectangle({
        x: observationsBoxX,
        y: observationsBoxY,
        width: observationsBoxWidth,
        height: observationsBoxHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 0.5,
      });

      page.drawText('Lugar de Destino:', {
        x: observationsBoxX + 5,
        y: observationsBoxY + observationsBoxHeight - 15,
        font: boldFont,
        size: 8,
      });
      page.drawLine({ start: { x: observationsBoxX + 5, y: observationsBoxY + observationsBoxHeight - 20 }, end: { x: observationsBoxX + observationsBoxWidth - 5, y: observationsBoxY + observationsBoxHeight - 20 }, thickness: 0.5 });

      page.drawText('OBSERVACIONES', {
        x: observationsBoxX + 5,
        y: observationsBoxY + observationsBoxHeight - 35,
        font: boldFont,
        size: 8,
      });

      let currentY = currentHalfStartY - 70;
      page.drawText('Datos de la reservación:', { x: margin + 5, y: currentY, font: boldFont, size: 9 });
      currentY -= 12;
      page.drawText(`ID de Reserva: ${data.displayId}`, { x: margin + 10, y: currentY, font: font, size: 8 });
      currentY -= 12;
      page.drawText(`Solicitante: ${data.userName}`, { x: margin + 10, y: currentY, font: font, size: 8 });
      currentY -= 12;
      page.drawText(`Matrícula/Nómina: ${data.userIdentifier}`, { x: margin + 10, y: currentY, font: font, size: 8 });
      currentY -= 12;
      page.drawText(`Teléfono: ${data.userPhoneNumber}`, { x: margin + 10, y: currentY, font: font, size: 8 });
      currentY -= 12;
      page.drawText(`Fecha y Hora de Salida: ${new Date(data.startTime).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`, { x: margin + 10, y: currentY, font: font, size: 8 });
      currentY -= 12;
      page.drawText(`Fecha y Hora de Regreso: ${new Date(data.endTime).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`, { x: margin + 10, y: currentY, font: font, size: 8 });

      // Divider line after applicant info
      currentY -= 8;
      page.drawLine({ start: { x: margin, y: currentY }, end: { x: width - margin, y: currentY }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
      currentY -= 15;

      // Equipment Table
      page.drawText('Equipo Solicitado:', { x: margin + 5, y: currentY, font: boldFont, size: 9 });
      currentY -= 15; // Space after title

      const tableHeaders = ['Nombre', 'Activo Fijo', 'Número de Serie'];
      const colWidths = [width * 0.3, width * 0.2, width * 0.3];
      let tableX = margin + 5;

      // Draw headers
      tableHeaders.forEach((header, i) => {
        page.drawText(header, { x: tableX, y: currentY + 1, font: boldFont, size: 8 }); // Moved up by 1 pixel
        tableX += colWidths[i];
      });
      currentY -= 1; // Adjusted space after headers (moved up by 4)
      page.drawLine({ start: { x: margin, y: currentY }, end: { x: width - margin, y: currentY }, thickness: 0.5 });
      currentY -= 6; // Adjusted space for first equipment item (moved up by 6)

      // Draw equipment rows
      data.equipment.forEach((item: any) => {
        currentY -= 2; // Lower the entire group by 2 pixels
        tableX = margin + 5;
        page.drawText(item.name, { x: tableX, y: currentY - 3, font: font, size: 8 }); // Lowered by 3 pixels
        tableX += colWidths[0];
        page.drawText(item.fixedAssetId, { x: tableX, y: currentY - 3, font: font, size: 8 }); // Lowered by 3 pixels
        tableX += colWidths[1];
        page.drawText(item.serialNumber, { x: tableX, y: currentY - 3, font: font, size: 8 }); // Lowered by 3 pixels
        currentY -= 6; // Adjusted line height for next item (moved up by 6)
        page.drawLine({ start: { x: margin, y: currentY }, end: { x: width - margin, y: currentY }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) }); // Draw line after each item
        currentY -= 6; // Adjusted space after line (moved up by 6)
      });

      // Signatures - Anchored to bottom
      const signatureBlockStartY = currentHalfEndY + 40; // Position signatures above the bottom border of the current half-sheet
      const signatureY = signatureBlockStartY - 15;

      const drawSignatureBlock = (x: number, text1: string, text2?: string, isLast?: boolean) => {
        const lineLength = isLast ? signatureLineLengthAdjusted - 5 : signatureLineLengthAdjusted; // Shorten last line
        page.drawLine({ start: { x, y: signatureBlockStartY }, end: { x: x + lineLength, y: signatureBlockStartY }, thickness: 0.5 });
        page.drawText(text1, { x: x + lineLength / 2 - font.widthOfTextAtSize(text1, 7) / 2, y: signatureY, font: font, size: 7 });
        if (text2) {
          page.drawText(text2, { x: x + lineLength / 2 - font.widthOfTextAtSize(text2, 7) / 2, y: signatureY - 10, font: font, size: 7 });
        }
      };

      const signatureLineLengthAdjusted = (width - 2 * margin - 20) / 4; // Adjusted for padding

      drawSignatureBlock(margin + 5, 'Coordinación de Ceproa', 'Germán Medina');
      drawSignatureBlock(margin + 5 + signatureLineLengthAdjusted + 5, 'Encargado Responsable del Equipo');
      
      const checkoutText1 = data.checkedOutAt ? data.checkedOutByUserName : 'Vigilancia (Salida)';
      const checkoutText2 = data.checkedOutAt ? new Date(data.checkedOutAt).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }) : undefined;
      drawSignatureBlock(margin + 5 + 2 * (signatureLineLengthAdjusted + 5), checkoutText1, checkoutText2);

      const checkinText1 = data.checkedInAt ? data.checkedInByUserName : 'Vigilancia (Entrada)';
      const checkinText2 = data.checkedInAt ? new Date(data.checkedInAt).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }) : undefined;
      drawSignatureBlock(margin + 5 + 3 * (signatureLineLengthAdjusted + 5), checkinText1, checkinText2, true);
    };

    const page = pdfDoc.addPage([612, 792]);
    drawHalfSheet(page, pdfData, true);
    page.drawLine({ start: { x: 0, y: page.getSize().height / 2 }, end: { x: page.getSize().width, y: page.getSize().height / 2 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7), dashArray: [5, 5] });
    drawHalfSheet(page, pdfData, false);

    const pdfBytes = await pdfDoc.save();

    const safeAsciiName = (`${firstReservation.user.firstName || ''} ${firstReservation.user.lastName || ''}`).trim().replace(/\s/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_]/g, '');
    const safeDisplayId = (firstReservation.displayId || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_]/g, '');

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="hoja_salida_${safeAsciiName}_${safeDisplayId}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generating exit sheet PDF:', error);
    return NextResponse.json({ error: 'Error interno del servidor al generar la hoja de salida.' }, { status: 500 });
  }
}
