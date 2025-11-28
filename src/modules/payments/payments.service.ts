import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../config/env.schema';

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    amount: number;
    metadata?: {
      phoneNumber?: string;
      [key: string]: unknown;
    };
    paid_at?: string | null;
  };
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly baseUrl: string;
  private readonly secretKey: string | undefined;
  private readonly appBaseUrl: string | undefined;

  constructor(private readonly configService: ConfigService<Env>) {
    this.baseUrl =
      this.configService.get('PAYSTACK_BASE_URL', { infer: true }) ??
      'https://api.paystack.co';
    this.secretKey = this.configService.get('PAYSTACK_SECRET_KEY', {
      infer: true,
    });
    this.appBaseUrl = this.configService.get('APP_BASE_URL', { infer: true });
  }

  async generatePaymentLink(
    orderId: string,
    amount: number,
    email: string,
    metadata?: Record<string, unknown>,
  ): Promise<string> {
    if (!this.secretKey) {
      this.logger.warn(
        'Paystack secret key not configured, returning placeholder link',
      );
      return `https://payment.example.com/pay/${orderId}`;
    }

    try {
      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        this.logger.error(
          `Invalid amount for Paystack: raw=${amount}, numeric=${numericAmount}`,
        );
        throw new Error('Invalid order amount for payment. Amount must be > 0.');
      }

      const amountInKobo = Math.round(numericAmount * 100);
      
      const callbackUrl = this.appBaseUrl
        ? `${this.appBaseUrl}/webhook/payment/verify`
        : undefined;

      this.logger.log(
        `Initializing Paystack payment: orderId=${orderId}, amount=${numericAmount}, amountInKobo=${amountInKobo}, callbackUrl=${callbackUrl || 'not set'}`,
      );

      const requestBody: {
        email: string;
        amount: number;
        reference: string;
        callback_url?: string;
        metadata: Record<string, unknown>;
      } = {
        email,
        amount: amountInKobo,
        reference: orderId,
        metadata: {
          orderId,
          ...metadata,
        },
      };

      if (callbackUrl) {
        requestBody.callback_url = callbackUrl;
      }

      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Paystack API error: ${response.status} - ${errorText}`,
        );
        throw new Error(
          `Failed to generate payment link: ${response.statusText}`,
        );
      }

      const data = (await response.json()) as PaystackInitializeResponse;

      if (!data.status || !data.data?.authorization_url) {
        this.logger.error(`Paystack returned error: ${data.message}`);
        throw new Error(data.message || 'Failed to generate payment link');
      }

      return data.data.authorization_url;
    } catch (error) {
      this.logger.error(
        `Failed to generate Paystack payment link: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async verifyPayment(reference: string): Promise<{
    amount: number;
    metadata?: { phoneNumber?: string; [key: string]: unknown };
    paidAt?: string | null;
  }> {
    if (!this.secretKey) {
      this.logger.warn(
        'Paystack secret key not configured, returning placeholder verification result',
      );
      return {
        amount: 0,
        metadata: {},
        paidAt: null,
      };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Paystack verify API error: ${response.status} - ${errorText}`,
        );
        throw new Error(
          `Failed to verify payment: ${response.statusText}`,
        );
      }

      const data = (await response.json()) as PaystackVerifyResponse;

      if (!data.status || !data.data) {
        this.logger.error(`Paystack verify returned error: ${data.message}`);
        throw new Error(data.message || 'Failed to verify payment');
      }

      const amountInNaira = data.data.amount / 100;

      return {
        amount: amountInNaira,
        metadata: data.data.metadata,
        paidAt: data.data.paid_at ?? null,
      };
    } catch (error) {
      this.logger.error(
        `Failed to verify Paystack payment: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }
}