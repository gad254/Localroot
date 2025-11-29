
export enum UserRole {
  CONSUMER = 'CONSUMER',
  PRODUCER = 'PRODUCER',
  ADMIN = 'ADMIN'
}

export enum UserStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  location?: string; // City or Zip
  avatarUrl?: string;
  bio?: string;
  status: UserStatus;
  isVerified: boolean;
  password?: string; // Mock password
}

export interface Product {
  id: string;
  producerId: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  category: string;
  imageUrl: string;
  inStock: boolean;
  harvestDate?: string;
  organic?: boolean;
  availableFrom?: string;
  availableUntil?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: number;
}

export interface Review {
  id: string;
  producerId: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  comment: string;
  timestamp: number;
}

export type ViewState = 'MARKETPLACE' | 'DASHBOARD' | 'MESSAGES' | 'PROFILE' | 'ADMIN' | 'PRODUCT_DETAIL' | 'WISHLIST';

// For Gemini Integration
export interface RecipeSuggestion {
  title: string;
  ingredients: string[];
  instructions: string;
}
