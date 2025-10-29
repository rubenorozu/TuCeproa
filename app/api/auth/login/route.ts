import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Correo electrónico y contraseña son obligatorios.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 });
    }

    // Create session using the centralized function
    await createSession(user.id, user.role);

    // Remove password from the user object before sending it back
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({ message: 'Inicio de sesión exitoso', user: userWithoutPassword }, { status: 200 });

  } catch (error) {
    console.error('Error en el inicio de sesión:', error);
    return NextResponse.json({ message: 'Algo salió mal en el servidor.' }, { status: 500 });
  }
}
