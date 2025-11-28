import { Injectable, Logger } from '@nestjs/common';
import { OrdersService } from '../../orders/orders.service';
import { CartService } from '../../cart/cart.service';
import { InvoicePdfService } from '../../orders/services/invoice-pdf.service';
import { ReceiptPdfService } from '../../orders/services/receipt-pdf.service';
import { PaymentsService } from '../../payments/payments.service';
import { UsersService } from '../../users/users.service';
import { WhatsappService } from '../../whatsapp/whatsapp.service';
import { SendMessageDto } from '../../webhook/dto/whatsapp-webhook.dto';
import { OnboardingFlow } from './onboarding.flow';

@Injectable()
export class OrderFlow {
  private readonly logger = new Logger(OrderFlow.name);

  constructor(
    private readonly ordersService: OrdersService,
    private readonly cartService: CartService,
    private readonly invoicePdfService: InvoicePdfService,
    private readonly receiptPdfService: ReceiptPdfService,
    private readonly paymentsService: PaymentsService,
    private readonly usersService: UsersService,
    private readonly whatsappService: WhatsappService,
    private readonly onboardingFlow: OnboardingFlow,
  ) {}

  async checkAndRequestAddress(
    phoneNumber: string,
    userId: string,
    userAddress: string | null,
  ): Promise<SendMessageDto> {
    this.logger.log(
      `[ORDER FLOW] checkAndRequestAddress called: phoneNumber=${phoneNumber}, userId=${userId}, hasAddress=${!!userAddress}`,
    );
    if (userAddress) {
      this.logger.log(
        `[ORDER FLOW] Returning address confirmation message with address: "${userAddress}"`,
      );
      return {
        to: phoneNumber,
        type: 'interactive',
        preview_url: false,
        interactive: {
          type: 'BUTTON',
          body: {
            text: `Your saved address is:\n${userAddress}\n\nWould you like to use this address?`,
          },
          action: {
            buttons: [
              {
                type: 'reply',
                reply: {
                  id: 'use_existing_address',
                  title: 'Use This Address',
                },
              },
              {
                type: 'reply',
                reply: {
                  id: 'provide_new_address',
                  title: 'Provide New Address',
                },
              },
            ],
          },
        },
      };
    }

    this.logger.log(
      `[ORDER FLOW] No saved address, returning address request message`,
    );
    return {
      to: phoneNumber,
      type: 'text',
      preview_url: false,
      message: 'Please provide your delivery address:',
    };
  }

