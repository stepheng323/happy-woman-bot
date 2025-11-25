import { Injectable, Logger } from '@nestjs/common';
import { ProductsRepository } from './products.repository';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly productsRepository: ProductsRepository) {}

  async findAll(activeOnly = true) {
    try {
      return await this.productsRepository.findAll(activeOnly);
    } catch (error) {
      this.logger.error(
        `Failed to find products: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async findById(id: string) {
    try {
      return await this.productsRepository.findById(id);
    } catch (error) {
      this.logger.error(
        `Failed to find product by id: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async findByCategory(category: string) {
    try {
      return await this.productsRepository.findByCategory(category);
    } catch (error) {
      this.logger.error(
        `Failed to find products by category: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async create(data: CreateProductDto) {
    try {
      return await this.productsRepository.create(data);
    } catch (error) {
      this.logger.error(
        `Failed to create product: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async update(id: string, data: UpdateProductDto) {
    try {
      return await this.productsRepository.update(id, data);
    } catch (error) {
      this.logger.error(
        `Failed to update product: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.productsRepository.delete(id);
    } catch (error) {
      this.logger.error(
        `Failed to delete product: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
