import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb, RGB } from 'pdf-lib';
import { OrderWithItems } from '../dto/order.dto';

interface ReceiptCustomerInfo {
  name: string;
  phoneNumber: string;
  address: string;
}

@Injectable()
export class ReceiptPdfService {
  private readonly logger = new Logger(ReceiptPdfService.name);

  async generateReceiptPdf(
    order: OrderWithItems,
    customer: ReceiptCustomerInfo,
  ): Promise<Buffer> {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]);
      const { width, height } = page.getSize();

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const margin = 50;
      let cursorY = height - margin;

      const drawText = (
        text: string,
        x: number,
        y: number,
        options?: {
          size?: number;
          font?: typeof font;
          color?: RGB;
        },
      ) => {
        const size = options?.size ?? 12;
        const usedFont = options?.font ?? font;
        const color = options?.color ?? rgb(0, 0, 0);
        page.drawText(text, { x, y, size, font: usedFont, color });
      };

      const title = 'RECEIPT';
      const titleSize = 32;
      const titleWidth = boldFont.widthOfTextAtSize(title, titleSize);
      drawText(title, width - margin - titleWidth, cursorY, {
        size: titleSize,
        font: boldFont,
      });

      cursorY -= 40;
      drawText('BILLED TO:', margin, cursorY, {
        size: 12,
        font: boldFont,
      });
      cursorY -= 18;
      drawText(customer.name, margin, cursorY);
      cursorY -= 16;
      drawText(customer.phoneNumber, margin, cursorY);
      cursorY -= 16;
      drawText(customer.address, margin, cursorY);

      const rightX = width - margin - 220;
      const createdAt =
        order.createdAt instanceof Date
          ? order.createdAt
          : new Date(order.createdAt);
      const dateStr = createdAt.toLocaleDateString();
      const timeStr = createdAt.toLocaleTimeString();

      drawText(`Receipt No. ${order.id}`, rightX, height - margin - 40);
      drawText(`Date: ${dateStr}`, rightX, height - margin - 56);
      drawText(`Time: ${timeStr}`, rightX, height - margin - 72);
      drawText(
        `Payment Status: ${order.paymentStatus}`,
        rightX,
        height - margin - 88,
      );

      cursorY -= 80;
      page.drawLine({
        start: { x: margin, y: cursorY },
        end: { x: width - margin, y: cursorY },
        thickness: 1,
        color: rgb(0.2, 0.2, 0.2),
      });
      cursorY -= 18;

      const colItemX = margin;
      const colQtyX = margin + 260;
      const colUnitPriceX = margin + 340;
      const colTotalX = margin + 440;

      drawText('Item', colItemX, cursorY, { font: boldFont });
      drawText('Quantity', colQtyX, cursorY, { font: boldFont });
      drawText('Unit Price', colUnitPriceX, cursorY, { font: boldFont });
      drawText('Total', colTotalX, cursorY, { font: boldFont });

      cursorY -= 12;
      page.drawLine({
        start: { x: margin, y: cursorY },
        end: { x: width - margin, y: cursorY },
        thickness: 1,
        color: rgb(0.2, 0.2, 0.2),
      });

      cursorY -= 16;
      const rowHeight = 18;

      for (const item of order.items) {
        if (cursorY < 120) {

          cursorY = height - margin - 80;
        }

        const quantity = item.quantity;

        const unitPrice = Number(
          (item.productPrice ?? item.price ?? 0).toString(),
        );

        const lineTotal = Number(
          (item.subtotal ?? unitPrice * quantity).toString(),
        );

        const baseName =
          item.productName || item.productRetailerId || 'Item';

        const maxItemWidth = colQtyX - colItemX - 8;
        let itemName = baseName;
        const itemNameWidth = font.widthOfTextAtSize(itemName, 12);
        if (itemNameWidth > maxItemWidth) {
          while (
            itemName.length > 3 &&
            font.widthOfTextAtSize(itemName + '…', 12) > maxItemWidth
          ) {
            itemName = itemName.slice(0, -1);
          }
          itemName += '…';
        }

        drawText(itemName, colItemX, cursorY);
        drawText(String(quantity), colQtyX, cursorY);

        drawText(`NGN ${unitPrice.toFixed(2)}`, colUnitPriceX, cursorY);
        drawText(`NGN ${lineTotal.toFixed(2)}`, colTotalX, cursorY);

        cursorY -= rowHeight;
      }

      cursorY -= 16;
      page.drawLine({
        start: { x: margin, y: cursorY },
        end: { x: width - margin, y: cursorY },
        thickness: 1,
        color: rgb(0.2, 0.2, 0.2),
      });
      cursorY -= 24;

      const labelX = colUnitPriceX;
      const valueX = colTotalX;

      const subtotal = Number(order.totalAmount);
      const taxRate = 0;
      const taxAmount = subtotal * taxRate;
      const grandTotal = subtotal + taxAmount;

      drawText('Subtotal', labelX, cursorY);
      drawText(`NGN ${subtotal.toFixed(2)}`, valueX, cursorY);
      cursorY -= 18;

      drawText(`Tax (${(taxRate * 100).toFixed(0)}%)`, labelX, cursorY);
      drawText(`NGN ${taxAmount.toFixed(2)}`, valueX, cursorY);
      cursorY -= 24;

      drawText('Total Paid', labelX, cursorY, { font: boldFont });
      drawText(`NGN ${grandTotal.toFixed(2)}`, valueX, cursorY, {
        font: boldFont,
      });

      cursorY -= 40;
      drawText('Thank you for your purchase!', margin, cursorY, {
        font: boldFont,
      });

      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error) {
      this.logger.error(
        `Failed to generate receipt PDF: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }
}