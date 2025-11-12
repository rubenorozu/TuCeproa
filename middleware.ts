import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from './lib/auth'; // Adjust path as needed
import { Role } from '@prisma/client';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

      // Proteger rutas /admin
      if (pathname.startsWith('/admin')) {
        console.log('--- MIDDLEWARE: Accessing /admin route ---');
        const session = await getServerSession();
        console.log('--- MIDDLEWARE: Session in /admin ---', session);
  
        if (!session) {
          console.log('--- MIDDLEWARE: No session for /admin, redirecting to login ---');
          // No hay sesión, redirigir a login
          const loginUrl = new URL('/login', request.url);
          loginUrl.searchParams.set('callbackUrl', pathname);
          return NextResponse.redirect(loginUrl);
        }
  
        // Verificar roles para rutas /admin
        const allowedAdminRoles = [Role.SUPERUSER, Role.ADMIN_RESOURCE, Role.ADMIN_RESERVATION, Role.CALENDAR_VIEWER];
        console.log('--- MIDDLEWARE: User role for /admin ---', session.user.role);
        console.log('--- MIDDLEWARE: Allowed roles for /admin ---', allowedAdminRoles);
        if (!allowedAdminRoles.some(role => role === session.user.role)) {
          console.log('--- MIDDLEWARE: Role not allowed for /admin, redirecting to / ---');
          // Rol no autorizado, redirigir a home o mostrar error
          return NextResponse.redirect(new URL('/', request.url));
        }
        console.log('--- MIDDLEWARE: Role allowed for /admin, proceeding ---');
      }  // Proteger rutas /vigilancia
  else if (pathname.startsWith('/vigilancia')) {
    const session = await getServerSession();

    if (!session) {
      // No hay sesión, redirigir a login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verificar roles para rutas /vigilancia
    const allowedVigilanciaRoles = [Role.SUPERUSER, Role.VIGILANCIA];
    if (!allowedVigilanciaRoles.some(role => role === session.user.role)) {
      // Rol no autorizado, redirigir a home
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
