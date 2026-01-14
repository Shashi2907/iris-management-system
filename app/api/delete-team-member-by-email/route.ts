import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Use admin client to delete user from auth by email
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Get user by email first
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      // eslint-disable-next-line no-console
      console.error('List users error', listError);
      return NextResponse.json(
        { error: listError.message },
        { status: 400 }
      );
    }

    const user = users?.users?.find((u: any) => u.email === email);

    if (!user) {
      return NextResponse.json({ success: true, message: 'User not found' });
    }

    // Delete user from auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      // eslint-disable-next-line no-console
      console.error('Auth delete error', deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('API error', e);
    return NextResponse.json(
      { error: (e as any).message },
      { status: 500 }
    );
  }
}
