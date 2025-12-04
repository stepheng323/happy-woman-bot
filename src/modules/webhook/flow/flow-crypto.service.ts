import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { Env } from '../../../config/env.schema';
import {
  Envelope,
  DecryptedRequest,
  DecryptionResult,
  EncryptionParams,
} from './types/flow.types';
import { FlowEndpointException } from './exceptions/flow-endpoint.exception';

@Injectable()
export class FlowCryptoService {
  private readonly logger = new Logger(FlowCryptoService.name);

  constructor(private readonly configService: ConfigService<Env>) {}

  private getPrivateKey(): crypto.KeyObject {
    // Priority order: BASE64 > PEM > PATH > default file
    // This order prioritizes env vars (Render-friendly) over file paths
    
    const base64 =
      this.configService.get('META_FLOW_PRIVATE_KEY_BASE64', { infer: true }) ||
      '';
    const keyPath = (
      this.configService.get('META_FLOW_PRIVATE_KEY_PATH', { infer: true }) ||
      ''
    )
      .trim()
      .replace(/^["']|["']$/g, '');
    let pem = (
      this.configService.get('META_FLOW_PRIVATE_KEY_PEM', { infer: true }) || ''
    )
      .trim()
      .replace(/\\\\n/g, '\n') // Handle escaped newlines
      .replace(/\\n/g, '\n'); // Handle literal \n sequences

    // 1. Try BASE64 first (best for Render/env vars)
    if (!pem && base64) {
      try {
        pem = Buffer.from(base64.trim(), 'base64').toString('utf8');
      } catch (error) {
        this.logger.warn(
          `Failed to decode META_FLOW_PRIVATE_KEY_BASE64: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // 2. Try PEM string directly (works if properly formatted in env var)
    // PEM is already set above if META_FLOW_PRIVATE_KEY_PEM exists

    // 3. Try reading from file path (for local development)
    if (!pem && keyPath) {
      try {
        pem = fs.readFileSync(keyPath, 'utf8');
      } catch (error) {
        throw new Error(
          `Failed to read private key from META_FLOW_PRIVATE_KEY_PATH: ${keyPath}. ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // 4. Try default file location (fallback for local dev)
    if (!pem) {
      const defaultPath = `${process.cwd()}/whatsapp_flow_private_key.pem`;
      try {
        pem = fs.readFileSync(defaultPath, 'utf8');
      } catch {
        // Silently fail, will throw error below if still no pem
      }
    }

    if (!pem) {
      throw new Error(
        'Private key not found. Set one of: META_FLOW_PRIVATE_KEY_BASE64 (recommended for Render), META_FLOW_PRIVATE_KEY_PEM, META_FLOW_PRIVATE_KEY_PATH, or provide a default private key file at whatsapp_flow_private_key.pem',
      );
    }

    const passphrase =
      this.configService.get('META_FLOW_PRIVATE_KEY_PASSPHRASE', {
        infer: true,
      }) || undefined;

    try {
      return crypto.createPrivateKey({ key: pem, passphrase });
    } catch {
      try {
        return crypto.createPrivateKey({
          key: pem,
          passphrase,
          type: 'pkcs1',
          format: 'pem',
        });
      } catch {
        try {
          return crypto.createPrivateKey({
            key: pem,
            passphrase,
            type: 'pkcs8',
            format: 'pem',
          });
        } catch (e3) {
          const hint = pem.includes('BEGIN PUBLIC KEY')
            ? 'Provided key appears to be a PUBLIC key; a PRIVATE key is required.'
            : 'Ensure the key includes proper PEM headers (e.g., -----BEGIN PRIVATE KEY-----).';
          throw new Error(
            `Failed to load private key. ${hint} Original error: ${(e3 as Error).message}`,
          );
        }
      }
    }
  }

  decryptFlowsRequest(envelope: Envelope): DecryptionResult {
    const privateKey = this.getPrivateKey();
    const { encrypted_aes_key, encrypted_flow_data, initial_vector } = envelope;

    let decryptedAesKey: Buffer;
    try {
      decryptedAesKey = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        Buffer.from(encrypted_aes_key, 'base64'),
      );
    } catch (error) {
      this.logger.error(
        `Failed to decrypt AES key: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new FlowEndpointException(
        421,
        'Failed to decrypt the request. Please verify your private key.',
      );
    }

    const flowDataBuffer = Buffer.from(encrypted_flow_data, 'base64');
    const iv = Buffer.from(initial_vector, 'base64');

    const TAG_LENGTH = 16;
    const encryptedBody = flowDataBuffer.subarray(0, -TAG_LENGTH);
    const encryptedTag = flowDataBuffer.subarray(-TAG_LENGTH);

    const algorithm =
      decryptedAesKey.length === 32 ? 'aes-256-gcm' : 'aes-128-gcm';

    let decipher: crypto.DecipherGCM;
    try {
      decipher = crypto.createDecipheriv(algorithm, decryptedAesKey, iv);
      decipher.setAuthTag(encryptedTag);
    } catch (error) {
      this.logger.error(
        `Failed to create decipher: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new FlowEndpointException(421, 'Failed to initialize decryption.');
    }

    let decryptedJSONString: string;
    try {
      decryptedJSONString = Buffer.concat([
        decipher.update(encryptedBody),
        decipher.final(),
      ]).toString('utf-8');
    } catch (error) {
      this.logger.error(
        `Failed to decrypt flow data: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new FlowEndpointException(421, 'Failed to decrypt flow data.');
    }

    let payload: DecryptedRequest;
    try {
      payload = JSON.parse(decryptedJSONString) as DecryptedRequest;
    } catch (error) {
      this.logger.error(
        `Failed to parse decrypted JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new FlowEndpointException(421, 'Failed to parse decrypted data.');
    }

    return { aesKey: decryptedAesKey, iv, payload };
  }

  encryptFlowsResponse({ aesKey, iv, response }: EncryptionParams): string {
    if (!iv) {
      throw new Error('IV is required to encrypt response');
    }
    if (!aesKey) {
      throw new Error('AES key is required to encrypt response');
    }

    const flipped: number[] = [];
    for (const [, byte] of iv.entries()) {
      flipped.push(~byte & 0xff);
    }
    const flippedIv = Buffer.from(flipped);
    const algorithm = aesKey.length === 32 ? 'aes-256-gcm' : 'aes-128-gcm';

    this.logger.debug(
      `Encrypting response with algorithm: ${algorithm}, key length: ${aesKey.length}, IV length: ${iv.length}`,
    );

    let cipher: crypto.CipherGCM;
    try {
      cipher = crypto.createCipheriv(algorithm, aesKey, flippedIv);
    } catch (error) {
      this.logger.error(
        `Failed to create cipher: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new FlowEndpointException(500, 'Failed to initialize encryption.');
    }

    const responseJson = JSON.stringify(response);
    this.logger.debug(
      `Encrypting response JSON: ${responseJson.substring(0, 100)}...`,
    );

    let encrypted: Buffer;
    try {
      encrypted = Buffer.concat([
        cipher.update(responseJson, 'utf-8'),
        cipher.final(),
      ]);
    } catch (error) {
      this.logger.error(
        `Failed to encrypt response: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new FlowEndpointException(500, 'Failed to encrypt response.');
    }

    const tag = cipher.getAuthTag();
    const encryptedWithTag = Buffer.concat([encrypted, tag]);

    this.logger.debug(
      `Encryption successful. Encrypted length: ${encryptedWithTag.length}, Tag length: ${tag.length}`,
    );

    return encryptedWithTag.toString('base64');
  }
}