import { Injectable, inject, PLATFORM_ID, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  public wishlistItems = signal<Product[]>([]);
  public isWishlistOpen = signal<boolean>(false);

  public count = computed(() => this.wishlistItems().length);

  constructor() {
    if (this.isBrowser) {
      const stored = localStorage.getItem('shreem_wishlist');
      if (stored) {
        try {
          this.wishlistItems.set(JSON.parse(stored));
        } catch {
          // ignore
        }
      }
    }
  }

  private persist(): void {
    if (this.isBrowser) {
      localStorage.setItem('shreem_wishlist', JSON.stringify(this.wishlistItems()));
    }
  }

  public isInWishlist(productId: string): boolean {
    return this.wishlistItems().some(p => p.id === productId);
  }

  public toggleWishlist(product: Product): boolean {
    const exists = this.isInWishlist(product.id);
    if (exists) {
      this.wishlistItems.set(this.wishlistItems().filter(p => p.id !== product.id));
      this.persist();
      return false;
    } else {
      this.wishlistItems.set([product, ...this.wishlistItems()]);
      this.persist();
      return true;
    }
  }

  public removeFromWishlist(productId: string): void {
    this.wishlistItems.set(this.wishlistItems().filter(p => p.id !== productId));
    this.persist();
  }

  public openWishlist(): void {
    this.isWishlistOpen.set(true);
  }

  public closeWishlist(): void {
    this.isWishlistOpen.set(false);
  }

  public toggleWishlistDrawer(): void {
    this.isWishlistOpen.update(v => !v);
  }
}

