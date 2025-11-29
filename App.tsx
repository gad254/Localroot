
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  User, UserRole, UserStatus, Product, Message, ViewState, RecipeSuggestion, Review
} from './types';
import { generateProductDescription, suggestRecipe, smartSearch } from './services/geminiService';
import ChatInterface from './components/ChatInterface';
import { 
  ShoppingBasket, MapPin, User as UserIcon, MessageSquare, 
  Menu, X, Plus, Search, Sparkles, ChefHat, Heart, Star, LogOut,
  ThumbsUp, ArrowLeft, Edit2, Check, X as XIcon, Calendar, Filter, Tag, Mail, Upload, Image as ImageIcon,
  ChevronLeft, ChevronRight, List, Sprout, ShieldCheck, Lock, Eye, EyeOff, UserCheck, UserX, RotateCcw,
  AlertCircle, Timer, BadgeCheck, Send, ArrowRight
} from 'lucide-react';

// --- MOCK DATA INITIALIZATION ---
const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Alice Consumer', email: 'alice@test.com', role: UserRole.CONSUMER, location: 'San Francisco, CA', avatarUrl: 'https://picsum.photos/100/100?random=1', status: UserStatus.APPROVED, isVerified: true, password: 'password' },
  { id: 'u2', name: 'Green Valley Farm', email: 'farm@test.com', role: UserRole.PRODUCER, location: 'Petaluma, CA', bio: 'Certified organic vegetables since 1998.', avatarUrl: 'https://picsum.photos/100/100?random=2', status: UserStatus.APPROVED, isVerified: true, password: 'password' },
  { id: 'u3', name: 'Bob\'s Honey', email: 'bob@test.com', role: UserRole.PRODUCER, location: 'Napa, CA', bio: 'Raw, unfiltered honey from local wildflowers.', avatarUrl: 'https://picsum.photos/100/100?random=3', status: UserStatus.APPROVED, isVerified: true, password: 'password' },
  { id: 'u4', name: 'Admin User', email: 'admin@test.com', role: UserRole.ADMIN, location: 'Cloud', avatarUrl: 'https://picsum.photos/100/100?random=4', status: UserStatus.APPROVED, isVerified: true, password: 'password' },
];

const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', producerId: 'u2', name: 'Heirloom Tomatoes', description: 'Juicy, colorful mix of heirloom tomatoes.', price: 4.50, unit: 'lb', category: 'Vegetables', imageUrl: 'https://picsum.photos/400/300?random=10', inStock: true, organic: true, availableFrom: '2024-06-01', availableUntil: '2024-09-30' },
  { id: 'p2', producerId: 'u2', name: 'Fresh Kale', description: 'Crunchy, dark green kale bunches.', price: 3.00, unit: 'bunch', category: 'Vegetables', imageUrl: 'https://picsum.photos/400/300?random=11', inStock: true, organic: true },
  { id: 'p3', producerId: 'u3', name: 'Wildflower Honey', description: 'Sweet, floral honey. Perfect for tea.', price: 12.00, unit: 'jar', category: 'Pantry', imageUrl: 'https://picsum.photos/400/300?random=12', inStock: true, organic: true },
  { id: 'p4', producerId: 'u2', name: 'Farm Eggs', description: 'Free-range eggs with golden yolks.', price: 8.00, unit: 'dozen', category: 'Dairy & Eggs', imageUrl: 'https://picsum.photos/400/300?random=13', inStock: false, organic: false },
];

const MOCK_MESSAGES: Message[] = [
  { id: 'm1', senderId: 'u1', receiverId: 'u2', content: 'Do you have tomatoes this week?', timestamp: Date.now() - 100000 },
  { id: 'm2', senderId: 'u2', receiverId: 'u1', content: 'Yes! Just harvested this morning.', timestamp: Date.now() - 90000 },
];

const MOCK_REVIEWS: Review[] = [
  { id: 'r1', producerId: 'u2', userId: 'u1', userName: 'Alice Consumer', rating: 5, comment: 'Amazing tomatoes! Tastes like summer.', timestamp: Date.now() - 1000000 },
  { id: 'r2', producerId: 'u2', userId: 'u4', userName: 'Admin User', rating: 4, comment: 'Great quality, but limited stock sometimes.', timestamp: Date.now() - 2000000 },
  { id: 'r3', producerId: 'u3', userId: 'u1', userName: 'Alice Consumer', rating: 5, comment: 'Best honey I have ever had.', timestamp: Date.now() - 500000 },
];

// Helper Component for Verified Badge
const VerifiedBadge = () => (
  <span className="inline-flex items-center ml-1 bg-blue-100 text-blue-600 rounded-full px-1 py-0.5" title="Verified Producer">
    <BadgeCheck size={14} fill="currentColor" className="text-blue-500 bg-white rounded-full" />
  </span>
);

