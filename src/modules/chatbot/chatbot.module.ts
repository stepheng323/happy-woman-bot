import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ChatbotService } from './chatbot.service';
import { ChatbotProcessor } from './chatbot.processor';
import { OnboardingFlow } from './flows/onboarding.flow';
import { CartFlow } from './flows/cart.flow';
import { OrderFlow } from './flows/order.flow';
import { UsersModule } from '../users/users.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { CatalogModule } from '../catalog/catalog.module';
import { CartModule } from '../cart/cart.module';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    UsersModule,
    CatalogModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    WhatsappModule,
    BullModule.registerQueue({
      name: 'webhook-queue',
    }),
  ],
  providers: [
    ChatbotService,
    ChatbotProcessor,
    OnboardingFlow,
    CartFlow,
    OrderFlow,
  ],
  exports: [ChatbotService],
})
export class ChatbotModule {}