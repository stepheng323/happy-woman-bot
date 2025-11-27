import { z } from 'zod';

export const CreateOrderSchema = z.object({
  deliveryAddress: z.string().min(1),
});

export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;

export interface OrderWithItems {
  id: string;
  userId: string;
  totalAmount: string;
  status: string;
  deliveryAddress: string;
  paymentStatus: string;
  paymentLink: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    productRetailerId: string;
    productName: string;
    productPrice: string;
    quantity: number;
    price: string;
    subtotal: string;
  }>;
}
