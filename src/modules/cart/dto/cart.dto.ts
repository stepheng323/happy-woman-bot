import { z } from 'zod';

export const AddToCartSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export const UpdateCartItemSchema = z.object({
  quantity: z.number().int().positive(),
});

export type AddToCartDto = z.infer<typeof AddToCartSchema>;
export type UpdateCartItemDto = z.infer<typeof UpdateCartItemSchema>;

export interface CartItemWithProduct {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
  product: {
    id: string;
    name: string;
    description: string | null;
    price: string;
    category: string | null;
    imageUrl: string | null;
  };
}

export interface CartSummary {
  items: CartItemWithProduct[];
  totalAmount: number;
  itemCount: number;
}
