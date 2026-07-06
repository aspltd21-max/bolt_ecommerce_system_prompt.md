# bolt_ecommerce_system_prompt.md (ENHANCED v2)
# Build a production-grade, full-stack E-commerce web application with advanced features.

=====================================================
1. TECH STACK (ENHANCED)
=====================================================
**Frontend:**
- React 18 + TypeScript + Vite (SWC transpiler for faster builds)
- React Router v6 for navigation + useNavigate for programmatic routing
- Tailwind CSS + shadcn/ui-style components + Headless UI for accessibility
- Mobile-first responsive design (tested at 320px+)
- TanStack Query (React Query) v5 for server-state management with caching
- Zustand for client-side state (auth, cart, UI preferences)
- axios with interceptors for API requests + automatic retry logic
- Socket.io-client for real-time notifications (order status, admin alerts)

**Backend/Database:**
- Supabase (Postgres + Row Level Security + Auth + Storage + Edge Functions)
- Supabase Realtime for live updates (cart sync across devices, admin notifications)
- Redis (optional, recommended) for caching product data, offers, and session storage
- Supabase Functions (Node.js runtime) for server-side logic

**Payments:**
- Razorpay Checkout v2 (latest SDK)
- Razorpay Webhooks for async payment status updates
- Server-side payment verification (HMAC SHA256) — never trust client

**Charts & Analytics:**
- Recharts for admin dashboards (line, bar, pie charts)
- date-fns for date manipulation and timezone handling

**Infrastructure:**
- Environment-based config (dev/staging/production)
- Error tracking: Sentry or similar
- Analytics: Mixpanel or Segment for conversion tracking

=====================================================
2. ENHANCED DATABASE SCHEMA (Supabase Postgres)
=====================================================

-- ========== AUTHENTICATION & USERS ==========
-- users table is Supabase Auth built-in; we extend it

profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text unique not null,
  phone text unique,
  phone_verified boolean default false,
  phone_verified_at timestamptz,
  avatar_url text,
  role text default 'customer' check (role in ('customer','admin')),
  is_active boolean default true,
  last_login_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

-- Track login history for audit & fraud detection
user_login_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  ip_address inet,
  user_agent text,
  login_at timestamptz default now(),
  login_method text check (login_method in ('email_password','phone_otp','google_sso','apple_sso'))
)

-- Password reset tokens (short-lived, one-time use)
password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  token text unique not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
)

-- ========== PRODUCTS & CATALOG ==========
categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text unique not null,
  description text,
  image_url text,
  parent_category_id uuid references categories(id),  -- for subcategories
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

-- Index for fast lookup by slug
create index idx_categories_slug on categories(slug);

