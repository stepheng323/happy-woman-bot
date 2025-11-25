import { Inject, Injectable, Logger } from '@nestjs/common';
import { Kysely } from 'kysely';
import { randomUUID } from 'crypto';
import { DB, OrderStatus, PaymentStatus } from '../../core/database/types';

@Injectable()
export class OrdersRepository {
  private readonly logger = new Logger(OrdersRepository.name);

  constructor(@Inject('DB_CONNECTION') private readonly db: Kysely<DB>) {}

  async create(
    userId: string,
    totalAmount: number,
    deliveryAddress: string,
    paymentLink: string | null,
  ) {
    try {
      const id = randomUUID();
      await this.db
        .insertInto('orders')
        .values({
          id,
          userId,
          totalAmount: totalAmount.toString(),
          status: 'PENDING',
          deliveryAddress,
          paymentStatus: 'PENDING',
          paymentLink,
          updatedAt: new Date(),
        })
        .execute();

      return await this.findById(id);
    } catch (error) {
      this.logger.error(
        `Database error while creating order: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async findById(id: string) {
    try {
      return await this.db
        .selectFrom('orders')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();
    } catch (error) {
      this.logger.error(
        `Database error while finding order by id: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async findByUserId(userId: string) {
    try {
      return await this.db
        .selectFrom('orders')
        .selectAll()
        .where('userId', '=', userId)
        .orderBy('createdAt', 'desc')
        .execute();
    } catch (error) {
      this.logger.error(
        `Database error while finding orders by user id: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async addOrderItem(
    orderId: string,
    productId: string,
    quantity: number,
    price: number,
    subtotal: number,
  ) {
    try {
      await this.db
        .insertInto('order_items')
        .values({
          id: randomUUID(),
          orderId,
          productId,
          quantity,
          price: price.toString(),
          subtotal: subtotal.toString(),
        })
        .execute();
    } catch (error) {
      this.logger.error(
        `Database error while adding order item: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async getOrderItems(orderId: string) {
    try {
      return await this.db
        .selectFrom('order_items')
        .selectAll()
        .where('orderId', '=', orderId)
        .execute();
    } catch (error) {
      this.logger.error(
        `Database error while finding order items: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async updateStatus(id: string, status: OrderStatus) {
    try {
      await this.db
        .updateTable('orders')
        .set({
          status,
          updatedAt: new Date(),
        })
        .where('id', '=', id)
        .execute();
    } catch (error) {
      this.logger.error(
        `Database error while updating order status: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async updatePaymentStatus(id: string, paymentStatus: PaymentStatus) {
    try {
      await this.db
        .updateTable('orders')
        .set({
          paymentStatus,
          updatedAt: new Date(),
        })
        .where('id', '=', id)
        .execute();
    } catch (error) {
      this.logger.error(
        `Database error while updating payment status: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async updatePaymentLink(id: string, paymentLink: string) {
    try {
      await this.db
        .updateTable('orders')
        .set({
          paymentLink,
          updatedAt: new Date(),
        })
        .where('id', '=', id)
        .execute();
    } catch (error) {
      this.logger.error(
        `Database error while updating payment link: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
