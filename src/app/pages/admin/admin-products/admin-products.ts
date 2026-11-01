import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FirebaseService } from '../../../services/firebase.service';
import { Product } from '../../../models/product.model';
import { Category } from '../../../models/category.model';

interface ProductFormData {
  name: string;
  category: string;
  subcategory: string;
  price: number;
  originalPrice?: number;
  stock: number;
  fabric: string;
  imageUrl: string;
  description: string;
  sizes: string[];
  colors: string;
  isFeatured: boolean;
}

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-products.html',
  styleUrls: ['./admin-products.scss']
})
export class AdminProductsComponent implements OnInit, OnDestroy {
  public firebaseService = inject(FirebaseService);

  private subs = new Subscription();

  // Dynamic data from Firestore
  public rawProducts = signal<Product[]>([]);
  public dynamicCategories = signal<Category[]>([]);
  public isLoading = signal<boolean>(true);
  public errorMessage = signal<string | null>(null);

  // Filters
  public selectedCategory = signal<string>('all');
  public searchQuery = signal<string>('');
  public stockFilter = signal<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');

  // Modal State
  public isModalOpen = signal<boolean>(false);
  public modalMode = signal<'add' | 'edit'>('add');
  public editingProductId = signal<string | null>(null);
  public isSubmitting = signal<boolean>(false);

  // Delete Confirmation State
  public productToDelete = signal<Product | null>(null);
  public isDeleting = signal<boolean>(false);

  // Form Model
  public formData = signal<ProductFormData>({
    name: '',
    category: '',
    subcategory: '',
    price: 2999,
    originalPrice: 3999,
    stock: 20,
    fabric: 'Pure Silk',
    imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
    description: '',
    sizes: ['S', 'M', 'L'],
    colors: 'Ivory, Gold',
    isFeatured: false
  });

  public availableSizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size', '2-3 Yrs', '4-5 Yrs', '6-7 Yrs', '8-9 Yrs', '10-12 Yrs'];