products (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  name text not null,
  slug text unique not null,
  description text,
  short_description text,  -- for product cards
  category_id uuid references categories(id) on delete set null,
  base_price numeric(10,2) not null check (base_price > 0),
  cost_price numeric(10,2),  -- for profit margin calculations
  gst_percentage numeric(5,2) default 0 check (gst_percentage >= 0),
  stock_quantity integer default 0 check (stock_quantity >= 0),
  reserved_stock integer default 0,  -- units in pending orders
  reorder_level integer default 50,  -- alert when stock below this
  images text[],  -- array of Supabase Storage URLs; first is primary
  thumbnail_url text,  -- optimized thumbnail for list views
  is_active boolean default true,
  rating numeric(3,2) default 0,  -- aggregated from reviews
  review_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

-- Indexes for common queries
create index idx_products_category on products(category_id);
create index idx_products_slug on products(slug);
create index idx_products_is_active on products(is_active) where is_active = true;

-- Product reviews
product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  title text,
  comment text,
  is_verified_purchase boolean default false,
  helpful_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

create index idx_reviews_product on product_reviews(product_id);
create index idx_reviews_user on product_reviews(user_id);

-- ========== OFFERS & DYNAMIC PRICING ==========
offers (
  id uuid primary key default gen_random_uuid(),
  name text not null,  -- e.g. "Summer Sale 2024"
  product_id uuid references products(id) on delete cascade,  -- null = store-wide offer
  offer_type text not null check (offer_type in ('percentage_discount','flat_discount','buy_x_get_y','tiered_discount','free_shipping')),
  
  -- percentage_discount
  discount_percentage numeric(5,2),
  
  -- flat_discount
  flat_discount_amount numeric(10,2),
  
  -- buy_x_get_y
  buy_quantity integer,
  get_quantity integer,
  get_percentage_discount numeric(5,2),  -- alternative: discount on free units
  
  -- tiered_discount: e.g. buy 5+ get 10% off
  tier_quantity integer,
  tier_discount_percentage numeric(5,2),
  
  -- free_shipping: no fields needed beyond is_active
  
  -- General
  is_active boolean default true,
  start_date timestamptz not null,
  end_date timestamptz not null,
  max_uses integer,  -- null = unlimited
  current_uses integer default 0,
  min_order_value numeric(10,2),  -- offer only applies above this threshold
  max_discount_amount numeric(10,2),  -- cap total discount even if percentage/flat would be higher
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

create index idx_offers_product on offers(product_id);
create index idx_offers_active on offers(is_active) where is_active = true;
create index idx_offers_date_range on offers(start_date, end_date);

-- ========== CARTS ==========
carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  applied_offer_id uuid references offers(id) on delete set null,  -- snapshot of which offer was applied
  added_at timestamptz default now(),
  updated_at timestamptz default now()
)

create index idx_carts_user on carts(user_id);
create unique index idx_carts_user_product on carts(user_id, product_id);

-- ========== ORDERS & PAYMENTS ==========
orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,  -- human-readable: ORD-2024-0001234
  user_id uuid references profiles(id) on delete set null,
  status text default 'pending' check (status in ('pending','paid','processing','shipped','delivered','cancelled','failed','refunded')),
  payment_status text default 'unpaid' check (payment_status in ('unpaid','paid','pending','failed','refunded')),
  
  -- Pricing breakdown
  subtotal numeric(10,2) not null,  -- sum of (unit_price * quantity)
  discount_total numeric(10,2) default 0,  -- sum of all line-item discounts
  gst_total numeric(10,2) default 0,  -- calculated
  shipping_fee numeric(10,2) default 0,
  grand_total numeric(10,2) not null,  -- final amount charged
  
  -- Razorpay integration
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  razorpay_signature text,
  
  -- Shipping
  shipping_address jsonb not null,  -- {name, email, phone, address_line_1, address_line_2, city, state, pincode, country}
  shipping_method text default 'standard',  -- 'standard', 'express', 'overnight'
  tracking_number text,
  estimated_delivery_date date,
  
  -- Notes
  notes text,
  admin_notes text,
  
  -- Timestamps
  created_at timestamptz default now(),
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz
)

create index idx_orders_user on orders(user_id);
create index idx_orders_status on orders(status);
create index idx_orders_payment_status on orders(payment_status);
create index idx_orders_created on orders(created_at);
create index idx_orders_razorpay_payment_id on orders(razorpay_payment_id);

order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id),
  product_name text not null,  -- snapshot
  product_sku text,  -- snapshot
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null,  -- price at time of order
  applied_offer_id uuid references offers(id) on delete set null,
  offer_description text,  -- e.g. "Buy 2 Get 1 Free"
  line_discount numeric(10,2) default 0,
  line_gst numeric(10,2) default 0,
  line_total numeric(10,2) not null,  -- (unit_price * quantity) - line_discount
  created_at timestamptz default now()
)

create index idx_order_items_order on order_items(order_id);

-- Payment webhooks log (for debugging Razorpay events)
payment_webhooks (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,  -- 'order.paid', 'payment.failed', etc.
  razorpay_order_id text,
  razorpay_payment_id text,
  webhook_data jsonb,
  processed_at timestamptz default now(),
  created_at timestamptz default now()
)

-- ========== CUSTOMER SERVICE & AI ==========
customer_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  channel text not null check (channel in ('email','chat','phone','contact_form')),
  subject text not null,
  message text not null,
  attachments text[],  -- URLs to uploaded files
  ai_response text,
  admin_response text,
  admin_id uuid references profiles(id) on delete set null,
  status text default 'open' check (status in ('open','in_progress','resolved','closed','escalated')),
  priority text default 'normal' check (priority in ('low','normal','high','urgent')),
  resolved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

create index idx_queries_status on customer_queries(status);
create index idx_queries_user on customer_queries(user_id);

-- ========== AI & INTERNAL TOOLS ==========
growth_chat_messages (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references profiles(id) on delete cascade,
  role text not null check (role in ('admin','ai_strategist')),
  message text not null,
  context jsonb,  -- {store_revenue, top_products, offer_performance}
  created_at timestamptz default now()
)

internal_collab_messages (
  id uuid primary key default gen_random_uuid(),
  sender_role text not null check (sender_role in ('admin','ai_collaborator')),
  message text not null,
  mentions text[],  -- @admin, @team
  created_at timestamptz default now()
)

