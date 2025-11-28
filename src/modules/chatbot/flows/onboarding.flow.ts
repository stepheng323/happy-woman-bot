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
      type: 'text',
      preview_url: false,
      message: `Welcome to HappyWoman Commerce — the smart way to manage your supplies!

What would you like to do today?

*1.* Place your orders quickly
*2.* Track your business expenses
*3.* Earn rewards for every transaction!

Please reply with the number (1, 2, or 3).`,
    };
  }
}