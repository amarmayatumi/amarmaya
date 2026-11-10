import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/utils/supabaseServer';

export const dynamic = 'force-dynamic';

function hasSameOrigin(request, { requireOrigin = false } = {}) {
  const origin = request.headers.get('origin');
  // Browser POSTs must carry Origin. Reject missing Origin rather than treating
  // it as trusted; same-origin GET requests may legitimately omit it.
  if (!origin) return !requireOrigin;
  try {
    const requestHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
    return !!requestHost && new URL(origin).host.toLowerCase() === requestHost.toLowerCase();
  } catch {
    return false;
  }
}

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

function validUserData(data) {
  // Require the complete snapshot. Missing fields must never be defaulted to
  // empty values because that could overwrite an existing user's saved data.
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (!data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings)) return false;
  if (!Array.isArray(data.entries) || data.entries.length > 20000) return false;
  try {
    // Prevent oversized requests from exhausting memory/database storage.
    return Buffer.byteLength(JSON.stringify(data), 'utf8') <= 1_000_000;
  } catch {
    return false;
  }
}

export async function POST(request) {
  try {
    if (!hasSameOrigin(request, { requireOrigin: true })) return jsonResponse({ status: 'error', message: 'Cross-origin request blocked' }, 403);
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 1_100_000) return jsonResponse({ status: 'error', message: 'Request too large' }, 413);
    const { action, uid, data } = await request.json();

    if (action !== 'save' && action !== 'load') {
      return jsonResponse({ status: 'error', message: 'Invalid action' }, 400);
    }
    if (!validUid(uid)) {
      return jsonResponse({ status: 'error', message: 'Invalid uid' }, 400);
    }
    if (action === 'save' && !validUserData(data)) {
      return jsonResponse({ status: 'error', message: 'Invalid data' }, 400);
    }

    const db = getDb();
    if (!db) {
      return jsonResponse({ status: 'error', message: 'Database is not configured' }, 503);
    }

    // UID is the user's only recovery credential. It is generated with 128 bits
    // of cryptographic randomness and is sent in the POST body, not the URL.
    if (action === 'load') {
      const { data: saved, error } = await db
        .from('user_data')
        .select('settings, entries')
        .eq('uid', uid)
        .maybeSingle();
      if (error) {
        console.error('Supabase load error:', error);
        return jsonResponse({ status: 'error', message: 'Database read failed' }, 502);
      }
      if (!saved) return jsonResponse({ status: 'error', message: 'Data not found' }, 404);
      return jsonResponse({ status: 'success', data: saved, source: 'supabase' });
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
    if (!hasSameOrigin(request)) return jsonResponse({ status: 'error', message: 'Cross-origin request blocked' }, 403);
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const uid = searchParams.get('uid');

    const db = getDb();
    if (!db) return jsonResponse({ status: 'error', message: 'Database is not configured' }, 503);

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
