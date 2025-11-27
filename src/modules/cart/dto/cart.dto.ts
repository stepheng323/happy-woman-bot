import { z } from 'zod';

export const AddToCartSchema = z.object({
  productRetailerId: z.string().min(1),
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
  productRetailerId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
  product: {
    retailerId: string;
    name: string;
    description?: string;
    price: string;
    currency: string;
    category?: string;
    imageUrl?: string;
    availability: 'in stock' | 'out of stock' | 'preorder';
  };
}

export interface CartSummary {
  items: CartItemWithProduct[];
  totalAmount: number;
  itemCount: number;
}
