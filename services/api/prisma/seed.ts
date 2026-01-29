import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Demo Tenant',
    },
  });

  // Create client/workspace
  const client = await prisma.client.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      tenantId: tenant.id,
      name: 'Demo Brand',
    },
  });

  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      tenantId: tenant.id,
      email: 'admin@demo.com',
      passwordHash,
      name: 'Admin User',
    },
  });

  // Create membership
  await prisma.membership.upsert({
    where: {
      userId_clientId: {
        userId: adminUser.id,
        clientId: client.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      clientId: client.id,
      role: 'admin',
    },
  });

  // Create demo products
  const product1 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      clientId: client.id,
      title: 'Demo T-Shirt',
      description: 'A cool demo t-shirt for testing the platform',
      price: 29.99,
      currency: 'USD',
      slug: 'demo-t-shirt',
      status: 'published',
      variants: {
        create: [
          {
            sku: 'TSHIRT-SM-BLUE',
            name: 'Size: Small, Color: Blue',
            stock: 10,
          },
          {
            sku: 'TSHIRT-MD-BLUE',
            name: 'Size: Medium, Color: Blue',
            stock: 15,
          },
          {
            sku: 'TSHIRT-LG-BLUE',
            name: 'Size: Large, Color: Blue',
            stock: 8,
          },
        ],
      },
    },
  });

  const product2 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      clientId: client.id,
      title: 'Demo Hoodie',
      description: 'A warm demo hoodie perfect for any occasion',
      price: 59.99,
      currency: 'USD',
      slug: 'demo-hoodie',
      status: 'published',
      variants: {
        create: [
          {
            sku: 'HOODIE-MD-BLACK',
            name: 'Size: Medium, Color: Black',
            stock: 5,
          },
          {
            sku: 'HOODIE-LG-BLACK',
            name: 'Size: Large, Color: Black',
            stock: 7,
          },
        ],
      },
    },
  });

  // Create demo draft post
  const draftPost = await prisma.post.create({
    data: {
      tenantId: tenant.id,
      clientId: client.id,
      status: 'draft',
      captions: {
        create: [
          {
            platform: 'facebook',
            caption: 'Check out our amazing new products! 🎉',
            includeLink: true,
          },
          {
            platform: 'instagram',
            caption: 'New collection just dropped! ✨ Check the link in bio',
            includeLink: true,
          },
          {
            platform: 'twitter',
            caption: 'New products available now! 🛍️',
            includeLink: true,
          },
        ],
      },
      products: {
        create: [
          {
            productId: product1.id,
            isPrimary: true,
          },
          {
            productId: product2.id,
            isPrimary: false,
          },
        ],
      },
    },
  });

  console.log('Seed data created:');
  console.log(`- Tenant: ${tenant.name} (${tenant.id})`);
  console.log(`- Client: ${client.name} (${client.id})`);
  console.log(`- Admin User: ${adminUser.email} (${adminUser.id})`);
  console.log(`- Products: ${product1.title}, ${product2.title}`);
  console.log(`- Draft Post: ${draftPost.id}`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
