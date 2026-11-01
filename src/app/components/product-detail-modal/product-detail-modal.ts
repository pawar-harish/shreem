import { Component, input, output, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Product } from '../../models/product.model';
import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service';

@Component({
  selector: 'app-product-detail-modal',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './product-detail-modal.html',
  styleUrls: ['./product-detail-modal.scss']
})
export class ProductDetailModalComponent implements OnInit {
  public product = input.required<Product>();
  public close = output<void>();

  public cartService = inject(CartService);
  public wishlistService = inject(WishlistService);

  public selectedSize = signal<string>('');
  public selectedColor = signal<string>('');
  public selectedImage = signal<string>('');
  public quantity = signal<number>(1);
  public addedFeedback = signal<boolean>(false);

  ngOnInit(): void {
    const p = this.product();
    if (p.sizes && p.sizes.length > 0) {
      this.selectedSize.set(p.sizes[0]);
    }
    if (p.colors && p.colors.length > 0) {
      this.selectedColor.set(p.colors[0]);
    }
    this.selectedImage.set(p.imageUrl);
  }

  public setSize(s: string): void {
    this.selectedSize.set(s);
  }

  public setColor(c: string): void {
    this.selectedColor.set(c);
  }

  public updateQty(delta: number): void {
    const next = this.quantity() + delta;
    if (next >= 1 && next <= (this.product().stock || 99)) {
      this.quantity.set(next);
    }
  }

  public addToCart(): void {
    this.cartService.addToCart(
      this.product(),
      this.selectedSize(),
      this.selectedColor(),
      this.quantity()
    );
    this.addedFeedback.set(true);
    setTimeout(() => this.addedFeedback.set(false), 2000);
  }

  public toggleWishlist(): void {
    this.wishlistService.toggleWishlist(this.product());
  }

  public isWishlisted(): boolean {
    return this.wishlistService.isInWishlist(this.product().id);
  }

  public dismiss(): void {
    this.close.emit();
  }
}
