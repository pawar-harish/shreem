import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './product-detail.html',
  styleUrls: ['./product-detail.scss']
})
export class ProductDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private firebaseService = inject(FirebaseService);
  public cartService = inject(CartService);
  public wishlistService = inject(WishlistService);

  public product = signal<Product | null>(null);
  public isLoading = signal<boolean>(true);
  public selectedImage = signal<string>('');
  public selectedSize = signal<string>('');
  public selectedColor = signal<string>('');
  public quantity = signal<number>(1);
  public addedFeedback = signal<boolean>(false);

  async ngOnInit(): Promise<void> {
    this.route.paramMap.subscribe(async params => {
      const id = params.get('id');
      if (id) {
        this.isLoading.set(true);
        const p = await this.firebaseService.getProductById(id);
        if (p) {
          this.product.set(p);
          this.selectedImage.set(p.imageUrl);
          if (p.sizes && p.sizes.length > 0) {
            this.selectedSize.set(p.sizes[0]);
          }
          if (p.colors && p.colors.length > 0) {
            this.selectedColor.set(p.colors[0]);
          }
        } else {
          this.product.set(null);
        }
        this.isLoading.set(false);
      }
    });
  }

  public setSize(s: string): void {
    this.selectedSize.set(s);
  }

  public setColor(c: string): void {
    this.selectedColor.set(c);
  }

  public updateQty(delta: number): void {
    const next = this.quantity() + delta;
    const maxStock = this.product()?.stock || 99;
    if (next >= 1 && next <= maxStock) {
      this.quantity.set(next);
    }
  }

  public addToBag(): void {
    const p = this.product();
    if (!p) return;
    this.cartService.addToCart(p, this.selectedSize(), this.selectedColor(), this.quantity());
    this.addedFeedback.set(true);
    setTimeout(() => this.addedFeedback.set(false), 2500);
  }

  public toggleWishlist(): void {
    const p = this.product();
    if (!p) return;
    this.wishlistService.toggleWishlist(p);
  }

  public isWishlisted(): boolean {
    const p = this.product();
    return p ? this.wishlistService.isInWishlist(p.id) : false;
  }
}

