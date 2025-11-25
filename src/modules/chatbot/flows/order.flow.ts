import { Injectable, Logger } from '@nestjs/common';
import { OrdersService } from '../../orders/orders.service';
import { CartService } from '../../cart/cart.service';
import { InvoiceService } from '../../orders/services/invoice.service';
import { ReceiptService } from '../../orders/services/receipt.service';
import { WaybillService } from '../../orders/services/waybill.service';
import { WhatsappService } from '../../whatsapp/whatsapp.service';
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
    private readonly whatsappService: WhatsappService,
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
      // Create order from cart (payment link will be generated after)
      const order = await this.ordersService.createOrderFromCart(
        userId,
        { deliveryAddress },
        null, // Payment link will be generated after order creation
      );

      if (!order) {
        throw new Error('Failed to create order');
      }

      // Generate payment link with actual order ID
      const paymentLink = await this.generatePaymentLink(order.id);

      // Update order with payment link
      await this.ordersService.updatePaymentLink(order.id, paymentLink);

      const messages: SendMessageDto[] = [];

      // Generate and send invoice
      const invoice = this.invoiceService.generateInvoice(order);
      messages.push({
        to: phoneNumber,
        type: 'text',
        preview_url: false,
        message: invoice,
      });

      // Send payment link
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

      // Store payment link in order (already done in createOrderFromCart)
      // For now, we'll send it as a text message too
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
    // Placeholder payment link generation
    return `https://payment.example.com/pay/${orderId}`;
  }

  async handlePaymentConfirmation(
    phoneNumber: string,
    orderId: string,
  ): Promise<SendMessageDto[]> {
    try {
      // Update payment status
      await this.ordersService.updatePaymentStatus(orderId, 'PAID');
      await this.ordersService.updateStatus(orderId, 'CONFIRMED');

      // Get order with items
      const order = await this.ordersService.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const messages: SendMessageDto[] = [];

      // Generate and send receipt
      const receipt = this.receiptService.generateReceipt(order);
      messages.push({
        to: phoneNumber,
        type: 'text',
        preview_url: false,
        message: receipt,
      });

      // Generate and send waybill
      const waybill = this.waybillService.generateWaybill(order);
      messages.push({
        to: phoneNumber,
        type: 'text',
        preview_url: false,
        message: waybill,
      });

      // Send success message with main menu
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
