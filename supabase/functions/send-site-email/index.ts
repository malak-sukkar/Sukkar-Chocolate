import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const secretKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default;
const publishableKey = Deno.env.get('SUPABASE_ANON_KEY') || JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}').default;
const emailjsServiceId = Deno.env.get('EMAILJS_SERVICE_ID');
const emailjsTemplateId = Deno.env.get('EMAILJS_TEMPLATE_ID');
const emailjsPublicKey = Deno.env.get('EMAILJS_PUBLIC_KEY');
const emailjsPrivateKey = Deno.env.get('EMAILJS_PRIVATE_KEY');
const adminClient = createClient(supabaseUrl, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const response = (body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers: corsHeaders });
const validEmail = (value: unknown) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const clean = (value: unknown, max = 4000) => String(value ?? '').trim().slice(0, max);
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

function getSiteUrl(request: Request) {
  const candidate = Deno.env.get('SITE_URL') || request.headers.get('origin') || '';
  try {
    const site = new URL(candidate);
    if (site.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(site.hostname)) throw new Error();
    return site.origin;
  } catch {
    throw new Error('The website address is not configured for order links.');
  }
}

async function sendEmail({ to, subject, text, html, replyTo }: { to: string; subject: string; text: string; html?: string; replyTo?: string }) {
  const messageHtml = html || `<div style="font-family:Arial,sans-serif;line-height:1.6">${escapeHtml(text).replace(/\n/g, '<br/>')}</div>`;
  const result = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: emailjsServiceId,
      template_id: emailjsTemplateId,
      user_id: emailjsPublicKey,
      accessToken: emailjsPrivateKey,
      template_params: { to_email: to, subject, reply_to: replyTo || '', message_text: text, message_html: messageHtml },
    }),
  });
  if (!result.ok) throw new Error('The email service could not send the message. Check the EmailJS service and template setup.');
}

async function getOrder(orderId: string) {
  const { data, error } = await adminClient.from('orders').select('*').eq('id', orderId).maybeSingle();
  if (error) throw new Error('Could not load the order.');
  if (!data) throw new Error('Order not found.');
  return data;
}

async function getAdminEmail() {
  const { data, error } = await adminClient.from('site_settings').select('value').eq('key', 'email').maybeSingle();
  if (error) throw new Error('Could not load Sukkar’s email address.');
  const email = typeof data?.value === 'string' ? data.value : data?.value?.email;
  if (!validEmail(email)) throw new Error('Add Sukkar’s email address in the dashboard before sending messages.');
  return email.trim();
}

