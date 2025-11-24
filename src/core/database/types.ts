import type { ColumnType } from 'kysely';
export type Generated<T> =
  T extends ColumnType<infer S, infer I, infer U>
    ? ColumnType<S, I | undefined, U>
    : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type User = {
  id: string;
  phoneNumber: string;
  businessName: string;
  contactPerson: string;
  email: string;
  address: string;
  natureOfBusiness: string;
  registrationNumber: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: string; // Decimal as string in Kysely
  category: string | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
};

export type Cart = {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
};

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export type Order = {
  id: string;
  userId: string;
  totalAmount: string; // Decimal as string in Kysely
  status: OrderStatus;
  deliveryAddress: string;
  paymentStatus: PaymentStatus;
  paymentLink: string | null;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
};

export type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: string; // Decimal as string in Kysely
  subtotal: string; // Decimal as string in Kysely
  createdAt: Generated<Timestamp>;
};

export type DB = {
  users: User;
  products: Product;
  cart: Cart;
  orders: Order;
  order_items: OrderItem;
};
