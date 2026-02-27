import { AppData } from './types';

const INITIAL_DATA: AppData = {
  users: [],
  orders: [],
  products: [
    {
      id: '1',
      name: 'Premium Subscription',
      description: 'Full access to all premium features.',
      price: 500,
      duration: '30 Days',
      stock: 50,
      image: 'https://api.dicebear.com/7.x/shapes/svg?seed=premium'
    },
    {
      id: '2',
      name: 'Basic Plan',
      description: 'Essential features for starters.',
      price: 200,
      duration: '7 Days',
      stock: 100,
      image: 'https://api.dicebear.com/7.x/shapes/svg?seed=basic'
    },
    {
      id: '3',
      name: 'Ultimate Bundle',
      description: 'The complete package for power users.',
      price: 1200,
      duration: '90 Days',
      stock: 20,
      image: 'https://api.dicebear.com/7.x/shapes/svg?seed=ultimate'
    }
  ],
  settings: {
    notice: 'PremiumZone এ আপনাকে স্বাগতম! আমাদের নতুন প্রোডাক্টগুলো চেক করুন।',
    bkash: '01700000000',
    nagad: '01800000000',
    whatsapp: '8801700000000',
    adminPassword: 'premiumzone2026',
    isMaintenance: false
  },
  chats: []
};

export const STORAGE_KEY = 'premiumzone_data';

export const getAppData = (): AppData => {
  return INITIAL_DATA;
};

export const saveAppData = (data: AppData) => {
  // Shared data is now handled by Firebase only.
  // We keep this as a no-op to avoid breaking imports, 
  // but we won't call it for shared state anymore.
};
