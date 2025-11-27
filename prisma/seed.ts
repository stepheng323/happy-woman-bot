import 'dotenv/config';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { DB } from '../src/database/types';

interface ProductSeedData {
  name: string;
  description: string | null;
  price: string;
  category: string | null;
  image_url: string | null;
  is_active: boolean;
}

const products: ProductSeedData[] = [
  {
    name: 'Ballpoint Pen - Blue (Pack of 10)',
    description: 'Smooth writing ballpoint pens in blue ink. Pack of 10 pens.',
    price: '5.99',
    category: 'Office Supplies',
    image_url:
      'https://images.unsplash.com/photo-1583484963886-cfe2bff2945f?w=500&h=500&fit=crop',
    is_active: true,
  },
  {
    name: 'A4 Notebook - 100 Pages',
    description:
      'High-quality A4 size notebook with 100 ruled pages. Perfect for notes and meetings.',
    price: '3.50',
    category: 'Office Supplies',
    image_url:
      'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&h=500&fit=crop',
    is_active: true,
  },
  {
    name: 'File Folder - Manila (Pack of 10)',
    description:
      'Standard manila file folders for document organization. Pack of 10.',
    price: '8.99',
    category: 'Office Supplies',
    image_url:
      'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=500&h=500&fit=crop',
    is_active: true,
  },
  {
    name: 'Stapler with 1000 Staples',
    description:
      'Heavy-duty stapler with 1000 staples included. Perfect for office use.',
    price: '12.99',
    category: 'Office Supplies',
    image_url:
      'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=500&h=500&fit=crop',
    is_active: true,
  },
  {
    name: 'Sticky Notes - Yellow (5 Pads)',
    description: 'Bright yellow sticky notes. 5 pads of 100 sheets each.',
    price: '4.50',
    category: 'Office Supplies',
    image_url:
      'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=500&h=500&fit=crop',
    is_active: true,
  },

  {
    name: 'USB Flash Drive - 32GB',
    description: 'High-speed USB 3.0 flash drive with 32GB storage capacity.',
    price: '15.99',
    category: 'Electronics',
    image_url:
      'https://images.unsplash.com/photo-1591488320449-11c0d0c6e3c8?w=500&h=500&fit=crop',
    is_active: true,
  },
  {
    name: 'USB-C Cable - 2m',
    description:
      'Fast charging USB-C cable, 2 meters long. Compatible with most devices.',
    price: '9.99',
    category: 'Electronics',
    image_url:
      'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=500&h=500&fit=crop',
    is_active: true,
  },
  {
    name: 'Wireless Mouse',
    description:
      'Ergonomic wireless mouse with 2.4GHz connectivity. Battery included.',
    price: '19.99',
    category: 'Electronics',
    image_url:
      'https://images.unsplash.com/photo-1527814050087-3793815479db?w=500&h=500&fit=crop',
    is_active: true,
  },
  {
    name: 'HDMI Cable - 1.5m',
    description:
      'High-speed HDMI cable for connecting devices to displays. 1.5 meters.',
    price: '7.99',
    category: 'Electronics',
    image_url:
      'https://images.unsplash.com/photo-1591488320449-11c0d0c6e3c8?w=500&h=500&fit=crop',
    is_active: true,
  },

  {
    name: 'Bottled Water - 500ml (Pack of 24)',
    description: 'Pure drinking water in 500ml bottles. Pack of 24 bottles.',
    price: '12.99',
    category: 'Food & Beverages',
    image_url:
      'https://images.unsplash.com/photo-1548839140-5a9415c3d5a1?w=500&h=500&fit=crop',
    is_active: true,
  },
  {
    name: 'Coffee - Instant (200g)',
    description:
      'Premium instant coffee. 200g jar. Makes approximately 50 cups.',
    price: '8.50',
    category: 'Food & Beverages',
    image_url:
      'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500&h=500&fit=crop',
    is_active: true,
  },
  {
    name: 'Biscuits - Assorted (500g)',
    description:
      'Assorted sweet biscuits. 500g pack. Perfect for office snacks.',
    price: '4.99',
    category: 'Food & Beverages',
    image_url:
      'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&h=500&fit=crop',
    is_active: true,
  },
  {
    name: 'Tea Bags - Black Tea (100 bags)',
    description: 'Premium black tea bags. Box of 100 tea bags.',
    price: '6.99',
    category: 'Food & Beverages',
    image_url:
      'https://images.unsplash.com/photo-1556679343-c7306c197f35?w=500&h=500&fit=crop',
    is_active: true,
  },

  // Cleaning Supplies
  {
    name: 'Hand Sanitizer - 500ml',
    description:
      'Alcohol-based hand sanitizer. 500ml bottle with pump dispenser.',
    price: '5.99',
    category: 'Cleaning Supplies',
    image_url:
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&h=500&fit=crop',
    is_active: true,
  },
  {
    name: 'Disinfectant Wipes (Pack of 3)',
    description:
      'Antibacterial disinfectant wipes. Pack of 3 containers, 80 wipes each.',
    price: '9.99',
    category: 'Cleaning Supplies',
    image_url:
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&h=500&fit=crop',
    is_active: true,
  },
  {
    name: 'Paper Towels - 2 Rolls',
    description: 'Absorbent paper towels. 2 rolls per pack.',
    price: '4.50',
    category: 'Cleaning Supplies',
    image_url:
      'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=500&h=500&fit=crop',
    is_active: true,
  },
  {
    name: 'Trash Bags - Large (20 bags)',
    description: 'Heavy-duty trash bags. Large size, pack of 20 bags.',
    price: '7.99',
    category: 'Cleaning Supplies',
    image_url:
      'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=500&h=500&fit=crop',
    is_active: true,
  },
  {
    name: 'All-Purpose Cleaner - 1L',
    description:
      'Multi-surface cleaner. 1 liter bottle. Safe for most surfaces.',
    price: '6.99',
    category: 'Cleaning Supplies',
    image_url:
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&h=500&fit=crop',
    is_active: true,
  },
];

