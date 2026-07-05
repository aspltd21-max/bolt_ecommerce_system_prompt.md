/*
 * Aditya E Mart — Bulk Product Import Generator
 * ------------------------------------------------
 * Reads: products_import_template.csv (edit/verify this file first!)
 * Outputs: products.json — ready to bulk-insert into the Supabase `products`
 *          and `offers` tables via the admin panel's bulk import feature,
 *          or via a one-time seed script.
 *
 * USAGE (in Bolt.new terminal):
 *   npm install csv-parse
 *   node generate_products_json.js
 *
 * IMPORTANT: Only rows with confidence=HIGH are safe to import as-is.
 * Rows marked confidence=REVIEW must be checked against the original
 * PDF price list before going live — this script will still convert
 * them, but flags them in the output so the admin panel can visually
 * mark them "Needs Review" and hide them from customers until confirmed.
 */

const fs = require('fs');
const { parse } = require('csv-parse/sync');

const INPUT_CSV = './products_import_template.csv';
const OUTPUT_JSON = './products.json';

// Wellness & Luxury themed placeholder wallpapers (used as page backgrounds
// per category — replace with real AI-generated art once the Visual Content
// admin tool has generated proper assets)
const CATEGORY_WALLPAPER = {
  'Jeeveda Spices': '/assets/wallpapers/wellness-spices-luxury.jpg',
  'Wellness': '/assets/wallpapers/wellness-herbal-luxury.jpg',
  'WellRoot': '/assets/wallpapers/wellness-botanical-luxury.jpg',
  'Sniss Cosmetic': '/assets/wallpapers/luxury-cosmetic-gold.jpg',
  'Sniss Elite': '/assets/wallpapers/luxury-skincare-marble.jpg',
  'default': '/assets/wallpapers/wellness-luxury-default.jpg',
};

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function computeDiscountPercentage(mrp, dp) {
  if (!mrp || mrp <= 0) return 0;
  const pct = ((mrp - dp) / mrp) * 100;
  return Math.round(pct * 100) / 100; // 2 decimal places
}

function main() {
  const csvContent = fs.readFileSync(INPUT_CSV, 'utf-8');
  const rows = parse(csvContent, { columns: true, skip_empty_lines: true });

  const products = [];
  const offers = [];
  let skipped = 0;

  rows.forEach((row, idx) => {
    const mrp = parseFloat(row.mrp);
    const dp = parseFloat(row.dp_price);
    const name = (row.product_name || '').trim();

    if (!name || isNaN(mrp) || isNaN(dp) || mrp <= 0) {
      skipped++;
      return; // skip incomplete placeholder rows (e.g. the cosmetics placeholder)
    }

    const discountPct = computeDiscountPercentage(mrp, dp);
    const needsReview = row.confidence !== 'HIGH';
    const isBuyOneGetOne = (row.offer_override || '').trim().toLowerCase() === 'buy_1_get_1';

    const productId = `prod_${slugify(name)}_${idx}`;

    products.push({
      id: productId,
      name,
      category: row.category,
      base_price: mrp,          // shown as the "original"/struck-through price
      selling_price: dp,        // actual charged price (never labelled "DP" on-site)
      quantity_label: `${row.quantity}${row.unit ? ' ' + row.unit : ''}`,
      is_active: !needsReview,  // hidden from storefront until admin confirms REVIEW rows
      needs_review: needsReview,
      wallpaper: CATEGORY_WALLPAPER[row.category] || CATEGORY_WALLPAPER.default,
      images: [],                // populated later via the Visual Content / AI image generator tool
      image_generation_prompt: `professional product photo of ${name}, wellness and luxury aesthetic, studio lighting, white/marble background`,
      created_from_import: true,
    });

    offers.push({
      product_id: productId,
      offer_type: isBuyOneGetOne ? 'buy_x_get_y' : 'percentage_discount',
      discount_percentage: isBuyOneGetOne ? null : discountPct,
      buy_quantity: isBuyOneGetOne ? 1 : null,
      get_quantity: isBuyOneGetOne ? 1 : null,
      is_active: !needsReview,
    });
  });

  fs.writeFileSync(
    OUTPUT_JSON,
    JSON.stringify({ products, offers }, null, 2)
  );

  console.log(`Done. ${products.length} products written, ${skipped} incomplete rows skipped.`);
  console.log(`${products.filter(p => p.needs_review).length} products marked needs_review=true (hidden from storefront until admin approves).`);
  console.log(`Output: ${OUTPUT_JSON}`);
}

main();
