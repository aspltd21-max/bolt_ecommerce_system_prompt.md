# Installation & Setup Guide

## Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Razorpay account (for payments)

## Setup Steps

### 1. Clone & Install
```bash
git clone https://github.com/aspltd21-max/bolt_ecommerce_system_prompt.md.git
cd website-source
npm install
```

### 2. Environment Variables
Create `.env.local`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_RAZORPAY_KEY_ID=your_razorpay_key
```

### 3. Database Setup
```bash
# Run migrations in Supabase dashboard
# Or use: npx supabase db push
```

### 4. Development Server
```bash
npm run dev
# Visit: http://localhost:5173
```

### 5. Build for Production
```bash
npm run build
npm run preview
```

## Available Scripts
- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - TypeScript type checking

## Testing

### Customer Flow
1. Sign up / Login
2. Browse products
3. Add to cart
4. Checkout
5. Payment (Razorpay)

### Admin Flow
1. Login as admin
2. Navigate to `/admin`
3. Manage products, offers, orders

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5173
npx kill-port 5173
npm run dev
```

### Supabase Connection Error
- Check `.env.local` values
- Verify Supabase project is running
- Check RLS policies

### Build Fails
```bash
rm -rf node_modules
npm install
npm run build
```

## Deployment

### Vercel (Recommended)
```bash
npm i -g vercel
vercel
```

### Netlify
```bash
npm run build
# Deploy dist/ folder
```

## Support
For issues, check:
- GitHub Issues
- Supabase Docs
- React Router Docs
