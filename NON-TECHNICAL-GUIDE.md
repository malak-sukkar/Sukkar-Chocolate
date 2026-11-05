# Sukkar Chocolate Website

For setup and implementation details, see the [Developer Guide](DEVELOPER-GUIDE.md).

## What the website is for

The website helps customers discover Sukkar Chocolate, request handmade treats for a special occasion, and follow an order until collection. The owner uses the **Admin Dashboard** to manage orders and update what customers see on the site.

Customers can browse the site without an account. They need to sign in or create an account to send a custom order and use **My Orders**.

## What customers can do

- Explore Sukkar’s story, chocolate gallery, customer reviews, contact details, and location map.
- Filter gallery photos by category and open a photo to see it larger.
- Send a custom order request with a description, collection date and preferred time, allergy details, and up to five reference photos.
- Follow the order journey and respond to a proposed price in **My Orders**.
- Send Sukkar a message through the contact form or ask about an existing order.

The collection date must be at least three days ahead. The customer’s preferred time must be between 10:00 AM and 10:00 PM. If the customer has an allergy or dietary requirement, they can choose **Yes** and describe it.

## How a custom order works

1. **Send a request.** The customer describes the treat, chooses a date and preferred time, and can attach photos. Sukkar and the customer receive confirmation emails.
2. **Sukkar reviews it.** The owner accepts or rejects the request. Accepting it does not send a separate email; a rejection does.
3. **Agree on a price.** Sukkar emails a price proposal. The email has a **View your order** button and a direct link. The customer signs in to **My Orders** to accept or reject the price. Sukkar receives an email about the response.
4. **Prepare the order.** After the price is accepted, Sukkar prepares the treat and chooses a collection time.
5. **Collect and pay.** Sukkar emails the customer when the order is ready. The customer can see both their preferred time and the confirmed collection time. Payment happens at collection.

There is no online payment or delivery checkout. The admin’s **Mark as collected** action removes a finished order from the active order lists.

## Using the Admin Dashboard

Open [the Admin Dashboard](https://malak-sukkar.github.io/Sukkar-Chocolate/admin) and sign in with the owner account.

- **Orders:** review the request and its photos, enlarge attached photos, accept or reject the request, propose a price, set the collection time, email the customer, and mark a finished order as collected. New requests must be accepted or rejected before they move forward.
- **Gallery:** add a photo with a required name, description, and category. Edit existing photo details, manage categories, and control photo visibility. Deleting a category moves its photos to the default **Chocolate** category.
- **Reviews:** new reviews are hidden until published. The dashboard opens with new reviews; use **Show all reviews** to manage published ones, then publish, hide, or delete reviews. Customers see six reviews at a time and can show six more or show less.
- **Public details:** update Sukkar’s email, phone number, address, and the home page map location. Enter the location as an address or map coordinates.
- **Admin sign-in:** change the dashboard email or password in account settings. Supabase may ask you to confirm an email change.

The Contact page shows the email address, location, Instagram, and Facebook. It does not show a phone number; the phone number can still be shown in the footer and managed from the dashboard.

## Email and order photos

The website sends contact messages and order updates by email. The order request email to Sukkar includes private reference-photo links that expire after 24 hours. The price-proposal email links customers to their order so they can accept or reject the proposal.

If a message is missing, check Spam or Promotions. Email providers decide where messages appear, so the website cannot guarantee every message lands in the Inbox.

## Important data note

When Supabase is connected, shared orders, gallery changes, reviews, and settings are saved online. In local preview mode without Supabase, test accounts and changes stay in that browser and are not shared with the live site or other devices.

