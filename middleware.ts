import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value;
  console.log('DEBUG Middleware: Cookie de sesión recibida:', sessionCookie ? 'Sí, encontrada' : 'No, no encontrada');
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|login|register).*)',
  ],
};
