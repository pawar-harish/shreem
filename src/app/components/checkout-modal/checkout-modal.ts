import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart.service';
import { FirebaseService } from '../../services/firebase.service';
import { Order } from '../../models/order.model';

@Component({
  selector: 'app-checkout-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './checkout-modal.html',
  styleUrls: ['./checkout-modal.scss']
})
export class CheckoutModalComponent {
  public cartService = inject(CartService);
  public firebaseService = inject(FirebaseService);

  public close = output<void>();

  // Form Model
  public customerName = signal<string>('Priya Sharma');
  public email = signal<string>('priya.sharma@example.com');
  public phone = signal<string>('+91 98765 43210');
  public address = signal<string>('42, Heritage Enclave, Civil Lines');
  public city = signal<string>('Jaipur');
  public postalCode = signal<string>('302006');
  public paymentMethod = signal<'Cash on Delivery' | 'Credit/Debit Card' | 'UPI'>('UPI');

  public isSubmitting = signal<boolean>(false);
  public orderSuccess = signal<Order | null>(null);

  public async placeOrder(): Promise<void> {
    if (!this.customerName() || !this.email() || !this.phone() || !this.address()) {
      alert('Please fill in all mandatory delivery details.');
      return;
    }

    this.isSubmitting.set(true);

    try {
      const order = await this.firebaseService.createOrder({
        customerName: this.customerName(),
        email: this.email(),
        phone: this.phone(),
        address: this.address(),
        city: this.city(),
        postalCode: this.postalCode(),
        items: this.cartService.cartItems().map(item => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
          imageUrl: item.imageUrl
        })),
        subtotal: this.cartService.subtotal(),
        shipping: this.cartService.shipping(),
        discount: this.cartService.discountAmount(),
        totalAmount: this.cartService.grandTotal(),
        status: 'Pending',
        paymentMethod: this.paymentMethod()
      });

      this.orderSuccess.set(order);
      this.cartService.clearCart();
    } catch (e: any) {
      alert('Error placing order: ' + (e?.message || 'Please try again.'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  public dismiss(): void {
    this.close.emit();
  }
}

