
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getSupabaseSession } from '@/lib/supabase/utils';

export async function POST(request: Request): Promise<NextResponse> {
  const { user } = await getSupabaseSession(request);

  if (!user) {
    return NextResponse.json({ error: 'Acceso denegado. Se requiere autenticación.' }, { status: 401 });
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
    return NextResponse.json({ error: 'Error al procesar la subida de archivos.' }, { status: 500 });
  }
}
