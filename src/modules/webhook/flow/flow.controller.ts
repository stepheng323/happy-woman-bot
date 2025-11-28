import {
  Controller,
  Post,
  Body,
  HttpCode,
  Logger,
  HttpStatus,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { FlowEnvelopeDto } from './dto/flow.dto';
import { FlowCryptoService } from './flow-crypto.service';
import { FlowProcessorService } from './flow-processor.service';
import { FlowEndpointException } from './exceptions/flow-endpoint.exception';

@ApiTags('flow')
@Controller('flow')
export class FlowController {
  private readonly logger = new Logger(FlowController.name);

  constructor(
    private readonly flowCryptoService: FlowCryptoService,
    private readonly flowProcessorService: FlowProcessorService,
  ) {}

  @Post()
  @HttpCode(200)
  @Header('Content-Type', 'text/plain')
  @ApiOperation({ summary: 'Handle WhatsApp Flow requests' })
  @ApiBody({ type: FlowEnvelopeDto })
  @ApiResponse({
    status: 200,
    description: 'Flow response encrypted (base64 string)',
    content: {
      'text/plain': {
        schema: {
          type: 'string',
          format: 'base64',
        },
      },
    },
  })
  @ApiResponse({ status: 421, description: 'Decryption failed' })
  async handleFlow(
    @Body() envelope: FlowEnvelopeDto,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log('Received Flow request');

    try {
      const { aesKey, iv, payload } =
        this.flowCryptoService.decryptFlowsRequest(envelope);

      this.logger.debug('Flow request decrypted', {
        screen: payload.screen,
        version: payload.version,
        data: payload.data,
        dataType: typeof payload.data,
        dataKeys: payload.data ? Object.keys(payload.data) : [],
        dataStringified: JSON.stringify(payload.data),
        flow_token: payload.flow_token,
        action: (payload as any).action,
        allPayloadKeys: Object.keys(payload),
        fullPayload: JSON.stringify(payload, null, 2),

        hasBusinessName: !!(payload as any).business_name,
        hasContactPerson: !!(payload as any).contact_person,
        hasEmail: !!(payload as any).email,
      });

      const response =
        await this.flowProcessorService.processFlowRequest(payload);

      this.logger.debug('Flow response prepared', {
        screen: response.screen,
        version: response.version,
        hasData: !!response.data,
      });

      const encryptedResponse = this.flowCryptoService.encryptFlowsResponse({
        aesKey,
        iv,
        response,
      });

      this.logger.log('Flow response encrypted and sent', {
        responseScreen: response.screen,
        requestScreen: payload.screen,
      });
      res.send(encryptedResponse);
    } catch (error) {
      if (error instanceof FlowEndpointException) {
        this.logger.error(`Flow endpoint error: ${error.message}`);
        throw error;
      }

      this.logger.error(
        `Unexpected error processing flow: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new FlowEndpointException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Failed to process flow request',
      );
    }
  }
}