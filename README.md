# bolt_ecommerce_system_prompt.md
# Build a production-grade, full-stack E-commerce web application. Use React + TypeScript + Vite for the frontend, Tailwind CSS for styling, and Supabase as the backend (Postgres database, Auth, Storage, and Edge Functions). Do not use localStorage for persistent data — everything must be stored in Supabase so data survives refreshes and is shared across devices.

=====================================================
1. TECH STACK
=====================================================
- Frontend: React 18 + TypeScript + Vite, React Router for navigation
- Styling: Tailwind CSS, shadcn/ui-style components, mobile-first responsive design
- Backend/DB: Supabase (Postgres + Row Level Security + Auth + Storage + Edge Functions)
- Payments: Razorpay Checkout (client) + Razorpay Orders API (server-side via Supabase Edge Function)
- State management: Zustand or React Context for cart/auth state
- Charts (for admin dashboard): Recharts

=====================================================
2. DATABASE SCHEMA (Supabase Postgres)
=====================================================
Create the following tables with proper foreign keys, indexes, and Row Level Security (RLS) policies (customers can only read active products and their own orders; only admin role can write to products/offers/settings):

-- users are handled by Supabase Auth; extend with a profiles table
profiles (
  id uuid primary key references auth.users(id),
  full_name text,
  phone text,
  role text default 'customer' check (role in ('customer','admin')),
  created_at timestamptz default now()
)

categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  image_url text
)

products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category_id uuid references categories(id),
  base_price numeric(10,2) not null,
  gst_percentage numeric(5,2) default 0,
  stock_quantity integer default 0,
  sku text unique,
  images text[],           -- array of Supabase Storage URLs
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  offer_type text check (offer_type in ('percentage_discount','flat_discount','buy_x_get_y')),
  discount_percentage numeric(5,2),          -- used if percentage_discount
  flat_discount_amount numeric(10,2),        -- used if flat_discount
  buy_quantity integer,                      -- used if buy_x_get_y (e.g. 2)
  get_quantity integer,                      -- used if buy_x_get_y (e.g. 1 free)
  is_active boolean default true,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz default now()
)
-- Admin sets this manually per product from the dashboard. Only ONE active offer per product at a time (enforce in app logic).

orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  status text default 'pending' check (status in ('pending','paid','processing','shipped','delivered','cancelled','refunded')),
  subtotal numeric(10,2) not null,
  discount_total numeric(10,2) default 0,
  gst_total numeric(10,2) default 0,
  shipping_fee numeric(10,2) default 0,
  grand_total numeric(10,2) not null,
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  shipping_address jsonb,
  created_at timestamptz default now()
)

order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id),
  quantity integer not null,
  unit_price numeric(10,2) not null,
  applied_offer_id uuid references offers(id),
  line_total numeric(10,2) not null
)

carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  product_id uuid references products(id),
  quantity integer default 1,
  updated_at timestamptz default now()
)

customer_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  channel text check (channel in ('email','call','chat')),
  subject text,
  message text,
  ai_response text,
  status text default 'open' check (status in ('open','resolved','escalated')),
  created_at timestamptz default now()
)

growth_chat_messages (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references profiles(id),
  role text check (role in ('admin','ai_strategist')),
  message text,
  created_at timestamptz default now()
)

internal_collab_messages (
  id uuid primary key default gen_random_uuid(),
  sender_role text check (sender_role in ('admin','ai_collaborator')),
  message text,
  created_at timestamptz default now()
)

generated_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id),
  prompt text not null,
  image_url text not null,
  created_at timestamptz default now()
)

=====================================================
3. CUSTOMER-FACING PAGES
=====================================================
- Home page: hero banner, featured/offer products carousel, category grid
- Product Listing page: grid with image, name, price (show strikethrough original price + discounted price when an offer is active), filters (category, price range), sort (price, newest, popularity)
- Product Detail page: image gallery, description, price with live offer applied, quantity selector, "Add to Cart"
- Cart page: line items, quantity edit, remove, auto-recalculate discounts (e.g. Buy 2 Get 1 logic must auto-detect when quantity qualifies), subtotal, GST breakdown, grand total
- Checkout page: shipping address form, order summary, "Pay with Razorpay" button
- Order confirmation + Order history page (My Orders) for logged-in users
- Auth: Sign up / Login (Supabase Auth, email+password, optional phone OTP)

Offer Display Logic (important):
- percentage_discount: show "X% OFF" badge, price = base_price - (base_price * discount_percentage/100)
- flat_discount: show "₹X OFF" badge, price = base_price - flat_discount_amount
- buy_x_get_y: e.g. Buy 2 Get 1 Free — cart logic must detect when quantity >= buy_quantity + get_quantity multiples and auto-apply the free unit(s) as a line-item discount, with clear messaging in the cart ("You got 1 free!")

