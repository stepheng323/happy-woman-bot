import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { randomUUID } from 'crypto';
import { DB } from '../../database/types';
import { OrderStatus, PaymentStatus } from '../../database/enums';

@Injectable()
export class OrdersRepository {
  private readonly db: Kysely<DB>;

  constructor(@Inject('DB_CONNECTION') db: Kysely<DB>) {
    this.db = db;
  }

  async create(
    userId: string,
    totalAmount: number,
    deliveryAddress: string,
    paymentLink: string | null,
  ) {
    const id = randomUUID();
    await this.db
      .insertInto('orders')
      .values({
        id,
        user_id: userId,
        total_amount: totalAmount.toString(),
        status: 'PENDING',
        delivery_address: deliveryAddress,
        payment_status: 'PENDING',
        payment_link: paymentLink,
        updated_at: new Date(),
      })
      .execute();

    return await this.findById(id);
  }

  async findById(id: string) {
    return await this.db
      .selectFrom('orders')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  async findByUserId(userId: string) {
    const query = this.db
      .selectFrom('orders')
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('created_at', 'desc');
    return await query.execute();
  }

  async addOrderItem(
    orderId: string,
    productRetailerId: string,
    productName: string,
    productPrice: number,
    quantity: number,
    price: number,
    subtotal: number,
  ) {
    await this.db
      .insertInto('order_items')
      .values({
        id: randomUUID(),
        order_id: orderId,
        product_retailer_id: productRetailerId,
        product_name: productName,
        product_price: productPrice.toString(),
        quantity,
        price: price.toString(),
        subtotal: subtotal.toString(),
      })
      .execute();
  }

  async getOrderItems(orderId: string) {
    return await this.db
      .selectFrom('order_items')
      .selectAll()
      .where('order_id', '=', orderId)
      .execute();
  }

  async updateStatus(id: string, status: OrderStatus) {
    await this.db
      .updateTable('orders')
      .set({
        status,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .execute();
  }

  async updatePaymentStatus(id: string, paymentStatus: PaymentStatus) {
    await this.db
      .updateTable('orders')
      .set({
        payment_status: paymentStatus,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .execute();
  }

  async updatePaymentLink(id: string, paymentLink: string) {
    await this.db
      .updateTable('orders')
      .set({
        payment_link: paymentLink,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .execute();
  }
}