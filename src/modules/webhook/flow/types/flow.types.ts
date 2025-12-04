export interface Envelope {
  encrypted_aes_key: string;
  encrypted_flow_data: string;
  initial_vector: string;
}

export interface DecryptedRequest {
  version: string;
  screen: string;
  data?: Record<string, unknown>;
  flow_token?: string;
  [key: string]: unknown;
}

export interface FlowResponse {
  version: string;
  screen: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface DecryptionResult {
  aesKey: Buffer;
  iv: Buffer;
  payload: DecryptedRequest;
}

export interface EncryptionParams {
  aesKey: Buffer;
  iv?: Buffer;
  response: unknown;
}
