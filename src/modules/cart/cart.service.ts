import { Injectable, Logger } from '@nestjs/common';
import { CartRepository } from './cart.repository';
import { ProductsService } from '../products/products.service';
import { AddToCartDto, UpdateCartItemDto, CartSummary } from './dto/cart.dto';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private readonly cartRepository: CartRepository,
    private readonly productsService: ProductsService,
  ) {}

  async getCart(userId: string): Promise<CartSummary> {
    try {
      const cartItems = await this.cartRepository.findByUserId(userId);
      const items = [];

      let totalAmount = 0;
      let itemCount = 0;

      for (const item of cartItems) {
        const product = await this.productsService.findById(item.productId);
        if (!product) {
          this.logger.warn(
            `Product ${item.productId} not found, skipping cart item`,
          );
          continue;
        }

        const price = parseFloat(product.price);
        const subtotal = price * item.quantity;

        items.push({
          id: item.id,
          userId: item.userId,
          productId: item.productId,
          quantity: item.quantity,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          product: {
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            category: product.category,
            imageUrl: product.imageUrl,
          },
        });

        totalAmount += subtotal;
        itemCount += item.quantity;
      }

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
      // Verify product exists and is active
      const product = await this.productsService.findById(data.productId);
      if (!product) {
        throw new Error('Product not found');
      }
      if (!product.isActive) {
        throw new Error('Product is not available');
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
    productId: string,
    data: UpdateCartItemDto,
  ): Promise<void> {
    try {
      await this.cartRepository.updateItem(userId, productId, data);
    } catch (error) {
      this.logger.error(
        `Failed to update cart item: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async removeItem(userId: string, productId: string): Promise<void> {
    try {
      await this.cartRepository.removeItem(userId, productId);
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
