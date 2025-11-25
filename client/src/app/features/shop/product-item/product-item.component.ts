import { Component, inject, Input } from '@angular/core';
import { Product } from '../../../shared/models/product';
import { RouterLink } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { getImageUrl } from '../../../shared/utils/image-url.util';

@Component({
  selector: 'app-product-item',
  standalone: true,
  imports: [
    RouterLink
  ],
  templateUrl: './product-item.component.html',
  styleUrl: './product-item.component.scss'
})
export class ProductItemComponent {
  @Input() product?: Product;
  cartService = inject(CartService);
  
  getImageUrl = getImageUrl;
}