  async requestDeliveryAddress(phoneNumber: string): Promise<SendMessageDto> {
    this.logger.log(
      `[ORDER FLOW] requestDeliveryAddress called: phoneNumber=${phoneNumber}`,
    );
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
    this.logger.log(
      `[ORDER FLOW] handlePlaceOrder called: phoneNumber=${phoneNumber}, userId=${userId}, address="${deliveryAddress}"`,
    );
    try {
      this.logger.log(`[ORDER FLOW] Creating order from cart...`);
      const order = await this.ordersService.createOrderFromCart(
        userId,
        { deliveryAddress },
        null,
      );

      if (!order) {
        throw new Error('Failed to create order');
      }

      this.logger.log(
        `[ORDER FLOW] Order created successfully: orderId=${order.id}, totalAmount=${order.totalAmount}`,
      );

      const user = await this.usersService.findByPhoneNumber(phoneNumber);
      const amount = parseFloat(order.totalAmount);
      const email = user?.email || `${phoneNumber}@whatsapp.local`;

      this.logger.log(
        `[ORDER FLOW] Generating payment link: orderId=${order.id}, amount=${amount}, email=${email}`,
      );
      const paymentLink = await this.paymentsService.generatePaymentLink(
        order.id,
        amount,
        email,
        {
          userId: order.userId,
          phoneNumber,
        },
      );
      this.logger.log(
        `[ORDER FLOW] Payment link generated: ${paymentLink.substring(0, 50)}...`,
      );
      await this.ordersService.updatePaymentLink(order.id, paymentLink);

      const messages: SendMessageDto[] = [];

      // Try to generate and send PDF invoice as a document (best-effort).
      const customerName =
        (user && (user as unknown as { businessName?: string }).businessName) ||
        (user &&
          (user as unknown as { contactPerson?: string }).contactPerson) ||
        phoneNumber;
      const customerAddress = deliveryAddress || order.deliveryAddress || '';
      const customerPhone = phoneNumber;

      this.logger.log(
        `[ORDER FLOW] Generating PDF invoice for order ${order.id}`,
      );
      const pdfBuffer = await this.invoicePdfService.generateInvoicePdf(order, {
        name: String(customerName),
        phoneNumber: customerPhone,
        address: String(customerAddress),
      });

      const filename = `invoice-${order.id}.pdf`;
      await this.whatsappService.sendDocument(
        phoneNumber,
        filename,
        pdfBuffer,
        'application/pdf',
      );
      this.logger.log(
        `[ORDER FLOW] PDF invoice sent successfully for order ${order.id}`,
      );

      messages.push({
        to: phoneNumber,
        type: 'interactive',
        preview_url: false,
        interactive: {
          type: 'cta_url',
          header: {
            type: 'text',
            text: 'Payment',
          },
          body: {
            text:
              `Your order has been created!\n\n` +
              `Order ID: ${order.id}\n` +
              `Total: ₦${parseFloat(order.totalAmount).toFixed(2)}\n\n` +
              `Tap the button below to complete your payment.`,
          },
          footer: {
            text: 'Thank you for your purchase',
          },
          action: {
            name: 'cta_url',
            parameters: {
              display_text: 'Pay Now',
              url: paymentLink,
            },
          },
        },
      });
      this.logger.log(`[ORDER FLOW] Payment button message added`);

      this.logger.log(
        `[ORDER FLOW] Returning ${messages.length} messages to send`,
      );
      return messages;
    } catch (error) {
      this.logger.error(
        `[ORDER FLOW] Failed to place order: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      let errorMessage = `Sorry, we couldn't process your order.`;
      if (error instanceof Error) {
        if (error.message.includes('Cart is empty')) {
          errorMessage =
            'Your cart is empty or contains products that are no longer available. Please browse the catalog and add items to your cart again.';
        } else if (error.message.includes('cart total is invalid')) {
          errorMessage =
            'Your cart contains invalid items. Please browse the catalog and add items to your cart again.';
        } else {
          errorMessage = `Sorry, we couldn't process your order. ${error.message}`;
        }
      }

      return [
        {
          to: phoneNumber,
          type: 'text',
          preview_url: false,
          message: errorMessage,
        },
      ];
    }
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

      const user = await this.usersService.findByPhoneNumber(phoneNumber);
      const customerName =
        (user && (user as unknown as { businessName?: string }).businessName) ||
        (user &&
          (user as unknown as { contactPerson?: string }).contactPerson) ||
        phoneNumber;
      const customerAddress = order.deliveryAddress || '';
      const customerPhone = phoneNumber;

      this.logger.log(
        `[ORDER FLOW] Generating PDF receipt for order ${order.id}`,
      );
      const pdfBuffer = await this.receiptPdfService.generateReceiptPdf(order, {
        name: String(customerName),
        phoneNumber: customerPhone,
        address: String(customerAddress),
      });

      const filename = `receipt-${order.id}.pdf`;
      await this.whatsappService.sendDocument(
        phoneNumber,
        filename,
        pdfBuffer,
        'application/pdf',
        '🎉 Payment confirmed! Your receipt is attached and your order is being processed.',
      );
      this.logger.log(
        `[ORDER FLOW] PDF receipt sent successfully for order ${order.id}`,
      );

      // After sending receipt, show main menu again
      const mainMenu = this.onboardingFlow.getMainMenu(phoneNumber);
      messages.push(mainMenu);

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
