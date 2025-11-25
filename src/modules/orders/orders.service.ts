import { Injectable, Logger } from '@nestjs/common';
import { OrdersRepository } from './orders.repository';
import { CartService } from '../cart/cart.service';
import { ProductsService } from '../products/products.service';
import { CreateOrderDto, OrderWithItems } from './dto/order.dto';
import { OrderStatus, PaymentStatus } from '../../core/database/types';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly cartService: CartService,
    private readonly productsService: ProductsService,
  ) {}

  async createOrderFromCart(
    userId: string,
    data: CreateOrderDto,
    paymentLink: string | null,
  ) {
    try {
      // Get cart summary
      const cart = await this.cartService.getCart(userId);

      if (cart.items.length === 0) {
        throw new Error('Cart is empty');
      }

      // Create order
      const order = await this.ordersRepository.create(
        userId,
        cart.totalAmount,
        data.deliveryAddress,
        paymentLink,
      );

      if (!order) {
        throw new Error('Failed to create order');
      }

      // Add order items
      for (const item of cart.items) {
        const product = await this.productsService.findById(item.productId);
        if (!product) {
          this.logger.warn(
            `Product ${item.productId} not found, skipping order item`,
          );
          continue;
        }

        const price = parseFloat(product.price);
        const subtotal = price * item.quantity;

        await this.ordersRepository.addOrderItem(
          order.id,
          item.productId,
          item.quantity,
          price,
          subtotal,
        );
      }

      // Clear cart
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
        const product = await this.productsService.findById(item.productId);
        if (!product) {
          this.logger.warn(
            `Product ${item.productId} not found for order item`,
          );
          continue;
        }

        itemsWithProducts.push({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
          product: {
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
          },
        });
      }

      return {
        id: order.id,
        userId: order.userId,
        totalAmount: order.totalAmount,
        status: order.status,
        deliveryAddress: order.deliveryAddress,
        paymentStatus: order.paymentStatus,
        paymentLink: order.paymentLink,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
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
