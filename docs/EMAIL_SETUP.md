# Website email setup

The website sends contact messages and order updates through a Supabase Edge Function and EmailJS. EmailJS can send through Sukkar’s existing Gmail account, so a custom domain is not required. Personal Gmail is intended for low-volume email; Google’s sending limits still apply.

## Connect Sukkar’s Gmail account

1. Create an account at [EmailJS](https://www.emailjs.com/).
2. In **Email Services**, add **Gmail** and connect Sukkar’s business Gmail account through Google’s sign-in and permission screen (currently intended to be `sukkarchocolate@gmail.com`).
3. In **Email Templates**, create one template and set:
   - **To Email:** `{{to_email}}`
   - **From Name:** `Sukkar Chocolate`
   - **Reply To:** `{{reply_to}}`
   - **Subject:** `{{subject}}`
   - **Content:** `{{{message_html}}}`
4. Save the template. Copy the **Service ID**, **Template ID**, and **Public Key** from EmailJS. In **Account → General**, copy the **Private Key**.
5. These four secrets have been added to Supabase **Sukkar Chocolate → Edge Functions → Secrets**:
   - `EMAILJS_SERVICE_ID`
   - `EMAILJS_TEMPLATE_ID`
   - `EMAILJS_PUBLIC_KEY`
   - `EMAILJS_PRIVATE_KEY`
6. EmailJS server API access is enabled, with private-key protection kept on. Sukkar’s receiving email is saved in the website settings, and the sending function is deployed.

The email function is separate from `delete-customer-account`, which handles customer account deletion and does not use EmailJS. See [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md) for that function's role and deployment note.

The email address saved in the Admin Dashboard controls where customer messages arrive and the reply-to address on customer emails. The actual sender address is the Gmail account connected to the EmailJS service. To change the sender, reconnect that Gmail account in EmailJS and keep the existing Service ID; changing the dashboard contact email alone does not change the sender mailbox.

Keep the EmailJS private key in Supabase Secrets. Do not put it in the website files, GitHub, or a message. The website email flow uses one template for contact messages and all order updates.

## Messages sent

- A new custom order emails Sukkar with the request details and private reference-photo links that expire after 30 days, and sends the customer a receipt. The customer can attach up to five photos from a device, mobile camera, or the website gallery, and can remove selections before sending.
- Customer contact messages, price accept/decline responses, and order questions email Sukkar. Replies to customer emails can be sent back to the customer.
- Admin rejection, price-proposal, and ready-for-collection updates email the customer. The ready-for-collection email includes the admin-confirmed collection date and time. The price proposal includes a **View your order** button that opens the matching order in My Orders so the customer can accept or reject the price. Replies go to Sukkar’s receiving address.
- Accepting a new order sends no email, as requested.

The **View your order** button and plain-text link currently point to `https://malak-sukkar.github.io/Sukkar-Chocolate/my-orders`. The function contains a `SITE_URL` helper, but the proposal email currently uses a fixed link; setting a `SITE_URL` secret alone will not change it. If the published domain or repository path changes, update the order URL in `../backend/supabase/functions/send-site-email/index.ts` and deploy the function again. The configured Supabase function can send from the local preview when it is connected to this project.
