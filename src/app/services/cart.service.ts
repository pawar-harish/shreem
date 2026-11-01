import { Injectable, inject, PLATFORM_ID, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CartItem } from '../models/cart.model';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // Reactive state using Angular Signals
  public cartItems = signal<CartItem[]>([]);
  public isCartOpen = signal<boolean>(false);
  public appliedPromo = signal<string | null>(null);
  public promoDiscountPercent = signal<number>(0);

  // Computed values
  public itemCount = computed(() => {
    return this.cartItems().reduce((sum, item) => sum + item.quantity, 0);
  });

  public subtotal = computed(() => {
    return this.cartItems().reduce((sum, item) => sum + item.price * item.quantity, 0);
  });

  public shipping = computed(() => {
    const sub = this.subtotal();
    if (sub === 0) return 0;
    return sub >= 2999 ? 0 : 250;
  });

  public discountAmount = computed(() => {
    const pct = this.promoDiscountPercent();
    if (pct <= 0) return 0;
    return Math.round((this.subtotal() * pct) / 100);
  });

  public grandTotal = computed(() => {
    return Math.max(0, this.subtotal() - this.discountAmount() + this.shipping());
  });

  constructor() {
    if (this.isBrowser) {
      const stored = localStorage.getItem('shreem_cart');
      if (stored) {
        try {
          this.cartItems.set(JSON.parse(stored));
        } catch {
          // ignore
        }
      }
    }
  }

  private persist(): void {
    if (this.isBrowser) {
      localStorage.setItem('shreem_cart', JSON.stringify(this.cartItems()));
    }
  }

  public openCart(): void {
    this.isCartOpen.set(true);
  }

  public closeCart(): void {
    this.isCartOpen.set(false);
  }

  public toggleCart(): void {
    this.isCartOpen.update(v => !v);
  }

  public addToCart(product: Product, size?: string, color?: string, quantity: number = 1): void {
    const chosenSize = size || (product.sizes?.length ? product.sizes[0] : 'Standard');
    const chosenColor = color || (product.colors?.length ? product.colors[0] : 'Standard');

    const current = this.cartItems();
    const existingIndex = current.findIndex(
      item => item.productId === product.id && item.size === chosenSize && item.color === chosenColor
    );

    if (existingIndex > -1) {
      const updated = [...current];
      updated[existingIndex].quantity += quantity;
      this.cartItems.set(updated);
    } else {
      const newItem: CartItem = {
        productId: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        size: chosenSize,
        color: chosenColor,
        quantity,
        category: product.category
      };
      this.cartItems.set([...current, newItem]);
    }

    this.persist();
    this.openCart();
  }

  public updateQuantity(productId: string, size: string, delta: number): void {
    const current = this.cartItems();
    const updated = current
      .map(item => {
        if (item.productId === productId && item.size === size) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      })
      .filter((item): item is CartItem => item !== null);

    this.cartItems.set(updated);
    this.persist();
  }

  public removeItem(productId: string, size: string): void {
    const current = this.cartItems();
    const updated = current.filter(item => !(item.productId === productId && item.size === size));
    this.cartItems.set(updated);
    this.persist();
  }

  public applyPromoCode(code: string): { success: boolean; message: string } {
    const normalized = code.trim().toUpperCase();
    if (normalized === 'SHREEM10' || normalized === 'FESTIVE10') {
      this.appliedPromo.set(normalized);
      this.promoDiscountPercent.set(10);
      return { success: true, message: 'Coupon applied! 10% luxury discount unlocked.' };
    } else if (normalized === 'ROYAL20') {
      this.appliedPromo.set(normalized);
      this.promoDiscountPercent.set(20);
      return { success: true, message: 'VIP Code applied! 20% royal discount unlocked.' };
    }
    return { success: false, message: 'Invalid coupon code. Try SHREEM10.' };
  }

  public removePromoCode(): void {
    this.appliedPromo.set(null);
    this.promoDiscountPercent.set(0);
  }

  public clearCart(): void {
    this.cartItems.set([]);
    this.appliedPromo.set(null);
    this.promoDiscountPercent.set(0);
    this.persist();
  }
}

