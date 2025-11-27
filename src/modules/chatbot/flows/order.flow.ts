import { Injectable, Logger } from '@nestjs/common';
import { OrdersService } from '../../orders/orders.service';
import { CartService } from '../../cart/cart.service';
import { InvoiceService } from '../../orders/services/invoice.service';
import { ReceiptService } from '../../orders/services/receipt.service';
import { WaybillService } from '../../orders/services/waybill.service';
import { SendMessageDto } from '../../webhook/dto/whatsapp-webhook.dto';

@Injectable()
export class OrderFlow {
  private readonly logger = new Logger(OrderFlow.name);

  constructor(
    private readonly ordersService: OrdersService,
    private readonly cartService: CartService,
    private readonly invoiceService: InvoiceService,
    private readonly receiptService: ReceiptService,
    private readonly waybillService: WaybillService,
  ) {}

  async requestDeliveryAddress(phoneNumber: string): Promise<SendMessageDto> {
    return {
      to: phoneNumber,
      type: 'text',
      preview_url: false,
      message: 'Please provide your delivery address:',
    };
  }

  async handlePlaceOrder(
    phoneNumber: string,
    userId: string,
    deliveryAddress: string,
  ): Promise<SendMessageDto[]> {
    try {
      const order = await this.ordersService.createOrderFromCart(
        userId,
        { deliveryAddress },
        null,
      );

      if (!order) {
        throw new Error('Failed to create order');
      }

      const paymentLink = await this.generatePaymentLink(order.id);
      await this.ordersService.updatePaymentLink(order.id, paymentLink);

      const messages: SendMessageDto[] = [];

      const invoice = this.invoiceService.generateInvoice(order);
      messages.push({
        to: phoneNumber,
        type: 'text',
        preview_url: false,
        message: invoice,
      });

      messages.push({
        to: phoneNumber,
        type: 'interactive',
        preview_url: false,
        interactive: {
          type: 'BUTTON',
          body: {
            text: `Your order has been created!\n\nOrder ID: ${order.id}\nTotal: ₦${parseFloat(order.totalAmount).toFixed(2)}\n\nClick below to complete payment:`,
          },
          action: {
            buttons: [
              {
                type: 'reply',
                reply: {
                  id: `payment_${order.id}`,
                  title: 'Pay Now',
                },
              },
            ],
          },
        },
      });

      messages.push({
        to: phoneNumber,
        type: 'text',
        preview_url: false,
        message: `Payment Link: ${paymentLink}\n\nClick the link above or use the button to complete your payment.`,
      });

      return messages;
    } catch (error) {
      this.logger.error(
        `Failed to place order: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [
        {
          to: phoneNumber,
          type: 'text',
          preview_url: false,
          message: `Sorry, we couldn't process your order. ${error instanceof Error ? error.message : 'Please try again.'}`,
        },
      ];
    }
  }

  async generatePaymentLink(orderId: string): Promise<string> {
    return `https://payment.example.com/pay/${orderId}`;
  }

  async handlePaymentConfirmation(
    phoneNumber: string,
    orderId: string,
  ): Promise<SendMessageDto[]> {
    try {
      await this.ordersService.updatePaymentStatus(orderId, 'PAID');
      await this.ordersService.updateStatus(orderId, 'CONFIRMED');

      const order = await this.ordersService.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const messages: SendMessageDto[] = [];

      const receipt = this.receiptService.generateReceipt(order);
      messages.push({
        to: phoneNumber,
        type: 'text',
        preview_url: false,
        message: receipt,
      });

      const waybill = this.waybillService.generateWaybill(order);
      messages.push({
        to: phoneNumber,
        type: 'text',
        preview_url: false,
        message: waybill,
      });

      messages.push({
        to: phoneNumber,
        type: 'text',
        preview_url: false,
        message:
          '🎉 Payment confirmed! Your order is being processed. You will receive updates on your order status.',
      });

      return messages;
    } catch (error) {
      this.logger.error(
        `Failed to confirm payment: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [
        {
          to: phoneNumber,
          type: 'text',
          preview_url: false,
          message: `Sorry, we couldn't confirm your payment. Please contact support.`,
        },
      ];
    }
  }
}