generated_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  prompt text not null,
  image_url text not null,
  image_alt_text text,  -- for accessibility
  api_provider text,  -- 'openai', 'stable_diffusion', etc.
  generation_time_ms integer,  -- for performance monitoring
  is_approved boolean default false,
  approved_by uuid references profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz default now()
)

-- ========== AUDIT & COMPLIANCE ==========
audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,  -- 'product', 'order', 'offer', 'user'
  entity_id uuid,
  action text not null,  -- 'create', 'update', 'delete'
  performed_by uuid references profiles(id) on delete set null,
  changes jsonb,  -- {field: {old_value, new_value}}
  ip_address inet,
  timestamp timestamptz default now()
)

create index idx_audit_entity on audit_log(entity_type, entity_id);
create index idx_audit_timestamp on audit_log(timestamp);

=====================================================
3. ENHANCED AUTH SYSTEM
=====================================================

**Login Methods:**
1. Email + Password (default)
   - Minimum password requirements: 8 chars, 1 uppercase, 1 number, 1 special char
   - Bcrypt hashing (Supabase default)
   - Rate limit: 5 failed attempts = 15 min lockout

2. Phone OTP (secondary)
   - Use Supabase Auth with Twilio SMS integration
   - Generate 6-digit OTP, valid for 10 minutes
   - Auto-verify on correct entry

3. Social SSO (future-ready)
   - Google OAuth 2.0
   - Apple Sign In (for iOS)
   - GitHub OAuth (optional, for test users)

**Auth Flow Improvements:**
- JWT tokens stored in secure HTTP-only cookies (not localStorage)
- Auto-refresh token logic: refresh before expiry (token valid 24h, refresh valid 30d)
- "Remember me" option: extends refresh token to 30 days
- Logout: revoke refresh token server-side

**Session Management:**
- Supabase Session Storage: syncs across browser tabs via Realtime
- Force logout from other sessions option in account settings
- Session timeout: 30 min inactivity for customer, 15 min for admin

**Phone Verification (for orders):**
- Send verification OTP post-signup
- Optional initially, mandatory for shipping addresses
- Store verification timestamp in profiles table

**Two-Factor Authentication (Admin only):**
- TOTP (Time-based OTP) via Google Authenticator / Authy
- Backup codes (8x 8-char codes)
- Enforce for all admins; disable after 14 days of inactivity

**Account Recovery:**
- Forget Password: send reset link (valid 1 hour)
- Verify email before password reset (re-send link if needed)
- Show "Password Reset" notification on next login attempt after recovery

=====================================================
4. ENHANCED PAYMENT INTEGRATION — RAZORPAY
=====================================================

**Payment Flow (Safe & Audit-Ready):**

Step 1: Frontend → Backend (Checkout Initiated)
- User clicks "Pay Now" on checkout page
- Frontend calls Edge Function `create-razorpay-order`
- Pass: user_id, order_id, grand_total, currency (INR), user email, user phone

Step 2: Backend (Order Creation)
- Edge Function validates:
  - User exists and is authenticated
  - Order exists and belongs to user
  - Total matches (prevent tampering)
  - Stock still available for all items
- Reserve stock: increment reserved_stock for all order items
- Call Razorpay Orders API with server-side API key:
  ```
  POST https://api.razorpay.com/v1/orders
  {
    amount: grand_total * 100,  // in paise
    currency: "INR",
    receipt: order_number,
    notes: { order_id, user_id },
    payment_capture: 1  // auto-capture on authorization
  }
  ```
- Store razorpay_order_id in orders table
- Return: { razorpay_order_id, razorpay_key_id, user_email, user_phone, amount }

Step 3: Frontend (Razorpay Checkout Modal)
- Open Razorpay Checkout with order_id from step 2
- User enters card/UPI/wallet details in secure modal (PCI-DSS compliant)
- On success callback: frontend sends payment_id + signature to backend

Step 4: Backend (Payment Verification)
- Edge Function `verify-razorpay-payment` receives: payment_id, order_id, signature
- Verify HMAC SHA256 signature server-side:
  ```
  expected_signature = HMAC-SHA256(order_id + "|" + payment_id, RAZORPAY_KEY_SECRET)
  if (signature !== expected_signature) throw error  // reject
  ```
- Never trust client-side signature validation
- Update orders table:
  - payment_status = 'paid'
  - razorpay_payment_id = payment_id
  - razorpay_signature = signature
  - paid_at = now()
