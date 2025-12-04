import { Module } from '@nestjs/common';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';
import { InvoicePdfService } from './services/invoice-pdf.service';
import { ReceiptPdfService } from './services/receipt-pdf.service';
import { CartModule } from '../cart/cart.module';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [CartModule, CatalogModule],
  providers: [
    OrdersRepository,
    OrdersService,
    InvoicePdfService,
    ReceiptPdfService,
  ],
  exports: [OrdersService, InvoicePdfService, ReceiptPdfService],
})
export class OrdersModule {}
