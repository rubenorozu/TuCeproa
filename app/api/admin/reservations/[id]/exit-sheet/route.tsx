import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'; // Import pdf-lib
import fs from 'fs/promises'; // For loading images
import path from 'path'; // For path resolution
// import ExitSheetDocument from '@/components/pdf/ExitSheetDocument'; // Removed

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();

  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESERVATION)) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const cartSubmissionId = params.id;

  try {
    const reservations = await prisma.reservation.findMany({
      where: {
        cartSubmissionId: cartSubmissionId,
        equipmentId: { not: null }, // Ensure it's an equipment reservation
        status: 'APPROVED', // Only approved equipment reservations
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
            identifier: true, // matricula o numero de nómina
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
      },
    });

    if (!reservations || reservations.length === 0) {
      return NextResponse.json({ error: 'No se encontraron reservaciones de equipo aprobadas para esta solicitud.' }, { status: 404 });
    }

    // All reservations in this group should have the same user, startTime, endTime
    const firstReservation = reservations[0];

    const pdfData = {
      reservationId: firstReservation.id,
      displayId: firstReservation.displayId || firstReservation.id,
      userName: `${firstReservation.user.firstName || ''} ${firstReservation.user.lastName || ''}`.trim() || firstReservation.user.email,
      userIdentifier: firstReservation.user.identifier || 'N/A',
      userPhoneNumber: firstReservation.user.phoneNumber || 'N/A',
      startTime: firstReservation.startTime,
      endTime: firstReservation.endTime,
      equipment: reservations.map(res => ({
        name: res.equipment?.name || 'N/A',
        serialNumber: res.equipment?.serialNumber || 'N/A',
        fixedAssetId: res.equipment?.fixedAssetId || 'N/A',
      })),
    };

    // --- PDF-LIB GENERATION LOGIC --- //
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Load Logos (assuming they are in public/assets as per workshop PDF)
    const univaLogoBytes = await fs.readFile(path.join(process.cwd(), 'public/assets/UNIVA.png'));
    const ceproaLogoBytes = await fs.readFile(path.join(process.cwd(), 'public/assets/Ceproa.png'));
    const univaLogo = await pdfDoc.embedPng(univaLogoBytes);
    const ceproaLogo = await pdfDoc.embedPng(ceproaLogoBytes);

    const drawHalfSheet = (page: any, data: any, isTopHalf: boolean) => {
      const { width, height } = page.getSize();
      const margin = 30;
      const halfHeight = height / 2;
      const topHalfBottomY = halfHeight + margin; // Bottom edge of the top half
      const bottomHalfTopY = halfHeight - margin; // Top edge of the bottom half

      const currentHalfStartY = isTopHalf ? height - margin : bottomHalfTopY;
      const currentHalfEndY = isTopHalf ? topHalfBottomY : margin;

      // Border for the half-sheet
      page.drawRectangle({
        x: margin,
        y: currentHalfEndY,
        width: width - 2 * margin,
        height: currentHalfStartY - currentHalfEndY,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });

      // Header - Logos only, with aspect ratio maintained and fine-tuned position
      const maxLogoHeight = 35; // Slightly smaller
      const univaScale = maxLogoHeight / univaLogo.height;
      const ceproaScale = maxLogoHeight / ceproaLogo.height;
      const logoY = currentHalfStartY - 10 - maxLogoHeight; // Position logos from the top of the half-sheet

      page.drawImage(univaLogo, { x: margin + 5, y: logoY, width: univaLogo.width * univaScale, height: univaLogo.height * univaScale });
      page.drawImage(ceproaLogo, { x: width - margin - (ceproaLogo.width * ceproaScale) - 5, y: logoY, width: ceproaLogo.width * ceproaScale, height: ceproaLogo.height * ceproaScale });

      // Observations Box (now includes Lugar de Destino)
      const observationsBoxX = margin + 200; // Adjusted X position to be further left
      const observationsBoxY = currentHalfStartY - 143; // Adjusted Y position to move DOWN by 3 pixels
      const observationsBoxWidth = width - 2 * margin - 200 - 10; // Adjusted width to extend left
      const observationsBoxHeight = 100; // Reverted height

      page.drawRectangle({
        x: observationsBoxX,
        y: observationsBoxY,
        width: observationsBoxWidth,
        height: observationsBoxHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 0.5,
      });

      // Lugar de Destino within the box
      page.drawText('Lugar de Destino:', {
        x: observationsBoxX + 5,
        y: observationsBoxY + observationsBoxHeight - 15,
        font: boldFont,
        size: 8,
      });
      // Single line for Lugar de Destino
      page.drawLine({ start: { x: observationsBoxX + 5, y: observationsBoxY + observationsBoxHeight - 20 }, end: { x: observationsBoxX + observationsBoxWidth - 5, y: observationsBoxY + observationsBoxHeight - 20 }, thickness: 0.5 });

      // Observaciones label (moved up)
      page.drawText('OBSERVACIONES', {
        x: observationsBoxX + 5, // Left-justified
        y: observationsBoxY + observationsBoxHeight - 35, // Adjusted Y position
        font: boldFont,
        size: 8,
      });

      // User Info
      let currentY = currentHalfStartY - 70; // Shifted up
      page.drawText('Datos de la reservación:', { x: margin + 5, y: currentY, font: boldFont, size: 9 });
      currentY -= 12;
      page.drawText(`ID de Reserva: ${data.displayId}`, { x: margin + 10, y: currentY, font: font, size: 8 });
      currentY -= 12;
      page.drawText(`Solicitante: ${data.userName}`, { x: margin + 10, y: currentY, font: font, size: 8 });
      currentY -= 12;
      page.drawText(`Matrícula/Nómina: ${data.userIdentifier}`, { x: margin + 10, y: currentY, font: font, size: 8 });
      currentY -= 12;
      page.drawText(`Teléfono: ${data.userPhoneNumber}`, { x: margin + 10, y: currentY, font: font, size: 8 });
      currentY -= 12; // Removed Lugar de Destino line
      page.drawText(`Fecha y Hora de Salida: ${new Date(data.startTime).toLocaleString()}`, { x: margin + 10, y: currentY, font: font, size: 8 });
      currentY -= 12;
      page.drawText(`Fecha y Hora de Regreso: ${new Date(data.endTime).toLocaleString()}`, { x: margin + 10, y: currentY, font: font, size: 8 });

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
      drawSignatureBlock(margin + 5 + 2 * (signatureLineLengthAdjusted + 5), 'Vigilancia (Salida)');
      drawSignatureBlock(margin + 5 + 3 * (signatureLineLengthAdjusted + 5), 'Vigilancia (Entrada)', undefined, true); // Mark as last to shorten line
    };

    const page = pdfDoc.addPage([612, 792]); // Explicitly set LETTER size (portrait) with numeric dimensions
    drawHalfSheet(page, pdfData, true); // Top half
    page.drawLine({ start: { x: 0, y: page.getSize().height / 2 }, end: { x: page.getSize().width, y: page.getSize().height / 2 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7), dashArray: [5, 5] }); // Cut line
    drawHalfSheet(page, pdfData, false); // Bottom half

    const pdfBytes = await pdfDoc.save();

    const asciiName = (`${firstReservation.user.firstName || ''} ${firstReservation.user.lastName || ''}`).trim().replace(/\s/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="hoja_salida_${asciiName}_${firstReservation.displayId}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generating exit sheet PDF:', error);
    return NextResponse.json({ error: 'Error interno del servidor al generar la hoja de salida.' }, { status: 500 });
  }
}