async function getOrderPhotoLinks(paths: string[] = []) {
  if (!paths.length) return [];
  const { data } = await adminClient.storage.from('order-reference-photos').createSignedUrls(paths, 86400);
  return (data || []).flatMap((file) => file.signedUrl ? [file.signedUrl.startsWith('http') ? file.signedUrl : `${supabaseUrl}/storage/v1${file.signedUrl}`] : []);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405);
  if (!emailjsServiceId || !emailjsTemplateId || !emailjsPublicKey || !emailjsPrivateKey || !secretKey || !publishableKey) return response({ error: 'Email sending is not configured yet.' }, 503);

  let payload: Record<string, unknown>;
  try { payload = await request.json(); } catch { return response({ error: 'Invalid request.' }, 400); }
  const type = clean(payload.type, 40);

  try {
    if (type === 'contact') {
      if (clean(payload.website, 200)) return response({ ok: true });
      const name = clean(payload.name, 100);
      const email = clean(payload.email, 254);
      const phone = clean(payload.phone, 40);
      const message = clean(payload.message, 4000);
      if (!name || !validEmail(email) || !message) return response({ error: 'Please provide your name, a valid email address, and a message.' }, 400);
      const adminEmail = await getAdminEmail();
      await sendEmail({ to: adminEmail, replyTo: email, subject: `Website message from ${name}`, text: `A customer sent Sukkar a message through the website.\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || 'Not provided'}\n\n${message}` });
      return response({ ok: true });
    }

    const authorization = request.headers.get('Authorization') || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!token) return response({ error: 'Please sign in before sending this message.' }, 401);
    const userClient = createClient(supabaseUrl, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) return response({ error: 'Your session expired. Please sign in again.' }, 401);

    const orderId = clean(payload.orderId, 40);
    const order = orderId ? await getOrder(orderId) : null;
    const isAdmin = user.app_metadata?.role === 'admin';
    if (type.startsWith('admin_') && !isAdmin) return response({ error: 'Only the Sukkar admin can send this message.' }, 403);
    if (!type.startsWith('admin_') && order && order.customer_user_id !== user.id) return response({ error: 'You can only message Sukkar about your own order.' }, 403);

    if (type === 'order_submitted') {
      if (!order || order.customer_user_id !== user.id) return response({ error: 'Order not found.' }, 404);
      const adminEmail = await getAdminEmail();
      const photoLinks = await getOrderPhotoLinks(order.photo_paths || []);
      const orderText = `New custom order request ${order.id}\n\nCustomer: ${order.customer_name}\nEmail: ${order.email}\nPhone: ${order.phone}\nCollection date: ${order.collection_date}\nPreferred time: ${order.preferred_collection_time}\nAllergies: ${order.allergies || 'No'}\n\nIdea:\n${order.description}${photoLinks.length ? `\n\nReference photos (available for 24 hours):\n${photoLinks.join('\n')}` : ''}`;
      await sendEmail({ to: adminEmail, replyTo: order.email, subject: `New Sukkar order request ${order.id}`, text: orderText });
      await new Promise((resolve) => setTimeout(resolve, 1100));
      await sendEmail({ to: order.email, replyTo: adminEmail, subject: `We received your Sukkar request ${order.id}`, text: `Hello ${order.customer_name},\n\nThank you for your custom order request. Sukkar has received it and will email you about the price and details.\n\nOrder reference: ${order.id}\nCollection date: ${order.collection_date}\n\nYou can check its progress in My orders on the website.` });
      return response({ ok: true });
    }

    if (type === 'order_question') {
      if (!order || order.customer_user_id !== user.id) return response({ error: 'Order not found.' }, 404);
      const adminEmail = await getAdminEmail();
      await sendEmail({ to: adminEmail, replyTo: order.email, subject: `Customer question about order ${order.id}`, text: `${order.customer_name} asked Sukkar for an update about order ${order.id}.\n\nCustomer email: ${order.email}\nPhone: ${order.phone}` });
      return response({ ok: true });
    }

    if (type === 'customer_price_response') {
      if (!order || order.customer_user_id !== user.id) return response({ error: 'Order not found.' }, 404);
      const adminEmail = await getAdminEmail();
      const accepted = payload.accepted === true;
      await sendEmail({ to: adminEmail, replyTo: order.email, subject: `${order.customer_name} ${accepted ? 'accepted' : 'declined'} the price for ${order.id}`, text: `${order.customer_name} ${accepted ? 'accepted' : 'declined'} the price proposal for order ${order.id}.\n\nProposed price: ${order.agreed_cost || 'Not available'}\nCustomer email: ${order.email}` });
      return response({ ok: true });
    }

    if (type === 'admin_order_rejected' || type === 'admin_price_proposal' || type === 'admin_ready_collection') {
      if (!order || !isAdmin) return response({ error: 'Order not found.' }, 404);
      const name = order.customer_name || 'there';
      let subject = '';
      let text = '';
      if (type === 'admin_order_rejected') {
        subject = `Update about Sukkar order ${order.id}`;
        text = `Hello ${name},\n\nThank you for your Sukkar order request ${order.id}. We’re sorry, but we can’t accept this request. Please reply to this email if you’d like to discuss another date or idea.`;
      } else if (type === 'admin_price_proposal') {
        const orderUrl = `${getSiteUrl(request)}/my-orders#order-${encodeURIComponent(order.id)}`;
        subject = `Price proposal for Sukkar order ${order.id}`;
        text = `Hello ${name},\n\nWe’ve accepted your Sukkar order request ${order.id} and propose a price of ${order.agreed_cost || 'the amount shown in My orders'}. Open your order to accept or reject the price:\n${orderUrl}\n\nThank you!`;
        const html = `<div style="font-family:Arial,sans-serif;color:#382b24;line-height:1.6;max-width:560px;margin:0 auto;padding:28px"><p>Hello ${escapeHtml(name)},</p><p>We’ve accepted your Sukkar order request <strong>${escapeHtml(order.id)}</strong> and propose a price of <strong>${escapeHtml(order.agreed_cost || 'the amount shown in My orders')}</strong>.</p><p>Open your order to accept or reject the price:</p><p style="margin:28px 0"><a href="${escapeHtml(orderUrl)}" style="display:inline-block;padding:13px 22px;background:#382b24;color:#fff8ec;text-decoration:none;border-radius:3px;font-weight:600">View your order</a></p><p>Thank you!<br/>Sukkar Chocolate</p></div>`;
        await sendEmail({ to: order.email, replyTo: await getAdminEmail(), subject, text, html });
        return response({ ok: true });
      } else {
        subject = `Your Sukkar order ${order.id} is ready for collection`;
        text = `Hello ${name},\n\nYour Sukkar order ${order.id} is ready for collection on ${order.collection_date} at ${order.collection_time}. The agreed total is ${order.agreed_cost}. We look forward to seeing you!`;
      }
      await sendEmail({ to: order.email, replyTo: await getAdminEmail(), subject, text });
      return response({ ok: true });
    }

    return response({ error: 'Unknown email message type.' }, 400);
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : 'The email could not be sent.' }, 500);
  }
});
