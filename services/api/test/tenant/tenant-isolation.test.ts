import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('Tenant Isolation', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
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

  describe('Cross-tenant data access prevention', () => {
    it('should prevent Tenant A from accessing Tenant B products', async () => {
      // Create two tenants
      const tenantA = await prisma.tenant.create({
        data: { name: 'Tenant A' },
      });

      const tenantB = await prisma.tenant.create({
        data: { name: 'Tenant B' },
      });

      // Create clients
      const clientA = await prisma.client.create({
        data: {
          tenantId: tenantA.id,
          name: 'Client A',
        },
      });

      const clientB = await prisma.client.create({
        data: {
          tenantId: tenantB.id,
          name: 'Client B',
        },
      });

      // Create products for each tenant
      const productA = await prisma.product.create({
        data: {
          tenantId: tenantA.id,
          clientId: clientA.id,
          title: 'Product A',
          description: 'Description',
          price: 10,
          currency: 'USD',
          slug: 'product-a',
          status: 'published',
        },
      });

      const productB = await prisma.product.create({
        data: {
          tenantId: tenantB.id,
          clientId: clientB.id,
          title: 'Product B',
          description: 'Description',
          price: 20,
          currency: 'USD',
          slug: 'product-b',
          status: 'published',
        },
      });

      // Try to access Tenant B's product from Tenant A context
      const productsFromTenantA = await prisma.product.findMany({
        where: {
          tenantId: tenantA.id,
          id: productB.id, // Trying to access Tenant B's product
        },
      });

      expect(productsFromTenantA).toHaveLength(0);

      // Verify Tenant A can only see their own products
      const tenantAProducts = await prisma.product.findMany({
        where: {
          tenantId: tenantA.id,
        },
      });

      expect(tenantAProducts).toHaveLength(1);
      expect(tenantAProducts[0].id).toBe(productA.id);
    });

    it('should prevent Tenant A from accessing Tenant B users', async () => {
      const tenantA = await prisma.tenant.create({
        data: { name: 'Tenant A' },
      });

      const tenantB = await prisma.tenant.create({
        data: { name: 'Tenant B' },
      });

      const passwordHash = await bcrypt.hash('password', 10);

      const userA = await prisma.user.create({
        data: {
          tenantId: tenantA.id,
          email: 'userA@example.com',
          passwordHash,
          name: 'User A',
        },
      });

      const userB = await prisma.user.create({
        data: {
          tenantId: tenantB.id,
          email: 'userB@example.com',
          passwordHash,
          name: 'User B',
        },
      });

      // Try to access Tenant B's user from Tenant A context
      const userFromTenantA = await prisma.user.findUnique({
        where: {
          id: userB.id,
          tenantId: tenantA.id, // Wrong tenant
        },
      });

      expect(userFromTenantA).toBeNull();
    });

    it('should prevent Tenant A from modifying Tenant B data', async () => {
      const tenantA = await prisma.tenant.create({
        data: { name: 'Tenant A' },
      });

      const tenantB = await prisma.tenant.create({
        data: { name: 'Tenant B' },
      });

      const clientA = await prisma.client.create({
        data: {
          tenantId: tenantA.id,
          name: 'Client A',
        },
      });

      const clientB = await prisma.client.create({
        data: {
          tenantId: tenantB.id,
          name: 'Client B',
        },
      });

      const productB = await prisma.product.create({
        data: {
          tenantId: tenantB.id,
          clientId: clientB.id,
          title: 'Product B',
          description: 'Description',
          price: 20,
          currency: 'USD',
          slug: 'product-b',
          status: 'published',
        },
      });

      // Try to update Tenant B's product with Tenant A's tenantId
      await expect(
        prisma.product.update({
          where: { id: productB.id },
          data: {
            tenantId: tenantA.id, // Attempting to change tenant
            title: 'Hacked Product',
          },
        }),
      ).rejects.toThrow();

      // Verify product still belongs to Tenant B
      const updatedProduct = await prisma.product.findUnique({
        where: { id: productB.id },
      });

      expect(updatedProduct.tenantId).toBe(tenantB.id);
      expect(updatedProduct.title).toBe('Product B');
    });
  });
});
