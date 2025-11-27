import { Injectable } from '@nestjs/common';
import { OrderWithItems } from '../dto/order.dto';

@Injectable()
export class InvoiceService {
  generateInvoice(order: OrderWithItems): string {
    const lines: string[] = [];
    lines.push('═══════════════════════════════════');
    lines.push('         INVOICE');
    lines.push('═══════════════════════════════════');
    lines.push('');
    lines.push(`Invoice #: ${order.id}`);
    lines.push(`Date: ${order.createdAt.toLocaleDateString()}`);
    lines.push('');
    lines.push('═══════════════════════════════════');
    lines.push('ORDER DETAILS');
    lines.push('═══════════════════════════════════');
    lines.push('');

    for (const item of order.items) {
      const quantity = item.quantity;
      const price = parseFloat(item.price);
      const subtotal = parseFloat(item.subtotal);

      lines.push(`${item.productName}`);
      lines.push(
        `  Qty: ${quantity} × ₦${price.toFixed(2)} = ₦${subtotal.toFixed(2)}`,
      );
      lines.push('');
    }

    lines.push('═══════════════════════════════════');
    const total = parseFloat(order.totalAmount);
    lines.push(`TOTAL: ₦${total.toFixed(2)}`);
    lines.push('═══════════════════════════════════');
    lines.push('');
    lines.push(`Delivery Address: ${order.deliveryAddress}`);
    lines.push(`Payment Status: ${order.paymentStatus}`);
    lines.push('');

    return lines.join('\n');
  }
}
