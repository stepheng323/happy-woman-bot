import { Injectable, Logger } from '@nestjs/common';
import { CartRepository } from './cart.repository';
import { CatalogService } from '../catalog/catalog.service';
import { AddToCartDto, UpdateCartItemDto, CartSummary } from './dto/cart.dto';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private readonly cartRepository: CartRepository,
    private readonly catalogService: CatalogService,
  ) {}

  async getCart(userId: string): Promise<CartSummary> {
    try {
      const cartItems = await this.cartRepository.findByUserId(userId);
      const items = [];

      let totalAmount = 0;
      let itemCount = 0;

      const retailerIds: string[] = cartItems.map(
        (item) => item.product_retailer_id,
      );

      const products = await this.catalogService.getProducts(retailerIds);

      const invalidRetailerIds: string[] = [];

      for (const item of cartItems) {
        const retailerId = item.product_retailer_id;
        const product = products.get(retailerId);
        if (!product) {
          this.logger.warn(
            `Product with retailer_id ${item.product_retailer_id} not found in catalog, marking for removal`,
          );
          invalidRetailerIds.push(retailerId);
          continue;
        }

        const price = parseFloat(product.price);
        if (!Number.isFinite(price) || price <= 0) {
          this.logger.warn(
            `Product ${retailerId} has invalid price: ${product.price}, marking for removal`,
          );
          invalidRetailerIds.push(retailerId);
          continue;
        }

        const subtotal = price * item.quantity;

        items.push({
          id: item.id,
          userId: item.user_id,
          productRetailerId: item.product_retailer_id,
          quantity: item.quantity,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          product: {
            retailerId: product.retailer_id,
            name: product.name,
            description: product.description,
            price: product.price,
            currency: product.currency,
            category: product.category,
            imageUrl: product.image_url,
            availability: product.availability,
          },
        });

        totalAmount += subtotal;
        itemCount += item.quantity;
      }

      if (invalidRetailerIds.length > 0) {
        this.logger.log(
          `Removing ${invalidRetailerIds.length} invalid cart items (products no longer in catalog)`,
        );
        for (const retailerId of invalidRetailerIds) {
          await this.cartRepository.removeItem(userId, retailerId);
        }
      }

      if (items.length === 0 && cartItems.length > 0) {
        this.logger.warn(
          `Cart had ${cartItems.length} items but none are valid (all products missing or invalid prices). Cart has been cleared.`,
        );
      }

      this.logger.log(
        `Cart summary: ${items.length} valid items, totalAmount=${totalAmount}, itemCount=${itemCount}`,
      );

      return {
        items,
        totalAmount,
        itemCount,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get cart: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async addItem(userId: string, data: AddToCartDto): Promise<void> {
    try {
      const product = await this.catalogService.getProduct(
        data.productRetailerId,
      );
      if (!product) {
        throw new Error('Product not found in catalog');
      }
      if (product.availability === 'out of stock') {
        throw new Error('Product is out of stock');
      }

      await this.cartRepository.addItem(userId, data);
    } catch (error) {
      this.logger.error(
        `Failed to add item to cart: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async updateItem(
    userId: string,
    productRetailerId: string,
    data: UpdateCartItemDto,
  ): Promise<void> {
    try {
      await this.cartRepository.updateItem(userId, productRetailerId, data);
    } catch (error) {
      this.logger.error(
        `Failed to update cart item: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async removeItem(userId: string, productRetailerId: string): Promise<void> {
    try {
      await this.cartRepository.removeItem(userId, productRetailerId);
    } catch (error) {
      this.logger.error(
        `Failed to remove cart item: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async clearCart(userId: string): Promise<void> {
    try {
      await this.cartRepository.clearCart(userId);
    } catch (error) {
      this.logger.error(
        `Failed to clear cart: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
