import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import {
  WhatsappWebhookDto,
  WhatsappMessage,
} from '../webhook/dto/whatsapp-webhook.dto';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Processor('webhook-queue')
export class ChatbotProcessor extends WorkerHost {
  private readonly logger = new Logger(ChatbotProcessor.name);

  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly whatsappService: WhatsappService,
  ) {
    super();
  }

  async process(job: Job<WhatsappWebhookDto>): Promise<void> {
    this.logger.log(`Processing job ${job.id}`);
    try {
      const payload = job.data;

      if (!payload) {
        this.logger.warn(`Job ${job.id} has no data`);
        return;
      }

      const messages = this.extractMessages(payload);

      if (!messages || messages.length === 0) {
        this.logger.debug('No messages found in webhook payload');
        return;
      }

      for (const message of messages) {
        try {
          if (!message || typeof message !== 'object') {
            this.logger.warn('Invalid message format');
            continue;
          }

          const senderPhone =
            'from' in message && typeof message.from === 'string'
              ? message.from
              : undefined;
          if (!senderPhone) {
            this.logger.warn('No sender phone number found in message');
            continue;
          }

          if (!('type' in message) || !('id' in message)) {
            this.logger.warn('Message missing required fields');
            continue;
          }

          const response = await this.chatbotService.processMessage(
            message,
            senderPhone,
          );

          if (response) {
            const messagesToSend = Array.isArray(response)
              ? response
              : [response];
            this.logger.log(
              `[MESSAGE SEND] Processing ${messagesToSend.length} message(s) for ${senderPhone}`,
            );
            for (let i = 0; i < messagesToSend.length; i++) {
              const msg = messagesToSend[i];
              try {
                this.logger.log(
                  `[MESSAGE SEND] Sending message ${i + 1}/${messagesToSend.length} to ${senderPhone}, type: ${msg.type}`,
                );
                await this.whatsappService.sendMessage(msg);
                this.logger.log(
                  `[MESSAGE SEND] Successfully sent message ${i + 1}/${messagesToSend.length} to ${senderPhone}`,
                );
              } catch (sendError) {
                this.logger.error(
                  `[MESSAGE SEND] Failed to send message ${i + 1}/${messagesToSend.length} to ${senderPhone}: ${sendError instanceof Error ? sendError.message : String(sendError)}`,
                  sendError instanceof Error ? sendError.stack : undefined,
                );
              }
            }
            this.logger.log(
              `[MESSAGE SEND] Completed sending ${messagesToSend.length} reply(ies) to ${senderPhone}`,
            );
          } else {
            this.logger.debug(
              `[MESSAGE SEND] No response returned from processMessage for ${senderPhone}`,
            );
          }
        } catch (messageError) {
          this.logger.error(
            `Failed to process message: ${messageError instanceof Error ? messageError.message : String(messageError)}`,
            messageError instanceof Error ? messageError.stack : undefined,
          );
        }
      }
    } catch (error) {
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String((error as { message: unknown }).message);
      } else if (error && typeof error === 'object') {
        try {
          errorMessage = JSON.stringify(error);
        } catch {
          errorMessage = 'Unknown error (failed to stringify)';
        }
      } else if (error) {
        if (typeof error === 'object' && error !== null) {
          try {
            errorMessage = JSON.stringify(error);
          } catch {
            errorMessage = 'Unknown error (failed to stringify)';
          }
        } else if (
          typeof error === 'string' ||
          typeof error === 'number' ||
          typeof error === 'boolean'
        ) {
          errorMessage = String(error);
        } else {
          errorMessage = 'Unknown error';
        }
      } else {
        errorMessage = 'Unknown error';
      }
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to process job ${job.id}: ${errorMessage}`,
        errorStack,
      );

      throw error;
    }
  }

  private extractMessages(payload: WhatsappWebhookDto): WhatsappMessage[] {
    const messages: WhatsappMessage[] = [];

    if (!payload?.entry || !Array.isArray(payload.entry)) {
      this.logger.warn('Invalid payload structure: missing entry array');
      return messages;
    }

    for (const entry of payload.entry) {
      if (!entry?.changes || !Array.isArray(entry.changes)) {
        continue;
      }

      for (const change of entry.changes) {
        if (change?.value?.messages && Array.isArray(change.value.messages)) {
          for (const msg of change.value.messages) {
            if (
              msg &&
              typeof msg === 'object' &&
              'from' in msg &&
              'id' in msg &&
              'type' in msg
            ) {
              messages.push(msg);
            }
          }
        }
      }
    }
    return messages;
  }
}
