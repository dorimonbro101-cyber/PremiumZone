/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, 
  User as UserIcon, 
  Home, 
  ClipboardList, 
  MessageCircle, 
  Settings as SettingsIcon,
  LogOut,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  ChevronRight,
  Copy,
  Menu,
  X,
  ShieldCheck,
  LayoutDashboard,
  Users,
  Package,
  HeadphonesIcon,
  Send,
  Bot,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppData, User, Product, Order, OrderStatus, SupportChat, ChatMessage } from './types';
import { getAppData, saveAppData } from './storage';
import { db, ref, onValue, set, auth, signInAnonymously, onAuthStateChanged } from './firebase';

// --- Components ---

const Badge = ({ status }: { status: OrderStatus | string }) => {
  const styles: Record<string, string> = {
    Pending: 'bg-amber-100 text-amber-800 border-amber-200',
    Approved: 'bg-blue-100 text-blue-800 border-blue-200',
    Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Rejected: 'bg-rose-100 text-rose-800 border-rose-200',
    Open: 'bg-blue-100 text-blue-800 border-blue-200',
    'In Progress': 'bg-amber-100 text-amber-800 border-amber-200',
    Resolved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
};

export default function App() {
  const [data, setData] = useState<AppData>(getAppData());
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('premiumzone_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'orders' | 'profile' | 'chat'>('home');
  const [adminTab, setAdminTab] = useState<'dashboard' | 'orders' | 'users' | 'products' | 'chat' | 'settings'>('dashboard');
  
  // Modals
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState<Product | null>(null);
  const [showProductEditModal, setShowProductEditModal] = useState<Product | null>(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [designTheme, setDesignTheme] = useState<'premium' | 'minimal'>('premium');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'bKash' | 'Nagad'>('bKash');

  // Firebase Auth & Sync
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        setError(null);
      } else {
        signInAnonymously(auth).catch(err => {
          console.error("Auth error:", err);
          setError("Authentication failed. Please ensure 'Anonymous Sign-in' is enabled in Firebase Console.");
          setIsLoading(false);
        });
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const dataRef = ref(db, 'appData');
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const firebaseData = snapshot.val();
      if (firebaseData) {
        setData(prev => ({
          ...prev,
          ...firebaseData,
          users: firebaseData.users || [],
          orders: firebaseData.orders || [],
          products: firebaseData.products || [],
          chats: firebaseData.chats || [],
          settings: firebaseData.settings || prev.settings
        }));
      } else {
        // If Firebase is empty, initialize it with default data
        set(dataRef, getAppData()).catch(err => {
          console.error("Firebase init error:", err);
          setError("Failed to initialize database. Check your Firebase rules.");
        });
      }
      setHasSynced(true);
      setIsLoading(false);
      setError(null);
    }, (error) => {
      console.error("Firebase read error:", error);
      setError("Database access denied. Please check your Firebase Realtime Database rules.");
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [isAuthenticated]);

  const syncToFirebase = (newData: AppData) => {
    // We still want to avoid syncing if we haven't even tried to load yet
    // but once we've attempted a load (even if empty), we should allow syncing.
    if (!hasSynced && isLoading) return;
    
    try {
      const sanitizedData = JSON.parse(JSON.stringify(newData, (_, value) => 
        value === undefined ? null : value
      ));
      set(ref(db, 'appData'), sanitizedData).catch(err => {
        console.error("Firebase write error:", err);
      });
    } catch (error) {
      console.error("Firebase sync error:", error);
    }
  };

  // Persistence for user session only
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('premiumzone_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('premiumzone_user');
    }
  }, [currentUser]);

  // --- Auth Handlers ---
  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const user = data.users.find(u => u.email === email && u.password === password);
    if (user) {
      setCurrentUser(user);
      setShowLogin(false);
    } else {
      alert('ভুল ইমেইল বা পাসওয়ার্ড!');
    }
  };

  const handleRegister = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (data.users.find(u => u.email === email)) {
      alert('এই ইমেইল দিয়ে ইতিমধ্যে একাউন্ট খোলা হয়েছে!');
      return;
    }

    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      email,
      password,
      registerDate: new Date().toISOString()
    };

    setData(prev => {
      const newData = { ...prev, users: [...(prev.users || []), newUser] };
      syncToFirebase(newData);
      return newData;
    });
    setCurrentUser(newUser);
    setShowRegister(false);
  };

  const handleAdminLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;

    if (password === (data.settings?.adminPassword || 'premiumzone2026')) {
      setIsAdmin(true);
      setShowAdminLogin(false);
    } else {
      alert('ভুল পাসওয়ার্ড!');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdmin(false);
    setActiveTab('home');
  };

  // --- Order Handlers ---
  const placeOrder = (e: React.FormEvent<HTMLFormElement>, product: Product, quantity: number) => {
    e.preventDefault();
    if (!currentUser) return;

    if (quantity > product.stock) {
      alert('দুঃখিত, স্টকের চেয়ে বেশি অর্ডার করা সম্ভব নয়!');
      return;
    }

    const formData = new FormData(e.currentTarget);
    const paymentMethod = formData.get('paymentMethod') as 'bKash' | 'Nagad';
    const senderNumber = formData.get('senderNumber') as string;
    const trxId = formData.get('trxId') as string;
    const whatsapp = formData.get('whatsapp') as string;

    const newOrder: Order = {
      id: 'ORD-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      productName: product.name,
      quantity,
      unitPrice: product.price,
      totalPrice: product.price * quantity,
      paymentMethod,
      senderNumber,
      trxId,
      whatsapp,
      status: 'Pending',
      orderDate: new Date().toISOString()
    };

    setData(prev => {
      const newData = {
        ...prev,
        orders: [newOrder, ...(prev.orders || [])],
        products: (prev.products || []).map(p => p.id === product.id ? { ...p, stock: p.stock - quantity } : p)
      };
      syncToFirebase(newData);
      return newData;
    });

    setShowOrderModal(null);
    setActiveTab('orders');
    alert('অর্ডার সফলভাবে সাবমিট করা হয়েছে!');
  };

  // --- Admin Handlers ---
  const updateOrderStatus = (orderId: string, status: OrderStatus, reason?: string) => {
    setData(prev => {
      const orders = prev.orders || [];
      const nextOrders = orders.map(o => o.id === orderId ? { ...o, status, rejectionReason: reason || null } : o);
      const newData = { ...prev, orders: nextOrders };
      syncToFirebase(newData);
      return newData;
    });
    setShowRejectionModal(null);
  };

  const deleteProduct = (id: string) => {
    if (confirm('আপনি কি নিশ্চিত যে এই প্রোডাক্টটি ডিলিট করতে চান?')) {
      setData(prev => {
        const newData = {
          ...prev,
          products: (prev.products || []).filter(p => p.id !== id)
        };
        syncToFirebase(newData);
        return newData;
      });
    }
  };

  const saveProduct = (e: React.FormEvent<HTMLFormElement>, existingId?: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const product: Product = {
      id: existingId || Math.random().toString(36).substr(2, 9),
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: Number(formData.get('price')),
      duration: formData.get('duration') as string,
      stock: Number(formData.get('stock')),
      image: formData.get('image') as string || 'https://api.dicebear.com/7.x/shapes/svg?seed=' + Date.now()
    };

    setData(prev => {
      let newData;
      if (existingId) {
        newData = { ...prev, products: (prev.products || []).map(p => p.id === existingId ? product : p) };
      } else {
        newData = { ...prev, products: [...(prev.products || []), product] };
      }
      syncToFirebase(newData);
      return newData;
    });

    setShowProductEditModal(null);
    setShowAddProductModal(false);
  };

  // --- Chat Handlers ---
  const sendMessage = (text: string, role: 'user' | 'admin' | 'bot', targetUserId?: string) => {
    const userId = targetUserId || currentUser?.id;
    if (!userId) return;

    const newMessage: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      role,
      text,
      timestamp: new Date().toISOString()
    };

    setData(prev => {
      const chats = prev.chats || [];
      const users = prev.users || [];
      const existingChat = chats.find(c => c.userId === userId);
      let newChats;

      if (existingChat) {
        newChats = chats.map(c => c.userId === userId ? {
          ...c,
          messages: [...c.messages, newMessage],
          lastMessageAt: newMessage.timestamp,
          status: role === 'user' ? 'Open' : c.status
        } : c);
      } else {
        const user = users.find(u => u.id === userId);
        newChats = [...chats, {
          id: Math.random().toString(36).substr(2, 9),
          userId,
          userName: user?.name || 'Unknown',
          userEmail: user?.email || 'Unknown',
          messages: [newMessage],
          lastMessageAt: newMessage.timestamp,
          status: 'Open'
        }];
      }

      const newData = { ...prev, chats: newChats as SupportChat[] };
      syncToFirebase(newData);
      return newData;
    });

    // AI Bot Response
    if (role === 'user') {
      setTimeout(() => {
        const botResponse = getBotResponse(text);
        sendMessage(botResponse, 'bot', userId);
      }, 1000);
    }
  };

  const getBotResponse = (text: string) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('hello') || lowerText.includes('hi') || lowerText.includes('সালাম') || lowerText.includes('হ্যালো')) {
      return 'আসসালামু আলাইকুম! PremiumZone এ আপনাকে স্বাগতম। আমি আপনার কি সাহায্য করতে পারি?';
    }
    if (lowerText.includes('অর্ডার') || lowerText.includes('order')) {
      return 'অর্ডার করতে প্রোডাক্ট এর নিচে থাকা "কিনুন" বাটনে ক্লিক করুন। আপনার অর্ডার লিস্ট দেখতে "অর্ডার" ট্যাবে যান।';
    }
    if (lowerText.includes('পেমেন্ট') || lowerText.includes('payment')) {
      return 'আমরা বিকাশ এবং নগদ পেমেন্ট গ্রহণ করি। অর্ডার করার সময় আপনি আমাদের পেমেন্ট নাম্বার দেখতে পাবেন।';
    }
    if (lowerText.includes('স্টক') || lowerText.includes('stock')) {
      return 'প্রোডাক্ট কার্ডে স্টক পরিমাণ দেখা যায়। স্টক শেষ হয়ে গেলে আপনি অর্ডার করতে পারবেন না।';
    }
    return 'আপনার মেসেজটি আমাদের এডমিন প্যানেলে পাঠানো হয়েছে। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন, আমাদের প্রতিনিধি আপনার সাথে যোগাযোগ করবেন।';
  };

  // --- Views ---

  const HomeView = () => (
    <div className="p-4 pb-24 max-w-6xl mx-auto">
      <div className="mb-12 text-center">
        <motion.h2 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-4xl sm:text-6xl font-display font-bold mb-4 tracking-tighter ${
            designTheme === 'minimal' ? 'text-slate-100' : ''
          }`}
        >
          আপনার ডিজিটাল <span className={designTheme === 'minimal' ? 'text-sky-400' : 'text-gradient'}>অভিজ্ঞতা</span> উন্নত করুন
        </motion.h2>
        <p className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base">
          PremiumZone আপনাকে দিচ্ছে সবথেকে এক্সক্লুসিভ ডিজিটাল অ্যাসেট এবং সাবস্ক্রিপশন, সাথে থাকছে ইনস্ট্যান্ট ডেলিভারি এবং ২৪/৭ সাপোর্ট।
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
        {(data.products || []).map(product => (
          <motion.div 
            key={product.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -10 }}
            className={`rounded-2xl sm:rounded-[2rem] overflow-hidden flex flex-col group transition-all duration-300 ${
              designTheme === 'minimal' 
                ? 'bg-slate-900 border border-slate-800 shadow-none' 
                : 'glass card-premium'
            }`}
          >
            <div className={`h-32 sm:h-56 flex items-center justify-center p-4 sm:p-8 relative overflow-hidden ${
              designTheme === 'minimal' ? 'bg-slate-800/50' : 'bg-white/[0.02]'
            }`}>
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                designTheme === 'minimal' ? 'bg-sky-500/5' : 'bg-gradient-to-br from-accent/10 to-transparent'
              }`} />
              <img src={product.image} alt={product.name} className="h-full object-contain relative z-10 drop-shadow-2xl transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
            </div>
            <div className="p-4 sm:p-8 flex-1 flex flex-col">
              <div className="flex flex-col sm:flex-row justify-between items-start mb-2 sm:mb-4">
                <h3 className={`text-sm sm:text-2xl font-display font-bold tracking-tight truncate w-full ${
                  designTheme === 'minimal' ? 'text-slate-100' : ''
                }`}>{product.name}</h3>
                <div className="text-left sm:text-right">
                  <span className={`font-bold text-base sm:text-xl block ${
                    designTheme === 'minimal' ? 'text-sky-400' : 'text-accent'
                  }`}>৳{product.price}</span>
                  <span className="text-[8px] sm:text-[10px] text-gray-500 uppercase tracking-widest">{product.duration}</span>
                </div>
              </div>
              <p className="text-gray-400 text-[10px] sm:text-sm mb-4 sm:mb-8 leading-relaxed line-clamp-2 sm:line-clamp-none">{product.description}</p>
              
              <div className="mt-auto space-y-2 sm:space-y-4">
                <div className="flex items-center justify-between text-[8px] sm:text-[10px] text-gray-500 uppercase tracking-widest border-t border-white/5 pt-2 sm:pt-4">
                  <span>স্টক</span>
                  <span className={product.stock > 0 ? 'text-success' : 'text-danger'}>{product.stock} টি</span>
                </div>
                <button 
                  onClick={() => currentUser ? setShowOrderModal(product) : setShowLogin(true)}
                  disabled={product.stock <= 0}
                  className={`w-full py-2 sm:py-4 rounded-xl sm:rounded-2xl font-bold transition-all flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-base ${
                    product.stock > 0 
                      ? (designTheme === 'minimal' ? 'bg-sky-500 text-white hover:bg-sky-600' : 'bg-white/5 hover:text-white btn-premium')
                      : 'bg-white/[0.02] text-gray-600 cursor-not-allowed'
                  }`}
                >
                  <span>{product.stock > 0 ? 'কিনুন' : 'স্টক আউট'}</span>
                  {product.stock > 0 && <ChevronRight size={14} className="relative z-10 sm:w-[18px] sm:h-[18px]" />}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const OrdersView = () => {
    if (!currentUser) {
      return (
        <div className="p-4 pb-24 max-w-4xl mx-auto">
          <div className="glass rounded-[2.5rem] p-12 text-center border border-white/5">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-600">
              <ClipboardList size={40} />
            </div>
            <h3 className="text-xl font-bold mb-2">আপনি লগইন করেননি</h3>
            <p className="text-gray-500 mb-8">আপনার অর্ডার হিস্টোরি দেখতে অনুগ্রহ করে লগইন করুন।</p>
            <button 
              onClick={() => setShowLogin(true)}
              className="w-full py-4 bg-accent rounded-2xl font-bold text-white shadow-lg shadow-accent/20 hover:shadow-accent/40 transition-all"
            >
              লগইন করুন
            </button>
          </div>
        </div>
      );
    }

    const userOrders = (data.orders || []).filter(o => o.userId === currentUser?.id);
    
    return (
      <div className="p-4 pb-24 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-accent/10 rounded-2xl text-accent">
            <ClipboardList size={24} />
          </div>
          <h2 className="text-3xl font-display font-bold">অর্ডার হিস্টোরি</h2>
        </div>

        {userOrders.length === 0 ? (
          <div className="glass rounded-[2rem] p-16 text-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-600">
              <ShoppingBag size={40} />
            </div>
            <h3 className="text-xl font-bold mb-2">কোনো অর্ডার পাওয়া যায়নি</h3>
            <p className="text-gray-500">আপনি এখনো কোনো কেনাকাটা করেননি। আমাদের শপ থেকে ঘুরে আসুন!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {userOrders.map(order => (
              <motion.div 
                key={order.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass rounded-3xl p-6 flex flex-col md:flex-row justify-between gap-6 relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[10px] font-mono text-gray-500 bg-white/5 px-2 py-1 rounded-lg">{order.id}</span>
                    <Badge status={order.status} />
                  </div>
                  <h4 className="text-xl font-bold mb-1">{order.productName}</h4>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-400">
                    <span className="flex items-center gap-1.5"><ShoppingBag size={14} /> {order.quantity} টি</span>
                    <span className="flex items-center gap-1.5"><span className="text-accent">৳</span> {order.totalPrice}</span>
                    <span className="flex items-center gap-1.5"><Clock size={14} /> {new Date(order.orderDate).toLocaleString('bn-BD')}</span>
                  </div>
                  
                  {order.status === 'Rejected' && order.rejectionReason && (
                    <div className="mt-4 p-3 bg-danger/10 border border-danger/20 rounded-xl flex items-start gap-3">
                      <AlertCircle size={16} className="text-danger shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-danger mb-0.5">রিজেক্ট করার কারণ:</p>
                        <p className="text-xs text-gray-300">{order.rejectionReason}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col justify-center items-end border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6 min-w-[150px]">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Transaction ID</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-white">{order.trxId}</span>
                    <button onClick={() => { navigator.clipboard.writeText(order.trxId); alert('TrxID কপি করা হয়েছে!'); }} className="text-gray-500 hover:text-accent transition-colors">
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const ProfileView = () => {
    if (!currentUser) {
      return (
        <div className="p-4 pb-24 max-w-2xl mx-auto">
          <div className="glass rounded-[2.5rem] p-12 text-center border border-white/5">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-600">
              <UserIcon size={40} />
            </div>
            <h3 className="text-xl font-bold mb-2">আপনি লগইন করেননি</h3>
            <p className="text-gray-500 mb-8">প্রোফাইল দেখতে এবং অর্ডার করতে অনুগ্রহ করে লগইন বা রেজিস্ট্রেশন করুন।</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => setShowLogin(true)}
                className="w-full py-4 bg-accent rounded-2xl font-bold text-white shadow-lg shadow-accent/20 hover:shadow-accent/40 transition-all"
              >
                লগইন করুন
              </button>
              <button 
                onClick={() => setShowRegister(true)}
                className="w-full py-4 bg-white/5 rounded-2xl font-bold text-gray-300 hover:bg-white/10 transition-all"
              >
                রেজিস্ট্রেশন করুন
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 pb-24 max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-accent/10 rounded-2xl text-accent">
            <UserIcon size={24} />
          </div>
          <h2 className="text-3xl font-display font-bold">আমার প্রোফাইল</h2>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-[2.5rem] p-8 sm:p-12 border border-white/5 text-center">
            <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-accent to-highlight mx-auto mb-6 flex items-center justify-center text-3xl font-bold shadow-xl shadow-highlight/20">
              {currentUser.name[0]}
            </div>
            <h3 className="text-2xl font-bold mb-1">{currentUser.name}</h3>
            <p className="text-gray-500 mb-8">{currentUser.email}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-6 bg-white/[0.02] rounded-3xl border border-white/5">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">মোট অর্ডার</p>
                <p className="text-2xl font-bold text-accent">{(data.orders || []).filter(o => o.userId === currentUser.id).length}</p>
              </div>
              <div className="p-6 bg-white/[0.02] rounded-3xl border border-white/5">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">মেম্বারশিপ</p>
                <p className="text-2xl font-bold text-highlight">Premium</p>
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className="w-full py-4 bg-rose-500/10 text-rose-500 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-rose-500/20 transition-all"
            >
              <LogOut size={20} /> লগআউট করুন
            </button>
          </div>

          <div className="glass rounded-3xl p-8 border border-white/5">
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <ShieldCheck size={18} className="text-accent" /> একাউন্ট সিকিউরিটি
            </h4>
            <p className="text-sm text-gray-500 leading-relaxed">
              আপনার একাউন্টটি সুরক্ষিত আছে। আমরা আপনার তথ্য কারো সাথে শেয়ার করি না। কোনো সমস্যা হলে আমাদের সাপোর্ট টিমে যোগাযোগ করুন।
            </p>
          </div>
        </div>
      </div>
    );
  };

  const ChatView = () => {
    const chat = (data.chats || []).find(c => c.userId === currentUser?.id);
    const [input, setInput] = useState('');
    const scrollRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [chat?.messages]);

    const handleSend = (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim()) return;
      sendMessage(input, 'user');
      setInput('');
    };

    if (!currentUser) {
      return (
        <div className="p-4 pb-24 max-w-4xl mx-auto h-[calc(100vh-180px)] flex flex-col items-center justify-center">
          <div className="glass rounded-[2.5rem] p-12 text-center border border-white/5 w-full max-w-md">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-600">
              <MessageCircle size={40} />
            </div>
            <h3 className="text-xl font-bold mb-2">আপনি লগইন করেননি</h3>
            <p className="text-gray-500 mb-8">সাপোর্ট পেতে এবং চ্যাট করতে অনুগ্রহ করে লগইন করুন।</p>
            <button 
              onClick={() => setShowLogin(true)}
              className="w-full py-4 bg-accent rounded-2xl font-bold text-white shadow-lg shadow-accent/20 hover:shadow-accent/40 transition-all"
            >
              লগইন করুন
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="p-4 pb-24 max-w-4xl mx-auto h-[calc(100vh-180px)] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-accent/10 rounded-2xl text-accent">
              <MessageCircle size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold">সাপোর্ট চ্যাট</h2>
              <p className="text-xs text-gray-500">আমাদের এআই এবং এডমিন আপনাকে সাহায্য করতে প্রস্তুত</p>
            </div>
          </div>
        </div>

        <div className="flex-1 glass rounded-[2rem] overflow-hidden flex flex-col mb-4">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 mask-fade">
            {!chat || chat.messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                <Bot size={48} className="mb-4 text-accent" />
                <p className="text-sm">হাই! আমি PremiumZone এআই।<br />আপনার যেকোনো প্রশ্ন এখানে করতে পারেন।</p>
              </div>
            ) : (
              chat.messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-accent text-white rounded-tr-none' 
                      : msg.role === 'bot'
                        ? 'bg-white/5 text-gray-300 rounded-tl-none border border-white/10'
                        : 'bg-highlight/10 text-highlight rounded-tl-none border border-highlight/20'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      {msg.role === 'bot' && <Bot size={12} />}
                      {msg.role === 'admin' && <ShieldCheck size={12} />}
                      <span className="text-[10px] opacity-50 uppercase font-bold tracking-tighter">
                        {msg.role === 'user' ? 'আপনি' : msg.role === 'bot' ? 'এআই বট' : 'এডমিন'}
                      </span>
                    </div>
                    <p className="leading-relaxed">{msg.text}</p>
                    <span className="text-[8px] opacity-30 block mt-2 text-right">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSend} className="p-4 bg-white/[0.02] border-t border-white/5 flex gap-3">
            <input 
              type="text" 
              placeholder="আপনার প্রশ্নটি এখানে লিখুন..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
              value={input}
              onChange={e => setInput(e.target.value)}
            />
            <button type="submit" className="p-3 bg-accent rounded-xl text-white hover:shadow-lg hover:shadow-accent/20 transition-all active:scale-95">
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    );
  };

  // --- Admin Views ---

  const AdminDashboard = () => {
    const stats = [
      { label: 'পেন্ডিং', value: (data.orders || []).filter(o => o.status === 'Pending').length, icon: Clock, color: designTheme === 'minimal' ? 'text-sky-400' : 'text-amber-500', bg: designTheme === 'minimal' ? 'bg-sky-400/10' : 'bg-amber-500/10' },
      { label: 'অ্যাপ্রুভড', value: (data.orders || []).filter(o => o.status === 'Approved').length, icon: CheckCircle, color: designTheme === 'minimal' ? 'text-indigo-400' : 'text-blue-500', bg: designTheme === 'minimal' ? 'bg-indigo-400/10' : 'bg-blue-500/10' },
      { label: 'কমপ্লিটেড', value: (data.orders || []).filter(o => o.status === 'Completed').length, icon: ShoppingBag, color: designTheme === 'minimal' ? 'text-emerald-400' : 'text-emerald-500', bg: designTheme === 'minimal' ? 'bg-emerald-400/10' : 'bg-emerald-500/10' },
      { label: 'ইউজার', value: (data.users || []).length, icon: Users, color: designTheme === 'minimal' ? 'text-slate-400' : 'text-purple-500', bg: designTheme === 'minimal' ? 'bg-slate-400/10' : 'bg-purple-500/10' },
    ];

    return (
      <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-2xl sm:text-3xl font-display font-bold">অ্যাডমিন ড্যাশবোর্ড</h3>
          <div className="text-[10px] text-gray-500 font-mono">Last Updated: {new Date().toLocaleTimeString()}</div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col sm:flex-row items-center sm:items-center gap-3 sm:gap-6 group hover:border-accent/30 transition-all ${
                designTheme === 'minimal' ? 'bg-white/[0.03] border-none' : ''
              }`}
            >
              <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <stat.icon size={20} className="sm:w-[28px] sm:h-[28px]" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-[8px] sm:text-xs text-gray-500 uppercase tracking-widest mb-0.5 sm:mb-1">{stat.label}</p>
                <p className="text-xl sm:text-3xl font-display font-bold">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={`glass rounded-2xl sm:rounded-3xl p-6 sm:p-8 ${designTheme === 'minimal' ? 'bg-white/[0.03] border-none' : ''}`}>
            <h4 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2">
              <Clock size={18} className="text-amber-500" />
              সাম্প্রতিক পেন্ডিং অর্ডার
            </h4>
            <div className="space-y-3 sm:space-y-4">
              {(data.orders || []).filter(o => o.status === 'Pending').slice(0, 5).map(order => (
                <div key={order.id} className="flex items-center justify-between p-3 sm:p-4 bg-white/5 rounded-xl sm:rounded-2xl">
                  <div className="truncate mr-2">
                    <p className="font-bold text-xs sm:text-sm truncate">{order.productName}</p>
                    <p className="text-[8px] sm:text-[10px] text-gray-500 truncate">{order.userName} | {order.trxId}</p>
                  </div>
                  <span className="text-xs font-bold text-accent shrink-0">৳{order.totalPrice}</span>
                </div>
              ))}
              {(data.orders || []).filter(o => o.status === 'Pending').length === 0 && (
                <p className="text-center text-gray-500 py-8 text-sm">কোনো পেন্ডিং অর্ডার নেই</p>
              )}
            </div>
          </div>

          <div className={`glass rounded-2xl sm:rounded-3xl p-6 sm:p-8 ${designTheme === 'minimal' ? 'bg-white/[0.03] border-none' : ''}`}>
            <h4 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2">
              <MessageCircle size={18} className="text-accent" />
              সাম্প্রতিক চ্যাট
            </h4>
            <div className="space-y-3 sm:space-y-4">
              {(data.chats || []).slice(0, 5).map(chat => (
                <div key={chat.id} className="flex items-center justify-between p-3 sm:p-4 bg-white/5 rounded-xl sm:rounded-2xl">
                  <div className="truncate mr-2">
                    <p className="font-bold text-xs sm:text-sm truncate">{chat.userName}</p>
                    <p className="text-[8px] sm:text-[10px] text-gray-500 truncate max-w-[150px] sm:max-w-[200px]">{chat.messages[chat.messages.length - 1]?.text}</p>
                  </div>
                  <span className="text-[8px] sm:text-[10px] text-gray-500 shrink-0">{new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
              {(data.chats || []).length === 0 && (
                <p className="text-center text-gray-500 py-8 text-sm">কোনো চ্যাট হিস্টোরি নেই</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AdminOrders = () => {
    const [filter, setFilter] = useState<OrderStatus | 'All'>('All');
    const [search, setSearch] = useState('');

    const filteredOrders = (data.orders || []).filter(o => {
      const matchesFilter = filter === 'All' || o.status === filter;
      const trxId = o.trxId || '';
      const userEmail = o.userEmail || '';
      const userName = o.userName || '';
      const orderId = o.id || '';
      const matchesSearch = trxId.toLowerCase().includes(search.toLowerCase()) || 
                           userEmail.toLowerCase().includes(search.toLowerCase()) ||
                           userName.toLowerCase().includes(search.toLowerCase()) ||
                           orderId.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });

    return (
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {['All', 'Pending', 'Approved', 'Completed', 'Rejected'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  filter === f ? 'bg-accent text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {f === 'All' ? 'সব অর্ডার' : f}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="TrxID বা ইমেইল দিয়ে খুঁজুন..."
              className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-accent w-full sm:w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="glass rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4 font-medium">অর্ডার আইডি</th>
                  <th className="p-4 font-medium">ইউজার ও হোয়াটসঅ্যাপ</th>
                  <th className="p-4 font-medium">প্রোডাক্ট ও পরিমাণ</th>
                  <th className="p-4 font-medium">পেমেন্ট ও TrxID</th>
                  <th className="p-4 font-medium">স্ট্যাটাস</th>
                  <th className="p-4 font-medium">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-white/5">
                {filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <span className="font-mono text-xs block">{order.id}</span>
                      <span className="text-[10px] text-gray-500">{new Date(order.orderDate).toLocaleString()}</span>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{order.userName}</div>
                      <div className="text-xs text-gray-400">{order.userEmail}</div>
                      <div className="text-xs text-accent mt-1">{order.whatsapp}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{order.productName}</div>
                      <div className="text-xs text-gray-400">পরিমাণ: {order.quantity} | মোট: ৳{order.totalPrice}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{order.paymentMethod} ({order.senderNumber})</div>
                      <div className="text-xs font-mono text-gray-400">{order.trxId}</div>
                    </td>
                    <td className="p-4"><Badge status={order.status} /></td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {order.status === 'Pending' && (
                          <>
                            <button 
                              onClick={() => updateOrderStatus(order.id, 'Approved')}
                              className="p-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20"
                              title="Approve"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button 
                              onClick={() => setShowRejectionModal(order.id)}
                              className="p-2 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500/20"
                              title="Reject"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        {order.status === 'Approved' && (
                          <button 
                            onClick={() => updateOrderStatus(order.id, 'Completed')}
                            className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20"
                            title="Complete"
                          >
                            <ShoppingBag size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const AdminProducts = () => (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-3xl font-display font-bold">প্রোডাক্ট ম্যানেজমেন্ট</h3>
          <p className="text-xs text-gray-500 mt-1">আপনার শপের সকল প্রোডাক্ট এখানে ম্যানেজ করুন</p>
        </div>
        <button 
          onClick={() => setShowAddProductModal(true)}
          className="px-6 py-3 bg-accent rounded-2xl text-sm font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-accent/20 transition-all active:scale-95"
        >
          <Plus size={18} /> নতুন প্রোডাক্ট
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {(data.products || []).map(product => (
          <motion.div 
            key={product.id} 
            layout
            className="glass rounded-[2rem] p-6 flex gap-6 group hover:border-accent/30 transition-all"
          >
            <div className="w-24 h-24 rounded-2xl bg-white/5 p-4 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <img src={product.image} alt={product.name} className="w-full h-full object-contain drop-shadow-xl" referrerPolicy="no-referrer" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-bold truncate mb-1">{product.name}</h4>
              <p className="text-accent font-bold mb-3">৳{product.price}</p>
              <div className="flex items-center gap-3 text-[10px] text-gray-500 uppercase tracking-widest mb-4">
                <span>স্টক: <span className={product.stock > 0 ? 'text-success' : 'text-danger'}>{product.stock}</span></span>
                <span>•</span>
                <span>{product.duration}</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowProductEditModal(product)}
                  className="flex-1 py-2 bg-white/5 text-gray-400 rounded-xl hover:bg-white/10 flex items-center justify-center gap-2 text-xs font-bold transition-colors"
                >
                  <Edit2 size={14} /> এডিট
                </button>
                <button 
                  onClick={() => deleteProduct(product.id)}
                  className="p-2 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500/20 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const AdminUsers = () => (
    <div className="p-6 space-y-8">
      <div>
        <h3 className="text-3xl font-display font-bold">ইউজার লিস্ট</h3>
        <p className="text-xs text-gray-500 mt-1">আপনার শপের সকল নিবন্ধিত ইউজারদের তালিকা</p>
      </div>
      
      <div className="glass rounded-[2rem] overflow-hidden border border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/[0.02] text-gray-500 text-[10px] uppercase tracking-[0.2em] font-bold">
              <tr>
                <th className="p-6">ইউজার আইডি</th>
                <th className="p-6">নাম ও ইমেইল</th>
                <th className="p-6">রেজিস্ট্রেশন</th>
                <th className="p-6">অর্ডার সংখ্যা</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-white/5">
              {(data.users || []).map(user => (
                <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="p-6 font-mono text-[10px] text-gray-500">{user.id}</td>
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold">
                        {user.name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-gray-200">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-6 text-gray-400 text-xs">
                    {new Date(user.registerDate).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </td>
                  <td className="p-6">
                    <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-bold text-gray-400 group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                      {(data.orders || []).filter(o => o.userId === user.id).length} টি
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const AdminChat = () => {
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const selectedChat = (data.chats || []).find(c => c.id === selectedChatId);

    if (selectedChatId && !selectedChat) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-gray-500 p-6 text-center">
          <p>চ্যাটটি খুঁজে পাওয়া যায়নি</p>
          <button onClick={() => setSelectedChatId(null)} className="mt-4 text-accent underline">ফিরে যান</button>
        </div>
      );
    }
    const [input, setInput] = useState('');
    const scrollRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [selectedChat?.messages]);

    const handleSend = (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || !selectedChat) return;
      sendMessage(input, 'admin', selectedChat.userId);
      setInput('');
    };

    return (
      <div className="p-4 sm:p-6 h-[calc(100vh-120px)] flex flex-col lg:flex-row gap-4 sm:gap-6">
        <div className={`w-full lg:w-80 glass rounded-[2rem] overflow-hidden flex flex-col border border-white/5 ${
          selectedChatId ? 'hidden lg:flex' : 'flex'
        }`}>
          <div className="p-4 sm:p-6 border-b border-white/5 font-display font-bold text-lg flex items-center justify-between">
            চ্যাট লিস্ট
            <span className="text-[10px] bg-accent/10 text-accent px-2 py-1 rounded-full">{(data.chats || []).length}</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {(data.chats || []).length === 0 ? (
              <div className="p-12 text-center text-gray-500 text-sm italic">কোনো চ্যাট হিস্টোরি নেই</div>
            ) : (
              [...(data.chats || [])].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()).map(chat => (
                <button 
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`w-full p-4 sm:p-6 text-left hover:bg-white/[0.02] transition-all border-b border-white/5 flex flex-col gap-2 relative group ${
                    selectedChatId === chat.id ? 'bg-accent/5' : ''
                  }`}
                >
                  {selectedChatId === chat.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />}
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-sm text-gray-200 group-hover:text-accent transition-colors truncate max-w-[120px]">{chat.userName}</span>
                    <span className="text-[8px] text-gray-500 font-mono">{new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate leading-relaxed">{chat.messages[chat.messages.length - 1]?.text}</p>
                  {chat.status === 'Resolved' && <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest">Resolved</span>}
                </button>
              ))
            )}
          </div>
        </div>

        <div className={`flex-1 glass rounded-[2rem] overflow-hidden flex flex-col border border-white/5 relative ${
          !selectedChatId ? 'hidden lg:flex' : 'flex'
        }`}>
          {selectedChat ? (
            <>
              <div className="p-4 sm:p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                <div className="flex items-center gap-3 sm:gap-4">
                  <button onClick={() => setSelectedChatId(null)} className="lg:hidden p-2 text-gray-400">
                    <ChevronRight size={20} className="rotate-180" />
                  </button>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-accent/10 flex items-center justify-center text-accent font-bold text-lg sm:text-xl">
                    {selectedChat.userName[0]}
                  </div>
                  <div className="truncate max-w-[120px] sm:max-w-none">
                    <h4 className="font-bold text-sm sm:text-lg text-gray-200 truncate">{selectedChat.userName}</h4>
                    <p className="text-[10px] sm:text-xs text-gray-500 font-mono truncate">{selectedChat.userEmail}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setData(prev => {
                      const newData = {
                        ...prev,
                        chats: (prev.chats || []).map(c => c.id === selectedChat.id ? { ...c, status: 'Resolved' } : c)
                      };
                      syncToFirebase(newData);
                      return newData;
                    });
                  }}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-500/10 text-emerald-500 rounded-xl text-[10px] sm:text-xs font-bold hover:bg-emerald-500/20 transition-colors flex items-center gap-1 sm:gap-2"
                >
                  <CheckCircle size={12} className="sm:w-[14px] sm:h-[14px]" /> <span className="hidden sm:inline">Resolved মার্ক করুন</span><span className="sm:hidden">Resolved</span>
                </button>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 sm:space-y-6 custom-scrollbar bg-white/[0.01]">
                {selectedChat.messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] sm:max-w-[70%] p-3 sm:p-4 rounded-2xl text-xs sm:text-sm shadow-sm ${
                      msg.role === 'admin' 
                        ? 'bg-accent text-white rounded-tr-none' 
                        : 'bg-white/5 text-gray-300 rounded-tl-none border border-white/10'
                    }`}>
                      <p className="leading-relaxed">{msg.text}</p>
                      <span className="text-[8px] opacity-40 block mt-2 text-right font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSend} className="p-4 sm:p-6 bg-white/[0.02] border-t border-white/5 flex gap-2 sm:gap-4">
                <input 
                  type="text" 
                  placeholder="আপনার রিপ্লাই..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-sm focus:outline-none focus:border-accent transition-colors"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                />
                <button type="submit" className="w-12 h-12 sm:w-14 sm:h-14 bg-accent rounded-xl sm:rounded-2xl text-white flex items-center justify-center hover:shadow-lg hover:shadow-accent/20 transition-all active:scale-95">
                  <Send size={20} className="sm:w-[24px] sm:h-[24px]" />
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4 p-6 text-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[2rem] bg-white/5 flex items-center justify-center">
                <MessageCircle size={40} className="opacity-20 sm:w-[48px] sm:h-[48px]" />
              </div>
              <p className="font-display font-medium text-sm sm:text-base">একটি চ্যাট সিলেক্ট করে কথা শুরু করুন</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const AdminSettings = () => {
    const [settings, setSettings] = useState(data.settings || getAppData().settings);

    useEffect(() => {
      if (data.settings) {
        setSettings(data.settings);
      }
    }, [data.settings]);

    const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      setData(prev => {
        const newData = { ...prev, settings };
        syncToFirebase(newData);
        return newData;
      });
      alert('সেটিংস সফলভাবে সেভ করা হয়েছে!');
    };

    return (
      <div className="p-6 max-w-3xl space-y-8">
        <div>
          <h3 className="text-3xl font-display font-bold">সেটিংস</h3>
          <p className="text-xs text-gray-500 mt-1">আপনার ওয়েবসাইটের কনফিগারেশন এখান থেকে পরিবর্তন করুন</p>
        </div>

        <form onSubmit={handleSave} className="glass rounded-[2.5rem] p-8 sm:p-12 space-y-10 border border-white/5">
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <LayoutDashboard size={14} className="text-accent" /> সাধারণ সেটিংস
            </h4>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 ml-1">নোটিশ (Marquee Text)</label>
              <textarea 
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-accent min-h-[120px] transition-colors"
                value={settings.notice}
                onChange={e => setSettings({ ...settings, notice: e.target.value })}
                placeholder="ওয়েবসাইটের উপরে যে নোটিশটি দেখাবে তা এখানে লিখুন..."
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <ShoppingBag size={14} className="text-emerald-500" /> পেমেন্ট সেটিংস
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 ml-1">বিকাশ পার্সোনাল নাম্বার</label>
                <input 
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-accent transition-colors"
                  value={settings.bkash}
                  onChange={e => setSettings({ ...settings, bkash: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 ml-1">নগদ পার্সোনাল নাম্বার</label>
                <input 
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-accent transition-colors"
                  value={settings.nagad}
                  onChange={e => setSettings({ ...settings, nagad: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <MessageCircle size={14} className="text-blue-500" /> কন্টাক্ট সেটিংস
            </h4>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 ml-1">হোয়াটসঅ্যাপ নাম্বার (Country Code সহ)</label>
              <input 
                type="text"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-accent transition-colors"
                value={settings.whatsapp}
                onChange={e => setSettings({ ...settings, whatsapp: e.target.value })}
                placeholder="যেমন: 88017XXXXXXXX"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck size={14} className="text-rose-500" /> সিকিউরিটি সেটিংস
            </h4>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 ml-1">এডমিন প্যানেল পাসওয়ার্ড</label>
              <input 
                type="password"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-accent transition-colors"
                value={settings.adminPassword}
                onChange={e => setSettings({ ...settings, adminPassword: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <AlertCircle size={14} className="text-amber-500" /> মেইনটেন্যান্স মোড
            </h4>
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
              <div>
                <p className="text-sm font-bold">মেইনটেন্যান্স মোড অন/অফ</p>
                <p className="text-[10px] text-gray-500">এটি অন করলে সাধারণ ইউজাররা ওয়েবসাইট দেখতে পারবে না</p>
              </div>
              <button 
                type="button"
                onClick={() => setSettings({ ...settings, isMaintenance: !settings.isMaintenance })}
                className={`w-14 h-8 rounded-full relative transition-colors ${settings.isMaintenance ? 'bg-accent' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.isMaintenance ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>

          <button type="submit" className="w-full py-5 bg-gradient-to-r from-accent to-highlight rounded-2xl font-bold text-lg shadow-xl shadow-accent/20 hover:shadow-accent/40 transition-all active:scale-95">
            সেটিংস আপডেট করুন
          </button>
        </form>
      </div>
    );
  };

  // --- Main Layout ---

  if (isLoading || error) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          {error ? (
            <>
              <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} />
              </div>
              <h2 className="text-2xl font-display font-bold text-white mb-4">Connection Error</h2>
              <p className="text-gray-400 mb-8 leading-relaxed">
                {error}
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="px-8 py-3 bg-accent text-white rounded-2xl font-bold hover:shadow-lg hover:shadow-accent/20 transition-all active:scale-95"
              >
                Retry Connection
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <h2 className="text-2xl font-display font-bold text-white mb-2">PremiumZone</h2>
              <p className="text-gray-500 animate-pulse">লোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...</p>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans relative overflow-x-hidden transition-colors duration-500 ${
      designTheme === 'minimal' ? 'bg-slate-950 text-slate-200' : 'bg-primary text-white'
    }`}>
      {/* Background Glows */}
      <div className={`fixed top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full pointer-events-none z-0 transition-all duration-1000 ${
        designTheme === 'minimal' ? 'bg-sky-500/5' : 'bg-accent/10'
      }`} />
      <div className={`fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full pointer-events-none z-0 transition-all duration-1000 ${
        designTheme === 'minimal' ? 'bg-indigo-500/5' : 'bg-highlight/10'
      }`} />
      
      {/* Design Switcher */}
      <div className="fixed right-4 top-24 z-50 flex flex-col gap-2">
        <button 
          onClick={() => setDesignTheme(designTheme === 'premium' ? 'minimal' : 'premium')}
          className="w-12 h-12 glass rounded-full flex items-center justify-center text-accent shadow-xl border border-white/10 hover:scale-110 transition-all group"
          title="Change Design"
        >
          {designTheme === 'premium' ? <SettingsIcon size={20} /> : <LayoutDashboard size={20} />}
          <div className="absolute right-14 bg-accent text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            ডিজাইন পরিবর্তন করুন
          </div>
        </button>
      </div>
      <header className="sticky top-0 z-40 glass border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-accent to-highlight rounded-xl flex items-center justify-center shadow-lg shadow-highlight/20">
            <ShoppingBag className="text-white" size={20} />
          </div>
          <h1 className="text-xl font-display font-bold tracking-tight">Premium<span className="text-highlight">Zone</span></h1>
        </div>
        
        <div className="flex items-center gap-2">
          {!isAdmin && (
            <button 
              onClick={() => setShowAdminLogin(true)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Admin Panel"
            >
              <ShieldCheck size={20} />
            </button>
          )}
          {isAdmin && (
            <button 
              onClick={() => setIsAdmin(false)}
              className="px-3 py-1.5 bg-rose-500/10 text-rose-500 rounded-lg text-xs font-bold border border-rose-500/20"
            >
              এডমিন মোড অফ
            </button>
          )}
        </div>
      </header>

      {/* Marquee */}
      <div className="bg-accent/10 border-b border-white/5 py-2 overflow-hidden">
        <div className="animate-marquee text-xs font-medium text-accent px-4">
          {data.settings?.notice || ''}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        {(data.settings?.isMaintenance || false) && !isAdmin ? (
          <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-24 h-24 bg-amber-500/10 rounded-[2.5rem] flex items-center justify-center text-amber-500 mb-8 animate-pulse">
              <AlertCircle size={48} />
            </div>
            <h2 className="text-3xl font-display font-bold mb-4">ওয়েবসাইট মেইনটেন্যান্স চলছে</h2>
            <p className="text-gray-400 max-w-md mx-auto leading-relaxed">
              দুঃখিত! আমাদের ওয়েবসাইটে বর্তমানে কিছু কাজ চলছে। খুব শীঘ্রই আমরা আবার ফিরে আসবো। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন।
            </p>
            <div className="mt-8 flex gap-4">
              <a href={`https://wa.me/${data.settings?.whatsapp || ''}`} className="px-6 py-3 bg-white/5 rounded-xl text-sm font-bold hover:bg-white/10 transition-all">আমাদের সাথে যোগাযোগ করুন</a>
            </div>
          </div>
        ) : isAdmin ? (
          <div className="flex flex-col lg:flex-row min-h-[calc(100vh-120px)]">
            {/* Admin Sidebar (Desktop) */}
            <aside className="hidden lg:flex flex-col w-64 glass border-r border-white/10 p-4 gap-2">
              {[
                { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
                { id: 'orders', label: 'অর্ডার লিস্ট', icon: ClipboardList },
                { id: 'users', label: 'ইউজার লিস্ট', icon: Users },
                { id: 'products', label: 'প্রোডাক্টস', icon: Package },
                { id: 'chat', label: 'সাপোর্ট চ্যাট', icon: MessageCircle },
                { id: 'settings', label: 'সেটিংস', icon: SettingsIcon },
              ].map(item => (
                <button 
                  key={item.id}
                  onClick={() => setAdminTab(item.id as any)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    adminTab === item.id ? 'bg-accent text-white' : 'text-gray-400 hover:bg-white/5'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              ))}
            </aside>

            {/* Admin Mobile Nav */}
            <div className="lg:hidden flex overflow-x-auto p-2 glass border-b border-white/10 gap-2 no-scrollbar">
              {[
                { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
                { id: 'orders', label: 'অর্ডার', icon: ClipboardList },
                { id: 'users', label: 'ইউজার', icon: Users },
                { id: 'products', label: 'প্রোডাক্ট', icon: Package },
                { id: 'chat', label: 'চ্যাট', icon: MessageCircle },
                { id: 'settings', label: 'সেটিংস', icon: SettingsIcon },
              ].map(item => (
                <button 
                  key={item.id}
                  onClick={() => setAdminTab(item.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    adminTab === item.id ? 'bg-accent text-white' : 'text-gray-400 hover:bg-white/5'
                  }`}
                >
                  <item.icon size={14} />
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {adminTab === 'dashboard' && <AdminDashboard />}
              {adminTab === 'orders' && <AdminOrders />}
              {adminTab === 'products' && <AdminProducts />}
              {adminTab === 'users' && <AdminUsers />}
              {adminTab === 'chat' && <AdminChat />}
              {adminTab === 'settings' && <AdminSettings />}
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'home' && <HomeView />}
            {activeTab === 'orders' && <OrdersView />}
            {activeTab === 'profile' && <ProfileView />}
            {activeTab === 'chat' && <ChatView />}
          </>
        )}
      </main>

      {/* Bottom Navigation (User) */}
      {!isAdmin && (
        <nav className="fixed bottom-0 left-0 right-0 glass border-t border-white/10 px-6 py-3 flex justify-between items-center z-40">
          {[
            { id: 'home', label: 'হোম', icon: Home },
            { id: 'orders', label: 'অর্ডার', icon: ClipboardList },
            { id: 'chat', label: 'সাপোর্ট', icon: MessageCircle },
            { id: 'profile', label: 'প্রোফাইল', icon: UserIcon },
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center gap-1 transition-all ${
                activeTab === item.id ? 'text-accent scale-110' : 'text-gray-400'
              }`}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Floating WhatsApp */}
      <a 
        href={`https://wa.me/${data.settings?.whatsapp || ''}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-24 right-4 w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 z-30 hover:scale-110 transition-transform active:scale-95"
      >
        <MessageCircle className="text-white" size={28} />
      </a>

      {/* Modals */}
      <AnimatePresence>
        {/* Login Modal */}
        {showLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowLogin(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-dark w-full max-w-md rounded-3xl p-8 relative z-10"
            >
              <h2 className="text-2xl font-display font-bold mb-6 text-center">লগইন করুন</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">ইমেইল</label>
                  <input name="email" type="email" required className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-accent" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">পাসওয়ার্ড</label>
                  <input name="password" type="password" required className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-accent" />
                </div>
                <button type="submit" className="w-full py-4 bg-accent rounded-2xl font-bold mt-4 hover:shadow-lg hover:shadow-accent/20 transition-all">লগইন</button>
              </form>
              <p className="text-center text-sm text-gray-400 mt-6">
                একাউন্ট নেই? <button onClick={() => { setShowLogin(false); setShowRegister(true); }} className="text-highlight font-bold">রেজিস্ট্রেশন করুন</button>
              </p>
            </motion.div>
          </div>
        )}

        {/* Register Modal */}
        {showRegister && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowRegister(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-dark w-full max-w-md rounded-3xl p-8 relative z-10"
            >
              <h2 className="text-2xl font-display font-bold mb-6 text-center">রেজিস্ট্রেশন করুন</h2>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">নাম</label>
                  <input name="name" type="text" required className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-accent" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">ইমেইল</label>
                  <input name="email" type="email" required className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-accent" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">পাসওয়ার্ড</label>
                  <input name="password" type="password" required className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-accent" />
                </div>
                <button type="submit" className="w-full py-4 bg-accent rounded-2xl font-bold mt-4 hover:shadow-lg hover:shadow-accent/20 transition-all">রেজিস্ট্রেশন</button>
              </form>
              <p className="text-center text-sm text-gray-400 mt-6">
                ইতিমধ্যে একাউন্ট আছে? <button onClick={() => { setShowRegister(false); setShowLogin(true); }} className="text-highlight font-bold">লগইন করুন</button>
              </p>
            </motion.div>
          </div>
        )}

        {/* Admin Login Modal */}
        {showAdminLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAdminLogin(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-dark w-full max-w-sm rounded-3xl p-8 relative z-10"
            >
              <h2 className="text-2xl font-display font-bold mb-6 text-center">এডমিন লগইন</h2>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">এডমিন পাসওয়ার্ড</label>
                  <input name="password" type="password" required className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-accent" />
                </div>
                <button type="submit" className="w-full py-4 bg-accent rounded-2xl font-bold mt-4 hover:shadow-lg hover:shadow-accent/20 transition-all">লগইন</button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Order Modal */}
        {showOrderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowOrderModal(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
              className="glass-dark w-full max-w-lg rounded-[2.5rem] p-6 sm:p-10 relative z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-display font-bold">অর্ডার কনফার্ম করুন</h2>
                <button onClick={() => setShowOrderModal(null)} className="p-2 text-gray-400 hover:text-white transition-colors"><X size={24} /></button>
              </div>

              <div className="flex gap-6 mb-8 p-6 bg-white/[0.02] rounded-3xl border border-white/5">
                <div className="w-20 h-20 bg-white/5 rounded-2xl p-4 flex items-center justify-center">
                  <img src={showOrderModal.image} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <h4 className="text-xl font-bold mb-1">{showOrderModal.name}</h4>
                  <p className="text-sm text-accent font-bold mb-2">৳{showOrderModal.price} / {showOrderModal.duration}</p>
                  <p className="text-xs text-gray-500">স্টক এভেলেবল: <span className={showOrderModal.stock > 0 ? 'text-success font-bold' : 'text-danger'}>{showOrderModal.stock} টি</span></p>
                </div>
              </div>

              <form onSubmit={(e) => placeOrder(e, showOrderModal, quantity)} className="space-y-6">
                <div className="p-6 bg-white/[0.02] rounded-3xl border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-400">অর্ডার পরিমাণ</span>
                    <div className="flex items-center gap-6">
                      <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors">-</button>
                      <span className="text-xl font-bold w-6 text-center">{quantity}</span>
                      <button type="button" onClick={() => setQuantity(Math.min(showOrderModal.stock, quantity + 1))} className="w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors">+</button>
                    </div>
                  </div>
                  {quantity >= showOrderModal.stock && <p className="text-[10px] text-danger font-bold text-center uppercase tracking-widest">সর্বোচ্চ স্টক লিমিট পৌঁছেছে</p>}
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">পেমেন্ট মেথড সিলেক্ট করুন</label>
                  <div className="grid grid-cols-2 gap-4">
                    {['bKash', 'Nagad'].map(method => (
                      <label key={method} className="relative cursor-pointer group">
                        <input 
                          type="radio" 
                          name="paymentMethod" 
                          value={method} 
                          checked={selectedMethod === method} 
                          onChange={() => setSelectedMethod(method as any)}
                          className="peer sr-only" 
                        />
                        <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] text-center font-bold peer-checked:border-accent peer-checked:bg-accent/10 peer-checked:text-accent transition-all group-hover:bg-white/5">
                          {method}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="p-6 bg-accent/5 border border-accent/20 rounded-3xl space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">আমাদের পেমেন্ট নাম্বার:</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-accent">
                        {selectedMethod === 'bKash' ? (data.settings?.bkash || '') : (data.settings?.nagad || '')}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => { 
                          const num = selectedMethod === 'bKash' ? (data.settings?.bkash || '') : (data.settings?.nagad || '');
                          navigator.clipboard.writeText(num); 
                          alert('নাম্বার কপি করা হয়েছে!'); 
                        }} 
                        className="p-2 bg-accent/10 rounded-lg text-accent hover:bg-accent/20 transition-colors"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 text-center italic leading-relaxed">উপরের নাম্বারে <span className="text-accent font-bold">সেন্ড মানি</span> করার পর নিচের তথ্যগুলো দিয়ে অর্ডার কনফার্ম করুন।</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">হোয়াটসঅ্যাপ নাম্বার</label>
                    <input name="whatsapp" type="text" required placeholder="017XXXXXXXX" className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-accent transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">সেন্ডার নাম্বার</label>
                    <input name="senderNumber" type="text" required placeholder="01XXXXXXXXX" className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-accent transition-colors" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Transaction ID (TrxID)</label>
                  <input name="trxId" type="text" required placeholder="8N7X6W5V4U" className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-accent transition-colors" />
                </div>

                <button 
                  type="submit" 
                  disabled={quantity > showOrderModal.stock}
                  className="w-full py-5 bg-gradient-to-r from-accent to-highlight rounded-2xl font-bold text-lg shadow-xl shadow-accent/20 hover:shadow-accent/40 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                >
                  অর্ডার কনফার্ম করুন (৳{showOrderModal.price * quantity})
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Product Add/Edit Modal */}
        {(showProductEditModal || showAddProductModal) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setShowProductEditModal(null); setShowAddProductModal(false); }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-dark w-full max-w-2xl rounded-[2.5rem] p-8 sm:p-12 relative z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-display font-bold">
                  {showProductEditModal ? 'প্রোডাক্ট এডিট' : 'নতুন প্রোডাক্ট'}
                </h2>
                <button onClick={() => { setShowProductEditModal(null); setShowAddProductModal(false); }} className="p-2 text-gray-400 hover:text-white transition-colors"><X size={24} /></button>
              </div>

              <form onSubmit={(e) => saveProduct(e, showProductEditModal?.id)} className="space-y-8">
                <div className="space-y-4">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">প্রোডাক্ট ইমেজ সিলেক্ট করুন</label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                    {[
                      'premium', 'basic', 'ultimate', 'gold', 'silver', 'diamond', 'star', 'crown',
                      'rocket', 'fire', 'bolt', 'gem', 'trophy', 'target', 'shield', 'heart'
                    ].map(seed => {
                      const url = `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}`;
                      return (
                        <button 
                          key={seed}
                          type="button"
                          onClick={() => {
                            const input = document.getElementById('product-image-input') as HTMLInputElement;
                            if (input) input.value = url;
                          }}
                          className="aspect-square glass rounded-2xl p-2 hover:bg-white/10 transition-all border-2 border-transparent focus:border-accent group"
                        >
                          <img src={url} alt="" className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
                        </button>
                      );
                    })}
                  </div>
                  <div className="relative">
                    <input 
                      id="product-image-input"
                      name="image" 
                      placeholder="অথবা কাস্টম ইমেজ URL দিন..." 
                      defaultValue={showProductEditModal?.image} 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-accent transition-colors" 
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 uppercase font-bold">Custom URL</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">প্রোডাক্ট নাম</label>
                    <input name="name" defaultValue={showProductEditModal?.name} required placeholder="যেমন: Netflix Premium" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-accent transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">মেয়াদ/পরিমাণ</label>
                    <input name="duration" defaultValue={showProductEditModal?.duration} required placeholder="যেমন: ১ মাস" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-accent transition-colors" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">প্রোডাক্ট বিবরণ</label>
                  <textarea name="description" defaultValue={showProductEditModal?.description} required placeholder="প্রোডাক্ট সম্পর্কে বিস্তারিত লিখুন..." className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-accent transition-colors min-h-[100px]" />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">মূল্য (৳)</label>
                    <input name="price" type="number" defaultValue={showProductEditModal?.price} required className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-accent transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">স্টক পরিমাণ</label>
                    <input name="stock" type="number" defaultValue={showProductEditModal?.stock} required className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-accent transition-colors" />
                  </div>
                </div>

                <button type="submit" className="w-full py-5 bg-accent rounded-2xl font-bold text-lg shadow-xl shadow-accent/20 hover:shadow-accent/40 transition-all active:scale-95">
                  সেভ করুন
                </button>
              </form>
            </motion.div>
          </div>
        )}
        {/* Rejection Modal */}
        {showRejectionModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowRejectionModal(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-dark w-full max-w-md rounded-3xl p-8 relative z-10"
            >
              <h2 className="text-2xl font-display font-bold mb-4">অর্ডার রিজেক্ট করুন</h2>
              <p className="text-sm text-gray-400 mb-6">রিজেক্ট করার কারণটি লিখুন (এটি ইউজার দেখতে পারবে):</p>
              <form onSubmit={(e) => {
                e.preventDefault();
                const reason = (e.currentTarget.querySelector('textarea') as HTMLTextAreaElement).value;
                updateOrderStatus(showRejectionModal, 'Rejected', reason);
              }} className="space-y-4">
                <textarea 
                  required 
                  placeholder="যেমন: ভুল TrxID বা পেমেন্ট পাওয়া যায়নি..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-danger min-h-[120px]"
                />
                <div className="flex gap-4">
                  <button type="button" onClick={() => setShowRejectionModal(null)} className="flex-1 py-3 bg-white/5 rounded-xl font-bold">বাতিল</button>
                  <button type="submit" className="flex-1 py-3 bg-danger rounded-xl font-bold">কনফার্ম রিজেক্ট</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