const App: React.FC = () => {
  // --- STATE ---
  const [showSplash, setShowSplash] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [reviews, setReviews] = useState<Review[]>(MOCK_REVIEWS);
  const [currentView, setCurrentView] = useState<ViewState>('MARKETPLACE');
  
  // Auth State
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP' | 'VERIFY'>('LOGIN');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupData, setSignupData] = useState({ name: '', email: '', password: '', role: UserRole.CONSUMER, location: '', bio: '' });
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pendingUser, setPendingUser] = useState<Partial<User> | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [smartKeywords, setSmartKeywords] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProducer, setSelectedProducer] = useState<User | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [aiRecipe, setAiRecipe] = useState<RecipeSuggestion | null>(null);
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [isSearchingSmart, setIsSearchingSmart] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Producer Form State
  const [newProdName, setNewProdName] = useState('');
  const [newProdCat, setNewProdCat] = useState('Vegetables');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdAvailableFrom, setNewProdAvailableFrom] = useState('');
  const [newProdAvailableUntil, setNewProdAvailableUntil] = useState('');
  const [newProdImage, setNewProdImage] = useState<string | null>(null);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Producer Dashboard View State
  const [inventoryView, setInventoryView] = useState<'LIST' | 'CALENDAR'>('LIST');
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Producer Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editBio, setEditBio] = useState('');

  // Review Form State
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);

  // Admin Dashboard State
  const [adminTab, setAdminTab] = useState<'PENDING' | 'REJECTED'>('PENDING');

  // --- ACTIONS ---

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Resend code countdown timer
  useEffect(() => {
    let interval: number;
    if (resendCountdown > 0 && authMode === 'VERIFY') {
      interval = window.setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCountdown, authMode]);

  // --- AUTH ACTIONS ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    // Demo backdoor for admin
    if (loginEmail === 'admin@test.com' && loginPassword === 'password') {
      const admin = users.find(u => u.email === 'admin@test.com');
      if (admin) {
        setCurrentUser(admin);
        setCurrentView('ADMIN');
        return;
      }
    }

    const user = users.find(u => u.email.toLowerCase() === loginEmail.toLowerCase());
    
    if (!user) {
      setAuthError('User not found. Please sign up.');
      return;
    }

    if (user.password !== loginPassword) {
      setAuthError('Incorrect password.');
      return;
    }

    if (user.status === UserStatus.PENDING) {
      setAuthError('Your account is currently PENDING approval. Please check back later.');
      return;
    }

    if (user.status === UserStatus.REJECTED) {
      setAuthError('Your account request has been declined.');
      return;
    }

    setCurrentUser(user);
    if (user.role === UserRole.ADMIN) {
      setCurrentView('ADMIN');
    } else if (user.role === UserRole.PRODUCER) {
      setCurrentView('DASHBOARD');
    } else {
      setCurrentView('MARKETPLACE');
    }
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (users.some(u => u.email.toLowerCase() === signupData.email.toLowerCase())) {
      setAuthError('Email already exists.');
      return;
    }

    if (signupData.password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    // Generate code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedCode(code);
    
    // Mock Send Email (Also shown in UI now)
    // alert(`[MOCK EMAIL SERVER]\nTo: ${signupData.email}\nSubject: Verify your LocalRoots account\n\nYour security code is: ${code}`);

    setPendingUser({
      ...signupData,
      status: UserStatus.PENDING,
      isVerified: false
    });
    setResendCountdown(30);
    setAuthMode('VERIFY');
  };

  const handleResendCode = () => {
    if (resendCountdown > 0) return;
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedCode(code);
    setResendCountdown(30);
    // alert(`[MOCK EMAIL SERVER]\nTo: ${pendingUser?.email}\nSubject: NEW Security Code\n\nYour new code is: ${code}`);
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (verificationCode === generatedCode) {
      // Create User
      const newUser: User = {
        id: `u${Date.now()}`,
        name: pendingUser?.name || '',
        email: pendingUser?.email || '',
        role: pendingUser?.role || UserRole.CONSUMER,
        location: pendingUser?.location,
        bio: pendingUser?.bio,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(pendingUser?.name || '')}&background=random`,
        status: UserStatus.PENDING, // STILL PENDING UNTIL ADMIN APPROVES
        isVerified: true,
        password: pendingUser?.password
      };

      setUsers(prev => [...prev, newUser]);
      setAuthMode('LOGIN');
      setLoginEmail(newUser.email);
      setLoginPassword('');
      setVerificationCode('');
      setSignupData({ name: '', email: '', password: '', role: UserRole.CONSUMER, location: '', bio: '' });
      
      // Success Message
      alert("Email verified successfully! Your account has been created and is now waiting for Admin approval.");
    } else {
      setAuthError('Invalid code. Please try again.');
    }
  };

  const handleAdminAction = (userId: string, action: 'APPROVE' | 'REJECT') => {
    const userToUpdate = users.find(u => u.id === userId);
    if (!userToUpdate) return;

    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          status: action === 'APPROVE' ? UserStatus.APPROVED : UserStatus.REJECTED
        };
      }
      return u;
    }));

    // Mock Email Notification
    const subject = action === 'APPROVE' ? 'Account Approved' : 'Account Update';
    const body = action === 'APPROVE' 
      ? `Congratulations! Your LocalRoots account has been approved. You can now log in.`
      : `We regret to inform you that your LocalRoots account request has been declined.`;
    
    alert(`[MOCK EMAIL SERVER]\nTo: ${userToUpdate.email}\nSubject: ${subject}\n\n${body}`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('MARKETPLACE');
    setAuthMode('LOGIN');
    setLoginEmail('');
    setLoginPassword('');
    setActiveConversationId(null);
  };

  // --- MARKETPLACE ACTIONS ---
  const handleSmartSearch = async () => {
    if (!searchTerm.trim()) return;
    setIsSearchingSmart(true);
    setSmartKeywords([]);
    
    const keywords = await smartSearch(searchTerm);
    setSmartKeywords(keywords);
    setIsSearchingSmart(false);
  };

  const handleAiRecipe = async () => {
    setIsGeneratingRecipe(true);
    const suggestion = await suggestRecipe(filteredProducts.slice(0, 5));
    setAiRecipe(suggestion);
    setIsGeneratingRecipe(false);
  };

  const toggleWishlist = (productId: string) => {
    setWishlist(prev => 
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const getProducerRating = (producerId: string) => {
    const producerReviews = reviews.filter(r => r.producerId === producerId);
    if (producerReviews.length === 0) return 0;
    const sum = producerReviews.reduce((acc, r) => acc + r.rating, 0);
    return sum / producerReviews.length;
  };

  const getProducerReviewCount = (producerId: string) => {
    return reviews.filter(r => r.producerId === producerId).length;
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex text-yellow-400">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={14} fill={i < Math.round(rating) ? "currentColor" : "none"} className={i < Math.round(rating) ? "" : "text-gray-300"} />
        ))}
      </div>
    );
  };

  const handleContactProducer = (producerId: string) => {
    setActiveConversationId(producerId);
    setSelectedProducer(null); // Close modal
    setCurrentView('MESSAGES');
  };

  // --- PRODUCER ACTIONS ---
  const handleGenerateDescription = async () => {
    if (!newProdName.trim()) return;
    setIsGeneratingDesc(true);
    const desc = await generateProductDescription(newProdName, newProdCat);
    setNewProdDesc(desc);
    setIsGeneratingDesc(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProdImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddProduct = () => {
    if (!newProdName || !newProdPrice) return;
    
    if (editingProductId) {
      setProducts(prev => prev.map(p => p.id === editingProductId ? {
        ...p,
        name: newProdName,
        category: newProdCat,
        description: newProdDesc,
        price: parseFloat(newProdPrice),
        availableFrom: newProdAvailableFrom,
        availableUntil: newProdAvailableUntil,
        imageUrl: newProdImage || p.imageUrl
      } : p));
      setEditingProductId(null);
    } else {
      const newProduct: Product = {
        id: `p${Date.now()}`,
        producerId: currentUser?.id || '',
        name: newProdName,
        category: newProdCat,
        description: newProdDesc || 'Fresh local product.',
        price: parseFloat(newProdPrice),
        unit: 'unit',
        imageUrl: newProdImage || `https://picsum.photos/400/300?random=${Date.now()}`,
        inStock: true,
        availableFrom: newProdAvailableFrom,
        availableUntil: newProdAvailableUntil,
        organic: true
      };
      setProducts([...products, newProduct]);
    }
    // Reset Form
    setNewProdName('');
    setNewProdDesc('');
    setNewProdPrice('');
    setNewProdAvailableFrom('');
    setNewProdAvailableUntil('');
    setNewProdImage(null);
  };

  const handleSaveProfile = () => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, name: editName, location: editLocation, bio: editBio };
    setCurrentUser(updatedUser);
    setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
    setIsEditingProfile(false);
  };

  // --- REVIEW ACTIONS ---
  const handleAddReview = () => {
    if (!selectedProducer || !currentUser) return;
    
    const newReview: Review = {
      id: `r${Date.now()}`,
      producerId: selectedProducer.id,
      userId: currentUser.id,
      userName: currentUser.name,
      rating: newReviewRating,
      comment: newReviewComment,
      timestamp: Date.now()
    };
    
    setReviews([newReview, ...reviews]);
    setNewReviewComment('');
    setNewReviewRating(5);
    setIsReviewFormOpen(false);
  };

  // --- CALENDAR LOGIC ---
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  };

  const checkProductAvailableOnDate = (product: Product, checkDate: Date): boolean => {
    if (!product.availableFrom || !product.availableUntil) return true;
    
    // Normalize to YYYY-MM-DD for comparison to avoid timezone issues
    const format = (d: Date) => d.toISOString().split('T')[0];
    const target = format(checkDate);
    const start = product.availableFrom; // Already YYYY-MM-DD
    const end = product.availableUntil; // Already YYYY-MM-DD
    
    return target >= start && target <= end;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Vegetables': return 'bg-green-100 text-green-800 border-green-200';
      case 'Fruits': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Dairy & Eggs': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Pantry': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // --- FILTER LOGIC ---
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const producer = users.find(u => u.id === p.producerId);
    const matchesProducerBio = producer?.bio?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                               producer?.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSmart = smartKeywords.length > 0 ? smartKeywords.some(kw => 
      p.category.toLowerCase().includes(kw.toLowerCase()) || p.name.toLowerCase().includes(kw.toLowerCase())
    ) : true;

    const matchesDate = showAvailableOnly ? (() => {
      const today = new Date().toISOString().split('T')[0];
      // Use filterStartDate if set, otherwise default to Today
      const start = filterStartDate || today;
      // If user sets an end date, use it. If not, we assume they are checking availability on the Start Date (single day check)
      const end = filterEndDate || start;
      
      return (!p.availableFrom || p.availableFrom <= end) && 
             (!p.availableUntil || p.availableUntil >= start);
    })() : true;

    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;

    return (matchesSearch || matchesProducerBio) && matchesSmart && matchesDate && matchesCategory;
  });

  // --- RENDER FUNCTIONS ---
  const renderProducerCalendar = () => {
    const { days, firstDay } = getDaysInMonth(calendarDate);
    const monthYear = calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    const myProducts = products.filter(p => p.producerId === currentUser?.id);
    
    const gridDays = [];
    for (let i = 0; i < firstDay; i++) gridDays.push(null);
    for (let i = 1; i <= days; i++) gridDays.push(i);

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-fadeIn">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">{monthYear}</h2>
          <div className="flex gap-2">
            <button onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() - 1)))} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft size={20}/></button>
            <button onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() + 1)))} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight size={20}/></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2 mb-2 text-center text-sm font-medium text-gray-500">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {gridDays.map((day, idx) => (
            <div key={idx} className={`min-h-[100px] border rounded-lg p-1 ${day ? 'bg-white' : 'bg-gray-50 border-transparent'}`}>
              {day && (
                <>
                  <div className="text-right text-xs text-gray-400 mb-1">{day}</div>
                  <div className="flex flex-col gap-1">
                    {myProducts.filter(p => checkProductAvailableOnDate(p, new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day))).slice(0, 3).map(p => (
                      <div key={p.id} className={`text-[10px] px-1 py-0.5 rounded truncate border ${getCategoryColor(p.category)}`}>
                        {p.name}
                      </div>
                    ))}
                    {myProducts.filter(p => checkProductAvailableOnDate(p, new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day))).length > 3 && (
                      <div className="text-[10px] text-gray-400 text-center">+ more</div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // --- SPLASH SCREEN ---
  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-leaf-600 to-leaf-900 flex flex-col items-center justify-center z-50">
        <div className="animate-[bounce_2s_infinite]">
          <Sprout size={80} className="text-white mb-4" />
        </div>
        <h1 className="text-4xl font-bold text-white tracking-widest animate-[pulse_3s_infinite]">
          LocalRoots
        </h1>
        <p className="text-leaf-100 mt-2 text-sm tracking-wide">From Farm to Your Table</p>
      </div>
    );
  }

  // --- LOGIN SCREEN ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 animate-fadeIn">
          <div className="flex justify-center mb-6">
            <div className="bg-leaf-100 p-3 rounded-full">
              <Sprout size={32} className="text-leaf-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-1">
            {authMode === 'LOGIN' ? 'Welcome Back' : authMode === 'SIGNUP' ? 'Join LocalRoots' : 'Verify Email'}
          </h1>
          <p className="text-center text-gray-500 mb-8 text-sm">Connect with your local food community</p>

          {authError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {authError}
            </div>
          )}

          {authMode === 'LOGIN' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full pl-10 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-leaf-500 focus:outline-none" placeholder="you@example.com" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input type={showPassword ? "text" : "password"} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full pl-10 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-leaf-500 focus:outline-none" placeholder="••••••••" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                  </button>
                </div>
              </div>
              <button type="submit" className="w-full bg-leaf-600 text-white py-3 rounded-xl font-medium hover:bg-leaf-700 transition-colors shadow-lg shadow-leaf-200">Sign In</button>
              <p className="text-center text-sm text-gray-600 mt-4">
                Don't have an account? <button type="button" onClick={() => setAuthMode('SIGNUP')} className="text-leaf-600 font-semibold hover:underline">Sign up</button>
              </p>
            </form>
          ) : authMode === 'SIGNUP' ? (
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                   <select className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-leaf-500" value={signupData.role} onChange={(e) => setSignupData({...signupData, role: e.target.value as UserRole})}>
                     <option value={UserRole.CONSUMER}>Consumer</option>
                     <option value={UserRole.PRODUCER}>Producer</option>
                   </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input type="text" value={signupData.name} onChange={e => setSignupData({...signupData, name: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-leaf-500" placeholder="Your Name" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={signupData.email} onChange={e => setSignupData({...signupData, email: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-leaf-500" placeholder="you@example.com" required />
              </div>
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" value={signupData.password} onChange={e => setSignupData({...signupData, password: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-leaf-500" placeholder="Min. 6 chars" required />
              </div>
              {signupData.role === UserRole.PRODUCER && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input type="text" value={signupData.location} onChange={e => setSignupData({...signupData, location: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-leaf-500" placeholder="City, State" required />
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bio (for approval)</label>
                    <textarea value={signupData.bio} onChange={e => setSignupData({...signupData, bio: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-leaf-500" placeholder="Tell us about your farm..." rows={2} required />
                  </div>
                </>
              )}
              <button type="submit" className="w-full bg-leaf-600 text-white py-3 rounded-xl font-medium hover:bg-leaf-700 transition-colors shadow-lg shadow-leaf-200">Create Account</button>
              <p className="text-center text-sm text-gray-600 mt-4">
                Already have an account? <button type="button" onClick={() => setAuthMode('LOGIN')} className="text-leaf-600 font-semibold hover:underline">Log in</button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerifySubmit} className="space-y-6">
              <div className="text-center">
                 <p className="text-sm text-gray-600 mb-4">We sent a 4-digit code to <span className="font-semibold">{pendingUser?.email}</span></p>
                 
                 {/* DEMO HINT TO FIX ISSUE */}
                 <div className="bg-blue-50 border border-blue-100 text-blue-600 px-4 py-2 rounded-lg mb-4 text-xs text-center">
                   <span className="font-bold">DEMO HINT:</span> Since this is a demo, your code is 
                   <span className="font-mono font-bold text-lg ml-2">{generatedCode}</span>
                 </div>

                 <input type="text" maxLength={4} value={verificationCode} onChange={e => setVerificationCode(e.target.value.replace(/\D/g,''))} className="w-32 text-center text-3xl tracking-[0.5em] p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-leaf-500 font-mono mx-auto block" placeholder="0000" />
              </div>
              <div className="flex flex-col gap-3">
                <button type="submit" className="w-full bg-leaf-600 text-white py-3 rounded-xl font-medium hover:bg-leaf-700 transition-colors">Verify Email</button>
                <button type="button" onClick={handleResendCode} disabled={resendCountdown > 0} className={`w-full py-3 rounded-xl font-medium border border-gray-200 transition-colors flex items-center justify-center gap-2 ${resendCountdown > 0 ? 'text-gray-400 cursor-not-allowed bg-gray-50' : 'text-gray-700 hover:bg-gray-50'}`}>
                   {resendCountdown > 0 ? (
                     <><Timer size={18} /> Resend in {resendCountdown}s</>
                   ) : (
                     <><RotateCcw size={18} /> Resend Code</>
                   )}
                </button>
              </div>
              <button type="button" onClick={() => setAuthMode('SIGNUP')} className="block w-full text-center text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // --- MAIN APP ---
  return (
    <div className="flex h-screen bg-gray-50">
      {/* SIDEBAR */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col z-20 shadow-xl`}>
        <div className="p-4 flex items-center justify-between h-16 border-b border-gray-200">
          <div className={`flex items-center gap-2 ${!isSidebarOpen && 'justify-center w-full'}`}>
             <Sprout className="text-leaf-600" size={28} />
             {isSidebarOpen && <span className="font-bold text-lg text-gray-800">LocalRoots</span>}
          </div>
          {isSidebarOpen && (
            <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg lg:hidden">
              <ChevronLeft size={20} />
            </button>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-2">
          {currentUser.role !== 'ADMIN' && (
            <button 
              onClick={() => setCurrentView('MARKETPLACE')}
              className={`w-full p-3 rounded-xl flex items-center gap-3 transition-colors ${currentView === 'MARKETPLACE' ? 'bg-leaf-50 text-leaf-700' : 'text-gray-600 hover:bg-gray-100'} ${!isSidebarOpen && 'justify-center'}`}
            >
              <ShoppingBasket size={22} />
              {isSidebarOpen && <span>Marketplace</span>}
            </button>
          )}
          
          {currentUser.role === 'CONSUMER' && (
            <button 
              onClick={() => setCurrentView('WISHLIST')}
              className={`w-full p-3 rounded-xl flex items-center gap-3 transition-colors ${currentView === 'WISHLIST' ? 'bg-leaf-50 text-leaf-700' : 'text-gray-600 hover:bg-gray-100'} ${!isSidebarOpen && 'justify-center'}`}
            >
              <Heart size={22} />
              {isSidebarOpen && <span>Wishlist</span>}
            </button>
          )}

          {currentUser.role === 'PRODUCER' && (
            <button 
              onClick={() => setCurrentView('DASHBOARD')}
              className={`w-full p-3 rounded-xl flex items-center gap-3 transition-colors ${currentView === 'DASHBOARD' ? 'bg-leaf-50 text-leaf-700' : 'text-gray-600 hover:bg-gray-100'} ${!isSidebarOpen && 'justify-center'}`}
            >
              <List size={22} />
              {isSidebarOpen && <span>My Products</span>}
            </button>
          )}

          {currentUser.role === 'ADMIN' && (
             <button 
              onClick={() => setCurrentView('ADMIN')}
              className={`w-full p-3 rounded-xl flex items-center gap-3 transition-colors ${currentView === 'ADMIN' ? 'bg-leaf-50 text-leaf-700' : 'text-gray-600 hover:bg-gray-100'} ${!isSidebarOpen && 'justify-center'}`}
            >
              <ShieldCheck size={22} />
              {isSidebarOpen && <span>Admin Panel</span>}
            </button>
          )}

          <button 
            onClick={() => setCurrentView('MESSAGES')}
            className={`w-full p-3 rounded-xl flex items-center gap-3 transition-colors ${currentView === 'MESSAGES' ? 'bg-leaf-50 text-leaf-700' : 'text-gray-600 hover:bg-gray-100'} ${!isSidebarOpen && 'justify-center'}`}
          >
            <MessageSquare size={22} />
            {isSidebarOpen && <span>Messages</span>}
          </button>
        </nav>

        <div className="p-3 border-t border-gray-200">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="hidden lg:flex w-full p-2 justify-center hover:bg-gray-100 rounded-lg text-gray-500 mb-2">
            {isSidebarOpen ? <ChevronLeft size={20}/> : <ChevronRight size={20}/>}
          </button>
          <button 
            onClick={handleLogout}
            className={`w-full p-3 rounded-xl flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors ${!isSidebarOpen && 'justify-center'}`}
          >
            <LogOut size={22} />
            {isSidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-auto flex flex-col">
        {/* VIEW: ADMIN DASHBOARD */}
        {currentView === 'ADMIN' && (
          <div className="p-6 max-w-6xl mx-auto w-full animate-fadeIn">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>
            
            <div className="flex gap-4 mb-6 border-b border-gray-200 pb-1">
              <button onClick={() => setAdminTab('PENDING')} className={`pb-3 px-2 font-medium transition-colors border-b-2 ${adminTab === 'PENDING' ? 'border-leaf-600 text-leaf-600' : 'border-transparent text-gray-500'}`}>Pending Approvals</button>
              <button onClick={() => setAdminTab('REJECTED')} className={`pb-3 px-2 font-medium transition-colors border-b-2 ${adminTab === 'REJECTED' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'}`}>Rejected Users</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.filter(u => u.status === adminTab).map(u => (
                <div key={u.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col animate-fadeIn">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden">
                        {u.avatarUrl ? <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover"/> : <UserIcon className="w-6 h-6 m-3 text-gray-400"/>}
                      </div>
                      <div>
                         <h3 className="font-semibold text-gray-900">{u.name}</h3>
                         <div className={`text-xs px-2 py-0.5 rounded-full w-fit mt-1 ${u.role === 'PRODUCER' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                           {u.role}
                         </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-6 flex-1">
                    <div className="flex items-center gap-2"><Mail size={14}/> {u.email}</div>
                    {u.location && <div className="flex items-center gap-2"><MapPin size={14}/> {u.location}</div>}
                    {u.role === 'PRODUCER' && u.bio && (
                      <div className="bg-gray-50 p-3 rounded-lg mt-2 text-xs italic">
                        "{u.bio}"
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    {adminTab === 'PENDING' && (
                       <>
                        <button onClick={() => handleAdminAction(u.id, 'APPROVE')} className="flex-1 bg-leaf-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-leaf-700 flex items-center justify-center gap-1">
                          <UserCheck size={16}/> Approve
                        </button>
                        <button onClick={() => handleAdminAction(u.id, 'REJECT')} className="flex-1 bg-white border border-red-200 text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-50 flex items-center justify-center gap-1">
                          <UserX size={16}/> Reject
                        </button>
                       </>
                    )}
                    {adminTab === 'REJECTED' && (
                      <button onClick={() => handleAdminAction(u.id, 'APPROVE')} className="flex-1 bg-white border border-leaf-600 text-leaf-600 py-2 rounded-lg text-sm font-medium hover:bg-leaf-50 flex items-center justify-center gap-1">
                          <RotateCcw size={16}/> Restore User
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {users.filter(u => u.status === adminTab).length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-400">
                  <ShieldCheck size={48} className="mx-auto mb-4 opacity-20"/>
                  <p>No users found in this list.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW: DASHBOARD (PRODUCER) */}
        {currentView === 'DASHBOARD' && (
          <div className="p-6 max-w-6xl mx-auto w-full animate-fadeIn">
            <div className="flex justify-between items-center mb-8">
               <h1 className="text-2xl font-bold text-gray-800">Producer Dashboard</h1>
               <div className="flex bg-gray-200 rounded-lg p-1">
                 <button onClick={() => setInventoryView('LIST')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${inventoryView === 'LIST' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>List View</button>
                 <button onClick={() => setInventoryView('CALENDAR')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${inventoryView === 'CALENDAR' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>Calendar</button>
               </div>
            </div>

            {/* Stats & Profile */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
               <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden">
                       <img src={currentUser?.avatarUrl} alt="Profile" className="w-full h-full object-cover"/>
                    </div>
                    <div>
                      {isEditingProfile ? (
                        <div className="space-y-2">
                           <input value={editName} onChange={e => setEditName(e.target.value)} className="block p-1 border rounded w-full" placeholder="Name" />
                           <input value={editLocation} onChange={e => setEditLocation(e.target.value)} className="block p-1 border rounded w-full" placeholder="Location" />
                           <textarea value={editBio} onChange={e => setEditBio(e.target.value)} className="block p-1 border rounded w-full" rows={2} placeholder="Bio" />
                           <div className="flex gap-2 mt-2">
                             <button onClick={handleSaveProfile} className="text-xs bg-leaf-600 text-white px-2 py-1 rounded">Save</button>
                             <button onClick={() => setIsEditingProfile(false)} className="text-xs bg-gray-200 px-2 py-1 rounded">Cancel</button>
                           </div>
                        </div>
                      ) : (
                        <>
                          <h2 className="text-xl font-bold text-gray-900 flex items-center">
                            {currentUser?.name}
                            {currentUser?.status === UserStatus.APPROVED && <VerifiedBadge />}
                          </h2>
                          <div className="text-gray-500 text-sm flex items-center gap-1 mb-1"><MapPin size={14}/> {currentUser?.location}</div>
                          <p className="text-gray-600 text-sm max-w-md">{currentUser?.bio}</p>
                          <button onClick={() => { setIsEditingProfile(true); setEditName(currentUser?.name || ''); setEditLocation(currentUser?.location || ''); setEditBio(currentUser?.bio || ''); }} className="text-leaf-600 text-xs font-semibold mt-2 hover:underline">Edit Profile</button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4 text-center">
                    <div className="px-4 border-r border-gray-100">
                      <div className="text-2xl font-bold text-leaf-600">{products.filter(p => p.producerId === currentUser?.id).length}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Products</div>
                    </div>
                    <div className="px-4">
                      <div className="text-2xl font-bold text-leaf-600">{getProducerRating(currentUser?.id || '').toFixed(1)}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Rating</div>
                    </div>
                  </div>
               </div>
            </div>
            
            {/* Reviews & Reputation */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Reviews & Reputation</h3>
              <div className="space-y-4">
                 {reviews.filter(r => r.producerId === currentUser?.id).length > 0 ? (
                    reviews.filter(r => r.producerId === currentUser?.id).map(r => (
                      <div key={r.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                         <div className="flex justify-between items-start mb-1">
                           <div className="flex items-center gap-2">
                             <span className="font-semibold text-sm">{r.userName}</span>
                             {renderStars(r.rating)}
                           </div>
                           <span className="text-xs text-gray-400">{new Date(r.timestamp).toLocaleDateString()}</span>
                         </div>
                         <p className="text-gray-600 text-sm">"{r.comment}"</p>
                      </div>
                    ))
                 ) : (
                    <p className="text-gray-400 text-sm italic">No reviews yet.</p>
                 )}
              </div>
            </div>

            {/* Add New Product Form */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
               <h3 className="text-lg font-bold text-gray-800 mb-4">{editingProductId ? 'Edit Product' : 'Add New Product'}</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                      <input value={newProdName} onChange={e => setNewProdName(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" placeholder="e.g. Heirloom Carrots" />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select value={newProdCat} onChange={e => setNewProdCat(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg">
                          {['Vegetables', 'Fruits', 'Dairy & Eggs', 'Meat', 'Pantry', 'Baked Goods'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                        <input type="number" value={newProdPrice} onChange={e => setNewProdPrice(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" placeholder="0.00" />
                      </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Available From</label>
                        <input type="date" value={newProdAvailableFrom} onChange={e => setNewProdAvailableFrom(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Available Until</label>
                        <input type="date" value={newProdAvailableUntil} onChange={e => setNewProdAvailableUntil(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                    </div>
                 </div>
                 <div className="space-y-4">
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <div className="relative">
                        <textarea value={newProdDesc} onChange={e => setNewProdDesc(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg h-24" placeholder="Describe your product..." />
                        <button 
                          onClick={handleGenerateDescription} 
                          disabled={isGeneratingDesc || !newProdName.trim()}
                          className="absolute bottom-2 right-2 bg-purple-100 text-purple-700 p-1.5 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
                          title="Generate AI Description (Enter Name First)"
                        >
                          {isGeneratingDesc ? <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full"/> : <Sparkles size={16}/>}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
                      <div className="flex items-center gap-4">
                         <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center">
                           {newProdImage ? <img src={newProdImage} className="w-full h-full object-cover" /> : <ImageIcon className="text-gray-400" />}
                         </div>
                         <label className="cursor-pointer bg-white border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-600">
                           <Upload size={16}/> Upload Photo
                           <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                         </label>
                      </div>
                    </div>
                 </div>
               </div>
               <div className="mt-6 flex justify-end">
                 <button onClick={handleAddProduct} className="bg-leaf-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-leaf-700 flex items-center gap-2">
                   <Plus size={18}/> {editingProductId ? 'Update Product' : 'Add Product'}
                 </button>
               </div>
            </div>

            {/* Inventory View */}
            {inventoryView === 'CALENDAR' ? renderProducerCalendar() : (
               <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                 <table className="w-full">
                   <thead className="bg-gray-50 border-b border-gray-200">
                     <tr>
                       <th className="text-left p-4 text-sm font-semibold text-gray-600">Product</th>
                       <th className="text-left p-4 text-sm font-semibold text-gray-600">Category</th>
                       <th className="text-left p-4 text-sm font-semibold text-gray-600">Availability</th>
                       <th className="text-left p-4 text-sm font-semibold text-gray-600">Price</th>
                       <th className="text-left p-4 text-sm font-semibold text-gray-600">Actions</th>
                     </tr>
                   </thead>
                   <tbody>
                     {products.filter(p => p.producerId === currentUser?.id).map(p => (
                       <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                         <td className="p-4 flex items-center gap-3">
                           <img src={p.imageUrl} className="w-10 h-10 rounded-lg object-cover" alt={p.name} />
                           <span className="font-medium">{p.name}</span>
                         </td>
                         <td className="p-4 text-gray-600">{p.category}</td>
                         <td className="p-4 text-sm text-gray-500">
                           {p.availableFrom ? `${p.availableFrom} → ${p.availableUntil}` : 'Always'}
                         </td>
                         <td className="p-4 font-medium">${p.price}</td>
                         <td className="p-4">
                           <button onClick={() => { 
                             setEditingProductId(p.id); setNewProdName(p.name); setNewProdCat(p.category); setNewProdDesc(p.description); setNewProdPrice(p.price.toString()); setNewProdAvailableFrom(p.availableFrom || ''); setNewProdAvailableUntil(p.availableUntil || ''); setNewProdImage(p.imageUrl);
                           }} className="text-blue-600 hover:text-blue-800 mr-3"><Edit2 size={18}/></button>
                         </td>
                       </tr>
                     ))}
                     {products.filter(p => p.producerId === currentUser?.id).length === 0 && (
                        <tr><td colSpan={5} className="p-8 text-center text-gray-400">No products added yet.</td></tr>
                     )}
                   </tbody>
                 </table>
               </div>
            )}
          </div>
        )}

        {/* VIEW: WISHLIST */}
        {currentView === 'WISHLIST' && (
          <div className="p-6 max-w-6xl mx-auto w-full animate-fadeIn">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">My Wishlist</h1>
            {products.filter(p => wishlist.includes(p.id)).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.filter(p => wishlist.includes(p.id)).map(p => (
                   <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group relative">
                    <div className="relative h-48">
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleWishlist(p.id); }}
                        className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur rounded-full shadow-sm hover:bg-white transition-colors"
                      >
                         <Heart size={18} className="fill-red-500 text-red-500" />
                      </button>
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-gray-800">{p.name}</h3>
                        <span className="text-green-700 font-bold">${p.price}</span>
                      </div>
                      <p className="text-sm text-gray-500 mb-3">{users.find(u => u.id === p.producerId)?.name}</p>
                      <button onClick={() => setSelectedProduct(p)} className="w-full py-2 border border-leaf-600 text-leaf-600 rounded-lg font-medium hover:bg-leaf-50 text-sm">View Details</button>
                    </div>
                   </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-gray-400">
                <Heart size={48} className="mx-auto mb-4 opacity-20" />
                <p>Your wishlist is empty. Start exploring!</p>
              </div>
            )}
          </div>
        )}

        {/* VIEW: MARKETPLACE */}
        {currentView === 'MARKETPLACE' && (
          <div className="p-6 max-w-7xl mx-auto w-full animate-fadeIn">
            <div className="flex flex-col md:flex-row gap-4 mb-8 justify-between items-start md:items-center">
               <div>
                  <h1 className="text-2xl font-bold text-gray-800">Marketplace</h1>
                  <p className="text-gray-500 text-sm">Fresh from your local community</p>
               </div>
               
               <div className="flex flex-col gap-3 w-full md:w-auto">
                 {/* Search Bar */}
                 <div className="relative w-full md:w-96">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                   <input 
                     type="text" 
                     placeholder="Search products, producers..." 
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && handleSmartSearch()}
                     className="w-full pl-10 pr-12 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-leaf-500 shadow-sm" 
                   />
                   <button 
                      onClick={handleSmartSearch}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-leaf-100 text-leaf-700 rounded-lg hover:bg-leaf-200 transition-colors"
                      title="Smart Search with AI"
                   >
                     {isSearchingSmart ? <div className="animate-spin h-4 w-4 border-2 border-leaf-600 border-t-transparent rounded-full"/> : <Sparkles size={18}/>}
                   </button>
                 </div>
                 {/* Smart Search Chips */}
                 {smartKeywords.length > 0 && (
                   <div className="flex gap-2 flex-wrap">
                      <span className="text-xs text-gray-500 py-1">AI suggestions:</span>
                      {smartKeywords.map(kw => (
                        <button key={kw} onClick={() => { setSearchTerm(kw); handleSmartSearch(); }} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full border border-purple-100 hover:bg-purple-100">
                          {kw}
                        </button>
                      ))}
                      <button onClick={() => setSmartKeywords([])} className="text-xs text-gray-400 hover:text-gray-600"><XIcon size={12}/></button>
                   </div>
                 )}
               </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col lg:flex-row gap-6 mb-8">
               {/* Categories */}
               <div className="flex-1 overflow-x-auto pb-2 scrollbar-hide">
                 <div className="flex gap-2">
                   {categories.map(cat => (
                     <button 
                       key={cat}
                       onClick={() => setSelectedCategory(cat)}
                       className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-leaf-600 text-white shadow-md shadow-leaf-200' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                     >
                       {cat}
                     </button>
                   ))}
                 </div>
               </div>

               {/* Date Filter */}
               <div className={`flex items-center gap-3 p-3 bg-white border rounded-xl shadow-sm transition-colors ${showAvailableOnly ? 'border-leaf-300 ring-1 ring-leaf-100' : 'border-gray-200'}`}>
                 <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${showAvailableOnly ? 'bg-leaf-600 border-leaf-600' : 'border-gray-300 bg-gray-50'}`}>
                      {showAvailableOnly && <Check size={14} className="text-white"/>}
                    </div>
                    <input type="checkbox" checked={showAvailableOnly} onChange={e => {
                        setShowAvailableOnly(e.target.checked);
                        if (e.target.checked && !filterStartDate) setFilterStartDate(new Date().toISOString().split('T')[0]);
                      }} className="hidden" />
                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{showAvailableOnly ? 'Filter Availability' : 'Available Now'}</span>
                 </label>
                 
                 {showAvailableOnly && (
                   <div className="flex items-center gap-2 pl-3 border-l border-gray-200 animate-fadeIn">
                      <div className="flex flex-col">
                        <label className="text-[10px] text-gray-500 leading-none mb-0.5">From</label>
                        <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-gray-50 focus:outline-none focus:border-leaf-500" />
                      </div>
                      <ArrowRight size={12} className="text-gray-400 mt-3" />
                      <div className="flex flex-col">
                        <label className="text-[10px] text-gray-500 leading-none mb-0.5">Until</label>
                        <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-gray-50 focus:outline-none focus:border-leaf-500" />
                      </div>
                   </div>
                 )}
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               {/* AI Chef Card */}
               <div className="col-span-full bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-6 flex items-center justify-between border border-orange-200">
                  <div>
                    <h3 className="font-bold text-orange-900 text-lg flex items-center gap-2">
                       <ChefHat size={24} /> AI Chef Suggestion
                    </h3>
                    <p className="text-orange-800 text-sm mt-1 max-w-xl">
                      {aiRecipe ? `Try "${aiRecipe.title}" with today's fresh ingredients!` : "Not sure what to cook? Let our AI suggest a recipe based on available local produce."}
                    </p>
                  </div>
                  <button 
                    onClick={handleAiRecipe}
                    className="bg-white text-orange-600 px-4 py-2 rounded-lg font-semibold shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                  >
                    {isGeneratingRecipe ? <div className="animate-spin h-4 w-4 border-2 border-orange-600 border-t-transparent rounded-full"/> : <Sparkles size={16} />}
                    {aiRecipe ? 'New Idea' : 'Suggest Recipe'}
                  </button>
               </div>

               {filteredProducts.map(product => {
                 const producer = users.find(u => u.id === product.producerId);
                 return (
                   <div key={product.id} onClick={() => setSelectedProduct(product)} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group flex flex-col h-full animate-fadeIn">
                     <div className="relative h-48 overflow-hidden">
                       <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                       <div className="absolute top-3 right-3 flex gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleWishlist(product.id); }}
                            className={`p-2 backdrop-blur rounded-full shadow-sm transition-colors ${wishlist.includes(product.id) ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-600 hover:bg-white'}`}
                          >
                             <Heart size={18} className={wishlist.includes(product.id) ? 'fill-current' : ''} />
                          </button>
                       </div>
                       {!product.inStock && (
                         <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                            <span className="bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Out of Stock</span>
                         </div>
                       )}
                       {/* Availability Badge */}
                       {product.availableFrom && (
                         <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur text-white text-[10px] px-2 py-1 rounded-md flex items-center gap-1">
                           <Calendar size={10} />
                           {new Date(product.availableFrom).toLocaleDateString(undefined, {month:'short', day:'numeric'})} - {product.availableUntil ? new Date(product.availableUntil).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : '...'}
                         </div>
                       )}
                     </div>
                     <div className="p-4 flex flex-col flex-1">
                       <div className="flex justify-between items-start mb-2">
                         <h3 className="font-bold text-gray-900 line-clamp-1">{product.name}</h3>
                         <span className="bg-leaf-50 text-leaf-700 px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap">${product.price.toFixed(2)} / {product.unit}</span>
                       </div>
                       <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-1">{product.description}</p>
                       
                       <div className="pt-3 border-t border-gray-100 mt-auto">
                          <div 
                             onClick={(e) => { e.stopPropagation(); producer && setSelectedProducer(producer); }}
                             className="flex items-center gap-2 hover:bg-gray-50 p-1 -ml-1 rounded-lg transition-colors cursor-pointer"
                          >
                             <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden">
                                <img src={producer?.avatarUrl} className="w-full h-full object-cover"/>
                             </div>
                             <div className="flex-1 min-w-0">
                               <p className="text-xs font-medium text-gray-900 truncate flex items-center">
                                 {producer?.name}
                                 {producer?.status === UserStatus.APPROVED && <VerifiedBadge />}
                               </p>
                               <p className="text-[10px] text-gray-500 truncate">{producer?.bio}</p>
                             </div>
                          </div>
                       </div>
                     </div>
                   </div>
                 );
               })}
            </div>
            {filteredProducts.length === 0 && (
               <div className="text-center py-20">
                 <p className="text-gray-400 text-lg">No products found matching your search.</p>
                 <button onClick={() => { setSearchTerm(''); setSmartKeywords([]); setSelectedCategory('All'); setShowAvailableOnly(false); }} className="mt-4 text-leaf-600 font-medium hover:underline">Clear Filters</button>
               </div>
            )}
          </div>
        )}

        {/* VIEW: MESSAGES */}
        {currentView === 'MESSAGES' && currentUser && (
          <div className="p-4 h-full animate-fadeIn">
             <ChatInterface 
               currentUser={currentUser}
               users={users}
               messages={messages}
               onSendMessage={(receiverId, content) => {
                 setMessages([...messages, {
                   id: `m${Date.now()}`,
                   senderId: currentUser.id,
                   receiverId,
                   content,
                   timestamp: Date.now()
                 }]);
               }}
               initialSelectedUserId={activeConversationId}
             />
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      
      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-modalPop" onClick={e => e.stopPropagation()}>
            <div className="relative h-64 md:h-80">
              <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
              <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 bg-white/80 p-2 rounded-full hover:bg-white transition-colors">
                <XIcon size={24} className="text-gray-800" />
              </button>
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-sm font-semibold shadow-sm">
                {selectedProduct.category}
              </div>
            </div>
            <div className="p-8">
              <div className="flex justify-between items-start mb-4">
                <div>
                   <h2 className="text-3xl font-bold text-gray-900 mb-2">{selectedProduct.name}</h2>
                   <div className="flex items-center gap-4 text-sm text-gray-500">
                     {selectedProduct.organic && <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-md"><Sprout size={14}/> Organic</span>}
                     {selectedProduct.availableFrom && <span className="flex items-center gap-1"><Calendar size={14}/> Available: {selectedProduct.availableFrom} to {selectedProduct.availableUntil}</span>}
                   </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-leaf-600">${selectedProduct.price}</div>
                  <div className="text-gray-500 text-sm">per {selectedProduct.unit}</div>
                </div>
              </div>
              
              <p className="text-gray-600 leading-relaxed mb-8">{selectedProduct.description}</p>
              
              <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                 <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">Sold by</span>
                    <button onClick={() => { 
                        const p = users.find(u => u.id === selectedProduct.producerId);
                        if (p) { setSelectedProducer(p); setSelectedProduct(null); }
                    }} className="flex items-center gap-2 hover:bg-gray-50 p-2 rounded-lg transition-colors group">
                       <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                          <img src={users.find(u => u.id === selectedProduct.producerId)?.avatarUrl} className="w-full h-full object-cover"/>
                       </div>
                       <div className="text-left">
                         <div className="font-semibold text-gray-900 text-sm flex items-center">
                           {users.find(u => u.id === selectedProduct.producerId)?.name}
                           {users.find(u => u.id === selectedProduct.producerId)?.status === UserStatus.APPROVED && <VerifiedBadge />}
                         </div>
                         <div className="text-xs text-leaf-600 group-hover:underline">View Profile</div>
                       </div>
                    </button>
                 </div>
                 <div className="flex gap-3">
                   <button 
                     onClick={() => toggleWishlist(selectedProduct.id)}
                     className={`p-3 rounded-xl border transition-colors ${wishlist.includes(selectedProduct.id) ? 'border-red-200 bg-red-50 text-red-500' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                   >
                     <Heart size={20} className={wishlist.includes(selectedProduct.id) ? 'fill-current' : ''} />
                   </button>
                   <button 
                     onClick={() => {
                        handleContactProducer(selectedProduct.producerId);
                        setSelectedProduct(null);
                     }}
                     className="bg-leaf-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-leaf-700 shadow-lg shadow-leaf-200 transition-all active:scale-95"
                   >
                     Contact Producer
                   </button>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Producer Profile Modal */}
      {selectedProducer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedProducer(null)}>
           <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-modalPop max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100 flex items-start gap-4">
                 <div className="w-20 h-20 bg-gray-100 rounded-full overflow-hidden border-2 border-white shadow-md">
                   <img src={selectedProducer.avatarUrl} alt={selectedProducer.name} className="w-full h-full object-cover" />
                 </div>
                 <div className="flex-1">
                   <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                     {selectedProducer.name}
                     {selectedProducer.status === UserStatus.APPROVED && <VerifiedBadge />}
                   </h2>
                   <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                     <MapPin size={14} /> {selectedProducer.location}
                   </div>
                   {(currentUser?.role === UserRole.CONSUMER || currentUser?.role === UserRole.ADMIN) && (
                     <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                       <Mail size={14} /> {selectedProducer.email}
                     </div>
                   )}
                   <div className="flex items-center gap-2 mt-2">
                      <div className="flex text-yellow-400">
                         {renderStars(getProducerRating(selectedProducer.id))}
                      </div>
                      <span className="text-xs text-gray-400">({getProducerReviewCount(selectedProducer.id)} reviews)</span>
                   </div>
                 </div>
                 <button onClick={() => setSelectedProducer(null)} className="text-gray-400 hover:text-gray-600"><XIcon size={24}/></button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                 <div className="mb-6">
                   <h3 className="font-semibold text-gray-900 mb-2">About</h3>
                   <p className="text-gray-600 text-sm leading-relaxed">{selectedProducer.bio || "No bio available."}</p>
                 </div>

                 <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-gray-900">Reviews</h3>
                      {currentUser?.role === UserRole.CONSUMER && (
                        <button onClick={() => setIsReviewFormOpen(!isReviewFormOpen)} className="text-leaf-600 text-sm font-medium hover:underline">Write a Review</button>
                      )}
                    </div>
                    
                    {isReviewFormOpen && (
                      <div className="bg-gray-50 p-4 rounded-lg mb-4 animate-fadeIn">
                        <div className="mb-3">
                           <label className="block text-xs font-semibold text-gray-500 mb-1">Rating</label>
                           <div className="flex gap-1">
                             {[1, 2, 3, 4, 5].map(star => (
                               <button key={star} onClick={() => setNewReviewRating(star)} className="text-yellow-400 hover:scale-110 transition-transform">
                                 <Star size={20} fill={star <= newReviewRating ? "currentColor" : "none"} className={star <= newReviewRating ? "" : "text-gray-300"}/>
                               </button>
                             ))}
                           </div>
                        </div>
                        <textarea 
                          value={newReviewComment}
                          onChange={e => setNewReviewComment(e.target.value)}
                          placeholder="Share your experience..."
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm mb-3 focus:outline-none focus:border-leaf-500"
                          rows={3}
                        />
                        <div className="flex justify-end gap-2">
                           <button onClick={() => setIsReviewFormOpen(false)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                           <button onClick={handleAddReview} className="bg-leaf-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-leaf-700">Post Review</button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      {reviews.filter(r => r.producerId === selectedProducer.id).length > 0 ? (
                        reviews.filter(r => r.producerId === selectedProducer.id).map(r => (
                          <div key={r.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-medium text-sm text-gray-900">{r.userName}</span>
                              <span className="text-xs text-gray-400">{new Date(r.timestamp).toLocaleDateString()}</span>
                            </div>
                            <div className="flex text-yellow-400 mb-1 scale-75 origin-left">
                               {[...Array(5)].map((_, i) => (
                                  <Star key={i} size={12} fill={i < r.rating ? "currentColor" : "none"} className={i < r.rating ? "" : "text-gray-300"} />
                               ))}
                            </div>
                            <p className="text-gray-600 text-sm">{r.comment}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-400 text-sm italic">No reviews yet.</p>
                      )}
                    </div>
                 </div>
              </div>
              
              {currentUser?.role === UserRole.CONSUMER && (
                <div className="p-4 border-t border-gray-100 bg-gray-50">
                   <button 
                     onClick={() => handleContactProducer(selectedProducer.id)}
                     className="w-full bg-leaf-600 text-white py-3 rounded-xl font-medium hover:bg-leaf-700 transition-colors flex items-center justify-center gap-2"
                   >
                     <MessageSquare size={18}/> Contact Producer
                   </button>
                </div>
              )}
           </div>
        </div>
      )}

    </div>
  );
};

export default App;
