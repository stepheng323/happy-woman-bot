import { Injectable, Logger } from '@nestjs/common';
import { OrdersRepository } from './orders.repository';
import { CartService } from '../cart/cart.service';
import { CatalogService } from '../catalog/catalog.service';
import { CreateOrderDto, OrderWithItems } from './dto/order.dto';
import { OrderStatus, PaymentStatus } from '../../database/enums';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly cartService: CartService,
    private readonly catalogService: CatalogService,
  ) {}

  async createOrderFromCart(
    userId: string,
    data: CreateOrderDto,
    paymentLink: string | null,
  ) {
    try {
      const cart = await this.cartService.getCart(userId);

      if (cart.items.length === 0) {
        throw new Error('Cart is empty');
      }

      const order = await this.ordersRepository.create(
        userId,
        cart.totalAmount,
        data.deliveryAddress,
        paymentLink,
      );

      if (!order) {
        throw new Error('Failed to create order');
      }

      for (const item of cart.items) {
        const price = parseFloat(item.product.price);
        const subtotal = price * item.quantity;

        await this.ordersRepository.addOrderItem(
          order.id,
          item.productRetailerId,
          item.product.name,
          price,
          item.quantity,
          price,
          subtotal,
        );
      }

      await this.cartService.clearCart(userId);

      return await this.findById(order.id);
    } catch (error) {
      this.logger.error(
        `Failed to create order: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async findById(id: string): Promise<OrderWithItems | undefined> {
    try {
      const order = await this.ordersRepository.findById(id);
      if (!order) {
        return undefined;
      }

      const items = await this.ordersRepository.getOrderItems(id);
      const itemsWithProducts = [];

      for (const item of items) {
        itemsWithProducts.push({
          id: item.id,
          productRetailerId: item.product_retailer_id,
          productName: item.product_name,
          productPrice: item.product_price,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
        });
      }

      return {
        id: order.id,
        userId: order.user_id,
        totalAmount: order.total_amount,
        status: order.status,
        deliveryAddress: order.delivery_address,
        paymentStatus: order.payment_status,
        paymentLink: order.payment_link,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        items: itemsWithProducts,
      };
    } catch (error) {
      this.logger.error(
        `Failed to find order: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async findByUserId(userId: string) {
    try {
      return await this.ordersRepository.findByUserId(userId);
    } catch (error) {
      this.logger.error(
        `Failed to find orders by user id: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async updateStatus(id: string, status: OrderStatus): Promise<void> {
    try {
      await this.ordersRepository.updateStatus(id, status);
    } catch (error) {
      this.logger.error(
        `Failed to update order status: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async updatePaymentStatus(
    id: string,
    paymentStatus: PaymentStatus,
  ): Promise<void> {
    try {
      await this.ordersRepository.updatePaymentStatus(id, paymentStatus);
    } catch (error) {
      this.logger.error(
        `Failed to update payment status: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async updatePaymentLink(id: string, paymentLink: string): Promise<void> {
    try {
      await this.ordersRepository.updatePaymentLink(id, paymentLink);
    } catch (error) {
      this.logger.error(
        `Failed to update payment link: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
