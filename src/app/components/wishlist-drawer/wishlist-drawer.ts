import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WishlistService } from '../../services/wishlist.service';
import { CartService } from '../../services/cart.service';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-wishlist-drawer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './wishlist-drawer.html',
  styleUrls: ['./wishlist-drawer.scss']
})
export class WishlistDrawerComponent {
  public wishlistService = inject(WishlistService);
  public cartService = inject(CartService);

  public moveToCart(product: Product): void {
    this.cartService.addToCart(product);
    this.wishlistService.removeFromWishlist(product.id);
  }
}

