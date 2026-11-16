import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const secretKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default;
const publishableKey = Deno.env.get('SUPABASE_ANON_KEY') || JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}').default;
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
const response = (request: Request, body: Record<string, unknown>, status = 200) =>
  Response.json(body, { status, headers: corsHeaders(request) });

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) });
  if (request.method !== 'POST') return response(request, { error: 'Method not allowed.' }, 405);
  if (!secretKey || !publishableKey) return response(request, { error: 'Account deletion is not configured.' }, 503);

  const authorization = request.headers.get('Authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return response(request, { error: 'Please sign in before deleting your account.' }, 401);

  const userClient = createClient(supabaseUrl, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: { user }, error: authError } = await userClient.auth.getUser(token);
  if (authError || !user) return response(request, { error: 'Your session expired. Please sign in again.' }, 401);
  try {
    const encodedClaims = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(encodedClaims.padEnd(encodedClaims.length + (4 - encodedClaims.length % 4) % 4, '=')));
    const issuedAt = Number(claims.iat);
    const ageSeconds = Math.floor(Date.now() / 1000) - issuedAt;
    if (!Number.isFinite(issuedAt) || ageSeconds < -30 || ageSeconds > 300) {
      return response(request, { error: 'For your security, sign in again with your password before deleting your account.' }, 401);
    }
  } catch {
    return response(request, { error: 'For your security, sign in again with your password before deleting your account.' }, 401);
  }

  try {
    const { data: orders, error: ordersLoadError } = await adminClient
      .from('orders')
      .select('photo_paths')
      .eq('customer_user_id', user.id);
    if (ordersLoadError) throw new Error('Could not load your order data. Your account was not deleted.');

    const photoPaths = [...new Set((orders || []).flatMap((order) => Array.isArray(order.photo_paths) ? order.photo_paths : []))]
      .filter((path): path is string => typeof path === 'string' && path.startsWith(`${user.id}/`));
    if (photoPaths.length) {
      const { error: photoDeleteError } = await adminClient.storage.from('order-reference-photos').remove(photoPaths);
      if (photoDeleteError) throw new Error('Could not remove your order photos. Your account was not deleted. Please try again.');
    }

    const { error: orderDeleteError } = await adminClient.from('orders').delete().eq('customer_user_id', user.id);
    if (orderDeleteError) throw new Error('Could not remove your orders. Your account was not deleted. Please try again.');

    const { error: userDeleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (userDeleteError) throw new Error('Your orders were removed, but the account could not be deleted. Please contact Sukkar for help.');

    return response(request, { ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not delete the account. Please try again.';
    console.error('Customer account deletion failed', { userId: user.id, message });
    return response(request, { error: message }, 500);
  }
});
