import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const MessageSchema = z.object({
  from: z.string(),
  id: z.string(),
  timestamp: z.string(),
  type: z.enum([
    'text',
    'image',
    'audio',
    'video',
    'document',
    'location',
    'contacts',
    'sticker',
    'interactive',

    'order',
  ]),
  text: z
    .object({
      body: z.string(),
    })
    .optional(),
  image: z
    .object({
      caption: z.string().optional(),
      mime_type: z.string().optional(),
      sha256: z.string().optional(),
      id: z.string().optional(),
    })
    .optional(),
  audio: z
    .object({
      mime_type: z.string().optional(),
      sha256: z.string().optional(),
      id: z.string().optional(),
      voice: z.boolean().optional(),
    })
    .optional(),
  video: z
    .object({
      caption: z.string().optional(),
      mime_type: z.string().optional(),
      sha256: z.string().optional(),
      id: z.string().optional(),
    })
    .optional(),
  document: z
    .object({
      caption: z.string().optional(),
      filename: z.string().optional(),
      mime_type: z.string().optional(),
      sha256: z.string().optional(),
      id: z.string().optional(),
    })
    .optional(),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      name: z.string().optional(),
      address: z.string().optional(),
    })
    .optional(),
  interactive: z
    .object({
      type: z.enum(['button_reply', 'list_reply', 'nfm_reply']),
      button_reply: z
        .object({
          id: z.string(),
          title: z.string(),
        })
        .optional(),
      list_reply: z
        .object({
          id: z.string(),
          title: z.string(),
          description: z.string().optional(),
        })
        .optional(),
      nfm_reply: z
        .object({
          response_json: z.string(),
          body: z.string(),
          name: z.string(),
          flow_token: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  context: z
    .object({
      from: z.string().optional(),
      id: z.string().optional(),
      referred_product: z
        .object({
          catalog_id: z.string().optional(),
          product_retailer_id: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

const ContactSchema = z.object({
  profile: z.object({
    name: z.string(),
  }),
  wa_id: z.string(),
});

const MetadataSchema = z.object({
  display_phone_number: z.string(),
  phone_number_id: z.string(),
});

const WebhookValueSchema = z.object({
  messaging_product: z.string(),
  metadata: MetadataSchema,
  contacts: z.array(ContactSchema).optional(),
  messages: z.array(MessageSchema).optional(),
  statuses: z
    .array(
      z.object({
        id: z.string(),
        status: z.enum(['sent', 'delivered', 'read', 'failed']),
        timestamp: z.string(),
        recipient_id: z.string(),
        conversation: z
          .object({
            id: z.string(),
            origin: z.object({
              type: z.string(),
            }),
          })
          .optional(),
        pricing: z
          .object({
            billable: z.boolean(),
            pricing_model: z.string(),
            category: z.string(),
          })
          .optional(),
      }),
    )
    .optional(),
});

const ChangeSchema = z.object({
  value: WebhookValueSchema,
  field: z.string(),
});

const EntrySchema = z.object({
  id: z.string(),
  changes: z.array(ChangeSchema),
});

export const WhatsappWebhookSchema = z.object({
  object: z.string(),
  entry: z.array(EntrySchema),
});

export class WhatsappWebhookDto extends createZodDto(WhatsappWebhookSchema) {}

export const SendMessageSchema = z.object({
  to: z.string().min(1),
  type: z
    .enum(['text', 'interactive', 'template', 'catalog'])
    .optional()
    .default('text'),
  message: z.string().optional(),
  preview_url: z.boolean().optional().default(false),
  interactive: z.any().optional(),
  template: z.any().optional(),
  catalog_id: z.string().optional(),
  product_retailer_id: z.string().optional(),
});

export class SendMessageDto extends createZodDto(SendMessageSchema) {}

export type WhatsappMessage = z.infer<typeof MessageSchema>;
export type WhatsappContact = z.infer<typeof ContactSchema>;