const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseReady = Boolean(url && publishableKey);
export const getAdminSession = () => {
  try { return JSON.parse(localStorage.getItem('sukkar-admin-session') || 'null'); } catch { return null; }
};
export const getCustomerSession = () => {
  try { return JSON.parse(localStorage.getItem('sukkar-customer-session') || 'null'); } catch { return null; }
};

async function hashPreviewPassword(password, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100_000, hash: 'SHA-256' }, key, 256);
  return [...new Uint8Array(bits)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function savePreviewSession(user) {
  const session = { access_token: `preview-${crypto.randomUUID()}`, user: { id: user.id, email: user.email, user_metadata: { full_name: user.name } } };
  localStorage.setItem('sukkar-customer-session', JSON.stringify(session));
  return session;
}

async function request(path, { method = 'GET', body, token, headers = {} } = {}) {
  const response = await fetch(`${url}${path}`, {
    method,
    headers: { apikey: publishableKey, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || data?.msg || data?.error || 'The request could not be completed.');
  return data;
}

export async function sendSiteEmail(type, payload = {}, session) {
  if (!supabaseReady) throw new Error('Email sending needs the connected Sukkar website account.');
  let token;
  if (session) {
    const isAdminSession = session.user?.app_metadata?.role === 'admin';
    const fresh = isAdminSession ? await freshSession(session) : await freshCustomerSession(session);
    token = fresh?.access_token;
  }
  return request('/functions/v1/send-site-email', { method: 'POST', body: { type, ...payload }, token });
}

export async function updateAdminEmail(email, session) {
  session = await freshSession(session);
  if (!session?.access_token) throw new Error('Please sign in again before changing your email.');
  return request('/auth/v1/user', { method: 'PUT', body: { email }, token: session.access_token });
}

export async function updateAdminPassword(password, session) {
  session = await freshSession(session);
  if (!session?.access_token) throw new Error('Please sign in again before changing your password.');
  return request('/auth/v1/user', { method: 'PUT', body: { password }, token: session.access_token });
}

export async function updateCustomerEmail(email, session) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!supabaseReady) {
    const accounts = JSON.parse(localStorage.getItem('sukkar-preview-accounts') || '[]');
    if (accounts.some((account) => account.id !== session?.user?.id && account.email === normalizedEmail)) {
      throw new Error('An account with this email already exists in this browser. Choose another email address.');
    }
    const accountIndex = accounts.findIndex((account) => account.id === session?.user?.id);
    if (accountIndex < 0) throw new Error('Could not find this preview account. Please sign in again.');
    accounts[accountIndex] = { ...accounts[accountIndex], email: normalizedEmail };
    localStorage.setItem('sukkar-preview-accounts', JSON.stringify(accounts));
    const updatedSession = { ...session, user: { ...session.user, email: normalizedEmail } };
    localStorage.setItem('sukkar-customer-session', JSON.stringify(updatedSession));
    window.dispatchEvent(new Event('sukkar-customer-auth'));
    return updatedSession.user;
  }
  session = await freshCustomerSession(session);
  if (!session?.access_token) throw new Error('Please sign in again before changing your email.');
  const user = await request('/auth/v1/user', { method: 'PUT', body: { email: normalizedEmail }, token: session.access_token });
  localStorage.setItem('sukkar-customer-session', JSON.stringify({ ...session, user }));
  window.dispatchEvent(new Event('sukkar-customer-auth'));
  return user;
}

export async function updateCustomerPassword(password, session) {
  if (!supabaseReady) {
    const accounts = JSON.parse(localStorage.getItem('sukkar-preview-accounts') || '[]');
    const accountIndex = accounts.findIndex((account) => account.id === session?.user?.id);
    if (accountIndex < 0) throw new Error('Could not find this preview account. Please sign in again.');
    const salt = [...crypto.getRandomValues(new Uint8Array(16))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    accounts[accountIndex] = { ...accounts[accountIndex], salt, passwordHash: await hashPreviewPassword(password, salt) };
    localStorage.setItem('sukkar-preview-accounts', JSON.stringify(accounts));
    return;
  }
  session = await freshCustomerSession(session);
  if (!session?.access_token) throw new Error('Please sign in again before changing your password.');
  await request('/auth/v1/user', { method: 'PUT', body: { password }, token: session.access_token });
}

export async function signInAdmin(email, password) {
  const session = await request('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
  const role = session.user?.app_metadata?.role;
  if (role !== 'admin') throw new Error('This account does not have dashboard access. Ask the site owner to grant the admin role.');
  localStorage.setItem('sukkar-admin-session', JSON.stringify(session));
  return session;
}

export async function registerCustomer(name, email, password) {
  if (!supabaseReady) {
    const accounts = JSON.parse(localStorage.getItem('sukkar-preview-accounts') || '[]');
    const normalizedEmail = email.trim().toLowerCase();
    if (accounts.some((account) => account.email === normalizedEmail)) throw new Error('An account with this email already exists in this browser. Please sign in.');
    const salt = [...crypto.getRandomValues(new Uint8Array(16))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    const account = { id: crypto.randomUUID(), name: name.trim(), email: normalizedEmail, salt, passwordHash: await hashPreviewPassword(password, salt) };
    localStorage.setItem('sukkar-preview-accounts', JSON.stringify([...accounts, account]));
    return { session: savePreviewSession(account), user: { id: account.id, email: account.email, user_metadata: { full_name: account.name } } };
  }
  return request('/auth/v1/signup', { method: 'POST', body: { email, password, data: { full_name: name } } });
}

export async function signInCustomer(email, password) {
  if (!supabaseReady) {
    const normalizedEmail = email.trim().toLowerCase();
    const accounts = JSON.parse(localStorage.getItem('sukkar-preview-accounts') || '[]');
    const account = accounts.find((item) => item.email === normalizedEmail);
    if (!account || await hashPreviewPassword(password, account.salt) !== account.passwordHash) throw new Error('Email or password is incorrect.');
    const session = savePreviewSession(account);
    window.dispatchEvent(new Event('sukkar-customer-auth'));
    return session;
  }
  const session = await request('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
  localStorage.setItem('sukkar-customer-session', JSON.stringify(session));
  return session;
}

export function signOutCustomer() { localStorage.removeItem('sukkar-customer-session'); }

export function signOutAdmin() { localStorage.removeItem('sukkar-admin-session'); }

async function freshSession(session) {
  if (!session?.refresh_token || (session.expires_at && session.expires_at * 1000 > Date.now() + 60_000)) return session;
  const refreshed = await request('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: session.refresh_token } });
  localStorage.setItem('sukkar-admin-session', JSON.stringify(refreshed));
  return refreshed;
}

async function freshCustomerSession(session) {
  if (!session?.refresh_token || (session.expires_at && session.expires_at * 1000 > Date.now() + 60_000)) return session;
  const refreshed = await request('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: session.refresh_token } });
  localStorage.setItem('sukkar-customer-session', JSON.stringify(refreshed));
  window.dispatchEvent(new Event('sukkar-customer-auth'));
  return refreshed;
}

export async function createRemoteOrder(order, files, customerSession) {
  customerSession = await freshCustomerSession(customerSession);
  if (!customerSession?.access_token || !customerSession.user?.id) throw new Error('Please sign in again before placing your order.');
  const token = crypto.randomUUID();
  const photos = [];
  for (const file of files) {
    const objectPath = `${customerSession.user.id}/${token}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const response = await fetch(`${url}/storage/v1/object/order-reference-photos/${objectPath.split('/').map(encodeURIComponent).join('/')}`, {
      method: 'POST', headers: { apikey: publishableKey, Authorization: `Bearer ${customerSession.access_token}`, 'Content-Type': file.type, 'x-upsert': 'false' }, body: file,
    });
    if (!response.ok) throw new Error('A reference photo could not be uploaded. Please try again.');
    photos.push(objectPath);
  }
  const photoUrls = await Promise.all(photos.map((path) => signedCustomerOrderPhoto(path, customerSession)));
  await request('/rest/v1/orders', { method: 'POST', token: customerSession.access_token, body: { id: order.id, tracking_token: token, customer_user_id: customerSession.user.id, customer_first_name: order.firstName, customer_last_name: order.lastName, customer_name: order.name, phone: order.phone, email: order.email, description: order.description, collection_date: order.date, preferred_collection_time: order.preferredPickupTime, collection_time: null, allergies: order.allergies, photo_paths: photos, status: 'Awaiting details' }, headers: { Prefer: 'return=minimal' } });
  return { ...order, trackingToken: token, photoPaths: photos, photoUrls };
}

export async function getRemoteOrderStatus(order) {
  if (!order.trackingToken) return null;
  const rows = await request('/rest/v1/rpc/get_order_status', { method: 'POST', body: { p_order_id: order.id, p_tracking_token: order.trackingToken } });
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function respondToPrice(orderId, accept, session) {
  session = await freshCustomerSession(session);
  if (!session?.access_token) throw new Error('Please sign in again to respond to this price.');
  return request('/rest/v1/rpc/respond_to_order_price', { method: 'POST', body: { p_order_id: orderId, p_accept: accept }, token: session.access_token });
}

export async function listRemoteOrders(session) {
  session = await freshSession(session);
  const rows = await request('/rest/v1/orders?select=*&status=neq.collected&order=created_at.desc', { token: session.access_token });
  return rows.map((row) => ({ id: row.id, firstName: row.customer_first_name || '', lastName: row.customer_last_name || '', name: row.customer_name, phone: row.phone, email: row.email, description: row.description, date: row.collection_date, allergies: row.allergies, photoPaths: row.photo_paths || [], cost: row.agreed_cost || '', preferredPickupTime: row.preferred_collection_time || '', pickupTime: row.collection_time || '', status: row.status, createdAt: row.created_at }));
}

export async function listCustomerOrders(session) {
  session = await freshCustomerSession(session);
  const fields = 'id,customer_first_name,customer_last_name,customer_name,description,collection_date,allergies,agreed_cost,preferred_collection_time,collection_time,status,created_at';
  const rows = await request(`/rest/v1/orders?select=${fields}&customer_user_id=eq.${encodeURIComponent(session.user.id)}&status=neq.collected&order=created_at.desc`, { token: session.access_token });
  return rows.map((row) => ({ id: row.id, firstName: row.customer_first_name || '', lastName: row.customer_last_name || '', name: row.customer_name, description: row.description, date: row.collection_date, allergies: row.allergies, cost: row.agreed_cost || '', preferredPickupTime: row.preferred_collection_time || '', pickupTime: row.collection_time || '', status: row.status, createdAt: row.created_at }));
}

export async function updateRemoteOrder(id, patch, session) {
  session = await freshSession(session);
  const names = { cost: 'agreed_cost', pickupTime: 'collection_time' };
  const mapped = Object.fromEntries(Object.entries(patch).map(([key, value]) => [names[key] || key, value]));
  return request(`/rest/v1/orders?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: mapped, token: session.access_token, headers: { Prefer: 'return=minimal' } });
}

export async function deleteRemoteOrder(id, session) {
  session = await freshSession(session);
  return request(`/rest/v1/orders?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', token: session.access_token, headers: { Prefer: 'return=minimal' } });
}

export async function signedOrderPhoto(path, session) {
  session = await freshSession(session);
  const result = await request(`/storage/v1/object/sign/order-reference-photos/${path.split('/').map(encodeURIComponent).join('/')}`, { method: 'POST', body: { expiresIn: 3600 }, token: session.access_token });
  return result.signedURL?.startsWith('http') ? result.signedURL : `${url}/storage/v1${result.signedURL}`;
}

export async function signedCustomerOrderPhoto(path, session) {
  session = await freshCustomerSession(session);
  const result = await request(`/storage/v1/object/sign/order-reference-photos/${path.split('/').map(encodeURIComponent).join('/')}`, { method: 'POST', body: { expiresIn: 86400 }, token: session.access_token });
  return result.signedURL?.startsWith('http') ? result.signedURL : `${url}/storage/v1${result.signedURL}`;
}

const galleryPublicUrl = (path) => `${url}/storage/v1/object/public/gallery-photos/${path.split('/').map(encodeURIComponent).join('/')}`;
const adminToken = async (session) => (await freshSession(session))?.access_token;

export async function loadPublicContent(session) {
  if (!supabaseReady) return null;
  const token = session ? await adminToken(session) : undefined;
  const [categoryRows, galleryRows, overrideRows, reviewRows, settingRows] = await Promise.all([
    request('/rest/v1/gallery_categories?select=id,name,sort_order&order=sort_order.asc,name.asc', { token }),
    request('/rest/v1/gallery_items?select=id,name,description,occasion,storage_path,category:gallery_categories(name)&order=created_at.desc', { token }),
    request('/rest/v1/gallery_product_overrides?select=product_id,name,description,category,is_visible,storage_path', { token }),
    request(`/rest/v1/reviews?select=id,customer_name,review,rating,created_at${session ? '' : '&is_published=eq.true'}&order=created_at.desc`, { token }),
    request('/rest/v1/site_settings?select=key,value', { token }),
  ]);
  return {
    categories: categoryRows.map((row) => row.name),
    gallery: galleryRows.map((row) => ({ id: row.id, name: row.name, description: row.description || '', category: row.category?.name || 'Chocolate', occasion: row.occasion || '', storagePath: row.storage_path, image: galleryPublicUrl(row.storage_path) })),
    overrides: Object.fromEntries(overrideRows.map((row) => [row.product_id, { ...row, image: row.storage_path ? galleryPublicUrl(row.storage_path) : null }])),
    reviews: reviewRows.map((row) => ({ id: row.id, name: row.customer_name, quote: row.review, rating: row.rating })),
    settings: Object.fromEntries(settingRows.map((row) => [row.key, row.value])),
  };
}

export async function loadAdminContent(session) {
  const token = await adminToken(session);
  const [reviewRows, settingRows] = await Promise.all([
    request('/rest/v1/reviews?select=id,customer_name,review,rating,is_published,created_at&order=created_at.desc', { token }),
    request('/rest/v1/site_settings?select=key,value', { token }),
  ]);
  return {
    reviews: reviewRows.map((row) => ({ id: row.id, name: row.customer_name, quote: row.review, rating: row.rating, isPublished: row.is_published })),
    settings: Object.fromEntries(settingRows.map((row) => [row.key, row.value])),
  };
}

export async function savePublicReview(review) {
  return request('/rest/v1/reviews', { method: 'POST', body: { customer_name: review.name, review: review.quote, rating: review.rating, is_published: false }, headers: { Prefer: 'return=minimal' } });
}

export async function saveRemoteReview(id, isPublished, session) {
  const token = await adminToken(session);
  return request(`/rest/v1/reviews?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: { is_published: isPublished }, token, headers: { Prefer: 'return=minimal' } });
}

export async function deleteRemoteReview(id, session) {
  const token = await adminToken(session);
  return request(`/rest/v1/reviews?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', token, headers: { Prefer: 'return=minimal' } });
}

export async function saveRemoteSettings(settings, session) {
  const token = await adminToken(session);
  for (const [key, value] of Object.entries(settings)) {
    await request('/rest/v1/site_settings?on_conflict=key', { method: 'POST', body: { key, value }, token, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
  }
}

export async function saveRemoteCategory(name, sortOrder, session) {
  const token = await adminToken(session);
  await request('/rest/v1/gallery_categories?on_conflict=name', { method: 'POST', body: { name, sort_order: sortOrder }, token, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
}

export async function deleteRemoteCategory(name, session) {
  const token = await adminToken(session);
  if (name === 'Chocolate') throw new Error('Chocolate is the default gallery category and cannot be removed.');
  const categories = await request('/rest/v1/gallery_categories?select=id,name', { token });
  const fallback = categories.find((category) => category.name === 'Chocolate');
  const removed = categories.find((category) => category.name === name);
  if (!fallback || !removed) throw new Error('Could not find the gallery category. Please refresh and try again.');
  await request(`/rest/v1/gallery_items?category_id=eq.${encodeURIComponent(removed.id)}`, { method: 'PATCH', body: { category_id: fallback.id }, token, headers: { Prefer: 'return=minimal' } });
  await request(`/rest/v1/gallery_product_overrides?category=eq.${encodeURIComponent(name)}`, { method: 'PATCH', body: { category: 'Chocolate', updated_at: new Date().toISOString() }, token, headers: { Prefer: 'return=minimal' } });
  await request(`/rest/v1/gallery_categories?id=eq.${encodeURIComponent(removed.id)}`, { method: 'DELETE', token, headers: { Prefer: 'return=minimal' } });
}

export async function saveRemoteProductOverride(product, session) {
  const token = await adminToken(session);
  await request('/rest/v1/gallery_product_overrides?on_conflict=product_id', { method: 'POST', body: { product_id: product.id, name: product.name, description: product.description || '', category: product.category, is_visible: product.isVisible ?? true, ...(product.storagePath ? { storage_path: product.storagePath } : {}), updated_at: new Date().toISOString() }, token, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
}

export async function uploadRemoteGalleryPhotos(files, details, session) {
  const token = await adminToken(session);
  const categoryRows = await request(`/rest/v1/gallery_categories?select=id,name&name=eq.${encodeURIComponent(details.category)}`, { token });
  if (!categoryRows[0]) throw new Error('Choose an available gallery category.');
  const added = [];
  for (const file of files) {
    const id = crypto.randomUUID();
    const path = `${id}/${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const upload = await fetch(`${url}/storage/v1/object/gallery-photos/${path.split('/').map(encodeURIComponent).join('/')}`, { method: 'POST', headers: { apikey: publishableKey, Authorization: `Bearer ${token}`, 'Content-Type': file.type, 'x-upsert': 'false' }, body: file });
    if (!upload.ok) throw new Error('A gallery photo could not be uploaded. Check the file type and try again.');
    try {
      await request('/rest/v1/gallery_items', { method: 'POST', body: { id, name: details.name, description: details.description, category_id: categoryRows[0].id, storage_path: path }, token, headers: { Prefer: 'return=minimal' } });
      added.push({ id, name: details.name, description: details.description, category: details.category, image: galleryPublicUrl(path), storagePath: path });
    } catch (error) {
      await fetch(`${url}/storage/v1/object/gallery-photos/${path.split('/').map(encodeURIComponent).join('/')}`, { method: 'DELETE', headers: { apikey: publishableKey, Authorization: `Bearer ${token}` } });
      throw error;
    }
  }
  return added;
}

export async function deleteRemoteGalleryItem(item, session) {
  const token = await adminToken(session);
  await request(`/rest/v1/gallery_items?id=eq.${encodeURIComponent(item.id)}`, { method: 'DELETE', token, headers: { Prefer: 'return=minimal' } });
  if (item.storagePath) {
    await fetch(`${url}/storage/v1/object/gallery-photos/${item.storagePath.split('/').map(encodeURIComponent).join('/')}`, { method: 'DELETE', headers: { apikey: publishableKey, Authorization: `Bearer ${token}` } });
  }
}

export async function updateRemoteGalleryItem(id, patch, session) {
  const token = await adminToken(session);
  const categoryRows = patch.category ? await request(`/rest/v1/gallery_categories?select=id&name=eq.${encodeURIComponent(patch.category)}`, { token }) : null;
  const body = { ...(patch.name !== undefined ? { name: patch.name } : {}), ...(patch.description !== undefined ? { description: patch.description } : {}), ...(categoryRows ? { category_id: categoryRows[0]?.id || null } : {}) };
  return request(`/rest/v1/gallery_items?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body, token, headers: { Prefer: 'return=minimal' } });
}
