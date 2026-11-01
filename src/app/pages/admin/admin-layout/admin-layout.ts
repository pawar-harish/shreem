import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FirebaseService } from '../../../services/firebase.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-layout.html',
  styleUrls: ['./admin-layout.scss']
})
export class AdminLayoutComponent {
  public firebaseService = inject(FirebaseService);
  private router = inject(Router);

  public navItems = [
    { label: 'Products Management', icon: 'checkroom', route: '/admin/products' },
    { label: 'Categories', icon: 'category', route: '/admin/categories' },
    { label: 'Orders & Fulfillment', icon: 'receipt_long', route: '/admin/orders' },
    // { label: 'Firebase & Firestore', icon: 'database', route: '/admin/settings' },
  ];

  public navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}

