import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/utils/supabaseServer';
import { createAdminToken, verifyAdminPassword, verifyAdminToken } from '@/utils/adminAuth';

export const dynamic = 'force-dynamic';

function jsonResponse(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function dbOrError() {
  const db = getSupabaseServer();
  if (!db) return null;
  return db;
}

function isValidUid(uid) {
  return typeof uid === 'string' && /^U[a-f0-9]{32}$/i.test(uid);
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const { action, password, token, uid, data, message, start, end, countdownEnabled, countdownName, countdownDate } = payload;

    if (action === 'admin_login') {
      try {
        if (!verifyAdminPassword(password)) {
          return jsonResponse({ status: 'error', message: 'Invalid Password' }, 401);
        }
        return jsonResponse({ status: 'success', data: { token: createAdminToken() } });
      } catch (error) {
        console.error('Admin auth configuration error:', error);
        return jsonResponse({ status: 'error', message: 'Admin authentication is not configured' }, 503);
      }
    }

    if (!verifyAdminToken(token)) {
      return jsonResponse({ status: 'error', message: 'Unauthorized' }, 403);
    }

    const db = dbOrError();
    if (!db) return jsonResponse({ status: 'error', message: 'Database is not configured' }, 503);

    if (action === 'save') {
      if (!isValidUid(uid) || !data || typeof data !== 'object' || Array.isArray(data) || !data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings) || !Array.isArray(data.entries) || data.entries.length > 20000 || Buffer.byteLength(JSON.stringify(data), 'utf8') > 1_000_000) {
        return jsonResponse({ status: 'error', message: 'Invalid uid or data' }, 400);
      }

      const { error } = await db.from('user_data').upsert({
        uid,
        settings: data.settings || {},
        entries: Array.isArray(data.entries) ? data.entries : [],
        updated_at: new Date().toISOString(),
      }, { onConflict: 'uid' });

      if (error) {
        console.error('Admin save error:', error);
        return jsonResponse({ status: 'error', message: 'Database save failed' }, 502);
      }
      return jsonResponse({ status: 'success', source: 'supabase' });
    }

    if (action === 'delete_user') {
      if (!isValidUid(uid)) return jsonResponse({ status: 'error', message: 'Invalid uid' }, 400);
      const { error } = await db.from('user_data').delete().eq('uid', uid);
      if (error) {
        console.error('Admin delete error:', error);
        return jsonResponse({ status: 'error', message: 'Database delete failed' }, 502);
      }
      return jsonResponse({ status: 'success', source: 'supabase' });
    }

    if (action === 'save_campaign') {
      const campaignData = { message: message || '', start: Number(start) || Date.now(), end: Number(end) || Date.now() };
      const { error } = await db.from('app_settings').upsert({ id: 'campaign', value: campaignData }, { onConflict: 'id' });
      if (error) {
        console.error('Campaign save error:', error);
        return jsonResponse({ status: 'error', message: 'Database save failed' }, 502);
      }
      return jsonResponse({ status: 'success', source: 'supabase' });
    }

    if (action === 'save_countdown') {
      const countdownData = { enabled: !!countdownEnabled, name: countdownName || '', date: countdownDate || '' };
      const { error } = await db.from('app_settings').upsert({ id: 'countdown', value: countdownData }, { onConflict: 'id' });
      if (error) {
        console.error('Countdown save error:', error);
        return jsonResponse({ status: 'error', message: 'Database save failed' }, 502);
      }
      return jsonResponse({ status: 'success', source: 'supabase' });
    }

    if (action === 'list_users') {
      const { data: users, error } = await db
        .from('user_data')
        .select('uid, settings, entries, updated_at')
        .order('updated_at', { ascending: false })
        .limit(10000);

      if (error) {
        console.error('List users error:', error);
        return jsonResponse({ status: 'error', message: 'Database read failed' }, 502);
      }

      const formatted = users.map((u) => ({
        uid: u.uid,
        last_modified: new Date(u.updated_at || Date.now()).getTime() / 1000,
        name: u.settings?.name || 'Unknown',
        entries: Array.isArray(u.entries) ? u.entries.length : 0,
        settings: u.settings || {},
      }));
      return jsonResponse({ status: 'success', data: formatted, source: 'supabase' });
    }

    if (action === 'get_user_full') {
      if (!isValidUid(uid)) return jsonResponse({ status: 'error', message: 'Invalid uid' }, 400);
      const { data, error } = await db.from('user_data').select('settings, entries').eq('uid', uid).maybeSingle();
      if (error) {
        console.error('Get user error:', error);
        return jsonResponse({ status: 'error', message: 'Database read failed' }, 502);
      }
      if (!data) return jsonResponse({ status: 'error', message: 'User not found' }, 404);
      return jsonResponse({ status: 'success', data, source: 'supabase' });
    }

    return jsonResponse({ status: 'error', message: 'Invalid action' }, 400);
  } catch (error) {
    console.error('Admin API POST error:', error);
    return jsonResponse({ status: 'error', message: 'Invalid request' }, 400);
  }
}
