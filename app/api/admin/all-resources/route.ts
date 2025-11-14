import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { Role } from '@prisma/client';

const allowedAdminRoles: Role[] = [Role.SUPERUSER, Role.ADMIN_RESOURCE, Role.ADMIN_RESERVATION];

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || !allowedAdminRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Utiliza el cliente de Supabase con rol de servicio para saltarse el RLS
    const supabaseAdmin = createAdminClient();
    
    // Obtenemos los espacios y equipos en paralelo
    const [spacesResponse, equipmentResponse] = await Promise.all([
      supabaseAdmin.from('Space').select('*'),
      supabaseAdmin.from('Equipment').select('*')
    ]);

    if (spacesResponse.error) throw spacesResponse.error;
    if (equipmentResponse.error) throw equipmentResponse.error;

    return NextResponse.json({ spaces: spacesResponse.data, equipment: equipmentResponse.data });

  } catch (error: any) {
    console.error('Error fetching all resources:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
