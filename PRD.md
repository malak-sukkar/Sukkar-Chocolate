# Sukkar Chocolate — Product Requirements

## Product

A responsive website for Sukkar Chocolate, a handmade chocolate business in Homs, Syria. It helps customers explore products and request personalized treats, while giving the owner tools to manage orders and site content.

## Users

- **Visitor:** explores the brand, gallery, reviews, and contact details.
- **Customer:** registers or signs in, requests orders, and checks order updates.
- **Admin:** signs in to manage orders, gallery content, reviews, and public contact details.

## Pages

Home, Our Story, Gallery, Reviews, Custom Order, My Orders, Contact, and the private Studio Dashboard at `/admin`.

## Functional requirements

### Customer accounts and orders

- Customers must sign in or register before placing a custom order. Registration collects first name, last name, email, and password; password visibility can be toggled.
- The order form collects first and last name, phone with country code, email, collection date, preferred time, idea description, an allergy Yes/No choice, and up to five reference photos. If the customer selects Yes, show a required field for allergy or dietary details; selecting No records that there are no known notes.
- The collection date must be at least three days ahead and is chosen from a calendar dropdown styled in the site's cream and rose colors. Preferred time uses a compact wheel dropdown with hours 1–12, minutes 00–59, and AM/PM, and must be between 10:00 am and 10:00 pm.
- The idea prompt should invite chocolate and filling details, colours, message, size, and occasion.
- Save orders and private reference photos to Supabase. Show the photos to the admin and include available photo links in the prepared WhatsApp order message.
- Admin must accept or reject each new order before further processing. For accepted orders, admin proposes a price; the customer can accept or decline it.
- After the customer accepts the price, admin can mark the order as preparing, choose a collection time with the same 1–12 hour, 00–59 minute, AM/PM wheel dropdown, and prepare a ready-to-collect WhatsApp message. My Orders refreshes to reflect the admin’s latest status and proposed price; when ready, it keeps the customer’s preferred time visible and highlights the confirmed collection time. Orders removed by the admin after collection disappear from the customer list.
- My Orders shows the full order journey, marks completed steps, highlights the current step, and clearly labels rejected or declined orders.
- On collection, admin can mark the order collected and remove it. Payment is made at collection; online payment is not required.

### Gallery and dashboard

- Gallery photos can be filtered by the categories managed in the dashboard. Names, descriptions, categories, and visibility must match between Gallery and Dashboard.
- Admin can add photos with a required name, description, and category; edit existing photo details; manage categories; and hide, restore, or remove photos.
- The dashboard displays order information, the same progress journey using admin status names, and enlarged attached reference photos. Reviews appear directly after Orders in the dashboard.
- Keep the customer's preferred time visible on each admin order. Let admin choose the confirmed collection time from the same AM/PM wheel picker used by customers and show it prominently beside the ready status.
- Admin can update the public phone number and address.

### Reviews and contact

- Customers can submit a named review with a one-to-five-star rating.
- New reviews require admin approval before appearing publicly. Show stars for every review and display approved reviews on the Reviews page and home page.
- Contact page includes a message form, phone, location, Instagram, and Facebook. Contact messages open in WhatsApp with the message prepared.
- Show form success and submission-error messages outside the relevant form card. Keep star-rating validation beside the star selector.

## Design and quality

- Responsive on desktop and mobile; use Sukkar’s warm cream and chocolate visual style with soft rose selection accents for the date and time dropdowns. The allergy Yes/No choice is a dropdown list without an extra focus border.
- Keep forms clear, validate required fields and limits, and show useful feedback.
- Use Supabase Auth, PostgreSQL with Row Level Security, and Supabase Storage. Do not expose a Supabase service-role key in the browser.
- WhatsApp opens a prepared message; the user must send it. The website does not process payments or arrange delivery.
- Without Supabase configuration, local preview data is stored only in the current browser and does not sync across devices.

## Acceptance checks

- A signed-in customer can submit a valid order with up to five photos and see its status and agreed details.
- The allergy dropdown records No by default; choosing Yes reveals a required details field and saves those details with the order.
- Admin can accept/reject, propose a price, enter a collection time, notify through WhatsApp, and remove a collected order.
- Admin gallery edits are reflected in the public gallery with the same category and description.
- A submitted review saves once, shows one confirmation or error (never both), and stays hidden until published.
- Contact and social links work, and layouts remain usable on narrow screens.

## Technology

React 19, JavaScript, Vite, React Router, CSS, and Supabase. No separate Express backend is used. Local setup instructions are in `SUPABASE_SETUP.md`.
