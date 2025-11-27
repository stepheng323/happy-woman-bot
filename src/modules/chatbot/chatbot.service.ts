import { Injectable, Logger } from '@nestjs/common';
import {
  WhatsappMessage,
  SendMessageDto,
} from '../webhook/dto/whatsapp-webhook.dto';
import { UsersService } from '../users/users.service';
import { OnboardingFlow } from './flows/onboarding.flow';
import { CartFlow } from './flows/cart.flow';
import { OrderFlow } from './flows/order.flow';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  private readonly pendingOrders = new Map<string, string>();

  constructor(
    private readonly usersService: UsersService,
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
        this.logger.debug(
          `Received WhatsApp ORDER message from ${senderPhone}: ${JSON.stringify(message, null, 2)}`,
        );
        return null;
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

    const pendingUserId = this.pendingOrders.get(senderPhone);
    if (pendingUserId && text.length > 0) {
      this.pendingOrders.delete(senderPhone);
      return await this.orderFlow.handlePlaceOrder(
        senderPhone,
        pendingUserId,
        text,
      );
    }

    const userExists = await this.usersService.checkUserExists(senderPhone);
    if (!userExists) {
      await this.onboardingFlow.sendOnboardingFlow(senderPhone);
      return null;
    }

    const menuSelection = await this.handleMenuSelection(text, senderPhone);
    if (menuSelection) {
      return menuSelection;
    }

    return this.onboardingFlow.getMainMenu(senderPhone);
  }

  private async handleMenuSelection(
    text: string,
    senderPhone: string,
  ): Promise<SendMessageDto | SendMessageDto[] | null> {
    const normalizedText = text.trim().toLowerCase();

    const user = await this.usersService.findByPhoneNumber(senderPhone);
    if (!user) {
      return null;
    }

    switch (normalizedText) {
      case '1':
        return this.cartFlow.showProductCatalog(senderPhone);
      case '2':
        return {
          to: senderPhone,
          type: 'text',
          preview_url: false,
          message:
            'Track your business expenses feature is coming soon! Stay tuned for updates.',
        };
      case '3':
        return {
          to: senderPhone,
          type: 'text',
          preview_url: false,
          message:
            'Earn rewards for every transaction feature is coming soon! Stay tuned for updates.',
        };
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
    if (!buttonId) {
      return null;
    }

    const user = await this.usersService.findByPhoneNumber(senderPhone);
    if (!user) {
      await this.onboardingFlow.sendOnboardingFlow(senderPhone);
      return null;
    }

    const userId = user.id;

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
      this.pendingOrders.set(senderPhone, userId);
      return await this.orderFlow.requestDeliveryAddress(senderPhone);
    } else if (buttonId.startsWith('payment_')) {
      const orderId = buttonId.replace('payment_', '');
      return await this.orderFlow.handlePaymentConfirmation(
        senderPhone,
        orderId,
      );
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
}