- Update status from 'pending' → 'paid' only after verification
- Deduct stock: stock_quantity -= order_item.quantity; reserved_stock = 0

Step 5: Frontend (Confirmation)
- On successful verification, redirect to order confirmation page
- Show order summary, delivery estimate, tracking (optional)
- Send customer confirmation email with order_number, items, total, tracking link

**Failure Handling:**
- Payment timeout (15 min): auto-cancel order, release reserved stock
- User cancels payment: don't create order, keep cart intact
- Payment failed: show retry button, keep order in pending state
- Webhook delay: reconcile via scheduled job every 5 min for pending orders

**Webhook Integration (Async Safety Net):**
- Razorpay sends webhooks: order.paid, payment.captured, payment.failed, refund.created
- Verify webhook signature (same HMAC logic)
- Log in payment_webhooks table
- If payment marked "paid" in webhook but order still pending: auto-update orders table
- Retry logic: webhook handler has exponential backoff (3 retries, 5s delay)

**Refund Handling:**
- Only admins can refund from dashboard
- Refund Edge Function calls Razorpay Refunds API
- Track refund_id; mark order status = 'refunded', payment_status = 'refunded'
- Send customer refund notification email
- Return stock to inventory

=====================================================
5. ENHANCED ADMIN DASHBOARD
=====================================================

**Tab 1: Dashboard / Analytics (Home)**
- Real-time metrics (refreshed via Supabase Realtime):
  - Today's revenue, orders, avg order value
  - Last 7 days: revenue chart (line), order count chart (bar)
  - Top 5 products by sales + revenue
  - Top 5 categories by revenue
  - Conversion funnel: visitors → cart adds → checkouts → payments
  - Low stock alerts (qty < reorder_level)
  - Recent orders (last 10, with status badge)

**Tab 2: Products**
- Product list: grid/table view, search by name/SKU, category filter
- Inline edit for stock, price, is_active
- Bulk actions: enable/disable, delete, apply offer
- Add Product form:
  - SKU, Name, Slug, Short Description, Full Description
  - Category (multi-select), Base Price, Cost Price, GST %
  - Stock Quantity, Reorder Level
  - Image uploader (multi-file, drag-drop to Supabase Storage)
  - Generate slug from name (auto)
  - Preview product card before save
- Edit Product: all above fields + rating, review_count (read-only)
- Delete: soft-delete or hard-delete with confirmation + audit log

**Tab 3: Offers & Pricing (Dynamic Control)**
- Table of all offers: name, product, type, discount, active dates, uses
- Create Offer form:
  - Name, Product (dropdown), Offer Type (radio buttons)
  - Show conditional fields based on type:
    - Percentage Discount: % input
    - Flat Discount: ₹ amount input
    - Buy X Get Y: buy qty + get qty + optional get % discount
    - Tiered: tier quantity + tier discount %
    - Free Shipping: none
  - Start Date/Time, End Date/Time (timezone aware)
  - Max Uses (optional), Min Order Value (optional), Max Discount Cap
  - Preview: "This offer will show as X% OFF" / "₹X OFF" / "Buy 2 Get 1 Free"
- Edit Offer: all above fields + current usage count, deactivate option
- Auto-deactivate offers when end_date passes (via scheduled job)
- Bulk offer application: select multiple products + apply same offer

**Tab 4: Orders**
- Table: Order #, Customer, Date, Total, Payment Status, Order Status
- Filters: status, payment_status, date range, customer name/email
- Bulk export to CSV
- Click row to open order detail drawer:
  - Customer info (name, email, phone, address history)
  - Items: product, qty, unit price, discount, line total
  - Totals: subtotal, discount, GST, shipping, grand total
  - Payment info: payment method, razorpay_payment_id, paid_at
  - Shipping address, tracking number (if shipped)
  - Timeline: order created → paid → processing → shipped → delivered
  - Manual status update: dropdown to change status, auto-email customer on change
  - Admin notes textarea
  - Refund button (if paid + not refunded): triggers refund via Razorpay + updates order
  - Re-send confirmation email button

**Tab 5: AI Customer Service**
- Customer Queries table: subject, channel, status, priority, date, customer name
- Filters: status, priority, channel, date range
- Click row to open query detail panel:
  - Full query message + any attachments
  - AI-drafted response (generated via Claude/ChatGPT via Edge Function)
  - Admin can edit AI response or write custom response
  - Approve & Send button: sends email to customer, marks status = 'resolved'
  - Escalate button: flag for manager, mark status = 'escalated'
  - Close button: mark status = 'closed'
