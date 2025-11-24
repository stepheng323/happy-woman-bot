import { HttpException } from '@nestjs/common';

export class FlowEndpointException extends HttpException {
  constructor(statusCode: number, message: string) {
    super(message, statusCode);
    this.name = this.constructor.name;
  }
}
