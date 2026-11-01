import { Routes } from '@angular/router';
import { UserLayoutComponent } from './pages/user-layout/user-layout';
import { HomeComponent } from './pages/home/home';
import { ProductDetailComponent } from './pages/product-detail/product-detail';
import { AdminLayoutComponent } from './pages/admin/admin-layout/admin-layout';
import { AdminProductsComponent } from './pages/admin/admin-products/admin-products';
import { AdminCategoriesComponent } from './pages/admin/admin-categories/admin-categories';
import { AdminOrdersComponent } from './pages/admin/admin-orders/admin-orders';
import { AdminSettingsComponent } from './pages/admin/admin-settings/admin-settings';

export const routes: Routes = [
  // User Panel Routes
  {
    path: '',
    component: UserLayoutComponent,
    children: [
      {
        path: '',
        component: HomeComponent
      },
      {
        path: 'product/:id',
        component: ProductDetailComponent
      }
    ]
  },

  // Admin Panel Routes
  {
    path: 'admin',
    component: AdminLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'products',
        pathMatch: 'full'
      },
      {
        path: 'products',
        component: AdminProductsComponent
      },
      {
        path: 'categories',
        component: AdminCategoriesComponent
      },
      {
        path: 'orders',
        component: AdminOrdersComponent
      },
      // {
      //   path: 'settings',
      //   component: AdminSettingsComponent
      // }
    ]
  },

  // Wildcard fallback
  {
    path: '**',
    redirectTo: ''
  }
];