- Auto-generate AI response on new query (async, happens in background)
- Show response time SLA: (now() - created_at) — highlight if > 24h

**Tab 6: Strategy & Growth (AI Advisor)**
- Chat interface (messages stored in growth_chat_messages)
- Context sidebar: show current metrics pulled from database
  - Monthly revenue, growth %, top product
  - Inventory health: total items, reorder items
  - Recent offers & their performance
- User types message e.g. "How can we increase sales by 20%?"
- Frontend sends to Edge Function `growth-strategist-agent`
  - Include store context (revenue, top products, offer performance, customer feedback)
  - LLM system prompt: "You are a critical, data-driven growth strategist..."
  - LLM analyzes store data + returns strategic advice
- Display AI response in chat
- Download conversation as PDF

**Tab 7: Visual Content (Image Generation)**
- Product image library: filter by product, status (approved/pending)
- Generate form:
  - Product dropdown (searchable)
  - Prompt textarea: e.g. "White background studio shot, product centered, bright lighting"
  - Style selector: photography, illustration, 3D render, etc. (optional)
  - Generate button: calls `generate-product-image` Edge Function
    - Call OpenAI DALL-E 3 / Stable Diffusion API
    - Return 1-2 images for review
- Generated images: show pending, with Approve / Reject buttons
- Approve: set is_approved = true, move to product gallery
- Reject: delete or modify prompt and regenerate
- Bulk operations: approve multiple, delete pending

**Tab 8: Internal Collaboration Chat**
- Real-time chat (Supabase Realtime subscription)
- Messages from admin + AI Collaborator
- AI Collaborator: LLM that responds to admin queries about day-to-day decisions
  - E.g. "Should we stock more of Product X?" → LLM analyzes sales data, gives recommendation
