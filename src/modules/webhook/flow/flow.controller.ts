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

      const response =
        await this.flowProcessorService.processFlowRequest(payload);

      const encryptedResponse = this.flowCryptoService.encryptFlowsResponse({
        aesKey,
        iv,
        response,
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
