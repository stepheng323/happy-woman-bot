import { Inject, Injectable, Logger } from '@nestjs/common';
import { Kysely } from 'kysely';
import { randomUUID } from 'crypto';
import { DB, Product } from '../../database/types';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Injectable()
export class ProductsRepository {
  private readonly logger = new Logger(ProductsRepository.name);

  constructor(@Inject('DB_CONNECTION') private readonly db: Kysely<DB>) {}

  async findAll(activeOnly = true) {
    try {
      let query = this.db.selectFrom('products').selectAll();

      if (activeOnly) {
        query = query.where('is_active', '=', true);
      }

      return await query.orderBy('name', 'asc').execute();
    } catch (error) {
      this.logger.error(
        `Database error while finding products: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async findById(id: string) {
    try {
      return await this.db
        .selectFrom('products')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();
    } catch (error) {
      this.logger.error(
        `Database error while finding product by id: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async findByCategory(category: string) {
    try {
      return await this.db
        .selectFrom('products')
        .selectAll()
        .where('category', '=', category)
        .where('is_active', '=', true)
        .orderBy('name', 'asc')
        .execute();
    } catch (error) {
      this.logger.error(
        `Database error while finding products by category: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async create(data: CreateProductDto) {
    try {
      const id = randomUUID();
      await this.db
        .insertInto('products')
        .values({
          id,
          name: data.name,
          description: data.description || null,
          price: data.price.toString(),
          category: data.category || null,
          image_url: data.imageUrl || null,
          is_active: data.isActive ?? true,
          updated_at: new Date(),
        })
        .execute();

      const product = await this.findById(id);
      if (!product) {
        throw new Error('Failed to retrieve created product');
      }
      return product;
    } catch (error) {
      this.logger.error(
        `Database error while creating product: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async update(id: string, data: UpdateProductDto) {
    try {
      const updateData: {
        name?: string;
        description?: string | null;
        price?: string;
        category?: string | null;
        image_url?: string | null;
        is_active?: boolean;
        updatedAt: Date;
      } = {
        updatedAt: new Date(),
      };

      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined)
        updateData.description = data.description || null;
      if (data.price !== undefined) updateData.price = data.price.toString();
      if (data.category !== undefined)
        updateData.category = data.category || null;
      if (data.imageUrl !== undefined)
        updateData.image_url = data.imageUrl || null;
      if (data.isActive !== undefined) updateData.is_active = data.isActive;

      await this.db
        .updateTable('products')
        .set(updateData)
        .where('id', '=', id)
        .execute();

      const product = await this.findById(id);
      if (!product) {
        throw new Error('Product not found after update');
      }
      return product;
    } catch (error) {
      this.logger.error(
        `Database error while updating product: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.deleteFrom('products').where('id', '=', id).execute();
    } catch (error) {
      this.logger.error(
        `Database error while deleting product: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}