- Separate from Strategy & Growth chat (that's long-term strategic, this is tactical)
- Message history with date separators
- Search past conversations

**Tab 9: Settings (Admin Only)**
- Store settings:
  - Store name, logo, contact email, support email
  - Default shipping fee, free shipping threshold
  - GST rate, currency
- Team management:
  - List of admin accounts
  - Add admin: email input, assign role (admin_full / admin_orders / admin_support)
  - Deactivate admin (don't delete)
- API Keys:
  - Show Razorpay public key (masked secret key)
  - Show environment (dev/staging/prod)
- Email templates:
  - Order confirmation, shipment, delivery, refund (edit HTML/text)

=====================================================
6. PERFORMANCE OPTIMIZATION
=====================================================

**Frontend Optimizations:**
- Code splitting: async route loading via React.lazy()
- Image optimization: use next-gen formats (WebP), lazy loading with IntersectionObserver
- Bundle size: gzip target < 150KB
- Minify & compress CSS/JS
- Service Worker: cache static assets + API responses (30-day expiry for product data)
- Skeleton loaders for async data (products, reviews, orders)

**Caching Strategy:**
- React Query: cache product data for 5 min, orders for 1 min, user profile for 10 min
- HTTP cache headers: max-age=3600 for product images, max-age=86400 for category data
- Redis (optional): cache frequently accessed data (top products, active offers) for 1 hour

**Backend/Database Optimization:**
- Index frequently queried columns: categories_slug, products_slug, products_is_active, orders_created_at
- Pagination: limit 50 items per page (API default)
- Database query optimization: use SELECT only needed columns, avoid N+1 queries
- Connection pooling: Supabase Edge Functions use connection pooling
- Scheduled jobs (via pg_cron or external cron):
  - Every hour: auto-deactivate expired offers
  - Every 6 hours: aggregate review ratings (cache in products.rating)
  - Every day at 2 AM: cleanup failed payment records > 30 days old
  - Every 30 min: reconcile pending payments via Razorpay API

**Mobile Optimization:**
- Viewport meta tag (already in base)
- Touch-friendly buttons: min 44x44px
- Avoid layout shifts (use aspect-ratio containers for images)
- Reduce animation complexity for low-end devices (use prefers-reduced-motion)
- Compress images aggressively on mobile

**Monitoring & Analytics:**
- Setup error tracking (Sentry): capture exceptions, performance metrics
- Google Analytics 4: track pageviews, events (add to cart, purchase, login)
- Conversion tracking: setup goals in GA4 for checkout completion, purchase value

=====================================================
7. SECURITY HARDENING
=====================================================

**Authentication & Authorization:**
- JWT stored in HTTP-only, Secure, SameSite=Strict cookies
- CSRF protection: X-CSRF-Token header on all mutations
- Rate limiting:
  - Login endpoint: 5 attempts per IP per 15 min
  - API endpoints: 100 requests per minute per user
  - Payment verification: 10 attempts per order_id per hour
- Admin-only routes: verify role === 'admin' server-side (not just client-side)
- Permissions: RLS policies on all tables
  - Customers: SELECT is_active products + own orders/cart/reviews
  - Admins: full access to products, orders, offers, settings
  - Analytics: read-only for non-admin users (nothing)

**Data Protection:**
- Encrypt sensitive fields (passwords, SSNs, card tokens) — but Supabase Auth handles passwords
- Never store full credit card numbers; use Razorpay tokenization
- PII (personally identifiable info) in orders/profiles:
  - Don't log full names, emails, addresses in error messages
  - Audit trail: log who accessed what data
- Row-level security policies:
  ```sql
  -- Customers see only active products
  create policy "customers_see_active_products" on products
    for select using (is_active = true or auth.uid() in (select id from profiles where role = 'admin'));
  
  -- Customers see only their own orders
  create policy "customers_see_own_orders" on orders
    for select using (user_id = auth.uid());
  ```

**Payment Security:**
- PCI DSS Compliance: never handle raw card data; use Razorpay Checkout (client-side)
- Signature verification on all Razorpay webhooks (HMAC SHA256)
- Store razorpay_key_secret only in Supabase Edge Function secrets, never in frontend code
- Validate order amount server-side before charging (prevent tampering)

**API Security:**
- All endpoints HTTPS only
- CORS: whitelist only your domain (e.g. https://yourdomain.com)
- Input validation: sanitize user inputs (prevent SQL injection, XSS)
  - Use prepared statements (Supabase does this by default)
  - DOMPurify on any user-generated HTML (reviews, chat messages)
- Output encoding: escape JSON responses to prevent XSS

**Infrastructure Security:**
- Environment variables: use Supabase Secrets for API keys (Razorpay, LLM, etc.)
- Database backups: enable Supabase automated backups (daily, 7-day retention)
- Access control: use Supabase role-based access (limit who can view logs, backups)
- Firewall: restrict IP access if behind firewall (or use VPN)

**Audit & Compliance:**
- Enable audit logging (audit_log table): log all admin actions (product updates, offer changes, refunds)
- Data retention: delete old logs after 1 year (compliance)
- GDPR: implement "export my data" + "delete my account" features
  - Export: generate JSON/CSV of user profile + orders (for SAR requests)
  - Delete: anonymize profile, mask order history, delete cart + reviews (mark deleted, don't remove)

**Incident Response:**
- Setup Sentry alerts: critical errors → email admin
- Payment failures: log to payment_webhooks, alert on repeated failures for same customer
- Suspicious activity: detect fraud patterns (e.g. 100 failed logins from same IP → block)

=====================================================
8. CUSTOMER-FACING PAGES (REFINED)
=====================================================

**Home Page:**
- Hero banner: high-res image, headline, CTA button ("Shop Now")
- Featured Products Carousel: 5-8 items, auto-scroll, touch-swipe on mobile
- Active Offers Section: show top 3 offers (percentage, flat, or BOGO), countdown timer for expiry
- Category Grid: 6-8 categories, clickable tiles (image + name)
- New Arrivals: last 10 products added
- Social proof: customer review highlights, trust badges

**Product Listing Page:**
- Grid layout: 2 cols mobile, 3 cols tablet, 4 cols desktop
- Each card: image (with hover zoom on desktop), name, price (strike original if offer, show new), rating (⭐), "Add to Cart" button
- Filters (sidebar on desktop, drawer on mobile):
  - Category (checkbox multi-select)
  - Price range (slider, min-max inputs)
  - Rating (1-5 stars)
  - Availability (in stock only)
- Sort dropdown: relevance, price (low-high), price (high-low), newest, best-selling, highest-rated
- Pagination: show 12 items per page (load more on mobile)
- Mobile: sticky filter button (funnel icon) at bottom

**Product Detail Page:**
- Left: image gallery (main + thumbnails, click to zoom), zoom on hover (desktop)
- Right:
  - Name, SKU, rating (⭐⭐⭐⭐⭐) with review count link
  - Price display:
    - If active offer: <strike>₹base_price</strike> → ₹discounted_price + offer badge (e.g. "30% OFF")
    - Show savings: "Save ₹X"
  - Quick details: category, availability (in stock / low stock / out of stock)
  - Quantity selector (- / input field / + buttons, max = stock_quantity)
  - Primary CTA: "Add to Cart" button (changes to "Added ✓" on click)
  - Secondary CTAs: wishlist icon (heart), share buttons (WhatsApp, Facebook)
  - Description (expandable): full product info, specifications
- Reviews section (below fold):
  - Show first 5 reviews, "See all" link
  - Each review: user name, rating (stars), title, comment, date, helpful/unhelpful votes
  - Write review form (if logged in): rating selector, title input, comment textarea, submit
- Related products: 4-6 items from same category (carousel on mobile)

**Cart Page:**
- Cart items list (removable):
  - Product image, name, SKU
  - Unit price, quantity (- / input / + buttons, min 1, max available stock)
  - Offer applied (if any): "Buy 2 Get 1 Free" with discount shown
  - Line total (unit price × qty - discount)
  - Remove button (trash icon)
- Empty cart message (if no items)
- Order summary (sticky on mobile, right sidebar on desktop):
  - Subtotal
  - Offers applied (breakdown by offer)
  - GST (show rate %, amount)
  - Shipping fee (show method, e.g. "Standard $5")
  - Grand Total (bold, large font)
  - Proceed to Checkout button
- Discount code input (optional): textbox + apply button (future: promo codes)
- Continue Shopping button → back to product listing

**Checkout Page:**
- Step indicator: Shipping → Billing → Payment (or single-page form)
- Shipping Address form:
  - Full Name, Email, Phone (read-only if logged in, prefill from profile)
  - Address line 1, Address line 2, City, State, Pincode, Country
  - Save address for future orders (checkbox)
  - Address book (if logged in, show saved addresses as options)
- Shipping Method (if available):
  - Standard (₹0, 5-7 days)
  - Express (₹5, 2-3 days)
  - Overnight (₹10, next day) — show "Not available for your location" if applicable
- Order Summary (read-only recap):
  - Items (show product names, qty, prices)
  - Subtotal, Discount, GST, Shipping, Grand Total
- Payment Method Selection:
  - "Pay with Razorpay" button (opens modal on click)
  - (Future: other methods like COD, wallet, etc.)
- Terms & Conditions checkbox (mandatory)
- Place Order button (triggers order creation + Razorpay Checkout)

**Order Confirmation Page:**
- Order placed! Thank you message
- Order number (ORD-2024-001234)
- Order details: order date, expected delivery date, tracking info (if available)
- Items recap
- Customer contact info (confirm email for updates)
- "Continue Shopping" or "View My Orders" button
- Confirmation email sent to customer (receipt)

**Order History / My Orders Page (Logged-In Only):**
- Table of customer's orders: order #, date, total, status, action
- Each row clickable → open order detail drawer:
  - Order number, date, status timeline (pending → paid → processing → shipped → delivered)
  - Items (product names, qty, prices)
  - Tracking number (link to carrier) if shipped
  - "Request Return" button (if delivered within 30 days) → future feature
  - "Reorder" button → add items back to cart
- Filter/sort: by status, date range, order amount
- Export orders to PDF option

**Auth Pages:**
**Sign Up Page:**
- Email input + Password input (show strength meter) + Confirm password
- Full Name input
- Phone input (with country code picker)
- "Agree to Terms & Privacy" checkbox
- Sign up button
- "Already have an account? Sign in" link
- Post-signup: show "Check your email to verify" message

**Login Page:**
- Email input
- Password input (show/hide toggle)
- "Remember me" checkbox
- Sign in button
- "Forgot password?" link
- "Don't have an account? Sign up" link
- (Future) "Sign in with Google" button

**Forgot Password Page:**
- Email input
- Send Reset Link button
- Message: "Check your email for password reset instructions"

**Reset Password Page (from email link):**
- New password input (strength meter) + confirm password
- Reset button
- Message: "Password reset successfully! Redirecting to login..."

**Account Settings Page (Logged-In Users):**
- Profile tab: name, email, phone, avatar, bio
- Addresses tab: saved addresses, add/edit/delete
- Orders tab: history (same as My Orders page)
- Security tab: change password, 2FA (future), active sessions, logout all devices
- Email preferences: subscribe/unsubscribe from marketing emails

=====================================================
9. ADVANCED FEATURES (AI & INTEGRATIONS)
=====================================================

**AI Customer Service:**
- Auto-respond to customer queries using Claude/ChatGPT
- Analyze sentiment: is customer angry/frustrated/neutral/happy?
- Auto-categorize query: returns/refunds, shipping, product info, feedback
- Suggest responses to admin (draft only, must approve before sending)

**AI Image Generation:**
- Generate product images via OpenAI DALL-E 3 or Stable Diffusion
- Admin writes prompt, system generates 1-2 options
- Approve best option → automatically added to product gallery

**Email Notifications (Transactional):**
- Order confirmation: order #, items, total, tracking (when shipped)
- Payment received: thank you, order summary
- Shipment alert: tracking #, carrier link, estimated delivery
- Delivery confirmation: thank you, review prompt
- Refund processed: refund amount, original payment method

**SMS Notifications (Optional):**
- Order confirmation (SMS shortcode)
- Payment received (SMS)
- Shipment tracking (SMS with link)
- OTP for phone login/verification

**WhatsApp Integration (Future):**
- Order status updates via WhatsApp message
- Customer support chat via WhatsApp Business API
- Order tracking link via WhatsApp

=====================================================
10. QUALITY ASSURANCE & TESTING
=====================================================

**Unit Tests:**
- Test offer calculation logic: discount percentage, flat, BOGO, tiered
- Test cart recalculation: stock updates, offer application, GST
- Test payment signature verification: valid + invalid signatures

**Integration Tests:**
- Test order creation → payment → confirmation flow
- Test admin offer creation → display on product page
- Test customer queries → AI response generation

**E2E Tests (Cypress / Playwright):**
- User signup → login → browse products → add to cart → checkout → payment
- Admin: login → create product → set offer → verify on storefront

**Performance Tests:**
- Lighthouse score target: >85 (desktop), >75 (mobile)
- Page load time target: <3s (desktop), <5s (mobile)
- Bundle size target: <150KB gzipped

**Security Tests:**
- SQL injection attempts on search/filters (should fail)
- XSS attempts in reviews (should sanitize)
- CSRF attacks on mutations (should reject if token missing)
- Auth bypass attempts (should require valid JWT)

=====================================================
11. DEPLOYMENT & INFRASTRUCTURE
=====================================================

**Development Environment:**
- Local: React dev server, Supabase local dev setup (Docker)
- Environment file: .env.local with Supabase credentials

**Staging Environment:**
- GitHub branch: `staging`
- Auto-deploy on PR merge via GitHub Actions
- Supabase staging project: separate DB from production

**Production Environment:**
- GitHub branch: `main` → triggers CD pipeline
- Supabase production project (with automated backups)
- Frontend hosted on Vercel / Netlify (auto-deploys on main push)
- Backend: Supabase Edge Functions (serverless)

**CI/CD Pipeline (GitHub Actions):**
```yaml
on: [push, pull_request]
jobs:
  test:
    - Lint (ESLint)
    - Type check (TypeScript)
    - Unit tests (Jest)
    - Build (Vite)
  deploy (if main branch):
    - Deploy frontend to Vercel/Netlify
    - Deploy Edge Functions to Supabase
```

**Monitoring & Alerts:**
- Sentry: error tracking, performance monitoring
- Uptime monitoring: StatusPage.io
- Database monitoring: Supabase dashboard (CPU, connections, queries)
- Alert conditions:
  - Error rate > 1%
  - API response time > 2s
  - Database connection pool exhausted
  - Payment webhook failures > 5 in 1 hour

=====================================================
12. IMPLEMENTATION ROADMAP (PHASES)
=====================================================

**Phase 1 (MVP): Core E-commerce**
- Auth (email + password)
- Product catalog + search + filters
- Cart + checkout
- Razorpay payment integration
- Order tracking (basic)
- Customer-facing pages

**Phase 2: Admin & Offers**
- Admin dashboard (products, orders, analytics)
- Offer management (percentage, flat, BOGO)
- Order status management + customer emails

**Phase 3: AI & Advanced Features**
- AI customer service (ChatGPT integration)
- AI image generation (DALL-E)
- Growth strategy chat

**Phase 4: Optimization & Scale**
- Performance tuning (caching, indexing)
- Mobile app (React Native, optional)
- Multi-currency support (future)
- Marketplace (seller accounts, future)

===================================================== 

**Build this as a production-ready, fully functional application. Test all auth flows, payment integrations, and data consistency. Include seed data (10+ products in 3 categories, 1 sample offer) so the store is demo-ready immediately after generation.**