  public presetImages = [
    { label: 'Banarasi Silk Saree', url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80' },
    { label: 'Men Bundi Kurta Set', url: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=800&q=80' },
    { label: 'Kids Kurta Dhoti', url: 'https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&w=800&q=80' },
    { label: 'Bridal Velvet Lehenga', url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80' },
    { label: 'Royal Sherwani', url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80' },
    { label: 'Linen Casual Shirt', url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80' },
    { label: 'Cashmere Pashmina Shawl', url: 'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?auto=format&fit=crop&w=800&q=80' }
  ];

  // Filtered Products Computed
  public filteredProducts = computed(() => {
    const list = this.rawProducts();
    const cat = this.selectedCategory().toLowerCase();
    const q = this.searchQuery().toLowerCase().trim();
    const stock = this.stockFilter();

    return list.filter(p => {
      const matchCat = cat === 'all' || p.category.toLowerCase() === cat;
      const matchSearch = !q ||
        p.name.toLowerCase().includes(q) ||
        p.subcategory.toLowerCase().includes(q) ||
        (p.fabric && p.fabric.toLowerCase().includes(q)) ||
        p.id.toLowerCase().includes(q);

      let matchStock = true;
      if (stock === 'in_stock') matchStock = p.stock > 0;
      if (stock === 'low_stock') matchStock = p.stock > 0 && p.stock <= 10;
      if (stock === 'out_of_stock') matchStock = p.stock <= 0;

      return matchCat && matchSearch && matchStock;
    });
  });

  // Metrics
  public totalCount = computed(() => this.rawProducts().length);
  public lowStockCount = computed(() => this.rawProducts().filter(p => p.stock <= 10).length);

  public countByCategory(categoryName: string): number {
    return this.rawProducts().filter(p => p.category.toLowerCase() === categoryName.toLowerCase()).length;
  }

  ngOnInit(): void {
    // 1. Subscribe to real-time products
    this.subs.add(
      this.firebaseService.products$.subscribe(prods => {
        this.rawProducts.set(prods);
      })
    );

    // 2. Subscribe to real-time categories from Firestore
    this.subs.add(
      this.firebaseService.categories$.subscribe(cats => {
        this.dynamicCategories.set(cats);
        // Default category for new product form if empty
        if (!this.formData().category && cats.length > 0) {
          this.formData.update(f => ({ ...f, category: cats[0].name }));
        }
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
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  public setCategory(cat: string): void {
    this.selectedCategory.set(cat);
  }

  public openAddModal(): void {
    this.modalMode.set('add');
    this.editingProductId.set(null);

    const categories = this.dynamicCategories();
    const defaultCat = this.selectedCategory() !== 'all' 
      ? this.selectedCategory() 
      : (categories.length > 0 ? categories[0].name : 'Women');

    this.formData.set({
      name: '',
      category: defaultCat,
      subcategory: '',
      price: 2999,
      originalPrice: 3999,
      stock: 15,
      fabric: 'Handwoven Silk',
      imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
      description: 'Handcrafted luxury apparel designed with fine artisan weave and superior comfort.',
      sizes: ['S', 'M', 'L'],
      colors: 'Gold, Ivory',
      isFeatured: false
    });

    this.isModalOpen.set(true);
  }

  public openEditModal(product: Product): void {
    this.modalMode.set('edit');
    this.editingProductId.set(product.id);
    this.formData.set({
      name: product.name,
      category: product.category,
      subcategory: product.subcategory || '',
      price: product.price,
      originalPrice: product.originalPrice || Math.round(product.price * 1.3),
      stock: product.stock,
      fabric: product.fabric || '',
      imageUrl: product.imageUrl,
      description: product.description,
      sizes: [...(product.sizes || [])],
      colors: (product.colors || []).join(', '),
      isFeatured: product.isFeatured
    });
    this.isModalOpen.set(true);
  }

  public closeModal(): void {
    this.isModalOpen.set(false);
  }

  public toggleSizeSelection(size: string): void {
    const curSizes = this.formData().sizes;
    const exists = curSizes.includes(size);
    const updated = exists ? curSizes.filter(s => s !== size) : [...curSizes, size];
    this.formData.update(f => ({ ...f, sizes: updated }));
  }

  public isSizeSelected(size: string): boolean {
    return this.formData().sizes.includes(size);
  }

  public selectPresetImage(url: string): void {
    this.formData.update(f => ({ ...f, imageUrl: url }));
  }

  public async saveProduct(): Promise<void> {
    const f = this.formData();
    if (!f.name.trim()) {
      alert('Please provide a product title.');
      return;
    }
    if (!f.category) {
      alert('Please select a category for this product.');
      return;
    }
    if (!f.price || f.price <= 0) {
      alert('Please provide a valid product price.');
      return;
    }
    if (!f.imageUrl.trim()) {
      alert('Please provide an image URL for the product.');
      return;
    }

    this.isSubmitting.set(true);

    const discount = f.originalPrice && f.originalPrice > f.price
      ? Math.round(((f.originalPrice - f.price) / f.originalPrice) * 100)
      : undefined;

    const colorsArray = f.colors
      .split(',')
      .map(c => c.trim())
      .filter(Boolean);

    try {
      if (this.modalMode() === 'add') {
        await this.firebaseService.addProduct({
          name: f.name.trim(),
          category: f.category,
          subcategory: f.subcategory.trim() || 'Apparel',
          price: Number(f.price),
          originalPrice: f.originalPrice ? Number(f.originalPrice) : undefined,
          discount,
          stock: Number(f.stock) || 0,
          fabric: f.fabric.trim(),
          imageUrl: f.imageUrl.trim(),
          description: f.description.trim(),
          sizes: f.sizes.length ? f.sizes : ['Free Size'],
          colors: colorsArray.length ? colorsArray : ['Standard'],
          rating: 5.0,
          reviewCount: 1,
          isFeatured: f.isFeatured
        });
      } else {
        const id = this.editingProductId();
        if (id) {
          await this.firebaseService.updateProduct(id, {
            name: f.name.trim(),
            category: f.category,
            subcategory: f.subcategory.trim() || 'Apparel',
            price: Number(f.price),
            originalPrice: f.originalPrice ? Number(f.originalPrice) : undefined,
            discount,
            stock: Number(f.stock) || 0,
            fabric: f.fabric.trim(),
            imageUrl: f.imageUrl.trim(),
            description: f.description.trim(),
            sizes: f.sizes,
            colors: colorsArray,
            isFeatured: f.isFeatured
          });
        }
      }
      this.closeModal();
    } catch (err: any) {
      alert('Firestore Error: ' + (err?.message || 'Could not save product.'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  public confirmDelete(product: Product): void {
    this.productToDelete.set(product);
  }

  public async executeDelete(): Promise<void> {
    const p = this.productToDelete();
    if (!p) return;

    this.isDeleting.set(true);
    try {
      await this.firebaseService.deleteProduct(p.id);
      this.productToDelete.set(null);
    } catch (e: any) {
      alert('Error deleting product from Firestore: ' + (e?.message || ''));
    } finally {
      this.isDeleting.set(false);
    }
  }

  public async adjustStock(product: Product, delta: number): Promise<void> {
    const newStock = Math.max(0, product.stock + delta);
    try {
      await this.firebaseService.updateProduct(product.id, { stock: newStock });
    } catch (e: any) {
      console.error('Failed to update stock in Firestore:', e);
    }
  }

  public async seedDefaultCatalog(): Promise<void> {
    const res = await this.firebaseService.seedAllDataToFirestore();
    if (res.success) {
      alert(`Successfully added ${res.count} clothing products & categories to Firestore!`);
    } else {
      alert('Seeding error: ' + res.error);
    }
  }
}
