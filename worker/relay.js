// SEMI-Talk 번역 중계소 (Cloudflare Worker)
// 폰의 SEMI-Talk → 이 중계소 → DeepL → 결과 반환
// 비밀 값 (Cloudflare 설정에 넣을 것, 코드에 쓰지 말 것):
//   DEEPL_KEY : DeepL API 키
//   APP_PASS  : SEMI-Talk 전용 비밀번호

const ALLOWED_ORIGIN = 'https://starseeker-harpseal.github.io';
const TARGETS = ['KO', 'JA', 'EN-US', 'EN-GB', 'ES'];
const SOURCES = ['KO', 'JA', 'EN', 'ES'];
const MAX_CHARS = 1000;

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-SEMI-Pass',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function reply(status, body, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(origin) }
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (origin !== ALLOWED_ORIGIN) return reply(403, { error: 'origin_not_allowed' }, origin);
    if (request.method !== 'POST') return reply(405, { error: 'post_only' }, origin);
    if (!env.DEEPL_KEY || !env.APP_PASS) return reply(500, { error: 'relay_not_configured' }, origin);
    if (request.headers.get('X-SEMI-Pass') !== env.APP_PASS) return reply(401, { error: 'wrong_password' }, origin);

    let body;
    try { body = await request.json(); } catch { return reply(400, { error: 'bad_json' }, origin); }

    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const target = String(body.target || '').toUpperCase();
    const source = body.source ? String(body.source).toUpperCase() : '';
    if (!text) return reply(400, { error: 'empty_text' }, origin);
    if (text.length > MAX_CHARS) return reply(400, { error: 'text_too_long' }, origin);
    if (!TARGETS.includes(target)) return reply(400, { error: 'bad_target' }, origin);
    if (source && !SOURCES.includes(source)) return reply(400, { error: 'bad_source' }, origin);

    const payload = { text: [text], target_lang: target };
    if (source) payload.source_lang = source;
    // 존댓말/반말: 지원 안 하는 언어(한국어 등)에서는 DeepL이 알아서 무시하는 prefer_ 값만 사용
    if (body.formality === 'more') payload.formality = 'prefer_more';
    if (body.formality === 'less') payload.formality = 'prefer_less';

    // 무료 키(:fx로 끝남)는 api-free 주소, 그 외는 일반 주소
    const host = env.DEEPL_KEY.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';

    let res;
    try {
      res = await fetch(`https://${host}/v2/translate`, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${env.DEEPL_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch {
      return reply(502, { error: 'deepl_unreachable' }, origin);
    }

    if (res.status === 456) return reply(429, { error: 'quota_used_up' }, origin);
    if (res.status === 403) return reply(502, { error: 'deepl_key_rejected' }, origin);
    if (!res.ok) return reply(502, { error: 'deepl_error', status: res.status }, origin);

    const data = await res.json();
    const t = data.translations && data.translations[0];
    if (!t) return reply(502, { error: 'deepl_empty' }, origin);
    return reply(200, { text: t.text, detected: t.detected_source_language }, origin);
  }
};
