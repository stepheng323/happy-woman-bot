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
      return this.handleHealthCheck(request);
    }

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

    return hasEmptyScreen && hasEmptyData;
  }

  private handleHealthCheck(request: DecryptedRequest): FlowResponse {
    return {
      version: request.version || '1.0',
      screen: request.screen || '',
      data: {
        status: 'active',
      },
    };
  }

  private handleDefaultScreen(request: DecryptedRequest): FlowResponse {

    return {
      version: request.version,
      screen: request.screen,
      data: request.data || {},
    };
  }
}