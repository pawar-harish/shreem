import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { FirebaseService } from '../../../services/firebase.service';
import { Category } from '../../../models/category.model';
import { Product } from '../../../models/product.model';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-categories.html',
  styleUrls: ['./admin-categories.scss']
})
export class AdminCategoriesComponent implements OnInit, OnDestroy {
  public firebaseService = inject(FirebaseService);

  private subs = new Subscription();

  public categories = signal<Category[]>([]);
  public products = signal<Product[]>([]);
  public isLoading = signal<boolean>(true);
  public errorMessage = signal<string | null>(null);

  public isModalOpen = signal<boolean>(false);
  public modalMode = signal<'add' | 'edit'>('add');
  public editingCategoryId = signal<string | null>(null);

  // Form
  public catName = signal<string>('');
  public catSlug = signal<string>('');
  public catDesc = signal<string>('');
  public catImageUrl = signal<string>('');
  public isFeatured = signal<boolean>(true);
  public isSubmitting = signal<boolean>(false);

  // Delete
  public categoryToDelete = signal<Category | null>(null);
  public isDeleting = signal<boolean>(false);

  public presetCategoryImages = [
    { label: 'Women', url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80' },
    { label: 'Men', url: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=800&q=80' },
    { label: 'Kids', url: 'https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&w=800&q=80' },
    { label: 'Ethnic & Festive', url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80' },
    { label: 'Accessories', url: 'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?auto=format&fit=crop&w=800&q=80' }
  ];

  ngOnInit(): void {
    this.subs.add(
      this.firebaseService.categories$.subscribe(cats => {
        this.categories.set(cats);
      })
    );

    this.subs.add(
      this.firebaseService.products$.subscribe(prods => {
        this.products.set(prods);
      })
    );

    this.subs.add(
      this.firebaseService.isLoadingCategories$.subscribe(loading => {
        this.isLoading.set(loading);
      })
    );

    this.subs.add(
      this.firebaseService.errorMessage$.subscribe(err => {
        this.errorMessage.set(err);
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  public getProductCount(catName: string): number {
    return this.products().filter(p => p.category.toLowerCase() === catName.toLowerCase()).length;
  }

  public openAddModal(): void {
    this.modalMode.set('add');
    this.editingCategoryId.set(null);
    this.catName.set('');
    this.catSlug.set('');
    this.catDesc.set('');
    this.catImageUrl.set('https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80');
    this.isFeatured.set(true);
    this.isModalOpen.set(true);
  }

  public openEditModal(c: Category): void {
    this.modalMode.set('edit');
    this.editingCategoryId.set(c.id);
    this.catName.set(c.name);
    this.catSlug.set(c.slug);
    this.catDesc.set(c.description);
    this.catImageUrl.set(c.imageUrl);
    this.isFeatured.set(c.isFeatured ?? true);
    this.isModalOpen.set(true);
  }

  public closeModal(): void {
    this.isModalOpen.set(false);
  }

  public onNameChange(val: string): void {
    this.catName.set(val);
    if (this.modalMode() === 'add') {
      this.catSlug.set(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
    }
  }

  public selectPresetImage(url: string): void {
    this.catImageUrl.set(url);
  }

  public async saveCategory(): Promise<void> {
    if (!this.catName().trim()) {
      alert('Please provide category title.');
      return;
    }

    const slug = this.catSlug().trim() || this.catName().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    this.isSubmitting.set(true);

    try {
      if (this.modalMode() === 'add') {
        await this.firebaseService.addCategory({
          name: this.catName().trim(),
          slug,
          description: this.catDesc().trim(),
          imageUrl: this.catImageUrl().trim() || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
          isFeatured: this.isFeatured()
        });
      } else {
        const id = this.editingCategoryId();
        if (id) {
          await this.firebaseService.updateCategory(id, {
            name: this.catName().trim(),
            slug,
            description: this.catDesc().trim(),
            imageUrl: this.catImageUrl().trim(),
            isFeatured: this.isFeatured()
          });
        }
      }
      this.closeModal();
    } catch (e: any) {
      alert('Firestore Error: ' + (e?.message || 'Could not save category.'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  public confirmDelete(c: Category): void {
    this.categoryToDelete.set(c);
  }

  public async executeDelete(): Promise<void> {
    const c = this.categoryToDelete();
    if (!c) return;

    this.isDeleting.set(true);
    try {
      await this.firebaseService.deleteCategory(c.id);
      this.categoryToDelete.set(null);
    } catch (e: any) {
      alert('Error deleting category from Firestore: ' + (e?.message || ''));
    } finally {
      this.isDeleting.set(false);
    }
  }

  public async seedDefaultCategories(): Promise<void> {
    try {
      await this.firebaseService.seedCategoriesToFirestore();
      alert('Default clothing categories successfully seeded into Firestore!');
    } catch (e: any) {
      alert('Failed to seed categories: ' + e?.message);
    }
  }
}
