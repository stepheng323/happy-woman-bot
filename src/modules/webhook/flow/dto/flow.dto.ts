import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// WhatsApp Flow Envelope Schema (encrypted request)
export const FlowEnvelopeSchema = z.object({
  encrypted_aes_key: z.string().min(1),
  encrypted_flow_data: z.string().min(1),
  initial_vector: z.string().min(1),
});

export class FlowEnvelopeDto extends createZodDto(FlowEnvelopeSchema) {}

// Decrypted Flow Request Schema
export const DecryptedFlowRequestSchema = z
  .object({
    version: z.string(),
    screen: z.string(),
    data: z.record(z.string(), z.unknown()).optional(),
    flow_token: z.string().optional(),
  })
  .passthrough(); // Allow additional fields

export class DecryptedFlowRequestDto extends createZodDto(
  DecryptedFlowRequestSchema,
) {}

// Flow Response Schema
export const FlowResponseSchema = z
  .object({
    version: z.string(),
    screen: z.string(),
    data: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough(); // Allow additional fields

export class FlowResponseDto extends createZodDto(FlowResponseSchema) {}
