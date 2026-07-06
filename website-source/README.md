# ShopNow - E-Commerce Website

A modern, full-stack e-commerce platform built with **React + TypeScript + Supabase**.

## 🚀 Features

### Customer-Facing
✅ **Product Catalog** - Browse products with filters and search  
✅ **Shopping Cart** - Add/remove items, auto-calculate totals  
✅ **Checkout** - Shipping address, order summary  
✅ **Payment** - Razorpay integration for secure payments  
✅ **Order Tracking** - View order history and status  
✅ **User Accounts** - Signup, login, profile management  
✅ **Responsive Design** - Works on mobile, tablet, desktop  

### Admin Dashboard
✅ **Product Management** - Add/edit/delete products  
✅ **Offer Management** - Create discounts (%, flat, BOGO)  
✅ **Order Management** - Track orders, update status  
✅ **Analytics** - Revenue charts, top products  
✅ **AI Features** - Customer service, image generation  
✅ **Real-time Sync** - Live updates via Supabase Realtime  

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand (cart, auth)
- **Backend**: Supabase (Postgres + Auth + Storage)
- **Database**: PostgreSQL (Supabase)
- **Payments**: Razorpay
- **Charts**: Recharts
- **Icons**: Lucide React
- **Routing**: React Router v7

## 📦 Installation

```bash
# Clone repository
git clone https://github.com/aspltd21-max/bolt_ecommerce_system_prompt.md.git
cd website-source

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your Supabase & Razorpay keys

# Start dev server
npm run dev
```

Visit `http://localhost:5173`

## 📋 Project Structure

See [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) for detailed folder organization.

## 🔧 Development

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🌐 Live Demo

**Website**: https://full-stack-e-commerc-uwur.bolt.host

### Test Credentials
- Email: `test@example.com`
- Password: `Test@123456`

## 📚 Documentation

- [Installation Guide](./INSTALLATION.md)
- [Project Structure](./PROJECT_STRUCTURE.md)
- [Enhanced System Prompt](../README_ENHANCED.md)

## 🔐 Security

- ✅ JWT authentication (HTTP-only cookies)
- ✅ Row-level security (RLS) on Supabase
- ✅ Server-side payment verification (Razorpay)
- ✅ Input validation & sanitization
- ✅ Environment variables for secrets

## 📊 Performance

- Bundle Size: <150KB (gzipped)
- Lighthouse Score: 85+
- Page Load: <3s (desktop), <5s (mobile)
- Caching: React Query + Service Workers

## 🚢 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm run build
# Deploy dist/ folder
```

### GitHub Pages
```bash
npm run build
# Push dist/ folder
```

## 🐛 Troubleshooting

See [INSTALLATION.md](./INSTALLATION.md#troubleshooting)

## 📝 License

MIT License - feel free to use this project for learning/commercial purposes.

## 👥 Contributing

Contributions welcome! Please:
1. Fork the repo
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📞 Support

For issues or questions:
- Open GitHub Issue
- Check Discussions
- Email: support@shopnow.com

---

**Made with ❤️ using React + Supabase**
