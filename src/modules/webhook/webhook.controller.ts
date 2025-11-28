import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WhatsappWebhookDto } from './dto/whatsapp-webhook.dto';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@ApiTags('webhook')
@Controller('webhook/whatsapp')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    @InjectQueue('webhook-queue') private readonly webhookQueue: Queue,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Verify WhatsApp webhook' })
  @ApiQuery({ name: 'hub.mode', required: false })
  @ApiQuery({ name: 'hub.verify_token', required: false })
  @ApiQuery({ name: 'hub.challenge', required: false })
  @ApiResponse({ status: 200, description: 'Webhook verified' })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string | null {
    this.logger.log(`Webhook verification attempt: mode=${mode}`);
    const result = this.whatsappService.verifyWebhook(mode, token, challenge);
    return result;
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle WhatsApp webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleWebhook(@Body() payload: any): Promise<{ status: string }> {
    this.logger.log('Received webhook payload, adding to queue');

    try {
      const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      if (message?.from && message?.id) {
        this.whatsappService
          .sendTyping(message.from, message.id)
          .catch((err: unknown) => {
            this.logger.warn(
              `Failed to send immediate typing indicator: ${
                err instanceof Error ? err.message : String(err)
              }`,
            );
          });
      }
    } catch (error) {
      this.logger.warn(
        `Error processing immediate typing indicator: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    try {
      await this.webhookQueue.add('process-webhook', payload, {
        removeOnComplete: true,
        removeOnFail: false,
      });

      return { status: 'ok' };
    } catch (error) {
      this.logger.error(
        `Error adding webhook to queue: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { status: 'ok' };
    }
  }
}
