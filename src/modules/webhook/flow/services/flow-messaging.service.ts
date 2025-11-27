import { Injectable, Logger } from '@nestjs/common';
import { WhatsappService } from '../../../whatsapp/whatsapp.service';
import { SendMessageDto } from '../../dto/whatsapp-webhook.dto';

@Injectable()
export class FlowMessagingService {
  private readonly logger = new Logger(FlowMessagingService.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  async sendOnboardingSuccessMessages(phoneNumber: string): Promise<void> {
    const welcomeMessage: SendMessageDto = {
      to: phoneNumber,
      type: 'text',
      preview_url: false,
      message:
        '🎉 Your business has been successfully onboarded! Welcome to HappyWoman Commerce.',
    };

    const mainMenu: SendMessageDto = {
      to: phoneNumber,
      type: 'interactive',
      preview_url: false,
      interactive: {
        type: 'BUTTON',
        body: {
          text: 'What would you like to do next?',
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: 'place_order_main',
                title: 'Place an order',
              },
            },
          ],
        },
      },
    };

    try {
      await this.whatsappService.sendMessage(welcomeMessage);

      await this.whatsappService.sendMessage(mainMenu);
    } catch (error) {
      this.logger.error(
        `Failed to send onboarding success messages: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
