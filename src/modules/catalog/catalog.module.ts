import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CatalogService } from './catalog.service';

@Module({
  imports: [ConfigModule],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}