import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { WhatsappService } from '../../whatsapp/whatsapp.service';
import { SendMessageDto } from '../../webhook/dto/whatsapp-webhook.dto';

@Injectable()
export class OnboardingFlow {
  private readonly logger = new Logger(OnboardingFlow.name);
  private readonly FLOW_ID = '2264166450676386';
  constructor(
    private readonly usersService: UsersService,
    private readonly whatsappService: WhatsappService,
  ) {}

  async sendOnboardingFlow(phoneNumber: string): Promise<void> {
    const flowToken = Buffer.from(`onboarding_flow:${phoneNumber}`).toString(
      'base64',
    );

    await this.whatsappService.sendFlow(phoneNumber, this.FLOW_ID, {
      headerText: 'Welcome to HappyWoman Commerce! 👋',
      bodyText:
        "Welcome! We're excited to have you join our platform. To get started and access all our features, please complete your onboarding by filling out a few quick questions. This will only take a minute!",
      footerText: 'HappyWoman Commerce',
      flowCta: 'Complete Onboarding',
      flowToken,
      screen: 'BASIC_INFO',
    });
  }

  getMainMenu(phoneNumber: string): SendMessageDto {
    return {
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
  }
}
