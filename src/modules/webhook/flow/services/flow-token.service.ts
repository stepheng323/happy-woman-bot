import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class FlowTokenService {
  private readonly logger = new Logger(FlowTokenService.name);

  extractPhoneNumberFromToken(flowToken?: string): string | null {
    if (!flowToken) {
      return null;
    }

    try {
      const decoded = Buffer.from(flowToken, 'base64').toString('utf-8');
      const parts = decoded.split(':');
      if (parts.length === 2 && parts[0] === 'onboarding_flow') {
        return parts[1];
      }
      return null;
    } catch (error) {
      this.logger.error(
        `Failed to extract phone number from flow_token: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  encodePhoneNumberToToken(phoneNumber: string): string {
    return Buffer.from(`onboarding_flow:${phoneNumber}`).toString('base64');
  }
}