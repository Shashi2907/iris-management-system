import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing SUPABASE env for admin route');
}

const supabaseAdmin = createClient(url || '', serviceKey || '');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, level, vertical } = body;
    if (!email || !name) return NextResponse.json({ error: 'Missing name or email' }, { status: 400 });

    // create auth user (admin)
    const { data: createData, error: createErr } = await (supabaseAdmin as any).auth.admin.createUser({
      email,
      // generate a temporary password; user should reset via email
      password: Math.random().toString(36).slice(-8) + 'A1!',
      user_metadata: { name },
      email_confirm: true,
    });

    if (createErr) {
      return NextResponse.json({ error: createErr.message || createErr }, { status: 500 });
    }

    const user = createData?.user || createData;
    const userId = user?.id;

    if (!userId) return NextResponse.json({ error: 'Failed to create auth user' }, { status: 500 });

    // upsert profile with id set to auth user id
    const { error: profileErr } = await supabaseAdmin.from('profiles').upsert(
      [{ id: userId, email, level: (level || '').toUpperCase(), vertical: vertical }],
      { onConflict: 'email' }
    );

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message || profileErr }, { status: 500 });
    }

    return NextResponse.json({ userId });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('create-user error', err);
    return NextResponse.json({ error: err.message || err }, { status: 500 });
  }
}
