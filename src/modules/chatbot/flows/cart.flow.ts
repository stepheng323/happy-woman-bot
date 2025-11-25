import { Injectable, Logger } from '@nestjs/common';
import { ProductsService } from '../../products/products.service';
import { CartService } from '../../cart/cart.service';
import { WhatsappService } from '../../whatsapp/whatsapp.service';
import { SendMessageDto } from '../../webhook/dto/whatsapp-webhook.dto';

@Injectable()
export class CartFlow {
  private readonly logger = new Logger(CartFlow.name);

  constructor(
    private readonly productsService: ProductsService,
    private readonly cartService: CartService,
    private readonly whatsappService: WhatsappService,
  ) {}

  async showProductCatalog(phoneNumber: string): Promise<SendMessageDto> {
    try {
      const products = await this.productsService.findAll(true);

      if (products.length === 0) {
        return {
          to: phoneNumber,
          type: 'text',
          preview_url: false,
          message:
            'No products available at the moment. Please check back later.',
        };
      }

      if (products.length <= 10) {
        const buttons = products.slice(0, 3).map((product, _) => ({
          type: 'reply' as const,
          reply: {
            id: `product_${product.id}`,
            title: `${product.name} - ₦${parseFloat(product.price).toFixed(2)}`,
          },
        }));

        if (products.length > 3) {
          buttons.push({
            type: 'reply' as const,
            reply: {
              id: 'view_all_products',
              title: 'View All Products',
            },
          });
        }

        return {
          to: phoneNumber,
          type: 'interactive',
          preview_url: false,
          interactive: {
            type: 'BUTTON',
            body: {
              text: 'What would you like to order? Select a product:',
            },
            action: {
              buttons,
            },
          },
        };
      } else {
        // Use LIST for larger catalogs
        const sections = [
          {
            title: 'Products',
            rows: products.slice(0, 10).map((product) => ({
              id: `product_${product.id}`,
              title: product.name,
              description: `₦${parseFloat(product.price).toFixed(2)}`,
            })),
          },
        ];

        return {
          to: phoneNumber,
          type: 'interactive',
          preview_url: false,
          interactive: {
            type: 'LIST',
            body: {
              text: 'What would you like to order? Select a product:',
            },
            action: {
              button: 'Browse Products',
              sections,
            },
          },
        };
      }
    } catch (error) {
      this.logger.error(
        `Failed to show product catalog: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        to: phoneNumber,
        type: 'text',
        preview_url: false,
        message:
          'Sorry, we encountered an error loading products. Please try again later.',
      };
    }
  }

  async showCart(phoneNumber: string, userId: string): Promise<SendMessageDto> {
    try {
      const cart = await this.cartService.getCart(userId);

      if (cart.items.length === 0) {
        return {
          to: phoneNumber,
          type: 'interactive',
          preview_url: false,
          interactive: {
            type: 'BUTTON',
            body: {
              text: 'Your cart is empty. Would you like to browse products?',
            },
            action: {
              buttons: [
                {
                  type: 'reply',
                  reply: {
                    id: 'browse_products',
                    title: 'Browse Products',
                  },
                },
                {
                  type: 'reply',
                  reply: {
                    id: 'back_to_menu',
                    title: 'Back to Menu',
                  },
                },
              ],
            },
          },
        };
      }

      let message = '🛒 *Your Cart*\n\n';
      for (const item of cart.items) {
        const price = parseFloat(item.product.price);
        const subtotal = price * item.quantity;
        message += `${item.product.name}\n`;
        message += `Qty: ${item.quantity} × ₦${price.toFixed(2)} = ₦${subtotal.toFixed(2)}\n\n`;
      }
      message += `*Total: ₦${cart.totalAmount.toFixed(2)}*\n`;
      message += `Items: ${cart.itemCount}`;

      return {
        to: phoneNumber,
        type: 'interactive',
        preview_url: false,
        interactive: {
          type: 'BUTTON',
          body: {
            text: message,
          },
          action: {
            buttons: [
              {
                type: 'reply',
                reply: {
                  id: 'place_order',
                  title: 'Place Order',
                },
              },
              {
                type: 'reply',
                reply: {
                  id: 'edit_cart',
                  title: 'Edit Cart',
                },
              },
              {
                type: 'reply',
                reply: {
                  id: 'browse_products',
                  title: 'Add More Items',
                },
              },
            ],
          },
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to show cart: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        to: phoneNumber,
        type: 'text',
        preview_url: false,
        message:
          'Sorry, we encountered an error loading your cart. Please try again later.',
      };
    }
  }

  async handleAddToCart(
    phoneNumber: string,
    userId: string,
    productId: string,
    quantity = 1,
  ): Promise<SendMessageDto> {
    try {
      await this.cartService.addItem(userId, { productId, quantity });

      const product = await this.productsService.findById(productId);
      const productName = product?.name || 'Product';

      return {
        to: phoneNumber,
        type: 'interactive',
        preview_url: false,
        interactive: {
          type: 'BUTTON',
          body: {
            text: `✅ ${quantity}x ${productName} added to cart!\n\nWhat would you like to do next?`,
          },
          action: {
            buttons: [
              {
                type: 'reply',
                reply: {
                  id: 'view_cart',
                  title: 'View Cart',
                },
              },
              {
                type: 'reply',
                reply: {
                  id: 'browse_products',
                  title: 'Continue Shopping',
                },
              },
            ],
          },
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to add item to cart: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        to: phoneNumber,
        type: 'text',
        preview_url: false,
        message: `Sorry, we couldn't add the item to your cart. ${error instanceof Error ? error.message : 'Please try again.'}`,
      };
    }
  }
}
