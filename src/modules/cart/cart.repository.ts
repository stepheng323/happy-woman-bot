import { Inject, Injectable, Logger } from '@nestjs/common';
import { Kysely } from 'kysely';
import { randomUUID } from 'crypto';
import { DB } from '../../core/database/types';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';

@Injectable()
export class CartRepository {
  private readonly logger = new Logger(CartRepository.name);

  constructor(@Inject('DB_CONNECTION') private readonly db: Kysely<DB>) {}

  async findByUserId(userId: string) {
    try {
      return await this.db
        .selectFrom('cart')
        .selectAll()
        .where('userId', '=', userId)
        .execute();
    } catch (error) {
      this.logger.error(
        `Database error while finding cart by user id: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async findByUserIdAndProductId(userId: string, productId: string) {
    try {
      return await this.db
        .selectFrom('cart')
        .selectAll()
        .where('userId', '=', userId)
        .where('productId', '=', productId)
        .executeTakeFirst();
    } catch (error) {
      this.logger.error(
        `Database error while finding cart item: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async addItem(userId: string, data: AddToCartDto) {
    try {
      // Check if item already exists in cart
      const existing = await this.findByUserIdAndProductId(
        userId,
        data.productId,
      );

      if (existing) {
        // Update quantity
        return await this.db
          .updateTable('cart')
          .set({
            quantity: existing.quantity + data.quantity,
            updatedAt: new Date(),
          })
          .where('userId', '=', userId)
          .where('productId', '=', data.productId)
          .execute();
      } else {
        // Create new cart item
        return await this.db
          .insertInto('cart')
          .values({
            id: randomUUID(),
            userId,
            productId: data.productId,
            quantity: data.quantity,
            updatedAt: new Date(),
          })
          .execute();
      }
    } catch (error) {
      this.logger.error(
        `Database error while adding item to cart: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async updateItem(userId: string, productId: string, data: UpdateCartItemDto) {
    try {
      return await this.db
        .updateTable('cart')
        .set({
          quantity: data.quantity,
          updatedAt: new Date(),
        })
        .where('userId', '=', userId)
        .where('productId', '=', productId)
        .execute();
    } catch (error) {
      this.logger.error(
        `Database error while updating cart item: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async removeItem(userId: string, productId: string) {
    try {
      return await this.db
        .deleteFrom('cart')
        .where('userId', '=', userId)
        .where('productId', '=', productId)
        .execute();
    } catch (error) {
      this.logger.error(
        `Database error while removing cart item: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async clearCart(userId: string) {
    try {
      return await this.db
        .deleteFrom('cart')
        .where('userId', '=', userId)
        .execute();
    } catch (error) {
      this.logger.error(
        `Database error while clearing cart: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
