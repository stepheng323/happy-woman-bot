import { Module } from '@nestjs/common';
import { CartRepository } from './cart.repository';
import { CartService } from './cart.service';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [CatalogModule],
  providers: [CartRepository, CartService],
  exports: [CartService],
})
export class CartModule {}
