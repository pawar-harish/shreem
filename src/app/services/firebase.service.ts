import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  Unsubscribe
} from 'firebase/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Product } from '../models/product.model';
import { Category } from '../models/category.model';
import { Order } from '../models/order.model';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS } from '../data/initial-data';

export interface FirebaseConfigModel {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;

  // Real-time unsubscribe handles
  private unsubs: Unsubscribe[] = [];

  // Connection and Status
  public isConnected$ = new BehaviorSubject<boolean>(false);
  public connectionStatus$ = new BehaviorSubject<'connected' | 'connecting' | 'error' | 'spark_ready' | 'mock_fallback'>('connecting');
  public statusMessage$ = new BehaviorSubject<string>('Initializing Firebase Firestore...');
  public errorMessage$ = new BehaviorSubject<string | null>(null);

  // Loading States
  public isLoadingProducts$ = new BehaviorSubject<boolean>(true);
  public isLoadingCategories$ = new BehaviorSubject<boolean>(true);
  public isLoadingOrders$ = new BehaviorSubject<boolean>(true);

  // Data Subjects (Real-time streams)
  private productsSubject = new BehaviorSubject<Product[]>([]);
  public products$: Observable<Product[]> = this.productsSubject.asObservable();

  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  public categories$: Observable<Category[]> = this.categoriesSubject.asObservable();

  private ordersSubject = new BehaviorSubject<Order[]>([]);
  public orders$: Observable<Order[]> = this.ordersSubject.asObservable();

  constructor() {
    if (this.isBrowser) {
      this.initFirebase();
    } else {
      // In SSR server context, supply initial data without opening listeners
      this.productsSubject.next(INITIAL_PRODUCTS);
      this.categoriesSubject.next(INITIAL_CATEGORIES);
      this.isLoadingProducts$.next(false);
      this.isLoadingCategories$.next(false);
    }
  }