async function seed() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const db = new Kysely<DB>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: dbUrl,
      }),
    }),
  });

  try {
    console.log('🌱 Starting product seed...');

    const existingProducts: Array<Pick<DB['products'], 'id' | 'name'>> =
      await db.selectFrom('products').select(['id', 'name']).execute();

    const existingProductNames = new Set(existingProducts.map((p) => p.name));

    let insertedCount = 0;
    let updatedCount = 0;

    console.log(`📦 Processing ${products.length} products...`);

    for (const product of products) {
      if (existingProductNames.has(product.name)) {
        await db
          .updateTable('products')
          .set({
            description: product.description,
            price: product.price,
            category: product.category,
            image_url: product.image_url,
            is_active: product.is_active,
            updated_at: new Date(),
          })
          .where('name', '=', product.name)
          .execute();
        updatedCount++;
      } else {
        await db
          .insertInto('products')
          .values({
            id: randomUUID(),
            name: product.name,
            description: product.description,
            price: product.price,
            category: product.category,
            image_url: product.image_url,
            is_active: product.is_active,
            updated_at: new Date(),
          })
          .execute();
        insertedCount++;
      }
    }

    const finalProducts: Array<Pick<DB['products'], 'id'>> = await db
      .selectFrom('products')
      .select('id')
      .execute();

    console.log(`✅ Seed completed successfully!`);
    console.log(`   📝 Inserted: ${insertedCount} products`);
    console.log(`   🔄 Updated: ${updatedCount} products`);
    console.log(`   📦 Total: ${finalProducts.length} products`);

    const productsByCategoryRaw = await db
      .selectFrom('products')
      .select(['category', (eb) => eb.fn.count('id').as('count')])
      .groupBy('category')
      .execute();

    const productsByCategory = productsByCategoryRaw.map((item) => ({
      category: item.category,
      count: Number(item.count),
    }));

    console.log('\n📊 Products by category:');
    for (const item of productsByCategory) {
      console.log(`   ${item.category || 'Uncategorized'}: ${item.count}`);
    }
  } catch (error) {
    console.error('❌ Error seeding products:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

seed()
  .then(() => {
    console.log('\n✨ Seed completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seed failed:', error);
    process.exit(1);
  });
