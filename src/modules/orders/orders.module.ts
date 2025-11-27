import { Module } from '@nestjs/common';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';
import { InvoiceService } from './services/invoice.service';
import { ReceiptService } from './services/receipt.service';
import { WaybillService } from './services/waybill.service';
import { CartModule } from '../cart/cart.module';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [CartModule, CatalogModule],
  providers: [
    OrdersRepository,
    OrdersService,
    InvoiceService,
    ReceiptService,
    WaybillService,
  ],
  exports: [OrdersService, InvoiceService, ReceiptService, WaybillService],
})
export class OrdersModule {}
