import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Cart, CartItem, Coupon } from '../../shared/models/cart';
import { Product } from '../../shared/models/product';
import { firstValueFrom, map, tap } from 'rxjs';
import { DeliveryMethod } from '../../shared/models/deliveryMethod';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  baseUrl = environment.apiUrl;
  private http = inject(HttpClient);
  cart = signal<Cart | null>(null);
  itemCount = computed(() => {
    return this.cart()?.items.reduce((sum, item) => sum + item.quantity, 0)
  });
  selectedDelivery = signal<DeliveryMethod | null>(null);
  totals = computed(() => {
    const cart = this.cart();
    const delivery = this.selectedDelivery();

    if (!cart) return null;
    const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    let discountValue = 0;

    if (cart.coupon) {
      if (cart.coupon.amountOff) {
        discountValue = cart.coupon.amountOff;
      } else if (cart.coupon.percentOff) {
        discountValue = subtotal * (cart.coupon.percentOff / 100);
      }
    }
    
    const shipping = delivery ? delivery.price : 0;

    return {
      subtotal,
      shipping,
      discount: discountValue,
      total: subtotal + shipping - discountValue
    }
  })

  getCart(id: string) {
    return this.http.get<Cart>(this.baseUrl + 'cart?id=' + id).pipe(
      map(cart => {
        // Ensure quantityInStock is set for all items (in case of old cart data)
        if (cart?.items) {
          cart.items.forEach(item => {
            // If quantityInStock is missing or 0, set a default to prevent adding more
            if (!item.quantityInStock || item.quantityInStock <= 0) {
              // If quantity is already 1, assume only 1 is available
              item.quantityInStock = item.quantity || 1;
            }
          });
        }
        this.cart.set(cart);
        return cart;
      })
    )
  }

  setCart(cart: Cart) {
    return this.http.post<Cart>(this.baseUrl + 'cart', cart).pipe(
      tap(cart => {
        this.cart.set(cart)
      })
    )
  }

  applyDiscount(code: string) {
    return this.http.get<Coupon>(this.baseUrl + 'coupons/' + code);
  }

  async addItemToCart(item: CartItem | Product, quantity = 1) {
    const cart = this.cart() ?? this.createCart();
    if (this.isProduct(item)) {
      item = this.mapProductToCartItem(item);
    }
    
    // Check stock availability
    const existingItem = cart.items.find(x => x.productId === item.productId);
    const currentQuantity = existingItem?.quantity || 0;
    const requestedQuantity = currentQuantity + quantity;
    
    if (requestedQuantity > item.quantityInStock) {
      throw new Error(`Only ${item.quantityInStock} item(s) available in stock. Cannot add more.`);
    }
    
    cart.items = this.addOrUpdateItem(cart.items, item, quantity);
    await firstValueFrom(this.setCart(cart));
  }

async removeItemFromCart(productId: number, quantity = 1) {
    const cart = this.cart();
    if (!cart) return;
    const index = cart.items.findIndex(x => x.productId === productId);
    if (index !== -1) {
      if (cart.items[index].quantity > quantity) {
        cart.items[index].quantity -= quantity;
      } else {
        cart.items.splice(index, 1);
      }
      if (cart.items.length === 0) {
        this.deleteCart();
      } else {
        await firstValueFrom(this.setCart(cart));
      }
    }
  }

  deleteCart() {
    this.http.delete(this.baseUrl  + 'cart?id=' + this.cart()?.id).subscribe({
      next: () => {
        localStorage.removeItem('cart_id');
        this.cart.set(null);
      }
    })
  }

  private addOrUpdateItem(items: CartItem[], item: CartItem, quantity: number): CartItem[] {
    const index = items.findIndex(x => x.productId === item.productId);
    if (index === -1) {
      item.quantity = quantity;
      items.push(item);
    } else {
      const newQuantity = items[index].quantity + quantity;
      // Preserve quantityInStock from existing item if it exists, otherwise use from new item
      const stockLimit = items[index].quantityInStock || item.quantityInStock;
      // Double-check stock limit (should already be checked in addItemToCart, but safety check)
      if (newQuantity > stockLimit) {
        items[index].quantity = stockLimit;
      } else {
        items[index].quantity = newQuantity;
      }
      // Ensure quantityInStock is preserved/updated
      if (item.quantityInStock) {
        items[index].quantityInStock = item.quantityInStock;
      }
    }
    return items;
  }
  
  canAddToCart(product: Product, quantityToAdd: number = 1): boolean {
    const cart = this.cart();
    const existingItem = cart?.items.find(x => x.productId === product.id);
    const currentQuantity = existingItem?.quantity || 0;
    const requestedQuantity = currentQuantity + quantityToAdd;
    return requestedQuantity <= product.quantityInStock;
  }

  private mapProductToCartItem(item: Product): CartItem {
    return {
      productId: item.id,
      productName: item.name,
      price: item.price,
      quantity: 0,
      pictureUrl: item.pictureUrl,
      brand: item.brand,
      type: item.type,
      quantityInStock: item.quantityInStock
    }
  }

  private isProduct(item: CartItem | Product): item is Product {
    return (item as Product).id !== undefined;
  }

  private createCart(): Cart {
    const cart = new Cart();
    localStorage.setItem('cart_id', cart.id);
    return cart;
  }

}
