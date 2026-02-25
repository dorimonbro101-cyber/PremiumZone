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
    notice: 'Welcome to PremiumZone! Get the best digital products at affordable prices.',
    bkash: '01700000000',
    nagad: '01800000000',
    whatsapp: '8801700000000',
    adminPassword: 'premiumzone2026'
  },
  chats: []
};

export const STORAGE_KEY = 'premiumzone_data';

export const getAppData = (): AppData => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
    return INITIAL_DATA;
  }
  return JSON.parse(data);
};

export const saveAppData = (data: AppData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};
