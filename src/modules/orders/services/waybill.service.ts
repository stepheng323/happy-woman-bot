import { Injectable } from '@nestjs/common';
import { OrderWithItems } from '../dto/order.dto';

@Injectable()
export class WaybillService {
  generateWaybill(order: OrderWithItems): string {
    const lines: string[] = [];
    lines.push('═══════════════════════════════════');
    lines.push('         WAYBILL');
    lines.push('═══════════════════════════════════');
    lines.push('');
    lines.push(`Waybill #: ${order.id}`);
    lines.push(`Date: ${order.createdAt.toLocaleDateString()}`);
    lines.push('');
    lines.push('═══════════════════════════════════');
    lines.push('SHIPMENT DETAILS');
    lines.push('═══════════════════════════════════');
    lines.push('');
    lines.push(`Delivery Address:`);
    lines.push(`${order.deliveryAddress}`);
    lines.push('');
    lines.push('═══════════════════════════════════');
    lines.push('ITEMS');
    lines.push('═══════════════════════════════════');
    lines.push('');

    let itemCount = 0;
    for (const item of order.items) {
      itemCount += item.quantity;
      lines.push(`${item.quantity}x ${item.productName}`);
    }

    lines.push('');
    lines.push(`Total Items: ${itemCount}`);
    lines.push(`Total Weight: To be determined`);
    lines.push('');
    lines.push('═══════════════════════════════════');
    lines.push(`Order Status: ${order.status}`);
    lines.push('═══════════════════════════════════');
    lines.push('');
    lines.push('Your order will be shipped soon.');
    lines.push('You will receive tracking information');
    lines.push('once your order is dispatched.');
    lines.push('');

    return lines.join('\n');
  }
}
