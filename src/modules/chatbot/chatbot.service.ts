import { Injectable, Logger } from '@nestjs/common';
import {
  WhatsappMessage,
  SendMessageDto,
} from '../webhook/dto/whatsapp-webhook.dto';
import { UsersService } from '../users/users.service';
import { OnboardingFlow } from './flows/onboarding.flow';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly onboardingFlow: OnboardingFlow,
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
      default:
        this.logger.debug(`Unhandled message type: ${message.type}`);
        return null;
    }
  }

  private async handleTextMessage(
    message: WhatsappMessage,
    senderPhone: string,
  ): Promise<SendMessageDto | null> {
    const userExists = await this.usersService.checkUserExists(senderPhone);

    if (userExists) {
      return this.onboardingFlow.getMainMenu(senderPhone);
    } else {
      await this.onboardingFlow.sendOnboardingFlow(senderPhone);
      return null;
    }
  }

  private async handleInteractiveMessage(
    message: WhatsappMessage,
    senderPhone: string,
  ): Promise<SendMessageDto | SendMessageDto[] | null> {
    const interactive = message.interactive;

    if (interactive?.type === 'button_reply') {
      return this.handleButtonReply(interactive.button_reply?.id, senderPhone);
    }

    return null;
  }

  private async handleButtonReply(
    buttonId: string | undefined,
    senderPhone: string,
  ): Promise<SendMessageDto | null> {
    if (buttonId === 'place_order_main') {
      // TODO: Implement order placement flow
      return {
        to: senderPhone,
        type: 'text',
        preview_url: false,
        message: 'Order placement flow coming soon!',
      };
    } else if (buttonId === 'retry_onboarding') {
      // Resend the onboarding flow
      await this.onboardingFlow.sendOnboardingFlow(senderPhone);
      return null;
    }

    return null;
  }
}