  /**
   * Retrieves active Firebase configuration.
   * Prioritizes environment.ts credentials unless an explicit valid override is stored.
   */
  public getConfig(): FirebaseConfigModel {
    if (this.isBrowser) {
      const stored = localStorage.getItem('shreem_firebase_config');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // If stored is not a stale demo key, return it
          if (parsed.apiKey && !parsed.apiKey.includes('DEMO-KEY') && parsed.projectId) {
            return parsed;
          } else {
            localStorage.removeItem('shreem_firebase_config');
          }
        } catch {
          localStorage.removeItem('shreem_firebase_config');
        }
      }
    }
    return environment.firebase;
  }

  /**
   * Save custom configuration from Admin Settings and reconnect
   */
  public saveConfig(config: FirebaseConfigModel): void {
    if (this.isBrowser) {
      localStorage.setItem('shreem_firebase_config', JSON.stringify(config));
      this.initFirebase();
    }
  }

  /**
   * Initializes Firebase and attaches real-time Firestore listeners (onSnapshot)
   * Designed strictly for the Firebase Spark (Free) Plan:
   * - No Cloud Functions required
   * - Minimal read/write footprint
   * - Shared listeners to keep reads within the 50,000/day free quota
   */
  public async initFirebase(): Promise<void> {
    const config = this.getConfig();

    // Clean up any existing listeners
    this.cleanupListeners();

    try {
      this.connectionStatus$.next('connecting');
      this.statusMessage$.next(`Connecting to Firestore project: ${config.projectId}...`);
      this.errorMessage$.next(null);

      // Initialize Firebase App
      if (getApps().length > 0) {
        this.app = getApps()[0];
      } else {
        this.app = initializeApp(config);
      }

      this.db = getFirestore(this.app);
      this.isConnected$.next(true);
      this.connectionStatus$.next('connected');
      this.statusMessage$.next(`Connected to Firestore (${config.projectId}) [Spark Plan Compatible]`);

      // Start Real-Time Listeners
      this.listenToCategories();
      this.listenToProducts();
      this.listenToOrders();

    } catch (err: any) {
      console.error('Firebase Firestore initialization error:', err);
      this.connectionStatus$.next('error');
      this.errorMessage$.next(err?.message || 'Failed to initialize Firebase Firestore');
      this.statusMessage$.next('Firebase error: ' + (err?.message || 'Check project credentials'));
      this.loadFallbackFromStorage();
    }
  }

  /**
   * Clean up real-time listener subscriptions
   */
  private cleanupListeners(): void {
    this.unsubs.forEach(unsub => {
      try {
        unsub();
      } catch (e) {
        // ignore
      }
    });
    this.unsubs = [];
  }

  /**
   * Real-time listener for the `categories` Firestore collection
   */
  private listenToCategories(): void {
    if (!this.db) return;

    this.isLoadingCategories$.next(true);
    const catCol = collection(this.db, 'categories');

    const unsub = onSnapshot(
      catCol,
      (snapshot) => {
        if (snapshot.empty) {
          console.info('Firestore categories collection is currently empty. Auto-seeding initial categories...');
          this.seedCategoriesToFirestore().then(() => {
            this.isLoadingCategories$.next(false);
          });
          return;
        }

        const cats: Category[] = [];
        snapshot.forEach(docSnap => {
          cats.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });

        this.categoriesSubject.next(cats);
        this.isLoadingCategories$.next(false);
        this.errorMessage$.next(null);

        if (this.isBrowser) {
          localStorage.setItem('shreem_cached_categories', JSON.stringify(cats));
        }
      },
      (error) => {
        console.error('Firestore categories onSnapshot error:', error);
        this.errorMessage$.next(`Firestore categories read error: ${error.message}`);
        this.isLoadingCategories$.next(false);
        this.loadFallbackCategories();
      }
    );

    this.unsubs.push(unsub);
  }

  /**
   * Real-time listener for the `products` Firestore collection
   */
  private listenToProducts(): void {
    if (!this.db) return;

    this.isLoadingProducts$.next(true);
    const prodCol = collection(this.db, 'products');

    const unsub = onSnapshot(
      prodCol,
      (snapshot) => {
        if (snapshot.empty) {
          console.info('Firestore products collection is currently empty. Auto-seeding initial clothing products...');
          this.seedProductsToFirestore().then(() => {
            this.isLoadingProducts$.next(false);
          });
          return;
        }

        const prods: Product[] = [];
        snapshot.forEach(docSnap => {
          prods.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });

        // Sort by createdAt descending
        prods.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

        this.productsSubject.next(prods);
        this.isLoadingProducts$.next(false);
        this.errorMessage$.next(null);

        if (this.isBrowser) {
          localStorage.setItem('shreem_cached_products', JSON.stringify(prods));
        }
      },
      (error) => {
        console.error('Firestore products onSnapshot error:', error);
        this.errorMessage$.next(`Firestore products read error: ${error.message}`);
        this.isLoadingProducts$.next(false);
        this.loadFallbackProducts();
      }
    );

    this.unsubs.push(unsub);
  }

  /**
   * Real-time listener for the `orders` Firestore collection
   */
  private listenToOrders(): void {
    if (!this.db) return;

    this.isLoadingOrders$.next(true);
    const ordersCol = collection(this.db, 'orders');

    const unsub = onSnapshot(
      ordersCol,
      (snapshot) => {
        const orders: Order[] = [];
        snapshot.forEach(docSnap => {
          orders.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });

        orders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        this.ordersSubject.next(orders);
        this.isLoadingOrders$.next(false);
      },
      (error) => {
        console.warn('Firestore orders onSnapshot notice:', error.message);
        this.isLoadingOrders$.next(false);
      }
    );

    this.unsubs.push(unsub);
  }

  // ==========================================
  // FALLBACK LOADERS (in case of network cutoff)
  // ==========================================

  private loadFallbackFromStorage(): void {
    this.loadFallbackCategories();
    this.loadFallbackProducts();
  }

  private loadFallbackCategories(): void {
    if (!this.isBrowser) return;
    const cached = localStorage.getItem('shreem_cached_categories');
    if (cached) {
      try {
        this.categoriesSubject.next(JSON.parse(cached));
        return;
      } catch {}
    }
    this.categoriesSubject.next(INITIAL_CATEGORIES);
  }

  private loadFallbackProducts(): void {
    if (!this.isBrowser) return;
    const cached = localStorage.getItem('shreem_cached_products');
    if (cached) {
      try {
        this.productsSubject.next(JSON.parse(cached));
        return;
      } catch {}
    }
    this.productsSubject.next(INITIAL_PRODUCTS);
  }

  // ==========================================
  // PRODUCT CRUD (Firestore Collections)
  // ==========================================

  /**
   * Fetch single product by ID (from memory or direct Firestore document)
   */
  public async getProductById(id: string): Promise<Product | undefined> {
    const list = this.productsSubject.getValue();
    const existing = list.find(p => p.id === id);
    if (existing) return existing;

    if (this.db) {
      try {
        const docRef = doc(this.db, 'products', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return { id: docSnap.id, ...(docSnap.data() as any) };
        }
      } catch (err) {
        console.error(`Error fetching product ${id} from Firestore:`, err);
      }
    }
    return undefined;
  }

  /**
   * Create a new product in the Firestore `products` collection
   */
  public async addProduct(product: Omit<Product, 'id'>): Promise<Product> {
    if (!this.db) {
      throw new Error('Firestore database is not initialized.');
    }

    const newId = 'shreem-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const newProduct: Product = {
      ...product,
      id: newId,
      createdAt: new Date().toISOString()
    };

    const docRef = doc(this.db, 'products', newId);
    await setDoc(docRef, newProduct);
    return newProduct;
  }

  /**
   * Update an existing product in the Firestore `products` collection
   */
  public async updateProduct(id: string, updates: Partial<Product>): Promise<void> {
    if (!this.db) {
      throw new Error('Firestore database is not initialized.');
    }

    const docRef = doc(this.db, 'products', id);
    await updateDoc(docRef, updates as any);
  }

  /**
   * Delete a product from the Firestore `products` collection
   */
  public async deleteProduct(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Firestore database is not initialized.');
    }

    const docRef = doc(this.db, 'products', id);
    await deleteDoc(docRef);
  }

  // ==========================================
  // CATEGORY CRUD (Firestore Collections)
  // ==========================================

  /**
   * Create a new category in the Firestore `categories` collection
   */
  public async addCategory(cat: Omit<Category, 'id'>): Promise<Category> {
    if (!this.db) {
      throw new Error('Firestore database is not initialized.');
    }

    const cleanSlug = cat.slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const newId = 'cat-' + cleanSlug;
    const newCategory: Category = {
      ...cat,
      id: newId,
      slug: cleanSlug
    };

    const docRef = doc(this.db, 'categories', newId);
    await setDoc(docRef, newCategory);
    return newCategory;
  }

  /**
   * Update a category in the Firestore `categories` collection
   */
  public async updateCategory(id: string, updates: Partial<Category>): Promise<void> {
    if (!this.db) {
      throw new Error('Firestore database is not initialized.');
    }

    const docRef = doc(this.db, 'categories', id);
    await updateDoc(docRef, updates as any);
  }

  /**
   * Delete a category from the Firestore `categories` collection
   */
  public async deleteCategory(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Firestore database is not initialized.');
    }

    const docRef = doc(this.db, 'categories', id);
    await deleteDoc(docRef);
  }

  // ==========================================
  // ORDER MANAGEMENT (Firestore Collections)
  // ==========================================

  public async createOrder(orderData: Omit<Order, 'id' | 'createdAt'>): Promise<Order> {
    if (!this.db) {
      throw new Error('Firestore database is not initialized.');
    }

    const newId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const order: Order = {
      ...orderData,
      id: newId,
      createdAt: new Date().toISOString()
    };

    const docRef = doc(this.db, 'orders', newId);
    await setDoc(docRef, order);
    return order;
  }

  public async updateOrderStatus(id: string, status: Order['status']): Promise<void> {
    if (!this.db) {
      throw new Error('Firestore database is not initialized.');
    }

    const docRef = doc(this.db, 'orders', id);
    await updateDoc(docRef, { status });
  }

  // ==========================================
  // SEED & SYNC (Spark Plan Batch Writes)
  // ==========================================

  /**
   * Seeds all initial categories to Firestore using an atomic batch write
   */
  public async seedCategoriesToFirestore(): Promise<void> {
    if (!this.db) return;
    const batch = writeBatch(this.db);
    for (const cat of INITIAL_CATEGORIES) {
      const docRef = doc(this.db, 'categories', cat.id);
      batch.set(docRef, cat);
    }
    await batch.commit();
  }

  /**
   * Seeds all initial clothing products to Firestore using an atomic batch write
   */
  public async seedProductsToFirestore(): Promise<void> {
    if (!this.db) return;
    const batch = writeBatch(this.db);
    for (const prod of INITIAL_PRODUCTS) {
      const docRef = doc(this.db, 'products', prod.id);
      batch.set(docRef, prod);
    }
    await batch.commit();
  }

  /**
   * Seeds both categories and products in a single operation
   */
  public async seedAllDataToFirestore(): Promise<{ success: boolean; count: number; error?: string }> {
    if (!this.db) {
      return { success: false, count: 0, error: 'Firestore database is not initialized.' };
    }

    try {
      await this.seedCategoriesToFirestore();
      await this.seedProductsToFirestore();
      return { success: true, count: INITIAL_CATEGORIES.length + INITIAL_PRODUCTS.length };
    } catch (err: any) {
      console.error('Error seeding data to Firestore:', err);
      return { success: false, count: 0, error: err?.message || 'Failed to seed data.' };
    }
  }

  /**
   * Resets local storage cached data and updates reactive streams
   */
  public resetLocalDemoData(): void {
    if (!this.isBrowser) return;
    localStorage.removeItem('shreem_cached_products');
    localStorage.removeItem('shreem_cached_categories');
    localStorage.removeItem('shreem_orders');
    this.productsSubject.next(INITIAL_PRODUCTS);
    this.categoriesSubject.next(INITIAL_CATEGORIES);
    this.ordersSubject.next([]);
  }
}
