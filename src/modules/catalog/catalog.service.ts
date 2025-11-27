import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../config/env.schema';

export interface CatalogProduct {
  id: string;
  retailer_id: string;
  name: string;
  description?: string;
  price: string;
  currency: string;
  image_url?: string;
  availability: 'in stock' | 'out of stock' | 'preorder';
  category?: string;
}

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);
  private readonly apiUrl: string;
  private readonly accessToken: string;
  private readonly catalogId: string | undefined;

  constructor(private readonly configService: ConfigService<Env>) {
    this.apiUrl = this.configService.get('WHATSAPP_API_URL', { infer: true })!;
    this.accessToken = this.configService.get('WHATSAPP_ACCESS_TOKEN', {
      infer: true,
    })!;
    this.catalogId = this.configService.get('WHATSAPP_CATALOG_ID', {
      infer: true,
    });
  }

  async getProduct(retailerId: string): Promise<CatalogProduct | null> {
    if (!this.catalogId) {
      this.logger.warn(
        'WHATSAPP_CATALOG_ID is not configured. Cannot fetch product details.',
      );
      return null;
    }

    try {
      const url = `${this.apiUrl}/${this.catalogId}/products/${retailerId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          this.logger.warn(`Product with retailer_id ${retailerId} not found`);
          return null;
        }
        const errorData = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        this.logger.error(
          `Failed to fetch product: ${JSON.stringify(errorData)}`,
        );
        throw new HttpException(
          `Failed to fetch product from catalog: ${errorData.error?.message || response.statusText}`,
          response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data = (await response.json()) as {
        id?: string;
        retailer_id?: string;
        name?: string;
        description?: string;
        price?: string;
        currency?: string;
        image_url?: string;
        availability?: 'in stock' | 'out of stock' | 'preorder';
        category?: string;
      };

      return {
        id: data.id || retailerId,
        retailer_id: data.retailer_id || retailerId,
        name: data.name || 'Unknown Product',
        description: data.description,
        price: data.price || '0',
        currency: data.currency || 'NGN',
        image_url: data.image_url,
        availability: data.availability || 'in stock',
        category: data.category,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error fetching product: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HttpException(
        'Failed to fetch product from catalog',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getProducts(
    retailerIds: string[],
  ): Promise<Map<string, CatalogProduct>> {
    const products = new Map<string, CatalogProduct>();

    // Fetch products in parallel (with rate limiting consideration)
    const promises = retailerIds.map(async (retailerId) => {
      try {
        const product = await this.getProduct(retailerId);
        if (product) {
          products.set(retailerId, product);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to fetch product ${retailerId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });

    await Promise.all(promises);
    return products;
  }
}
