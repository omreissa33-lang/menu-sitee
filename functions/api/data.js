// GET  /api/data            -> بيانات المنيو العامة (بدون كلمة المرور)
// GET  /api/data?since=REV  -> {unchanged:true} لو مفيش تغيير
// PUT  /api/data            -> حفظ (يتطلب ترويسة X-Auth = هاش كلمة المرور)
const KEY = 'db';
const DEFAULT_HASH = 'ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f';
const json = (o, s = 200) => new Response(JSON.stringify(o), {
  status: s,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});

export async function onRequestGet({ request, env }) {
  const raw = await env.MENU_KV.get(KEY);
  if (!raw) return json({ empty: true }, 404);
  const db = JSON.parse(raw);
  const since = Number(new URL(request.url).searchParams.get('since') || 0);
  if (since && db.rev === since) return json({ unchanged: true, rev: db.rev });
  const { security, ...pub } = db;
  return json({ db: pub });
}

export async function onRequestPut({ request, env }) {
  const auth = request.headers.get('x-auth') || '';
  const text = await request.text();
  if (text.length > 24 * 1024 * 1024) return json({ error: 'too_large' }, 413);
  let body;
  try { body = JSON.parse(text); } catch (e) { return json({ error: 'bad_json' }, 400); }
  if (!body || !Array.isArray(body.items) || !Array.isArray(body.categories)) return json({ error: 'bad_data' }, 400);

  const raw = await env.MENU_KV.get(KEY);
  const current = raw ? (JSON.parse(raw).security || {}).passHash : DEFAULT_HASH;
  if (!auth || auth !== current) return json({ error: 'unauthorized' }, 401);

  const newHash = body.security && body.security.passHash;
  if (!/^[0-9a-f]{64}$/.test(newHash || '')) body.security = { passHash: current, hint: '' };

  await env.MENU_KV.put(KEY, JSON.stringify(body));
  return json({ ok: true, rev: body.rev });
}
