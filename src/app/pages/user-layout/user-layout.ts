import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar';
import { FooterComponent } from '../../components/footer/footer';
import { CartDrawerComponent } from '../../components/cart-drawer/cart-drawer';
import { WishlistDrawerComponent } from '../../components/wishlist-drawer/wishlist-drawer';
import { CheckoutModalComponent } from '../../components/checkout-modal/checkout-modal';

@Component({
  selector: 'app-user-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    NavbarComponent,
    FooterComponent,
    CartDrawerComponent,
    WishlistDrawerComponent,
    CheckoutModalComponent
  ],
  template: `
    <div class="user-layout-container">
      <app-navbar></app-navbar>
      
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>

      <app-cart-drawer (checkoutTriggered)="openCheckout()"></app-cart-drawer>
      <app-wishlist-drawer></app-wishlist-drawer>

      @if (isCheckoutModalOpen()) {
        <app-checkout-modal (close)="closeCheckout()"></app-checkout-modal>
      }

      <app-footer></app-footer>
    </div>
  `,
  styles: [`
    .user-layout-container {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background-color: var(--light-bg);
    }
    .main-content {
      flex: 1;
    }
  `]
})
export class UserLayoutComponent {
  public isCheckoutModalOpen = signal<boolean>(false);

  public openCheckout(): void {
    this.isCheckoutModalOpen.set(true);
  }

  public closeCheckout(): void {
    this.isCheckoutModalOpen.set(false);
  }
}

