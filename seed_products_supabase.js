/*
 * Aditya E Mart — Supabase Bulk Product Import Seed
 * =====================================================
 * This script:
 * 1. Reads products_import_template.csv
 * 2. Generates products & offers data (same as generate_products_json.js)
 * 3. Bulk inserts into Supabase `products` and `offers` tables
 * 4. Handles needs_review flag (is_active=false for REVIEW items)
 *
 * USAGE:
 *   Set env vars: SUPABASE_URL, SUPABASE_ANON_KEY (or service role key for bulk ops)
 *   npm install csv-parse @supabase/supabase-js
 *   node seed_products_supabase.js
 */

const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gxdbqdybudxszbexjtgo.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4ZGJxZHlidWR4c3piZXhqdGdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxODMxMjMsImV4cCI6MjA5ODc1OTEyM30.M-jnlIfd44Via8lehkMVtYbqK99m1XmkTYwPRKogaG4';

const INPUT_CSV = './products_import_template.csv';

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
  return Math.round(pct * 100) / 100;
}

async function main() {
  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log('📖 Reading products_import_template.csv...');
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
      return;
    }

    const discountPct = computeDiscountPercentage(mrp, dp);
    const needsReview = row.confidence !== 'HIGH';
    const isBuyOneGetOne = (row.offer_override || '').trim().toLowerCase() === 'buy_1_get_1';

    const productId = `prod_${slugify(name)}_${idx}`;

    products.push({
      id: productId,
      name,
      category: row.category,
      base_price: mrp,
      selling_price: dp,
      quantity_label: `${row.quantity}${row.unit ? ' ' + row.unit : ''}`,
      is_active: !needsReview,
      needs_review: needsReview,
      wallpaper: CATEGORY_WALLPAPER[row.category] || CATEGORY_WALLPAPER.default,
      images: [],
      image_generation_prompt: `professional product photo of ${name}, wellness and luxury aesthetic, studio lighting, white/marble background`,
      created_from_import: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    offers.push({
      product_id: productId,
      offer_type: isBuyOneGetOne ? 'buy_x_get_y' : 'percentage_discount',
      discount_percentage: isBuyOneGetOne ? null : discountPct,
      buy_quantity: isBuyOneGetOne ? 1 : null,
      get_quantity: isBuyOneGetOne ? 1 : null,
      is_active: !needsReview,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });

  console.log(`\n📊 Generated ${products.length} products (${skipped} skipped)\n`);

  // Bulk insert products
  try {
    console.log('💾 Inserting products into Supabase...');
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .insert(products);

    if (productsError) {
      console.error('❌ Products insert error:', productsError);
      return;
    }
    console.log(`✅ ${products.length} products inserted`);
  } catch (err) {
    console.error('❌ Products insert failed:', err.message);
    return;
  }

  // Bulk insert offers
  try {
    console.log('💾 Inserting offers into Supabase...');
    const { data: offersData, error: offersError } = await supabase
      .from('offers')
      .insert(offers);

    if (offersError) {
      console.error('❌ Offers insert error:', offersError);
      return;
    }
    console.log(`✅ ${offers.length} offers inserted`);
  } catch (err) {
    console.error('❌ Offers insert failed:', err.message);
    return;
  }

  // Summary
  const needsReviewCount = products.filter(p => p.needs_review).length;
  const activeCount = products.filter(p => p.is_active).length;

  console.log(`\n🎉 Import Complete!`);
  console.log(`   ✓ ${activeCount} products active (visible to customers)`);
  console.log(`   ⚠ ${needsReviewCount} products flagged for review (hidden until verified)`);
  console.log(`\n📝 Next: In your admin panel, verify the ${needsReviewCount} products marked "Needs Price Verification"`);
}

main().catch(console.error);
