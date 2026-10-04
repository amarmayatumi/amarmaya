import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/utils/supabaseServer';

export const dynamic = 'force-dynamic';

function jsonResponse(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function validUid(uid) {
  return typeof uid === 'string' && /^U[a-f0-9]{32}$/i.test(uid);
}

function getDb() {
  return getSupabaseServer();
}

export async function POST(request) {
  try {
    const { action, uid, data } = await request.json();

    if (action !== 'save') {
      return jsonResponse({ status: 'error', message: 'Invalid action' }, 400);
    }
    if (!validUid(uid) || !data || typeof data !== 'object') {
      return jsonResponse({ status: 'error', message: 'Invalid uid or data' }, 400);
    }

    const db = getDb();
    if (!db) {
      return jsonResponse({ status: 'error', message: 'Database is not configured' }, 503);
    }

    const { error } = await db.from('user_data').upsert({
      uid,
      settings: data.settings || {},
      entries: Array.isArray(data.entries) ? data.entries : [],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'uid' });

    if (error) {
      console.error('Supabase save error:', error);
      return jsonResponse({ status: 'error', message: 'Database save failed' }, 502);
    }

    return jsonResponse({ status: 'success', source: 'supabase' });
  } catch (error) {
    console.error('User API POST error:', error);
    return jsonResponse({ status: 'error', message: 'Invalid request' }, 400);
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const uid = searchParams.get('uid');

    const db = getDb();
    if (!db) return jsonResponse({ status: 'error', message: 'Database is not configured' }, 503);

    if (action === 'load') {
      if (!validUid(uid)) return jsonResponse({ status: 'error', message: 'Invalid uid' }, 400);

      const { data, error } = await db
        .from('user_data')
        .select('settings, entries')
        .eq('uid', uid)
        .maybeSingle();

      if (error) {
        console.error('Supabase load error:', error);
        return jsonResponse({ status: 'error', message: 'Database read failed' }, 502);
      }
      if (!data) return jsonResponse({ status: 'error', message: 'Data not found' }, 404);

      return jsonResponse({ status: 'success', data, source: 'supabase' });
    }

    if (action === 'get_campaign' || action === 'get_countdown') {
      const id = action === 'get_campaign' ? 'campaign' : 'countdown';
      const { data, error } = await db.from('app_settings').select('value').eq('id', id).maybeSingle();

      if (error) {
        console.error(`Supabase ${action} error:`, error);
        return jsonResponse({ status: 'error', message: 'Database read failed' }, 502);
      }

      return jsonResponse({ status: 'success', data: data?.value ?? null, source: 'supabase' });
    }

    return jsonResponse({ status: 'error', message: 'Invalid action' }, 400);
  } catch (error) {
    console.error('User API GET error:', error);
    return jsonResponse({ status: 'error', message: 'Invalid request' }, 400);
  }
}
