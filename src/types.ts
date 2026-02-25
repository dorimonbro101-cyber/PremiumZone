export type OrderStatus = 'Pending' | 'Approved' | 'Completed' | 'Rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  registerDate: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: string;
  stock: number;
  image: string;
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  paymentMethod: 'bKash' | 'Nagad';
  senderNumber: string;
  trxId: string;
  whatsapp: string;
  status: OrderStatus;
  rejectionReason?: string;
  orderDate: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'admin' | 'bot';
  text: string;
  timestamp: string;
}

export interface SupportChat {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  messages: ChatMessage[];
  lastMessageAt: string;
  status: 'Open' | 'Resolved';
}

export interface Settings {
  notice: string;
  bkash: string;
  nagad: string;
  whatsapp: string;
  adminPassword: string;
}

export interface AppData {
  users: User[];
  orders: Order[];
  products: Product[];
  settings: Settings;
  chats: SupportChat[];
}
