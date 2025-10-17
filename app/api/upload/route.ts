
import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { getServerSession } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function POST(request: Request) {
  const session = await getServerSession();

  // Proteger esta ruta para que solo usuarios logueados puedan subir imágenes
  // Opcional: Podríamos restringirlo a roles específicos si solo admins suben imágenes
  if (!session) {
    return NextResponse.json({ error: 'Acceso denegado. Se requiere autenticación.' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No se han subido archivos.' }, { status: 400 });
    }

    const uploadedImageUrls: string[] = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      const filePath = path.join(uploadDir, filename);

      // Asegurarse de que el directorio de subida exista (opcional, pero buena práctica)
      // import { mkdir } from 'fs/promises';
      // await mkdir(uploadDir, { recursive: true });

      await writeFile(filePath, buffer);
      uploadedImageUrls.push(`/uploads/${filename}`);
    }

    return NextResponse.json({ urls: uploadedImageUrls }, { status: 200 });
  } catch (error) {
    console.error('Error al subir archivos:', error);
    return NextResponse.json({ error: 'Error al procesar la subida de archivos.' }, { status: 500 });
  }
}
