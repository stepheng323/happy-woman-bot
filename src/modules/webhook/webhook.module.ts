import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhookController } from './webhook.controller';
import { PaymentWebhookController } from './payment-webhook.controller';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { PaymentsModule } from '../payments/payments.module';
import { OrdersModule } from '../orders/orders.module';
import { FlowController } from './flow/flow.controller';
import { FlowCryptoService } from './flow/flow-crypto.service';
import { FlowProcessorService } from './flow/flow-processor.service';
import { FlowTokenService } from './flow/services/flow-token.service';
import { FlowMessagingService } from './flow/services/flow-messaging.service';
import { BasicInfoHandler } from './flow/handlers/basic-info.handler';
import { AdditionalInfoHandler } from './flow/handlers/additional-info.handler';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    WhatsappModule,
    PaymentsModule,
    OrdersModule,
    UsersModule,
    BullModule.registerQueue({
      name: 'webhook-queue',
    }),
  ],
  controllers: [WebhookController, PaymentWebhookController, FlowController],
  providers: [
    FlowCryptoService,
    FlowProcessorService,
    FlowTokenService,
    FlowMessagingService,
    BasicInfoHandler,
    AdditionalInfoHandler,
  ],
})
export class WebhookModule {}