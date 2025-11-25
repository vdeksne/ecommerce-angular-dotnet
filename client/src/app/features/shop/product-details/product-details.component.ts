import { Component, inject, OnInit } from '@angular/core';
import { ShopService } from '../../../core/services/shop.service';
import { ActivatedRoute } from '@angular/router';
import { Product } from '../../../shared/models/product';
import { CurrencyPipe } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { CartService } from '../../../core/services/cart.service';
import { FormsModule } from '@angular/forms';
import { getImageUrl } from '../../../shared/utils/image-url.util';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CurrencyPipe, MatButton, FormsModule],
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.scss',
})
export class ProductDetailsComponent implements OnInit {
  private shopService = inject(ShopService);
  private activatedRoute = inject(ActivatedRoute);
  private cartService = inject(CartService);
  product?: Product;
  quantityInCart = 0;
  quantity = 1;

  ngOnInit(): void {
    this.loadProduct();
  }

  loadProduct() {
    const id = this.activatedRoute.snapshot.paramMap.get('id');
    if (!id) return;
    this.shopService.getProduct(+id).subscribe({
      next: (product) => {
        this.product = product;
        this.updateQuantityInCart();
      },
      error: (error) => console.log(error),
    });
  }

  updateCart() {
    if (!this.product) return;
    if (this.quantity > this.quantityInCart) {
      const itemsToAdd = this.quantity - this.quantityInCart;
      this.quantityInCart += itemsToAdd;
      this.cartService.addItemToCart(this.product, itemsToAdd);
    } else {
      const itemsToRemove = this.quantityInCart - this.quantity;
      this.quantityInCart -= itemsToRemove;
      this.cartService.removeItemFromCart(this.product.id, itemsToRemove);
    }
  }

  updateQuantityInCart() {
    this.quantityInCart =
      this.cartService
        .cart()
        ?.items.find((x) => x.productId === this.product?.id)?.quantity || 0;
    this.quantity = this.quantityInCart || 1;
  }

  getButtonText() {
    return this.quantityInCart > 0 ? 'Update cart' : 'Add to cart';
  }

  inquireToAcquire() {
    if (!this.product) return;

    // Check if we can add to cart
    if (!this.cartService.canAddToCart(this.product)) {
      return; // Cannot add more items
    }

    this.cartService.addItemToCart(this.product).catch((error) => {
      console.error('Error adding to cart:', error);
      // Optionally show a user-friendly message
    });
    this.updateQuantityInCart();
  }

  canAddToCart(): boolean {
    if (!this.product) return false;
    return this.cartService.canAddToCart(this.product);
  }

  getProductSize(): string {
    if (!this.product?.description) return '';

    // Try to find size in cm format first
    const sizeMatchCm = this.product.description.match(
      /Size:\s*(\d+(?:\.\d+)?)\s*cm\s*x\s*(\d+(?:\.\d+)?)\s*cm/i
    );
    if (sizeMatchCm) {
      return `${sizeMatchCm[1]} cm x ${sizeMatchCm[2]} cm`;
    }

    // Try to find size in cm format without "Size:" prefix
    const sizeMatchCm2 = this.product.description.match(
      /(\d+(?:\.\d+)?)\s*cm\s*x\s*(\d+(?:\.\d+)?)\s*cm/i
    );
    if (sizeMatchCm2) {
      return `${sizeMatchCm2[1]} cm x ${sizeMatchCm2[2]} cm`;
    }

    // Try to find size in inches format (for backward compatibility)
    const sizeMatchInches = this.product.description.match(
      /Size:\s*(\d+(?:\.\d+)?)"\s*x\s*(\d+(?:\.\d+)?)"/i
    );
    if (sizeMatchInches) {
      // Convert to cm
      const widthCm = (parseFloat(sizeMatchInches[1]) * 2.54).toFixed(1);
      const heightCm = (parseFloat(sizeMatchInches[2]) * 2.54).toFixed(1);
      return `${widthCm} cm x ${heightCm} cm`;
    }

    // Try to find size in inches format without "Size:" prefix
    const sizeMatchInches2 = this.product.description.match(
      /(\d+(?:\.\d+)?)"\s*x\s*(\d+(?:\.\d+)?)"/i
    );
    if (sizeMatchInches2) {
      // Convert to cm
      const widthCm = (parseFloat(sizeMatchInches2[1]) * 2.54).toFixed(1);
      const heightCm = (parseFloat(sizeMatchInches2[2]) * 2.54).toFixed(1);
      return `${widthCm} cm x ${heightCm} cm`;
    }

    return '';
  }

  getSubtitle(): string {
    if (!this.product) return '';
    const size = this.getProductSize();
    const parts = [this.product.brand, this.product.type];
    if (size) {
      parts.push(size);
    }
    return `${parts.join(', ')}*`;
  }

  getFormattedDescription(): string[] {
    if (!this.product?.description) return [];

    // Remove size information from description (it's shown separately in subtitle)
    let description = this.product.description
      .replace(/Size:\s*\d+(?:\.\d+)?\s*cm\s*x\s*\d+(?:\.\d+)?\s*cm/gi, '')
      .replace(/Size:\s*\d+(?:\.\d+)?"\s*x\s*\d+(?:\.\d+)?"/gi, '')
      .replace(/\d+(?:\.\d+)?\s*cm\s*x\s*\d+(?:\.\d+)?\s*cm/gi, '')
      .replace(/\d+(?:\.\d+)?"\s*x\s*\d+(?:\.\d+)?"/gi, '')
      .trim();

    // Split by double newlines to preserve paragraph structure
    const paragraphs = description
      .split(/\n\n+/)
      .filter((p) => p.trim().length > 0);

    return paragraphs;
  }

  getDescriptionWithSize(): string {
    const size = this.getProductSize();
    if (size) {
      return `this piece measures ${size}, referring to the overall framed work.`;
    }
    return `this piece measures XX x XX cm, referring to the overall framed work.`;
  }

  getImageUrl = getImageUrl;
}
