import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

interface UserPayload {
  userId: string;
  role: string;
  iat: number;
  exp: number;
}

export async function POST(request: Request): Promise<NextResponse> {
  const cookieStore = cookies();
  const tokenCookie = cookieStore.get('session');
  if (!tokenCookie) {
    return NextResponse.json({ error: 'Acceso denegado. Se requiere autenticación.' }, { status: 401 });
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify<UserPayload>(tokenCookie.value, secret);
  } catch (err) {
    return NextResponse.json({ error: 'La sesión no es válida.' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No se han subido archivos.' }, { status: 400 });
    }

    const blobs = await Promise.all(
      files.map(async (file) => {
        const uniqueFilename = `${Date.now()}-${file.name}`;
        const blob = await put(uniqueFilename, file, {
          access: 'public',
        });
        return blob;
      })
    );

    return NextResponse.json({ urls: blobs.map(b => b.url) }, { status: 200 });

  } catch (error) {
    console.error('Error al subir archivos a Vercel Blob:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json({ error: 'Error al procesar la subida de archivos.' }, { status: 500 });
  }
}
