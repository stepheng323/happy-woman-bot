import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ChatbotService } from './chatbot.service';
import { ChatbotProcessor } from './chatbot.processor';
import { OnboardingFlow } from './flows/onboarding.flow';
import { CartFlow } from './flows/cart.flow';
import { OrderFlow } from './flows/order.flow';
import { UsersModule } from '../users/users.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { ProductsModule } from '../products/products.module';
import { CartModule } from '../cart/cart.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    UsersModule,
    ProductsModule,
    CartModule,
    OrdersModule,
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
