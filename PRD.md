# Sukkar Chocolate — Product Requirements

## Product overview

A responsive website for Sukkar Chocolate, a handmade chocolate business. Customers can explore the gallery, request personalized treats, and follow an order through to collection. The owner can manage customer orders, gallery content, reviews, contact details, and the location shown on the site.

## Users

- **Visitor:** browses the home page, story, gallery, reviews, contact details, and map.
- **Customer:** creates an account or signs in, submits a custom order, reviews the proposal, and follows order progress.
- **Admin:** signs in to the private dashboard to manage orders and public website content.

## Pages

Home, Our Story, Gallery, Reviews, Custom Order, My Orders, Contact, and the private Admin Dashboard at `/admin`.

## Functional requirements

### Public website

- The home page introduces Sukkar, shows occasions and reviews, and includes the business map. The footer location link opens the map section on the home page.
- Home page actions use clear labels: **Create a custom order** and **View gallery**.
- The gallery displays photos with names, descriptions, and categories. Customers can filter by categories managed in the dashboard and open photos for a larger view.
- The Reviews page shows six reviews at a time. **Show more** loads the next six; **Show less** returns to the initial set. Every review displays its star rating.
- The Contact page provides an email contact form, email address, location, Instagram, and Facebook. It does not display a phone number. Form messages are sent to Sukkar by email.
- The home page map uses Sukkar’s saved location. The admin can change the location used by the map and directions by entering an address or coordinates.

### Customer accounts and custom orders

- Visitors can browse without an account. Customers must sign in or register before submitting a custom order or using My Orders. Registration collects first name, last name, email, and password. Password visibility can be toggled with an eye icon.
- The custom order form collects first and last name, phone with country calling code, email, collection date, preferred collection time, idea description, allergy information, and up to five reference photos.
- The collection date must be at least three days ahead and is selected from a calendar dropdown styled to match the site.
- Preferred collection time is selected with a compact wheel dropdown for hours 1–12, minutes 00–59, and AM/PM. Valid times are 10:00 AM through 10:00 PM. An invalid selection shows an error and hides the normal helper text until corrected.
- Allergy information is a Yes/No list. Choosing Yes reveals a required field for allergy or dietary details.
- The idea description prompt should guide customers to include chocolate and filling, colours, message, size, and occasion.
- Reference photos are stored privately in Supabase Storage and available to the admin with the order. The new-order email to Sukkar includes temporary links to the attached photos.
- My Orders shows the customer’s order, proposed or agreed price in SYP, preferred collection time, confirmed collection time when ready, and the order journey. Customer responses to a price proposal are made from this page.
- Signed-in customers can open the person icon in the top-right navigation bar to change their account email and password. Supabase email changes require confirmation; local preview changes apply only in that browser.

### Order journey and messages

1. **Request received:** the customer submits the order. Sukkar receives an email notification and the customer receives confirmation.
2. **Admin review:** the admin accepts or rejects the request before further processing. Accepting sends no message. Rejecting sends an email to the customer.
3. **Price proposal:** the admin sets a proposed price in SYP and emails the customer. The email links to My Orders, where the customer can accept or decline. Both parties receive an email about the customer’s response. A declined proposal can be deleted by the admin.
4. **Preparation:** after the customer agrees to the price, the admin changes the order to Preparing.
5. **Ready for collection:** the admin chooses a confirmed collection time using the same wheel picker and emails the customer. The customer’s preferred time remains visible; the confirmed collection time is displayed clearly and distinctly.
6. **Collected:** the admin uses **Mark as collected**. This removes the order from the active dashboard and the customer’s My Orders list.

- The customer and admin see matching order progress, with completed steps marked, the current step highlighted, and declined or rejected outcomes identified.
- The admin’s collection time is entered using a selectable time control, not free-form text.
- Customer questions about an order are emailed to Sukkar. Price proposals, rejections, and ready-for-collection updates are emailed to the customer. Email includes a button and a direct link to My Orders for the customer’s proposal response.
- Payment takes place at collection. The site does not provide online payment or delivery checkout.

### Owner dashboard

- Admin signs in at `/admin` to see customer requests, order details, status, price, preferred time, and attached photos. Attached photos can be enlarged.
- The dashboard displays the order journey with admin-appropriate status labels. Admin actions include accepting or rejecting a new request, proposing a price, preparing the order, setting a collection time, marking it collected, and deleting declined orders.
- Reviews appear below orders. The dashboard opens on new reviews; the admin can show or hide the full review list, publish, hide, or delete a review.
- The admin can add gallery photos with a required name, description, and category, and can update existing photo names, descriptions, categories, and visibility. Gallery and dashboard use the same categories and photo details. If a category is deleted, its photos move to the default **Chocolate** category.
- Admin can create and manage gallery categories.
- Admin can update the public email address, phone number, address, and map location. The map location field accepts an address or coordinates and controls the home page map and directions.
- Admin can change the dashboard sign-in email and password. Email changes may require confirmation from Supabase.

### Reviews

- Customers can submit a review with their name, written feedback, and a one-to-five-star rating.
- Reviews require admin approval before appearing publicly. Approved reviews appear on the Reviews page and the home page. Each displayed review shows its star rating.
- Success and error messages appear outside the review form card. Star-rating validation appears beside the star selector.

## Design and quality

- Responsive on desktop and mobile, using Sukkar’s warm cream and chocolate visual style with soft rose accents.
- Keep forms clear, validate required fields and limits, and show helpful feedback. Keep success and error messages outside their form cards.
- Use a calendar dropdown and the compact time wheel consistently in the customer order form and admin collection-time control.
- Use a dropdown list for allergy Yes/No without adding a focus border when choosing.
- Ensure direct links to website pages work on GitHub Pages, including links from email on mobile email apps.

## Technology and data

- Frontend: React 19, JavaScript, Vite, React Router, and CSS.
- Backend services: Supabase Auth, PostgreSQL with Row Level Security, Supabase Storage, and a Supabase Edge Function for email sending through EmailJS.
- Hosting: GitHub Pages with deployment through GitHub Actions.
- Do not expose Supabase service-role credentials or private email credentials in browser code.
- Without Supabase configuration, local preview data is stored only in the current browser and does not sync across devices.
- There is no separate Express server, online payment system, or delivery checkout.

## Acceptance checks

- A visitor can browse public pages without signing in; a customer can register, sign in, and submit an order with up to five photos.
- The order form enforces the three-day minimum collection date, the 10:00 AM–10:00 PM preferred-time range, and the conditional allergy details field.
- Admin can accept or reject new requests before processing; acceptance sends no email. A rejected request, price proposal, customer response, and ready-for-collection update follow the email behavior described above.
- Customer and admin order journeys show the same current status. The customer’s preferred time and admin’s confirmed collection time are both visible when appropriate.
- Admin can enlarge attached order photos, manage gallery details and categories, moderate reviews, update contact details and map location, and change dashboard email or password.
- The public gallery reflects dashboard photo names, descriptions, categories, and visibility. Removing a category reassigns its photos to Chocolate.
- The Reviews page displays six items initially and supports showing six more at a time and returning with Show less.
- Contact, social, map, and email links work on desktop and mobile. Forms show one appropriate success or error message.
