import type { ColumnType } from 'kysely';
export type Generated<T> =
  T extends ColumnType<infer S, infer I, infer U>
    ? ColumnType<S, I | undefined, U>
    : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

import type { OrderStatus, PaymentStatus } from './enums';

export type Cart = {
  id: string;
  user_id: string;
  product_retailer_id: string;
  quantity: number;
  created_at: Generated<Timestamp>;
  updated_at: Timestamp;
};
export type Order = {
  id: string;
  user_id: string;
  total_amount: string;
  status: Generated<OrderStatus>;
  delivery_address: string;
  payment_status: Generated<PaymentStatus>;
  payment_link: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Timestamp;
};
export type OrderItem = {
  id: string;
  order_id: string;
  product_retailer_id: string;
  product_name: string;
  product_price: string;
  quantity: number;
  price: string;
  subtotal: string;
  created_at: Generated<Timestamp>;
};
export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  category: string | null;
  image_url: string | null;
  is_active: Generated<boolean>;
  created_at: Generated<Timestamp>;
  updated_at: Timestamp;
};
export type User = {
  id: string;
  phoneNumber: string;
  businessName: string;
  contactPerson: string;
  email: string;
  address: string | null;
  natureOfBusiness: string;
  registrationNumber: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
};
export type DB = {
  cart: Cart;
  order_items: OrderItem;
  orders: Order;
  products: Product;
  users: User;
};
