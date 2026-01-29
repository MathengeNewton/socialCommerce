import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

describe('Database Seed', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.auditLog.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.postDestination.deleteMany();
    await prisma.destination.deleteMany();
    await prisma.integration.deleteMany();
    await prisma.postProduct.deleteMany();
    await prisma.postMedia.deleteMany();
    await prisma.postCaption.deleteMany();
    await prisma.post.deleteMany();
    await prisma.productImage.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.media.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.user.deleteMany();
    await prisma.client.deleteMany();
    await prisma.tenant.deleteMany();
  });

  describe('Tenant Creation', () => {
    it('should create a tenant', async () => {
      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
        },
      });

      expect(tenant).toBeDefined();
      expect(tenant.name).toBe('Test Tenant');
      expect(tenant.id).toBeDefined();
    });
  });

  describe('Client Creation', () => {
    it('should create a client linked to tenant', async () => {
      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
        },
      });

      const client = await prisma.client.create({
        data: {
          tenantId: tenant.id,
          name: 'Test Client',
        },
      });

      expect(client).toBeDefined();
      expect(client.tenantId).toBe(tenant.id);
      expect(client.name).toBe('Test Client');
    });
  });

  describe('User Creation', () => {
    it('should create a user with hashed password', async () => {
      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
        },
      });

      const passwordHash = await bcrypt.hash('test123', 10);
      const user = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: 'test@example.com',
          passwordHash,
          name: 'Test User',
        },
      });

      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.passwordHash).not.toBe('test123');
      expect(await bcrypt.compare('test123', user.passwordHash)).toBe(true);
    });
  });

  describe('Product Creation', () => {
    it('should create a product with variants', async () => {
      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
        },
      });

      const client = await prisma.client.create({
        data: {
          tenantId: tenant.id,
          name: 'Test Client',
        },
      });

      const product = await prisma.product.create({
        data: {
          tenantId: tenant.id,
          clientId: client.id,
          title: 'Test Product',
          description: 'Test Description',
          price: 29.99,
          currency: 'USD',
          slug: 'test-product',
          status: 'published',
          variants: {
            create: [
              {
                sku: 'TEST-SKU-1',
                name: 'Variant 1',
                stock: 10,
              },
            ],
          },
        },
        include: {
          variants: true,
        },
      });

      expect(product).toBeDefined();
      expect(product.variants).toHaveLength(1);
      expect(product.variants[0].stock).toBe(10);
    });

    it('should enforce unique slug per tenant', async () => {
      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
        },
      });

      const client = await prisma.client.create({
        data: {
          tenantId: tenant.id,
          name: 'Test Client',
        },
      });

      await prisma.product.create({
        data: {
          tenantId: tenant.id,
          clientId: client.id,
          title: 'Product 1',
          description: 'Description',
          price: 10,
          currency: 'USD',
          slug: 'test-slug',
          status: 'published',
        },
      });

      await expect(
        prisma.product.create({
          data: {
            tenantId: tenant.id,
            clientId: client.id,
            title: 'Product 2',
            description: 'Description',
            price: 10,
            currency: 'USD',
            slug: 'test-slug', // Same slug, same tenant
            status: 'published',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Post Creation', () => {
    it('should create a post with captions and products', async () => {
      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
        },
      });

      const client = await prisma.client.create({
        data: {
          tenantId: tenant.id,
          name: 'Test Client',
        },
      });

      const product = await prisma.product.create({
        data: {
          tenantId: tenant.id,
          clientId: client.id,
          title: 'Test Product',
          description: 'Test',
          price: 10,
          currency: 'USD',
          slug: 'test-product',
          status: 'published',
        },
      });

      const post = await prisma.post.create({
        data: {
          tenantId: tenant.id,
          clientId: client.id,
          status: 'draft',
          captions: {
            create: [
              {
                platform: 'facebook',
                caption: 'Test caption',
                includeLink: true,
              },
            ],
          },
          products: {
            create: [
              {
                productId: product.id,
                isPrimary: true,
              },
            ],
          },
        },
        include: {
          captions: true,
          products: true,
        },
      });

      expect(post).toBeDefined();
      expect(post.captions).toHaveLength(1);
      expect(post.products).toHaveLength(1);
      expect(post.products[0].isPrimary).toBe(true);
    });
  });

  describe('Tenant Isolation', () => {
    it('should prevent cross-tenant data access', async () => {
      const tenant1 = await prisma.tenant.create({
        data: {
          name: 'Tenant 1',
        },
      });

      const tenant2 = await prisma.tenant.create({
        data: {
          name: 'Tenant 2',
        },
      });

      const client1 = await prisma.client.create({
        data: {
          tenantId: tenant1.id,
          name: 'Client 1',
        },
      });

      const client2 = await prisma.client.create({
        data: {
          tenantId: tenant2.id,
          name: 'Client 2',
        },
      });

      const product1 = await prisma.product.create({
        data: {
          tenantId: tenant1.id,
          clientId: client1.id,
          title: 'Product 1',
          description: 'Description',
          price: 10,
          currency: 'USD',
          slug: 'product-1',
          status: 'published',
        },
      });

      // Try to access tenant1's product from tenant2 context
      const products = await prisma.product.findMany({
        where: {
          tenantId: tenant2.id,
          id: product1.id,
        },
      });

      expect(products).toHaveLength(0);
    });
  });
});
