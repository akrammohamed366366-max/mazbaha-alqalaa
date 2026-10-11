/**
 * Seeds sample Egyptian-grill menu (PLACEHOLDER prices) into categories and menuItems
 * using Firebase Admin SDK.
 * 
 * Usage:
 *   node scripts/seed-menu.mjs
 *   (or with FIRESTORE_EMULATOR_HOST=localhost:8080 node scripts/seed-menu.mjs)
 */
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const categories = [
  {
    id: 'cat-meats',
    name: 'مشويات اللحوم',
    sortOrder: 1,
    active: true,
  },
  {
    id: 'cat-poultry',
    name: 'مشويات الدواجن',
    sortOrder: 2,
    active: true,
  },
  {
    id: 'cat-casseroles',
    name: 'طواجن وأطباق جانبية',
    sortOrder: 3,
    active: true,
  },
  {
    id: 'cat-salads',
    name: 'سلطات ومقبلات',
    sortOrder: 4,
    active: true,
  },
];

const menuItems = [
  {
    id: 'item-kebab-lamb',
    categoryId: 'cat-meats',
    name: 'كباب ضاني بلدي على الفحم',
    description: 'قطع لحم ضاني بلدي متبلة بالخلطة السرية ومشوية على الفحم الحجري',
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80',
    tags: ['الأكثر طلباً', 'ضاني', 'مشويات'],
    sortOrder: 1,
    active: true,
    available: true,
    featured: true,
    variants: [
      { id: 'var-kebab-q', label: 'ربع كيلو', price: 210 },
      { id: 'var-kebab-h', label: 'نصف كيلو', price: 420 },
      { id: 'var-kebab-k', label: 'كيلو', price: 840 },
    ],
  },
  {
    id: 'item-kofta-charcoal',
    categoryId: 'cat-meats',
    name: 'كفتة مشوية بلدي',
    description: 'كفتة مفرومة طازجة مع بقدونس وبهارات القلعة المميزة مشوية على الفحم',
    imageUrl: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&auto=format&fit=crop&q=80',
    tags: ['الأكثر طلباً', 'كفتة'],
    sortOrder: 2,
    active: true,
    available: true,
    featured: true,
    variants: [
      { id: 'var-kofta-q', label: 'ربع كيلو', price: 160 },
      { id: 'var-kofta-h', label: 'نصف كيلو', price: 320 },
      { id: 'var-kofta-k', label: 'كيلو', price: 640 },
    ],
  },
  {
    id: 'item-ribs-lamb',
    categoryId: 'cat-meats',
    name: 'ريش ضاني ممتازة',
    description: 'ريش لحم ضاني متبلة بعناية مشوية على نار هادئة حتى النضج التام',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
    tags: ['فاخر', 'ريش'],
    sortOrder: 3,
    active: true,
    available: true,
    featured: false,
    variants: [
      { id: 'var-ribs-q', label: 'ربع كيلو', price: 240 },
      { id: 'var-ribs-h', label: 'نصف كيلو', price: 480 },
      { id: 'var-ribs-k', label: 'كيلو', price: 960 },
    ],
  },
  {
    id: 'item-tarb-grilled',
    categoryId: 'cat-meats',
    name: 'طرب مشوي على الفحم',
    description: 'كفتة لحم بلدي ملفوفة بمنديل الضاني المقرمش المتبل',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
    tags: ['طرب', 'أصيل'],
    sortOrder: 4,
    active: true,
    available: true,
    featured: false,
    variants: [
      { id: 'var-tarb-q', label: 'ربع كيلو', price: 180 },
      { id: 'var-tarb-h', label: 'نصف كيلو', price: 360 },
      { id: 'var-tarb-k', label: 'كيلو', price: 720 },
    ],
  },
  {
    id: 'item-mix-grill',
    categoryId: 'cat-meats',
    name: 'صينية مشكل مشويات القلعة',
    description: 'تشكيلة متكاملة من كباب، كفتة، ريش، وطرب مع خبز بلدي وطحينة',
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80',
    tags: ['الأكثر طلباً', 'عائلي', 'مشكل'],
    sortOrder: 5,
    active: true,
    available: true,
    featured: true,
    variants: [
      { id: 'var-mix-h', label: 'نصف كيلو مشكل', price: 390 },
      { id: 'var-mix-k', label: 'كيلو مشكل', price: 780 },
    ],
  },
  {
    id: 'item-shish-tawook',
    categoryId: 'cat-poultry',
    name: 'شيش طاووق متبل',
    description: 'شيش صدور وأوراك دجاج متبلة بالزبادي والليمون والأعشاب الطازجة',
    imageUrl: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=800&auto=format&fit=crop&q=80',
    tags: ['دواجن', 'شيش'],
    sortOrder: 6,
    active: true,
    available: true,
    featured: false,
    variants: [
      { id: 'var-shish-q', label: 'ربع كيلو', price: 120 },
      { id: 'var-shish-h', label: 'نصف كيلو', price: 240 },
      { id: 'var-shish-k', label: 'كيلو', price: 480 },
    ],
  },
  {
    id: 'item-grilled-chicken',
    categoryId: 'cat-poultry',
    name: 'فرخة مشوية على الفحم',
    description: 'دجاجة طازجة متبلة بالبهارات المصرية ومشوية على الفحم حتى الاحمرار',
    imageUrl: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800&auto=format&fit=crop&q=80',
    tags: ['دجاج', 'مشوي'],
    sortOrder: 7,
    active: true,
    available: true,
    featured: true,
    variants: [
      { id: 'var-chick-half', label: 'نصف فرخة', price: 130 },
      { id: 'var-chick-whole', label: 'فرخة كاملة', price: 250 },
    ],
  },
  {
    id: 'item-rice-nuts',
    categoryId: 'cat-casseroles',
    name: 'أرز بسمتي بالمكسرات',
    description: 'أرز مبهر بالزعفران والقرفة ومزين بالكاجو واللوز والزبيب',
    imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&auto=format&fit=crop&q=80',
    tags: ['أرز', 'أطباق جانبية'],
    sortOrder: 8,
    active: true,
    available: true,
    featured: false,
    variants: [
      { id: 'var-rice-s', label: 'طبق فردي', price: 45 },
      { id: 'var-rice-m', label: 'طبق عائلي', price: 90 },
    ],
  },
  {
    id: 'item-tahini',
    categoryId: 'cat-salads',
    name: 'طحينة سمسم بلدي',
    description: 'طحينة خام معدة بالليمون والكمون والخل وزيت الزيتون',
    imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80',
    tags: ['سلطات'],
    sortOrder: 9,
    active: true,
    available: true,
    featured: false,
    variants: [
      { id: 'var-tahini-box', label: 'علبة طحينة', price: 20 },
    ],
  },
];

async function seed() {
  console.log('Seeding categories...');
  for (const cat of categories) {
    await db.doc(`categories/${cat.id}`).set(cat, { merge: true });
    console.log(`Saved category: ${cat.name}`);
  }

  console.log('Seeding menu items...');
  for (const item of menuItems) {
    await db.doc(`menuItems/${item.id}`).set(item, { merge: true });
    console.log(`Saved item: ${item.name}`);
  }

  console.log('Menu seeding completed successfully.');
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
