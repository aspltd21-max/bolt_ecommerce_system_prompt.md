# Bolt E-Commerce Website - Source Code Structure

## Folder Organization

```
src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx          # Navigation bar with cart icon
│   │   ├── Footer.tsx          # Footer with links
│   │   └── MainLayout.tsx      # Main wrapper layout
│   └── ui/
│       ├── Button.tsx          # Reusable button component
│       ├── Card.tsx            # Reusable card component
│       ├── Input.tsx           # Form input component
│       ├── Badge.tsx           # Badge/label component
│       ├── Loading.tsx         # Loading spinner
│       └── Toast.tsx           # Toast notifications
├── pages/
│   ├── HomePage.tsx            # Landing page
│   ├── ProductsPage.tsx        # Product listing with filters
│   ├── ProductDetailPage.tsx   # Single product view
│   ├── CartPage.tsx            # Shopping cart
│   ├── CheckoutPage.tsx        # Payment & shipping
│   ├── LoginPage.tsx           # User login
│   ├── RegisterPage.tsx        # User signup
│   ├── OrdersPage.tsx          # User order history
│   ├── admin/                  # Admin panel pages
│   │   ├── AdminLayout.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── ProductsPage.tsx
│   │   ├── OffersPage.tsx
│   │   ├── OrdersPage.tsx
│   │   ├── CustomerServicePage.tsx
│   │   ├── GrowthChatPage.tsx
│   │   ├── ImageGenPage.tsx
│   │   ├── CollabChatPage.tsx
│   │   └── index.ts
│   └── index.ts
├── stores/                     # Zustand state management
│   ├── authStore.ts           # Auth state (user, login/logout)
│   └── cartStore.ts           # Cart state (items, totals)
├── services/                   # API calls & integrations
│   ├── admin.ts               # Admin API endpoints
│   ├── products.ts            # Product API endpoints
│   └── settings.ts            # Settings API endpoints
├── lib/                        # Utilities
│   └── database.ts            # Supabase utilities
├── types/                      # TypeScript interfaces
│   └── supabase.ts            # Supabase types
├── App.tsx                    # Main app component
├── main.tsx                   # Entry point
└── index.css                  # Global styles
```

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State**: Zustand (cart, auth)
- **Backend**: Supabase (Postgres, Auth, Storage)
- **Routing**: React Router v7
- **Charts**: Recharts (admin)
- **Icons**: Lucide React

## Key Features
✅ Customer Pages (Home, Products, Cart, Checkout, Orders)
✅ Admin Dashboard (Products, Offers, Orders, Analytics)
✅ AI Customer Service
✅ Payment Integration (Razorpay ready)
✅ Real-time Cart Sync
✅ Mobile Responsive

## Next Steps
1. Add all component files to GitHub
2. Implement missing services
3. Setup Supabase Edge Functions
4. Add Razorpay integration
5. Deploy to production
