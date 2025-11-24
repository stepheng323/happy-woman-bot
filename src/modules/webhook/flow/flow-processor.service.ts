import { Injectable, Logger } from '@nestjs/common';
import { DecryptedRequest, FlowResponse } from './types/flow.types';
import { BasicInfoHandler } from './handlers/basic-info.handler';
import { AdditionalInfoHandler } from './handlers/additional-info.handler';

@Injectable()
export class FlowProcessorService {
  private readonly logger = new Logger(FlowProcessorService.name);

  constructor(
    private readonly basicInfoHandler: BasicInfoHandler,
    private readonly additionalInfoHandler: AdditionalInfoHandler,
  ) {}

  async processFlowRequest(request: DecryptedRequest): Promise<FlowResponse> {
    this.logger.log(
      `Processing Flow request - Screen: ${request.screen}, Version: ${request.version}`,
      {
        data: request.data,
        dataKeys: request.data ? Object.keys(request.data) : [],
        isHealthCheck: this.isHealthCheckRequest(request),
      },
    );

    if (this.isHealthCheckRequest(request)) {
      this.logger.debug('Treating as health check request');
      return this.handleHealthCheck(request);
    }

    this.logger.debug('Routing to screen handler', { screen: request.screen });
    switch (request.screen) {
      case 'BASIC_INFO':
        return this.basicInfoHandler.handle(request);
      case 'ADDITIONAL_INFO':
        return this.additionalInfoHandler.handle(request);
      default:
        return this.handleDefaultScreen(request);
    }
  }

  private isHealthCheckRequest(request: DecryptedRequest): boolean {
    // Health check requests have empty screen AND empty data
    // If screen is explicitly set to BASIC_INFO or ADDITIONAL_INFO, it's NOT a health check
    if (
      request.screen === 'BASIC_INFO' ||
      request.screen === 'ADDITIONAL_INFO'
    ) {
      return false;
    }

    const hasEmptyScreen = !request.screen || request.screen === '';
    const hasEmptyData =
      !request.data ||
      (typeof request.data === 'object' &&
        Object.keys(request.data).length === 0);

    // Only treat as health check if BOTH screen and data are empty
    return hasEmptyScreen && hasEmptyData;
  }

  private handleHealthCheck(request: DecryptedRequest): FlowResponse {
    this.logger.log('Handling Flow health check request');
    return {
      version: request.version || '1.0',
      screen: request.screen || '',
      data: {
        status: 'active',
      },
    };
  }

  private handleDefaultScreen(request: DecryptedRequest): FlowResponse {
    this.logger.log(`Handling screen: ${request.screen}`);

    return {
      version: request.version,
      screen: request.screen,
      data: request.data || {},
    };
  }
}
