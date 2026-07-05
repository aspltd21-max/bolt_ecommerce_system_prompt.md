# Aditya E Mart — Bulk Import + Pricing Logic + Visuals + Growth Tab (v4)

> Same Bolt.new project chat mein paste karein.
> Is prompt ke saath 3 files bhi upload/attach karein: `products_import_template.csv`, `generate_products_json.js`, aur (script chalane ke baad banega) `products.json`.

---

## STEP A — Pehle apne computer/terminal mein (ya Bolt ke terminal mein) yeh chalayein:

```
npm install csv-parse
node generate_products_json.js
```

Yeh `products.json` banayega jisme har product ka: naam, category, MRP (base_price), asli selling price (DP se), discount %, aur ek `needs_review` flag hoga (jo products PDF se clearly verify nahi ho paaye, woh flag=true honge aur automatically customer ko dikhenge nahi jab tak admin manually confirm na kare).

---

## PASTE THIS INTO BOLT.NEW (same project chat)

```
Bulk-import products from the attached products.json into the existing `products` and `offers` tables.

=== BULK IMPORT LOGIC ===
- For each entry in products.json → products array: insert into the `products` table using base_price as the MRP field, and store the DP-derived selling_price internally (do NOT create a visible "DP Price" label anywhere in the UI — this must never be shown to customers).
- For each entry in products.json → offers array: insert into the `offers` table, linked by product_id.
- Any product with needs_review = true must be inserted with is_active = false, and additionally flagged in the admin Products tab with a visible "⚠ Needs Price Verification" badge — these must NOT appear on the public storefront until the admin manually reviews and activates them.

=== PRICING DISPLAY LOGIC (apply store-wide) ===
- Never display the word "DP Price" or "Dealer Price" anywhere customer-facing.
- Display format: show base_price (MRP) with strikethrough, then the actual selling_price, then a badge:
  - If offer_type = 'percentage_discount': badge shows "{discount_percentage}% OFF"
  - If offer_type = 'buy_x_get_y' with buy_quantity=1, get_quantity=1: badge shows "BUY 1 GET 1 FREE" instead of a percentage — and the discount_percentage field is ignored/hidden for these products.
- discount_percentage is always calculated server-side as ((base_price - selling_price) / base_price) * 100, rounded to 2 decimals — never hardcode it in the frontend.
- Admin can override any product's offer_type from the existing Offers & Pricing admin tab (already built) — e.g. switch a percentage-discount product to Buy 1 Get 1 manually at any time.

=== VISUAL THEME — "WELLNESS & LUXURY" ===
- Apply a cohesive Wellness & Luxury visual theme site-wide: soft neutral/cream backgrounds, deep green + gold accent palette, elegant serif headings paired with a clean sans-serif body font, generous whitespace, subtle marble/botanical texture backgrounds behind hero sections and category banners (not behind product grids, to keep prices readable).
- Each product category (Wellness, WellRoot, Jeeveda Spices, Sniss Cosmetic, Sniss Elite, Sniss Herbal, Home Care, Food Product, Veterinary, Vedik Agro) gets its own subtle background wallpaper accent on its category landing page, using the `wallpaper` field already present in each product's imported data as a reference path — treat these as placeholders (`/assets/wallpapers/...`) and use elegant CSS gradient + texture patterns as a fallback until real wallpaper images are uploaded.
- For product images: since imported products currently have an empty `images` array, show an elegant placeholder card (soft gradient + product category icon + "Image coming soon") instead of a broken image — and surface a clear "Generate Image" button on that product in the admin Visual Content tab, pre-filled with the `image_generation_prompt` field already included in the import data.

=== GROWTH & REVENUE TAB (confirm/extend existing Strategy & Growth tab) ===
- Ensure the admin "Strategy & Growth" tab (already built) automatically surfaces insights from this newly imported catalog: total SKUs by category, average discount % by category, products still marked needs_review (as an action item: "12 products awaiting price verification"), and top-margin vs thin-margin products (based on discount_percentage — lower discount % often means thinner promotional room, worth flagging to the admin).
- Keep the "critical, business-minded" AI growth strategist persona already defined — it should proactively mention the needs_review backlog as a blocker to resolve before a marketing push, since unverified prices going live is a real business risk.

=== ADMIN-AI CHAT ===
- Confirm the existing Admin ↔ AI Collaborator internal chat tab is available for the admin to ask operational questions about this specific import (e.g. "which products are still unverified?", "show me all Jeeveda Spices products added today") — wire it to query the products table directly so answers are grounded in real, current data, not guesses.

Do not overwrite or duplicate any existing products already in the store — check for existing SKUs/names before inserting to avoid duplicates.
```

---

### Zaroori baatein (please dhyan se padhein):

1. **Sirf `HIGH` confidence wale 32 products (Jeeveda Spices)** maine 100% verify kiye hain — inka discount pattern consistently ~28.5% nikla, jo genuine lagta hai.
2. **Baaki categories (Wellness, WellRoot, Sniss Cosmetic/Elite/Herbal, Home Care, Food Product, Veterinary, Vedik Agro)** ka data PDF scan quality ki wajah se ambiguous hai — kai jagah ₹ symbol OCR mein galat digit (2/3/8) ban gaya, aur multi-column layout ki wajah se products aapas mein mix ho gaye. Maine kuch examples "REVIEW" tag ke saath diye hain, lekin **poori catalog (200+ products) ke liye aapko `products_import_template.csv` file khud open karke baaki rows fill/verify karni hongi** — original PDF dekh kar. Yeh 1-2 ghante ka kaam hai lekin galat prices live jaane se zyada surakshit hai.
3. Cosmetics section (pages 13-17) sabse zyada corrupt tha OCR mein — is section ke products manually type karna hi sabse reliable tareeka hoga.
4. Jab tak koi product `needs_review` flag ke saath hai, woh automatically customer ko nahi dikhega — sirf admin panel mein "Needs Verification" list mein rahega. Yeh isliye kiya hai taaki koi galat price accidentally live na chala jaaye.
5. Ek baar `products_import_template.csv` mein saare rows verify/fill ho jayein, bas dobara `node generate_products_json.js` chalayein aur naya `products.json` Bolt mein paste kar dein.

Agar aap chahein toh main aapko CSV ke bache hue rows (Wellness, WellRoot, etc.) fill karne mein bhi help kar sakta hoon — bas mujhe bataiye kis page/category se shuru karna hai, aur main OCR draft + verification checklist bana dunga taaki aapko sirf confirm karna pade, type na karna pade.
