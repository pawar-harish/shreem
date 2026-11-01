import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cart-drawer.html',
  styleUrls: ['./cart-drawer.scss']
})
export class CartDrawerComponent {
  public cartService = inject(CartService);

  public checkoutTriggered = output<void>();

  public promoInput = signal<string>('');
  public promoFeedback = signal<{ success: boolean; message: string } | null>(null);

  public applyPromo(): void {
    const val = this.promoInput().trim();
    if (!val) return;
    const res = this.cartService.applyPromoCode(val);
    this.promoFeedback.set(res);
    if (res.success) {
      this.promoInput.set('');
    }
  }

  public removePromo(): void {
    this.cartService.removePromoCode();
    this.promoFeedback.set(null);
  }

  public proceedToCheckout(): void {
    this.cartService.closeCart();
    this.checkoutTriggered.emit();
  }
}

