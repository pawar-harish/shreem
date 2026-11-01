import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service';
import { FirebaseService } from '../../services/firebase.service';
import { Category } from '../../models/category.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  public cartService = inject(CartService);
  public wishlistService = inject(WishlistService);
  public firebaseService = inject(FirebaseService);
  private router = inject(Router);

  private subs = new Subscription();

  public searchQuery = signal<string>('');
  public isMobileMenuOpen = signal<boolean>(false);
  public categories = signal<Category[]>([]);

  ngOnInit(): void {
    this.subs.add(
      this.firebaseService.categories$.subscribe(cats => {
        this.categories.set(cats);
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  public onSearch(): void {
    const q = this.searchQuery().trim();
    if (q) {
      this.router.navigate(['/'], { queryParams: { q } });
    } else {
      this.router.navigate(['/']);
    }
  }

  public selectCategory(identifier: string): void {
    this.isMobileMenuOpen.set(false);
    if (!identifier || identifier === 'all') {
      this.router.navigate(['/']);
    } else {
      this.router.navigate(['/'], { queryParams: { category: identifier } });
    }
  }

  public toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(v => !v);
  }
}
