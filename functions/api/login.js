// POST /api/login {hash} -> يرجّع كل البيانات (شاملة الأمان) لو الهاش صحيح
const KEY = 'db';
const DEFAULT_HASH = 'ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f';
const json = (o, s = 200) => new Response(JSON.stringify(o), {
  status: s,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});

export async function onRequestPost({ request, env }) {
  let hash = '';
  try { hash = (await request.json()).hash || ''; } catch (e) {}
  const raw = await env.MENU_KV.get(KEY);
  if (!raw) {
    // لسه مفيش بيانات على السيرفر: الدخول الأول بكلمة المرور الافتراضية
    return hash === DEFAULT_HASH ? json({ ok: true, empty: true }) : json({ error: 'wrong' }, 401);
  }
  const db = JSON.parse(raw);
  if (hash !== (db.security || {}).passHash) return json({ error: 'wrong' }, 401);
  return json({ ok: true, db });
}
