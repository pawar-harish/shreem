import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FirebaseService } from '../../services/firebase.service';
import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service';
import { Product } from '../../models/product.model';
import { Category } from '../../models/category.model';
import { ProductDetailModalComponent } from '../../components/product-detail-modal/product-detail-modal';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ProductDetailModalComponent],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  public firebaseService = inject(FirebaseService);
  public cartService = inject(CartService);
  public wishlistService = inject(WishlistService);
  private route = inject(ActivatedRoute);

  private subs = new Subscription();

  // Real-time Firestore Signals
  public rawProducts = signal<Product[]>([]);
  public dynamicCategories = signal<Category[]>([]);
  public isLoading = signal<boolean>(true);
  public errorMessage = signal<string | null>(null);

  // Filters State
  public selectedCategory = signal<string>('all');
  public searchQuery = signal<string>('');
  public selectedSort = signal<'featured' | 'price-asc' | 'price-desc' | 'rating'>('featured');
  public selectedSizeFilter = signal<string>('all');

  // Modal State
  public activeProductForModal = signal<Product | null>(null);

  // Available Sizes for quick filter
  public availableSizes = ['all', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];

  // Filtered Products Computed
  public filteredProducts = computed(() => {
    const prods = this.rawProducts();
    const cat = this.selectedCategory().toLowerCase().trim();
    const q = this.searchQuery().toLowerCase().trim();
    const sort = this.selectedSort();
    const size = this.selectedSizeFilter();

    let list = prods.filter(p => {
      // Category filter (match category name or slug)
      const matchesCat = cat === 'all' || 
        p.category.toLowerCase() === cat || 
        p.category.toLowerCase().includes(cat);

      // Search query
      const matchesSearch = !q || 
        p.name.toLowerCase().includes(q) || 
        p.subcategory.toLowerCase().includes(q) || 
        (p.fabric && p.fabric.toLowerCase().includes(q)) ||
        p.description.toLowerCase().includes(q);

      // Size filter
      const matchesSize = size === 'all' || (p.sizes && p.sizes.some(s => s.toLowerCase() === size.toLowerCase()));

      return matchesCat && matchesSearch && matchesSize;
    });

    // Sorting
    if (sort === 'price-asc') {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (sort === 'price-desc') {
      list = [...list].sort((a, b) => b.price - a.price);
    } else if (sort === 'rating') {
      list = [...list].sort((a, b) => b.rating - a.rating);
    } else {
      // featured
      list = [...list].sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
    }

    return list;
  });

  ngOnInit(): void {
    // 1. Listen to real-time products
    this.subs.add(
      this.firebaseService.products$.subscribe(prods => {
        this.rawProducts.set(prods);
      })
    );

    // 2. Listen to real-time categories
    this.subs.add(
      this.firebaseService.categories$.subscribe(cats => {
        this.dynamicCategories.set(cats);
      })
    );

    // 3. Loading state
    this.subs.add(
      this.firebaseService.isLoadingProducts$.subscribe(loading => {
        this.isLoading.set(loading);
      })
    );

    // 4. Error state
    this.subs.add(
      this.firebaseService.errorMessage$.subscribe(err => {
        this.errorMessage.set(err);
      })
    );

    // 5. Query parameters
    this.subs.add(
      this.route.queryParams.subscribe(params => {
        if (params['category']) {
          this.selectedCategory.set(params['category']);
        } else {
          this.selectedCategory.set('all');
        }
        if (params['q']) {
          this.searchQuery.set(params['q']);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  public setCategory(cat: string): void {
    this.selectedCategory.set(cat);
  }

  public setSort(sort: 'featured' | 'price-asc' | 'price-desc' | 'rating'): void {
    this.selectedSort.set(sort);
  }

  public setSize(size: string): void {
    this.selectedSizeFilter.set(size);
  }

  public openProductModal(product: Product): void {
    this.activeProductForModal.set(product);
  }

  public closeProductModal(): void {
    this.activeProductForModal.set(null);
  }

  public quickAddToCart(product: Product, event: Event): void {
    event.stopPropagation();
    this.cartService.addToCart(product);
  }

  public toggleWishlist(product: Product, event: Event): void {
    event.stopPropagation();
    this.wishlistService.toggleWishlist(product);
  }

  public isWishlisted(id: string): boolean {
    return this.wishlistService.isInWishlist(id);
  }
}
