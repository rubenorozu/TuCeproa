
import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { Role } from '@prisma/client';

const secretKey = process.env.JWT_SECRET;
if (!secretKey) {
  throw new Error('JWT_SECRET is not set in the environment variables');
}
const key = new TextEncoder().encode(secretKey);

// --- Tipos de Sesión ---
interface SessionPayload {
  userId: string;
  role: Role;
}

// --- Funciones de Sesión --- //

/**
 * Encripta el payload de la sesión y lo establece como una cookie HTTPOnly.
 */
export async function createSession(userId: string, role: Role) {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días
  const sessionPayload: SessionPayload = { userId, role };

  const token = await new SignJWT(sessionPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);

  // --- CAMBIO CLAVE AQUÍ ---
  const cookieStore = await cookies(); // Obtener el almacén de cookies de forma explícita y AWAIT
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expires,
    sameSite: 'lax',
    path: '/',
  });
}

/**
 * Obtiene y verifica la sesión del usuario a partir de la cookie.
 * Diseñada para ser usada en API Routes y Server Components.
 */
export async function getServerSession(): Promise<{ user: { id: string; role: Role } } | null> {
  // --- CAMBIO CLAVE AQUÍ ---
  const cookieStore = await cookies(); // Obtener el almacén de cookies de forma explícita y AWAIT
  const token = cookieStore.get('session')?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    const sessionData = {
      user: {
        id: payload.userId as string,
        role: payload.role as Role,
      },
    };
    console.log('DEBUG API: getServerSession devuelve:', sessionData);
    return sessionData;
  } catch (e) {
    return null;
  }
}

/**
 * Elimina la cookie de sesión para cerrar la sesión del usuario.
 */
export async function deleteSession() {
  // --- CAMBIO CLAVE AQUÍ ---
  const cookieStore = await cookies(); // Obtener el almacén de cookies de forma explícita y AWAIT
  cookieStore.set('session', '', { expires: new Date(0) });
}
