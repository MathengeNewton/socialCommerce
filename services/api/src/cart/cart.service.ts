import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { randomUUID } from 'crypto';

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
  ) {}

  async getOrCreateCart(tenantId: string, cartToken: string) {
    let cart = await this.prisma.cart.findFirst({
      where: { tenantId, cartToken },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                listPrice: true,
                price: true,
                currency: true,
                images: {
                  include: { media: true },
                  orderBy: { order: 'asc' },
                  take: 1,
                },
              },
            },
            variant: true,
          },
        },
      },
    });

    if (!cart) {
      try {
        cart = await this.prisma.cart.create({
          data: {
            tenantId,
            cartToken: cartToken || randomUUID(),
          },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    title: true,
                    slug: true,
                    listPrice: true,
                    price: true,
                    currency: true,
                    images: {
                      include: { media: true },
                      orderBy: { order: 'asc' },
                      take: 1,
                    },
                  },
                },
                variant: true,
              },
            },
          },
        });
      } catch (err: any) {
        if (err?.code === 'P2002') {
          cart = await this.prisma.cart.findFirst({
            where: { tenantId, cartToken },
            include: {
              items: {
                include: {
                  product: {
                    select: {
                      id: true,
                      title: true,
                      slug: true,
                      listPrice: true,
                      price: true,
                      currency: true,
                      images: {
                        include: { media: true },
                        orderBy: { order: 'asc' },
                        take: 1,
                      },
                    },
                  },
                  variant: true,
                },
              },
            },
          });
          if (!cart) throw err;
        } else {
          throw err;
        }
      }
    }

    return {
      id: cart.id,
      cartToken: cart.cartToken,
      tenantId: cart.tenantId,
      items: cart.items.map((item) => {
        const linePrice =
          item.variant?.price != null
            ? Number(item.variant.price)
            : Number(item.product.listPrice ?? item.product.price);
        return {
          id: item.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          product: item.product,
          variant: item.variant,
          price: linePrice,
        };
      }),
    };
  }

  async addToCart(
    tenantId: string,
    cartToken: string,
    productId: string,
    quantity: number,
    variantId?: string,
  ) {
    const { cart } = await this.ensureCart(tenantId, cartToken);

    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId, status: 'published' },
      include: { variants: variantId ? { where: { id: variantId } } : true },
    });

    if (!product) throw new Error('Product not found or not available');

    if (variantId) {
      const v = product.variants?.find((x) => x.id === variantId);
      if (!v || v.stock < quantity) throw new Error('Variant not found or insufficient stock');
    }

    const existing = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        variantId: variantId || null,
      },
    });

    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          variantId: variantId || null,
          quantity,
        },
      });
    }

    return this.getOrCreateCart(tenantId, cart.cartToken);
  }

  async updateItem(tenantId: string, cartToken: string, itemId: string, quantity: number) {
    if (quantity < 1) return this.removeItem(tenantId, cartToken, itemId);

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId },
      include: { cart: true },
    });
    if (!item || item.cart.tenantId !== tenantId || item.cart.cartToken !== cartToken) {
      throw new Error('Cart item not found');
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
    return this.getOrCreateCart(tenantId, cartToken);
  }

  async removeItem(tenantId: string, cartToken: string, itemId: string) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId },
      include: { cart: true },
    });
    if (!item || item.cart.tenantId !== tenantId || item.cart.cartToken !== cartToken) {
      throw new Error('Cart item not found');
    }
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.getOrCreateCart(tenantId, cartToken);
  }

  async clearCart(tenantId: string, cartToken: string) {
    const cart = await this.prisma.cart.findFirst({
      where: { tenantId, cartToken },
    });
    if (cart) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
  }

  private async ensureCart(tenantId: string, cartToken: string) {
    let cart = await this.prisma.cart.findFirst({
      where: { tenantId, cartToken },
    });
    if (!cart) {
      try {
        cart = await this.prisma.cart.create({
          data: {
            tenantId,
            cartToken: cartToken || randomUUID(),
          },
        });
      } catch (err: any) {
        if (err?.code === 'P2002') {
          cart = await this.prisma.cart.findFirst({
            where: { tenantId, cartToken },
          });
          if (!cart) throw err;
        } else {
          throw err;
        }
      }
    }
    return { cart };
  }

  async validateCartItems(items: Array<{ productId: string; variantId?: string; quantity: number }>) {
    const validatedItems = [];

    for (const item of items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
        include: {
          variants: item.variantId ? { where: { id: item.variantId } } : false,
        },
      });

      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      if (product.status !== 'published') {
        throw new Error(`Product ${item.productId} is not available`);
      }

      const variant = item.variantId
        ? (product.variants as Array<{ id: string; price?: unknown; stock: number }> | undefined)?.find(
            (v) => v.id === item.variantId,
          )
        : undefined;
      if (item.variantId) {
        if (!variant) {
          throw new Error(`Variant ${item.variantId} not found`);
        }
        if (variant.stock < item.quantity) {
          throw new Error(`Insufficient stock for variant ${item.variantId}`);
        }
      }

      const price =
        variant?.price != null
          ? Number(variant.price)
          : Number(product.listPrice ?? product.price);
      validatedItems.push({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        price,
      });
    }

    return validatedItems;
  }
}
