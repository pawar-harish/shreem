import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '../../../services/firebase.service';
import { Order } from '../../../models/order.model';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-orders.html',
  styleUrls: ['./admin-orders.scss']
})
export class AdminOrdersComponent implements OnInit {
  public firebaseService = inject(FirebaseService);

  public rawOrders = signal<Order[]>([]);
  public selectedStatus = signal<string>('all');
  public searchQuery = signal<string>('');
  public selectedOrder = signal<Order | null>(null);

  // Computed metrics
  public totalOrders = computed(() => this.rawOrders().length);
  public pendingCount = computed(() => this.rawOrders().filter(o => o.status === 'Pending').length);
  public processingCount = computed(() => this.rawOrders().filter(o => o.status === 'Processing').length);
  public deliveredCount = computed(() => this.rawOrders().filter(o => o.status === 'Delivered').length);
  public totalRevenue = computed(() => this.rawOrders().reduce((sum, o) => sum + o.totalAmount, 0));

  public filteredOrders = computed(() => {
    const list = this.rawOrders();
    const st = this.selectedStatus().toLowerCase();
    const q = this.searchQuery().toLowerCase().trim();

    return list.filter(o => {
      const matchStatus = st === 'all' || o.status.toLowerCase() === st;
      const matchSearch = !q ||
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.city.toLowerCase().includes(q) ||
        o.phone.toLowerCase().includes(q);

      return matchStatus && matchSearch;
    });
  });

  ngOnInit(): void {
    this.firebaseService.orders$.subscribe(orders => {
      this.rawOrders.set(orders);
    });
  }

  public setStatus(st: string): void {
    this.selectedStatus.set(st);
  }

  public openOrderDetails(order: Order): void {
    this.selectedOrder.set(order);
  }

  public closeOrderDetails(): void {
    this.selectedOrder.set(null);
  }

  public async updateStatus(orderId: string, event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const newStatus = select.value as Order['status'];
    try {
      await this.firebaseService.updateOrderStatus(orderId, newStatus);
    } catch (e: any) {
      alert('Error updating status in Firestore: ' + (e?.message || ''));
    }
  }
}

