import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../config/env.schema';
import { SendMessageDto } from '../webhook/dto/whatsapp-webhook.dto';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly apiUrl: string;
  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  private readonly verifyToken: string;
  private readonly catalogId: string | undefined;

  constructor(private readonly configService: ConfigService<Env>) {
    this.apiUrl = this.configService.get('WHATSAPP_API_URL', { infer: true })!;
    this.phoneNumberId = this.configService.get('WHATSAPP_PHONE_NUMBER_ID', {
      infer: true,
    })!;
    this.accessToken = this.configService.get('WHATSAPP_ACCESS_TOKEN', {
      infer: true,
    })!;
    this.verifyToken = this.configService.get('WHATSAPP_VERIFY_TOKEN', {
      infer: true,
    })!;
    this.catalogId = this.configService.get('WHATSAPP_CATALOG_ID', {
      infer: true,
    });
  }

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.verifyToken) {
      this.logger.log('Webhook verified successfully');
      return challenge;
    }
    this.logger.warn('Webhook verification failed');
    return null;
  }

  async sendMessage(messageData: SendMessageDto): Promise<void> {
    const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;

    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: messageData.to,
      type: messageData.type,
    };

    if (messageData.type === 'text') {
      payload.text = {
        preview_url: messageData.preview_url,
        body: messageData.message,
      };
    } else if (messageData.type === 'interactive') {
      payload.interactive = messageData.interactive;
    } else if (messageData.type === 'template') {
      payload.template = messageData.template;
    } else if (messageData.type === 'catalog') {
      // Catalog messages are sent as interactive messages with type 'catalog'
      const catalogId = messageData.catalog_id || this.catalogId;
      if (!catalogId) {
        throw new HttpException(
          'Catalog ID is required for catalog messages',
          HttpStatus.BAD_REQUEST,
        );
      }
      payload.type = 'interactive';
      payload.interactive = {
        type: 'CATALOG_MESSAGE',
        body: {
          text: messageData.message || 'Browse our products:',
        },
        action: {
          name: 'catalog_message',
          ...(messageData.product_retailer_id && {
            parameters: {
              thumbnail_product_retailer_id: messageData.product_retailer_id,
            },
          }),
          catalog_id: catalogId,
        },
      };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        this.logger.error(
          `Failed to send message: ${JSON.stringify(errorData)}`,
        );
        throw new HttpException(
          `Failed to send WhatsApp message: ${errorData.error?.message || response.statusText}`,
          response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data = (await response.json()) as {
        messages?: Array<{ id?: string }>;
      };
      this.logger.log(
        `Message sent successfully to ${messageData.to}: ${data.messages?.[0]?.id}`,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error sending message: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HttpException(
        'Failed to send WhatsApp message',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async sendFlow(
    to: string,
    flowId: string,
    options: {
      headerText?: string;
      bodyText: string;
      footerText?: string;
      flowCta: string;
      flowToken?: string;
      screen?: string;
    },
  ): Promise<void> {
    const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'flow',
        header: options.headerText
          ? {
              type: 'text',
              text: options.headerText,
            }
          : undefined,
        body: {
          text: options.bodyText,
        },
        footer: options.footerText
          ? {
              text: options.footerText,
            }
          : undefined,
        action: {
          name: 'flow',
          parameters: {
            flow_message_version: '3',
            flow_token: options.flowToken || 'flow_token',
            flow_id: flowId,
            flow_cta: options.flowCta,
            flow_action: 'navigate',
            flow_action_payload: {
              screen: options.screen || 'MAIN',
            },
          },
        },
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        this.logger.error(`Failed to send flow: ${JSON.stringify(errorData)}`);
        throw new HttpException(
          `Failed to send WhatsApp flow: ${errorData.error?.message || response.statusText}`,
          response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data = (await response.json()) as {
        messages?: Array<{ id?: string }>;
      };
      this.logger.log(
        `Flow sent successfully to ${to}: ${data.messages?.[0]?.id}`,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error sending flow: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HttpException(
        'Failed to send WhatsApp flow',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
