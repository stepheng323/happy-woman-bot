import { Injectable } from '@nestjs/common';
import { OrderWithItems } from '../dto/order.dto';

@Injectable()
export class ReceiptService {
  generateReceipt(order: OrderWithItems): string {
    const lines: string[] = [];
    lines.push('═══════════════════════════════════');
    lines.push('         RECEIPT');
    lines.push('═══════════════════════════════════');
    lines.push('');
    lines.push(`Receipt #: ${order.id}`);
    lines.push(`Date: ${order.createdAt.toLocaleDateString()}`);
    lines.push(`Time: ${order.createdAt.toLocaleTimeString()}`);
    lines.push('');
    lines.push('═══════════════════════════════════');
    lines.push('ITEMS PURCHASED');
    lines.push('═══════════════════════════════════');
    lines.push('');

    for (const item of order.items) {
      const quantity = item.quantity;
      const price = parseFloat(item.price);
      const subtotal = parseFloat(item.subtotal);

      lines.push(`${item.product.name}`);
      lines.push(
        `  ${quantity} × ₦${price.toFixed(2)} = ₦${subtotal.toFixed(2)}`,
      );
      lines.push('');
    }

    lines.push('═══════════════════════════════════');
    const total = parseFloat(order.totalAmount);
    lines.push(`TOTAL PAID: ₦${total.toFixed(2)}`);
    lines.push('═══════════════════════════════════');
    lines.push('');
    lines.push(`Payment Status: ${order.paymentStatus}`);
    lines.push(`Order Status: ${order.status}`);
    lines.push('');
    lines.push('Thank you for your purchase!');
    lines.push('');

    return lines.join('\n');
  }
}