=====================================================
4. PAYMENT INTEGRATION — RAZORPAY
=====================================================
- On checkout, call a Supabase Edge Function `create-razorpay-order` that uses the Razorpay Orders API (server-side, using RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET stored as Supabase secrets — never expose the secret key in frontend code) to create an order and return the order_id.
- Frontend opens Razorpay Checkout modal using the public key + order_id.
- On payment success, call a second Edge Function `verify-razorpay-payment` that verifies the payment signature server-side (HMAC SHA256) before marking the order as 'paid' in the database. Never trust client-side payment success alone.
- Handle payment failure/cancellation gracefully with retry option.

=====================================================
5. ADMIN DASHBOARD (role = 'admin' only, protected route)
=====================================================
Build a dashboard with a left sidebar and these tabs:

### Tab 1: Products
- CRUD interface for products (add/edit/delete, upload multiple images to Supabase Storage)
- Inline stock management

### Tab 2: Offers & Pricing (Dynamic Pricing Control)
- For each product, a form to set an offer: dropdown to choose offer_type (Percentage Discount / Flat Discount / Buy X Get Y), relevant input fields appear conditionally, start/end date, activate/deactivate toggle
- Table view of all active offers across the catalog

### Tab 3: Orders
- Table of all orders with status filters, order detail drawer, manual status update (processing/shipped/delivered)

### Tab 4: AI Customer Service
- List of customer_queries (from email/chat/call channels)
- Each query shows the AI-drafted response (ai_response) which admin can review, edit, and approve/send
- NOTE FOR BOLT: Actual inbound email parsing (e.g. Gmail API) and telephony (e.g. Twilio Voice) require external account setup and cannot be fully wired without the user's own API keys. Build the UI and database structure fully, and add a placeholder Edge Function `ai-customer-service-agent` that accepts an incoming message/email text and returns an AI-drafted reply (using an LLM API call — leave the API key as an environment variable placeholder for the user to fill in).

### Tab 5: Strategy & Growth (AI Business Advisor)
- A chat interface (using growth_chat_messages table) where the admin converses with an AI agent about revenue optimization, pricing strategy, and site changes.
- System prompt for this AI agent (used in the Edge Function `growth-strategist-agent`): "You are a critical, business-minded growth strategist for this e-commerce store. You have access to the store's product, offer, and order data. Be direct and analytical — challenge weak strategies, point out risks in discounting or margins, and give specific, numbers-backed recommendations rather than generic advice. Ask clarifying questions when data is insufficient."
- Pass relevant store metrics (revenue, top products, offer performance) from the database into the AI's context on each request so its advice is grounded in real data.

### Tab 6: Visual Content (AI Image Generation)
- A form: select a product + enter an image prompt (e.g. "product photo of the item on a white background, studio lighting")
- Submit calls an Edge Function `generate-product-image` (placeholder for an image-generation API — e.g. OpenAI Images / Stable Diffusion — API key as environment variable) which returns an image URL, saved into generated_images and optionally attached to the product's images array.
- Gallery view of previously generated images per product.

### Tab 7: Internal Collaboration Chat
- A real-time chat (Supabase Realtime subscription on internal_collab_messages) between the admin and an "AI Collaborator" for day-to-day discussion/decisions — separate from the Strategy & Growth tab, this one is casual/operational (e.g. "update this listing", "check this order").

### Tab 8: Analytics Overview (dashboard home)
- Revenue over time chart, top-selling products, conversion funnel stub, low-stock alerts

=====================================================
6. UI/UX DIRECTION
=====================================================
- Clean, modern, high-conversion e-commerce aesthetic (think Nike/Myntra-lite): generous white space, clear price hierarchy, prominent CTA buttons, sticky "Add to Cart" bar on mobile product pages
- Consistent color system: one primary brand color + neutral grays, offer badges in a distinct accent color (e.g. red/orange) to draw attention
- Fully responsive: mobile-first, since most e-commerce traffic is mobile
- Loading states, empty states, and error states for every data-driven screen
- Toast notifications for cart actions, order status, admin saves

=====================================================
7. SECURITY & CONFIG NOTES
=====================================================
- Use Supabase Row Level Security: customers can only see is_active=true products and only their own orders/cart; only role='admin' profiles can write to products/offers/settings tables
- Store all secrets (Razorpay key secret, LLM API keys, image-gen API keys) as Supabase Edge Function environment variables — never in frontend code
- Add an admin-only route guard that checks profiles.role === 'admin' before rendering any /admin/* route

Build this as a cohesive, working application with seed data (a handful of sample products and categories) so the store is demo-ready immediately after generation.
