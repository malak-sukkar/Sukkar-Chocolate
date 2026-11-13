# Website email setup

The website sends contact messages and order updates through a Supabase Edge Function and EmailJS. EmailJS can send through Sukkar’s existing Gmail account, so a custom domain is not required. Personal Gmail is intended for low-volume email; Google’s sending limits still apply.

## Connect Sukkar’s Gmail account

1. Create an account at [EmailJS](https://www.emailjs.com/).
2. In **Email Services**, add **Gmail** and connect `msukkar547@gmail.com` through Google’s sign-in and permission screen.
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

Keep the EmailJS private key in Supabase Secrets. Do not put it in the website files, GitHub, or a message. The website email flow uses one template for contact messages and all order updates.

## Messages sent

- A new custom order emails Sukkar with the request details and temporary links to private reference photos, and sends the customer a receipt.
- Customer contact messages, price accept/decline responses, and order questions email Sukkar. Replies to customer emails can be sent back to the customer.
- Admin rejection, price-proposal, and ready-for-collection updates email the customer. The price proposal includes a **View your order** button that opens the matching order in My Orders so the customer can accept or reject the price. Replies go to Sukkar’s receiving address.
- Accepting a new order sends no email, as requested.

The **View your order** button and plain-text link currently point to `https://malak-sukkar.github.io/Sukkar-Chocolate/my-orders`. The function contains a `SITE_URL` helper, but the proposal email currently uses a fixed link; setting a `SITE_URL` secret alone will not change it. If the published domain or repository path changes, update the order URL in `backend/supabase/functions/send-site-email/index.ts` and deploy the function again. The configured Supabase function can send from the local preview when it is connected to this project.
