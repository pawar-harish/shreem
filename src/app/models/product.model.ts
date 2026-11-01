export interface Product {
  id: string;
  name: string;
  category: 'Men' | 'Women' | 'Kids' | 'Ethnic' | 'Accessories' | string;
  subcategory: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  description: string;
  imageUrl: string;
  additionalImages?: string[];
  sizes: string[];
  colors: string[];
  fabric?: string;
  stock: number;
  rating: number;
  reviewCount: number;
  isFeatured: boolean;
  isNewArrival?: boolean;
  createdAt?: string;
}

