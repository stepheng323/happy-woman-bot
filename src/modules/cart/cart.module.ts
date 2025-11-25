import { Module } from '@nestjs/common';
import { CartRepository } from './cart.repository';
import { CartService } from './cart.service';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [ProductsModule],
  providers: [CartRepository, CartService],
  exports: [CartService],
})
export class CartModule {}
