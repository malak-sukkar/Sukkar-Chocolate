import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const secretKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default;
const adminClient = createClient(supabaseUrl, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
const allowedOrigins = new Set([
  'https://malak-sukkar.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);
const corsHeaders = (request: Request) => {
  const origin = request.headers.get('origin') || '';
  return {
    'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'https://malak-sukkar.github.io',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
};
const response = (request: Request, body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers: corsHeaders(request) });
const clean = (value: unknown, max: number) => String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
const digest = async (value: string) => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};
const clientAddress = (request: Request) => {
  const cloudflareAddress = request.headers.get('cf-connecting-ip');
  const forwardedAddresses = request.headers.get('x-forwarded-for')?.split(',').map((part) => part.trim()).filter(Boolean);
  return cloudflareAddress || forwardedAddresses?.at(-1) || request.headers.get('x-real-ip') || '';
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) });
  if (request.method !== 'POST') return response(request, { error: 'Method not allowed.' }, 405);
  if (!secretKey) return response(request, { error: 'Review submission is not configured.' }, 503);

  let payload: Record<string, unknown>;
  try { payload = await request.json(); } catch { return response(request, { error: 'Invalid request.' }, 400); }
  if (clean(payload.website, 200)) return response(request, { ok: true });

  const customerName = clean(payload.name, 60);
  const review = clean(payload.review, 500);
  const rating = Number(payload.rating);
  if (!customerName || !review || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return response(request, { error: 'Enter your name, a review, and a rating from 1 to 5 stars.' }, 400);
  }

  const address = clientAddress(request);
  if (!address) return response(request, { error: 'Please try submitting your review again.' }, 503);
  const addressKey = `review:${await digest(address)}`;
  const firstLimit = await adminClient.rpc('consume_rate_limit', { p_key: await digest(`${addressKey}:hour`), p_window_seconds: 3600, p_max_requests: 3 });
  if (firstLimit.error) {
    console.error('Review rate limit check failed', { message: firstLimit.error.message });
    return response(request, { error: 'Review submission is temporarily unavailable. Please try again later.' }, 503);
  }
  const dailyLimit = await adminClient.rpc('consume_rate_limit', { p_key: await digest(`${addressKey}:day`), p_window_seconds: 86400, p_max_requests: 10 });
  if (dailyLimit.error) {
    console.error('Review rate limit check failed', { message: dailyLimit.error.message });
    return response(request, { error: 'Review submission is temporarily unavailable. Please try again later.' }, 503);
  }
  if (firstLimit.data !== true || dailyLimit.data !== true) return response(request, { error: 'Too many reviews were submitted from this connection. Please try again later.' }, 429);

  const { error } = await adminClient.from('reviews').insert({
    customer_name: customerName,
    review,
    rating,
    is_published: false,
  });
  if (error) {
    console.error('Review submission failed', { message: error.message });
    return response(request, { error: 'We could not submit your review. Please try again.' }, 500);
  }
  return response(request, { ok: true });
});
