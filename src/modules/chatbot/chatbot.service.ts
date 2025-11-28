import { Injectable, Logger } from '@nestjs/common';
import {
  WhatsappMessage,
  SendMessageDto,
} from '../webhook/dto/whatsapp-webhook.dto';
import { UsersService } from '../users/users.service';
import { CartService } from '../cart/cart.service';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from '../payments/payments.service';
import { OnboardingFlow } from './flows/onboarding.flow';
import { CartFlow } from './flows/cart.flow';
import { OrderFlow } from './flows/order.flow';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  private readonly pendingOrders = new Map<
    string,
    { userId: string; state: 'address_confirmation' | 'address_input' }
  >();

  constructor(
    private readonly usersService: UsersService,
    private readonly cartService: CartService,
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService,
    private readonly onboardingFlow: OnboardingFlow,
    private readonly cartFlow: CartFlow,
    private readonly orderFlow: OrderFlow,
  ) {}

  async processMessage(
    message: WhatsappMessage,
    senderPhone: string,
  ): Promise<SendMessageDto | SendMessageDto[] | null> {
    this.logger.log(
      `Processing message from ${senderPhone}, type: ${message.type}`,
    );

    switch (message.type) {
      case 'text':
        return this.handleTextMessage(message, senderPhone);
      case 'interactive':
        return this.handleInteractiveMessage(message, senderPhone);
      case 'order':
        return this.handleOrderMessage(message, senderPhone);
      default:
        this.logger.debug(`Unhandled message type: ${message.type}`);
        return null;
    }
  }

  private async handleTextMessage(
    message: WhatsappMessage,
    senderPhone: string,
  ): Promise<SendMessageDto | SendMessageDto[] | null> {
    if (!message.text?.body) {
      return null;
    }

    const text = message.text.body.trim();

    const pendingOrder = this.pendingOrders.get(senderPhone);
    if (pendingOrder && text.length > 0) {
      this.logger.log(
        `[ORDER FLOW] Text message received while pending order exists: state=${pendingOrder.state}, text="${text.substring(0, 50)}..."`,
      );
      if (pendingOrder.state === 'address_confirmation') {
        this.logger.log(
          `[ORDER FLOW] Ignoring text during address confirmation state`,
        );
        return null;
      }

      if (pendingOrder.state === 'address_input') {
        this.logger.log(
          `[ORDER FLOW] Address input received: "${text}", proceeding with order placement`,
        );
        this.pendingOrders.delete(senderPhone);
        const orderMessages = await this.orderFlow.handlePlaceOrder(
          senderPhone,
          pendingOrder.userId,
          text,
        );
        this.logger.log(
          `[ORDER FLOW] Order placement returned ${orderMessages.length} messages`,
        );
        return orderMessages;
      }
    }

    const user = await this.usersService.findByPhoneNumber(senderPhone);
    if (!user) {
      await this.onboardingFlow.sendOnboardingFlow(senderPhone);
      return null;
    }

    const menuSelection = this.handleMenuSelection(text, senderPhone);
    if (menuSelection) {
      return menuSelection;
    }

    return this.onboardingFlow.getMainMenu(senderPhone);
  }

  private handleMenuSelection(
    text: string,
    senderPhone: string,
  ): SendMessageDto | SendMessageDto[] | null {
    const normalizedText = text.trim().toLowerCase();

    switch (normalizedText) {
      case '1':
        return this.cartFlow.showProductCatalog(senderPhone);
      case '2':
        return [
          {
            to: senderPhone,
            type: 'text',
            preview_url: false,
            message:
              'Track your business expenses feature is coming soon! Stay tuned for updates.',
          },
          this.onboardingFlow.getMainMenu(senderPhone),
        ];
      case '3':
        return [
          {
            to: senderPhone,
            type: 'text',
            preview_url: false,
            message:
              'Earn rewards for every transaction feature is coming soon! Stay tuned for updates.',
          },
          this.onboardingFlow.getMainMenu(senderPhone),
        ];
      default:
        return null;
    }
  }

  private async handleInteractiveMessage(
    message: WhatsappMessage,
    senderPhone: string,
  ): Promise<SendMessageDto | SendMessageDto[] | null> {
    const interactive = message.interactive;

    if (interactive?.type === 'button_reply') {
      return this.handleButtonReply(
        interactive.button_reply?.id,
        senderPhone,
        message,
      );
    } else if (interactive?.type === 'list_reply') {
      return this.handleListReply(interactive.list_reply?.id, senderPhone);
    }

    return null;
  }

  private async handleButtonReply(
    buttonId: string | undefined,
    senderPhone: string,
    message?: WhatsappMessage,
  ): Promise<SendMessageDto | SendMessageDto[] | null> {
    this.logger.log(
      `[BUTTON HANDLER] Button clicked: buttonId="${buttonId}", senderPhone=${senderPhone}`,
    );
    if (!buttonId) {
      this.logger.warn(`[BUTTON HANDLER] No buttonId provided`);
      return null;
    }

    const user = await this.usersService.findByPhoneNumber(senderPhone);
    if (!user) {
      this.logger.log(
        `[BUTTON HANDLER] User not found for ${senderPhone}, sending onboarding flow`,
      );
      await this.onboardingFlow.sendOnboardingFlow(senderPhone);
      return null;
    }

    const userId = user.id;
    this.logger.log(
      `[BUTTON HANDLER] User found: userId=${userId}, processing button: ${buttonId}`,
    );

    if (message?.context?.referred_product?.product_retailer_id) {
      const productRetailerId =
        message.context.referred_product.product_retailer_id;
      return await this.cartFlow.handleAddToCart(
        senderPhone,
        userId,
        productRetailerId,
      );
    }

    if (buttonId === 'view_cart' || buttonId === 'edit_cart') {
      return await this.cartFlow.showCart(senderPhone, userId);
    } else if (
      buttonId === 'browse_products' ||
      buttonId === 'view_all_products'
    ) {
      return this.cartFlow.showProductCatalog(senderPhone);
    } else if (buttonId.startsWith('product_')) {
      const productRetailerId = buttonId.replace('product_', '');
      return await this.cartFlow.handleAddToCart(
        senderPhone,
        userId,
        productRetailerId,
      );
    } else if (buttonId === 'place_order') {
      this.logger.log(
        `[ORDER FLOW] Place order button clicked by ${senderPhone}`,
      );
      const user = await this.usersService.findByPhoneNumber(senderPhone);
      const userAddress = user?.address || null;

      this.logger.log(
        `[ORDER FLOW] User lookup result: userId=${userId}, hasAddress=${!!userAddress}, address="${userAddress || 'none'}"`,
      );

      if (userAddress) {
        this.logger.log(
          `[ORDER FLOW] User has saved address, requesting confirmation`,
        );
        this.pendingOrders.set(senderPhone, {
          userId,
          state: 'address_confirmation',
        });
        const addressMessage = await this.orderFlow.checkAndRequestAddress(
          senderPhone,
          userId,
          userAddress,
        );
        this.logger.log(
          `[ORDER FLOW] Address confirmation message returned: ${JSON.stringify(addressMessage)}`,
        );
        return addressMessage;
      } else {
        this.logger.log(
          `[ORDER FLOW] User has no saved address, requesting address input`,
        );
        this.pendingOrders.set(senderPhone, {
          userId,
          state: 'address_input',
        });
        const addressRequestMessage =
          await this.orderFlow.requestDeliveryAddress(senderPhone);
        this.logger.log(
          `[ORDER FLOW] Address request message returned: ${JSON.stringify(addressRequestMessage)}`,
        );
        return addressRequestMessage;
      }
    } else if (buttonId === 'use_existing_address') {
      this.logger.log(
        `[ORDER FLOW] Use existing address button clicked by ${senderPhone}`,
      );
      const pendingOrder = this.pendingOrders.get(senderPhone);
      if (pendingOrder && pendingOrder.state === 'address_confirmation') {
        const user = await this.usersService.findByPhoneNumber(senderPhone);
        const userAddress = user?.address;
        if (userAddress) {
          this.logger.log(
            `[ORDER FLOW] Using existing address: "${userAddress}", proceeding with order placement`,
          );
          this.pendingOrders.delete(senderPhone);
          const orderMessages = await this.orderFlow.handlePlaceOrder(
            senderPhone,
            pendingOrder.userId,
            userAddress,
          );
          this.logger.log(
            `[ORDER FLOW] Order placement returned ${orderMessages.length} messages`,
          );
          return orderMessages;
        } else {
          this.logger.warn(
            `[ORDER FLOW] User confirmed existing address but address not found`,
          );
        }
      } else {
        this.logger.warn(
          `[ORDER FLOW] Use existing address clicked but no pending order or wrong state: ${pendingOrder?.state || 'none'}`,
        );
      }
      return null;
    } else if (buttonId === 'provide_new_address') {
      const pendingOrder = this.pendingOrders.get(senderPhone);
      if (pendingOrder) {
        this.pendingOrders.set(senderPhone, {
          userId: pendingOrder.userId,
          state: 'address_input',
        });
        return await this.orderFlow.requestDeliveryAddress(senderPhone);
      }
      return null;
    } else if (buttonId.startsWith('payment_')) {
      const orderId = buttonId.replace('payment_', '');
      this.logger.log(
        `[PAYMENT] Pay Now button clicked by ${senderPhone} for orderId=${orderId}`,
      );

      const order = await this.ordersService.findById(orderId);
      if (!order) {
        this.logger.warn(
          `[PAYMENT] Order not found for Pay Now click: orderId=${orderId}`,
        );
        return {
          to: senderPhone,
          type: 'text',
          preview_url: false,
          message:
            "Sorry, we couldn't find your order. Please try again or contact support.",
        };
      }

      let paymentLink = order.paymentLink;

      if (!paymentLink) {
        const amount = parseFloat(order.totalAmount);
        const email =
          user.email && user.email.length > 0
            ? user.email
            : `${senderPhone}@whatsapp.local`;

        this.logger.log(
          `[PAYMENT] Generating new payment link: orderId=${orderId}, amount=${amount}, email=${email}`,
        );

        paymentLink = await this.paymentsService.generatePaymentLink(
          order.id,
          amount,
          email,
          {
            userId: userId,
            phoneNumber: senderPhone,
          },
        );

        await this.ordersService.updatePaymentLink(order.id, paymentLink);
      } else {
        this.logger.log(
          `[PAYMENT] Using existing payment link for orderId=${orderId}`,
        );
      }

      return {
        to: senderPhone,
        type: 'text',
        preview_url: true,
        message: `Please complete your payment using this secure link:\n${paymentLink}\n\nAfter payment, you will receive your receipt here on WhatsApp.`,
      };
    } else if (buttonId === 'retry_onboarding') {
      await this.onboardingFlow.sendOnboardingFlow(senderPhone);
      return null;
    } else if (buttonId === 'back_to_menu') {
      return this.onboardingFlow.getMainMenu(senderPhone);
    }

    return null;
  }

  private async handleListReply(
    listId: string | undefined,
    senderPhone: string,
  ): Promise<SendMessageDto | null> {
    if (!listId || !listId.startsWith('product_')) {
      return null;
    }

    const user = await this.usersService.findByPhoneNumber(senderPhone);
    if (!user) {
      await this.onboardingFlow.sendOnboardingFlow(senderPhone);
      return null;
    }

    const productRetailerId = listId.replace('product_', '');
    return await this.cartFlow.handleAddToCart(
      senderPhone,
      user.id,
      productRetailerId,
    );
  }

  private async handleOrderMessage(
    message: WhatsappMessage,
    senderPhone: string,
  ): Promise<SendMessageDto | SendMessageDto[] | null> {
    this.logger.log(
      `[ORDER FLOW] Handling WhatsApp ORDER message from ${senderPhone}`,
    );

    const user = await this.usersService.findByPhoneNumber(senderPhone);
    if (!user) {
      this.logger.log(`[ORDER FLOW] User not found, sending onboarding flow`);
      await this.onboardingFlow.sendOnboardingFlow(senderPhone);
      return null;
    }

    const orderData = (message as any).order;
    if (
      !orderData ||
      !orderData.product_items ||
      orderData.product_items.length === 0
    ) {
      this.logger.warn(`[ORDER FLOW] ORDER message missing product items`);
      return {
        to: senderPhone,
        type: 'text',
        preview_url: false,
        message: "Sorry, we couldn't process your order. No items found.",
      };
    }

    this.logger.log(
      `[ORDER FLOW] Processing ${orderData.product_items.length} product items from ORDER message`,
    );

    try {

      await this.cartService.clearCart(user.id);

      for (const item of orderData.product_items) {
        const productRetailerId = String(item.product_retailer_id);
        const quantity = Number(item.quantity) || 1;

        this.logger.log(
          `[ORDER FLOW] Adding item to cart: productRetailerId=${productRetailerId}, quantity=${quantity}`,
        );

        await this.cartFlow.handleAddToCart(
          senderPhone,
          user.id,
          productRetailerId,
          quantity,
        );
      }

      const userAddress = user.address || null;

      this.logger.log(
        `[ORDER FLOW] User has address: ${!!userAddress}, proceeding with address flow`,
      );

      if (userAddress) {
        this.pendingOrders.set(senderPhone, {
          userId: user.id,
          state: 'address_confirmation',
        });
        const addressMessage = await this.orderFlow.checkAndRequestAddress(
          senderPhone,
          user.id,
          userAddress,
        );
        this.logger.log(`[ORDER FLOW] Address confirmation message returned`);
        return addressMessage;
      } else {
        this.pendingOrders.set(senderPhone, {
          userId: user.id,
          state: 'address_input',
        });
        const addressRequestMessage =
          await this.orderFlow.requestDeliveryAddress(senderPhone);
        this.logger.log(`[ORDER FLOW] Address request message returned`);
        return addressRequestMessage;
      }
    } catch (error) {
      this.logger.error(
        `[ORDER FLOW] Failed to process ORDER message: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return {
        to: senderPhone,
        type: 'text',
        preview_url: false,
        message: `Sorry, we couldn't process your order. ${error instanceof Error ? error.message : 'Please try again.'}`,
      };
    }
  }
}