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
      type: 'text',
      preview_url: false,
      message: `Welcome to HappyWoman Commerce — the smart way to manage your supplies!

What would you like to do today?

*1.* Place your orders quickly
*2.* Track your business expenses
*3.* Earn rewards for every transaction!

Please reply with the number (1, 2, or 3).`,
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