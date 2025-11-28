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
      const fields = [
        'id',
        'retailer_id',
        'name',
        'description',
        'price',
        'currency',
        'image_url',
        'availability',
        'category',
      ].join(',');
      const url = `${this.apiUrl}/${this.catalogId}/products/${retailerId}?fields=${fields}`;
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

      const responseData = (await response.json()) as
        | {
            id?: string;
            retailer_id?: string;
            name?: string;
            description?: string;
            price?: string;
            currency?: string;
            image_url?: string;
            availability?: 'in stock' | 'out of stock' | 'preorder';
            category?: string;
          }
        | {
            data?: Array<{
              id?: string;
              retailer_id?: string;
              name?: string;
              description?: string;
              price?: string;
              currency?: string;
              image_url?: string;
              availability?: 'in stock' | 'out of stock' | 'preorder';
              category?: string;
            }>;
            paging?: unknown;
          };

      this.logger.debug(
        `Meta API response for ${retailerId}: ${JSON.stringify(responseData)}`,
      );

      let data: {
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

      if ('data' in responseData && Array.isArray(responseData.data)) {
        const productInList = responseData.data.find(
          (item) => item.retailer_id === retailerId,
        );
        if (!productInList) {
          this.logger.warn(
            `Product with retailer_id ${retailerId} not found in list response`,
          );
          return null;
        }

        if (productInList.price && productInList.name) {
          this.logger.debug(
            `Using product data from list response for ${retailerId}`,
          );
          data = productInList;
        } else if (productInList.id) {
          const productId = productInList.id;
          this.logger.debug(
            `Found product ${retailerId} with id ${productId}, fetching full details`,
          );

          const detailUrl = `${this.apiUrl}/${productId}?fields=${fields}`;
          const detailResponse = await fetch(detailUrl, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
            },
          });

          if (!detailResponse.ok) {
            this.logger.error(
              `Failed to fetch product details by id ${productId}: ${detailResponse.statusText}`,
            );
            throw new HttpException(
              `Failed to fetch product details from catalog`,
              detailResponse.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
          }

          const detailData = (await detailResponse.json()) as {
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

          this.logger.debug(
            `Product details for ${retailerId}: ${JSON.stringify(detailData)}`,
          );
          data = detailData;
        } else {
          this.logger.error(
            `Product ${retailerId} found in list but missing required fields`,
          );
          return null;
        }
      } else if ('id' in responseData || 'retailer_id' in responseData) {
        data = responseData as {
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
      } else {
        this.logger.error(
          `Unexpected response format for ${retailerId}: ${JSON.stringify(responseData)}`,
        );
        throw new HttpException(
          `Unexpected response format from Meta catalog API`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      let priceStr = data.price;
      if (!priceStr || priceStr.trim() === '') {
        this.logger.error(
          `Product ${retailerId} has missing or empty price field. Full response: ${JSON.stringify(responseData)}`,
        );
        throw new HttpException(
          `Product ${retailerId} has invalid price in Meta catalog`,
          HttpStatus.BAD_REQUEST,
        );
      }

      priceStr = priceStr.trim();
      priceStr = priceStr.replace(/^\s*(NGN|USD|EUR|GBP)\s*/i, '');
      priceStr = priceStr.replace(/\s*(NGN|USD|EUR|GBP)\s*$/i, '');
      priceStr = priceStr.replace(/,/g, '');

      const priceNum = parseFloat(priceStr);
      if (!Number.isFinite(priceNum) || priceNum <= 0) {
        this.logger.error(
          `Product ${retailerId} has invalid price value: "${data.price}" (cleaned: "${priceStr}", parsed as: ${priceNum}). Full response: ${JSON.stringify(responseData)}`,
        );
        throw new HttpException(
          `Product ${retailerId} has invalid price in Meta catalog: ${data.price}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        id: data.id || retailerId,
        retailer_id: data.retailer_id || retailerId,
        name: data.name || 'Unknown Product',
        description: data.description,
        price: priceStr,
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