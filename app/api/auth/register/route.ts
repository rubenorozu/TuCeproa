import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const ALLOWED_DOMAINS = ['univa.mx', 'alumnos.univa.mx'];

export async function POST(req: Request) {
  try {
    const { firstName, lastName, identifier, email, password, phoneNumber } = await req.json();

    if (!firstName || !lastName || !identifier || !email || !password) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }

    // Password complexity validation
    if (password.length < 8) {
      return NextResponse.json({ message: 'La contraseña debe tener al menos 8 caracteres.' }, { status: 400 });
    }
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json({ message: 'La contraseña debe contener al menos una letra mayúscula.' }, { status: 400 });
    }
    if (!/[a-z]/.test(password)) {
      return NextResponse.json({ message: 'La contraseña debe contener al menos una letra minúscula.' }, { status: 400 });
    }
    if (!/[0-9]/.test(password)) {
      return NextResponse.json({ message: 'La contraseña debe contener al menos un número.' }, { status: 400 });
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      return NextResponse.json({ message: 'La contraseña debe contener al menos un carácter especial.' }, { status: 400 });
    }

    const domain = email.split('@')[1];
    if (!ALLOWED_DOMAINS.includes(domain)) {
      return NextResponse.json({ message: 'Invalid email domain' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ message: 'User with that email already exists' }, { status: 409 });
    }

    const existingIdentifier = await prisma.user.findUnique({
      where: { identifier },
    });

    if (existingIdentifier) {
      return NextResponse.json({ message: 'User with that identifier already exists' }, { status: 409 });
    }

    const hashedPassword = await hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await prisma.user.create({
      data: {
        displayId: `USR_${identifier}`,
        firstName,
        lastName,
        identifier,
        email,
        password: hashedPassword,
        phoneNumber,
        verificationToken,
      },
    });

    // In a real app, you would send an email with the verification link
    const verificationLink = `http://localhost:3000/verify-email?token=${verificationToken}`;
    console.log(`
--- SIMULATED EMAIL ---
`);
    console.log(`To: ${email}`);
    console.log(`Subject: Verify your email address`);
    console.log(`Click this link to verify your email: ${verificationLink}`);
    console.log(`
-----------------------
`);

    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
}