import { Inject, Injectable, Logger } from '@nestjs/common';
import { Kysely } from 'kysely';
import { randomUUID } from 'crypto';
import { DB } from '../../database/types';
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
        .where('user_id', '=', userId)
        .execute();
    } catch (error) {
      this.logger.error(
        `Database error while finding cart by user id: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async findByUserIdAndProductRetailerId(
    userId: string,
    productRetailerId: string,
  ) {
    try {
      return await this.db
        .selectFrom('cart')
        .selectAll()
        .where('user_id', '=', userId)
        .where('product_retailer_id', '=', productRetailerId)
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
      const existing = await this.findByUserIdAndProductRetailerId(
        userId,
        data.productRetailerId,
      );

      if (existing) {
        return await this.db
          .updateTable('cart')
          .set({
            quantity: existing.quantity + data.quantity,
            updated_at: new Date(),
          })
          .where('user_id', '=', userId)
          .where('product_retailer_id', '=', data.productRetailerId)
          .execute();
      } else {
        return await this.db
          .insertInto('cart')
          .values({
            id: randomUUID(),
            user_id: userId,
            product_retailer_id: data.productRetailerId,
            quantity: data.quantity,
            updated_at: new Date(),
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

  async updateItem(
    userId: string,
    productRetailerId: string,
    data: UpdateCartItemDto,
  ) {
    try {
      return await this.db
        .updateTable('cart')
        .set({
          quantity: data.quantity,
          updated_at: new Date(),
        })
        .where('user_id', '=', userId)
        .where('product_retailer_id', '=', productRetailerId)
        .execute();
    } catch (error) {
      this.logger.error(
        `Database error while updating cart item: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async removeItem(userId: string, productRetailerId: string) {
    try {
      return await this.db
        .deleteFrom('cart')
        .where('user_id', '=', userId)
        .where('product_retailer_id', '=', productRetailerId)
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
        .where('user_id', '=', userId)
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
