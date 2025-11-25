import { Component, inject, input, OnInit } from '@angular/core';
import { CartItem } from '../../../shared/models/cart';
import { RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { CurrencyPipe } from '@angular/common';
import { CartService } from '../../../core/services/cart.service';
import { getImageUrl } from '../../../shared/utils/image-url.util';
import { ShopService } from '../../../core/services/shop.service';
import { Product } from '../../../shared/models/product';

@Component({
  selector: 'app-cart-item',
  standalone: true,
  imports: [
    RouterLink,
    MatIcon,
    CurrencyPipe
  ],
  templateUrl: './cart-item.component.html',
  styleUrl: './cart-item.component.scss'
})
export class CartItemComponent implements OnInit {
  item = input.required<CartItem>();
  cartService = inject(CartService);
  private shopService = inject(ShopService);
  getImageUrl = getImageUrl;
  product: Product | null = null;

  ngOnInit() {
    // Load product details to get size information
    // If product doesn't exist, we'll still show the cart item with available info
    this.shopService.getProduct(this.item().productId).subscribe({
      next: (product) => {
        this.product = product;
      },
      error: (err) => {
        // Product might not exist anymore - that's okay, we'll show cart item without size
        console.warn('Product not found, showing cart item without size info:', err);
        this.product = null;
      }
    });
  }

  getProductSize(): string {
    if (!this.product?.description) return '';
    
    // Try to find size in cm format first
    const sizeMatchCm = this.product.description.match(
      /Size:\s*(\d+(?:\.\d+)?)\s*cm\s*x\s*(\d+(?:\.\d+)?)\s*cm/i
    );
    if (sizeMatchCm) {
      return `${sizeMatchCm[1]}cm x ${sizeMatchCm[2]}cm`;
    }
    
    // Try to find size in cm format without "Size:" prefix
    const sizeMatchCm2 = this.product.description.match(
      /(\d+(?:\.\d+)?)\s*cm\s*x\s*(\d+(?:\.\d+)?)\s*cm/i
    );
    if (sizeMatchCm2) {
      return `${sizeMatchCm2[1]}cm x ${sizeMatchCm2[2]}cm`;
    }
    
    return '';
  }

  canIncrement(): boolean {
    const item = this.item();
    // If quantityInStock is not set or is 0, don't allow increment
    if (!item.quantityInStock || item.quantityInStock <= 0) {
      return false;
    }
    // If current quantity is already at or above stock limit, can't increment
    return item.quantity < item.quantityInStock;
  }

  incrementQuantity() {
    // Check if we can add more
    if (!this.canIncrement()) {
      return; // Cannot add more
    }
    
    this.cartService.addItemToCart(this.item()).catch(error => {
      console.error('Error adding to cart:', error);
    });
  }

  decrementQuantity() {
    this.cartService.removeItemFromCart(this.item().productId);
  }

  removeItemFromCart() {
    this.cartService.removeItemFromCart(this.item().productId, this.item().quantity);
  }
}
