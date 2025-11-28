import {
  Controller,
  Get,
  Query,
  Res,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { PaymentsService } from '../payments/payments.service';
import { OrdersService } from '../orders/orders.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { ReceiptPdfService } from '../orders/services/receipt-pdf.service';
import { UsersService } from '../users/users.service';

@Controller('webhook/payment')
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly ordersService: OrdersService,
    private readonly whatsappService: WhatsappService,
    private readonly receiptPdfService: ReceiptPdfService,
    private readonly usersService: UsersService,
  ) {}

  @Get('verify')
  async verifyPayment(
    @Query('reference') reference: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(
      `Payment verification callback received: reference=${reference}`,
    );

    if (!reference) {
      this.logger.warn('Payment verification called without reference');
      res.status(HttpStatus.BAD_REQUEST).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Payment Verification Failed</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <h1 class="error">❌ Payment Verification Failed</h1>
            <p>Invalid payment reference.</p>
          </body>
        </html>
      `);
      return;
    }

    try {
      this.logger.log(`Verifying payment with Paystack: ${reference}`);
      const verification = await this.paymentsService.verifyPayment(reference);

      this.logger.log(
        `Payment verified successfully: ${reference}, amount: ${verification.amount}`,
      );

      await this.ordersService.updatePaymentStatus(reference, 'PAID');
      await this.ordersService.updateStatus(reference, 'CONFIRMED');

      this.logger.log(`Order ${reference} marked as PAID and CONFIRMED`);

      const order = await this.ordersService.findById(reference);
      if (order && verification.metadata?.phoneNumber) {
        const phoneNumber = verification.metadata.phoneNumber as string;

        const user = await this.usersService.findByPhoneNumber(phoneNumber);
        const customerName =
          user?.businessName || user?.contactPerson || 'Customer';
        const receiptPdf = await this.receiptPdfService.generateReceiptPdf(
          order,
          {
            name: customerName,
            phoneNumber: phoneNumber,
            address: order.deliveryAddress || '',
          },
        );

        const filename = `receipt-${reference}.pdf`;

        this.logger.log(`Sending PDF receipt to ${phoneNumber}`);
        await this.whatsappService
          .sendDocument(
            phoneNumber,
            filename,
            receiptPdf,
            'application/pdf',
            '🎉 Payment confirmed! Your receipt is attached and your order is being processed.',
          )
          .catch((err: Error) => {
            this.logger.warn(`Failed to send PDF receipt: ${err.message}`);
          });

        this.whatsappService
          .sendMessage({
            to: phoneNumber,
            type: 'text',
            preview_url: false,
            message: `Welcome to HappyWoman Commerce — the smart way to manage your supplies!

What would you like to do today?

*1.* Place your orders quickly
*2.* Track your business expenses
*3.* Earn rewards for every transaction!

Please reply with the number (1, 2, or 3).`,
          })
          .catch((err: Error) => {
            this.logger.warn(`Failed to send main menu: ${err.message}`);
          });
      }

      res.status(HttpStatus.OK).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Payment Successful</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 50px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .success { color: #4caf50; background: white; padding: 30px; border-radius: 10px; }
              h1 { margin-bottom: 20px; }
              p { font-size: 18px; }
            </style>
          </head>
          <body>
            <div class="success">
              <h1>✅ Payment Successful!</h1>
              <p>Your payment of ₦${verification.amount.toFixed(2)} has been confirmed.</p>
              <p>Order Reference: <strong>${reference}</strong></p>
              <p>You will receive a confirmation message on WhatsApp shortly.</p>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      this.logger.error(
        `Payment verification failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Payment Verification Failed</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <h1 class="error">❌ Payment Verification Failed</h1>
            <p>${error instanceof Error ? error.message : 'An error occurred while verifying your payment.'}</p>
            <p>Please contact support with reference: <strong>${reference}</strong></p>
          </body>
        </html>
      `);
    }
  }
}

