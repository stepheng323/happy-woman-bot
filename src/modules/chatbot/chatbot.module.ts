import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ChatbotService } from './chatbot.service';
import { ChatbotProcessor } from './chatbot.processor';
import { OnboardingFlow } from './flows/onboarding.flow';
import { UsersModule } from '../users/users.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    UsersModule,
    WhatsappModule,
    BullModule.registerQueue({
      name: 'webhook-queue',
    }),
  ],
  providers: [ChatbotService, ChatbotProcessor, OnboardingFlow],
  exports: [ChatbotService],
})
export class ChatbotModule {}
