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
  AlertCircle, Timer, BadgeCheck, Send, ArrowRight, Map, BarChart3, TrendingUp, DollarSign, Package
} from 'lucide-react';

// --- MOCK DATA INITIALIZATION ---
const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Alice Consumer', email: 'gadbolima@gmail.com', role: UserRole.CONSUMER, location: 'San Francisco, CA', avatarUrl: 'https://picsum.photos/100/100?random=1', status: UserStatus.APPROVED, isVerified: true, password: 'Gadbolima995' },
  { id: 'u2', name: 'Green Valley Farm', email: 'gadbolima6@gmail.com', role: UserRole.PRODUCER, location: 'Petaluma, CA', bio: 'Certified organic vegetables since 1998.', avatarUrl: 'https://picsum.photos/100/100?random=2', status: UserStatus.APPROVED, isVerified: true, password: 'Gadbolima995.' },
  { id: 'u3', name: 'Bob\'s Honey', email: 'bob@test.com', role: UserRole.PRODUCER, location: 'Napa, CA', bio: 'Raw, unfiltered honey from local wildflowers.', avatarUrl: 'https://picsum.photos/100/100?random=3', status: UserStatus.APPROVED, isVerified: true, password: 'password' },
  { id: 'u4', name: 'Admin User', email: 'admin@demo.com', role: UserRole.ADMIN, location: 'Cloud', avatarUrl: 'https://picsum.photos/100/100?random=4', status: UserStatus.APPROVED, isVerified: true, password: 'password' },
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
  <span className="inline-flex items-center ml-1" title="Verified Producer">
    <BadgeCheck size={18} className="text-white fill-blue-500" />
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
  const [mapVisibleProductIds, setMapVisibleProductIds] = useState<Set<string>>(new Set());

  // Producer Form State
  const [newProdName, setNewProdName] = useState('');
  const [newProdCat, setNewProdCat] = useState('Vegetables');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdAvailableFrom, setNewProdAvailableFrom] = useState('');
  const [newProdAvailableUntil, setNewProdAvailableUntil] = useState('');
  const [newProdImage, setNewProdImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState('');
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
  const [adminTab, setAdminTab] = useState<'PENDING' | 'REJECTED' | 'ANALYTICS'>('PENDING');

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
    
    // Mock Send Email
    alert(`[MOCK EMAIL SERVER]\nTo: ${signupData.email}\nSubject: Verify your LocalRoots account\n\nYour security code is: ${code}`);

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
    alert(`[MOCK EMAIL SERVER]\nTo: ${pendingUser?.email}\nSubject: NEW Security Code\n\nYour new code is: ${code}`);
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

  const toggleProductMap = (productId: string) => {
    const newSet = new Set(mapVisibleProductIds);
    if (newSet.has(productId)) {
      newSet.delete(productId);
    } else {
      newSet.add(productId);
    }
    setMapVisibleProductIds(newSet);
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
    setImageError('');
    if (file) {
      if (!file.type.startsWith('image/')) {
        setImageError('Invalid file type. Please upload an image (JPG, PNG, etc).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setImageError('File size exceeds 5MB limit.');
        return;
      }

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
    setImageError('');
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
    
    // Construct local YYYY-MM-DD string to compare with product availability dates
    const format = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

  // --- ANALYTICS LOGIC ---
  const getAnalyticsData = () => {
    const producers = users.filter(u => u.role === UserRole.PRODUCER);
    return producers.map((p, idx) => {
      // Deterministic mock data based on ID length or index
      const baseSales = (p.name.length * 1000) + (idx * 500);
      const orders = Math.floor(baseSales / 35);
      const myProducts = products.filter(prod => prod.producerId === p.id);
      const topProduct = myProducts.length > 0 ? myProducts[0].name : 'N/A';
      return {
        id: p.id,
        name: p.name,
        sales: baseSales,
        orders,
        topProduct
      };
    }).sort((a, b) => b.sales - a.sales);
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
                      <button 
                        key={p.id} 
                        onClick={() => {
                           setEditingProductId(p.id); 
                           setNewProdName(p.name); 
                           setNewProdCat(p.category); 
                           setNewProdDesc(p.description); 
                           setNewProdPrice(p.price.toString()); 
                           setNewProdAvailableFrom(p.availableFrom || ''); 
                           setNewProdAvailableUntil(p.availableUntil || ''); 
                           setNewProdImage(p.imageUrl);
                        }}
                        className={`text-[10px] px-1 py-0.5 rounded truncate border w-full text-left ${getCategoryColor(p.category)} hover:opacity-80 transition-opacity`}
                        title={`Click to edit ${p.name}`}
                      >
                        {p.name}
                      </button>
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

  const renderAdminAnalytics = () => {
    const analytics = getAnalyticsData();
    const maxSales = Math.max(...analytics.map(a => a.sales), 1);
    const totalRevenue = analytics.reduce((acc, curr) => acc + curr.sales, 0);
    const totalOrders = analytics.reduce((acc, curr) => acc + curr.orders, 0);

    return (
      <div className="animate-fadeIn space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/95 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-white/50 flex items-center gap-4">
             <div className="p-3 bg-green-100 text-green-600 rounded-full"><DollarSign size={24}/></div>
             <div>
               <p className="text-sm text-gray-500 font-medium">Total Platform Sales</p>
               <h3 className="text-2xl font-bold text-gray-900">${totalRevenue.toLocaleString()}</h3>
             </div>
          </div>
          <div className="bg-white/95 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-white/50 flex items-center gap-4">
             <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><Package size={24}/></div>
             <div>
               <p className="text-sm text-gray-500 font-medium">Total Orders</p>
               <h3 className="text-2xl font-bold text-gray-900">{totalOrders}</h3>
             </div>
          </div>
          <div className="bg-white/95 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-white/50 flex items-center gap-4">
             <div className="p-3 bg-purple-100 text-purple-600 rounded-full"><TrendingUp size={24}/></div>
             <div>
               <p className="text-sm text-gray-500 font-medium">Active Producers</p>
               <h3 className="text-2xl font-bold text-gray-900">{analytics.length}</h3>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Chart */}
          <div className="bg-white/95 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-white/50">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <BarChart3 size={20} className="text-gray-500"/> Revenue by Producer
            </h3>
            <div className="h-64 flex items-end justify-around gap-2">
              {analytics.map((item) => (
                <div key={item.id} className="w-full flex flex-col items-center group">
                  <div className="relative w-full max-w-[60px] bg-gray-100 rounded-t-lg overflow-hidden flex items-end h-full">
                     <div 
                       className="w-full bg-leaf-500 group-hover:bg-leaf-600 transition-all duration-500 rounded-t-lg relative"
                       style={{ height: `${(item.sales / maxSales) * 100}%` }}
                     >
                       <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                         ${item.sales.toLocaleString()}
                       </div>
                     </div>
                  </div>
                  <span className="text-[10px] text-gray-500 mt-2 text-center truncate w-full px-1" title={item.name}>
                    {item.name.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Products Table */}
          <div className="bg-white/95 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-white/50">
             <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
               <Star size={20} className="text-gray-500"/> Top Performing Products
             </h3>
             <div className="overflow-auto">
               <table className="w-full">
                 <thead className="bg-gray-50/50 border-b border-gray-200">
                   <tr>
                     <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Producer</th>
                     <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Top Product</th>
                     <th className="text-right p-3 text-xs font-semibold text-gray-500 uppercase">Est. Vol</th>
                   </tr>
                 </thead>
                 <tbody>
                   {analytics.map(item => (
                     <tr key={item.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                       <td className="p-3 text-sm font-medium text-gray-900">{item.name}</td>
                       <td className="p-3 text-sm text-gray-600">{item.topItem}</td>
                       <td className="p-3 text-sm text-right text-leaf-600 font-mono">${(item.sales * 0.4).toFixed(0)}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
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
      <div className="min-h-screen relative flex items-center justify-center p-4">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
           <img src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2832&auto=format&fit=crop" className="w-full h-full object-cover" alt="Farm Background" />
           <div className="absolute inset-0 bg-amber-50/80 backdrop-blur-[2px]"></div>
        </div>

        <div className="relative z-10 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl w-full max-w-md p-8 animate-fadeIn border border-white/50">
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
    <div className="flex h-screen relative overflow-hidden">
      {/* BACKGROUND IMAGE FOR MAIN APP */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2832&auto=format&fit=crop" className="w-full h-full object-cover" alt="Farm Background" />
        <div className="absolute inset-0 bg-amber-50/80 backdrop-blur-[2px]"></div>
      </div>

      {/* SIDEBAR */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-20'} relative z-20 bg-white/95 backdrop-blur-sm border-r border-gray-200 transition-all duration-300 flex flex-col shadow-xl`}>
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
      <div className="flex-1 overflow-auto flex flex-col relative z-10">
        {/* VIEW: ADMIN DASHBOARD */}
        {currentView === 'ADMIN' && (
          <div className="p-6 max-w-6xl mx-auto w-full animate-fadeIn">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 drop-shadow-sm">Admin Dashboard</h1>
            
            <div className="flex gap-4 mb-6 border-b border-gray-300/50 pb-1">
              <button onClick={() => setAdminTab('PENDING')} className={`pb-3 px-2 font-medium transition-colors border-b-2 ${adminTab === 'PENDING' ? 'border-leaf-600 text-leaf-800' : 'border-transparent text-gray-600'}`}>Pending Approvals</button>
              <button onClick={() => setAdminTab('REJECTED')} className={`pb-3 px-2 font-medium transition-colors border-b-2 ${adminTab === 'REJECTED' ? 'border-red-600 text-red-800' : 'border-transparent text-gray-600'}`}>Rejected Users</button>
              <button onClick={() => setAdminTab('ANALYTICS')} className={`pb-3 px-2 font-medium transition-colors border-b-2 ${adminTab === 'ANALYTICS' ? 'border-purple-600 text-purple-800' : 'border-transparent text-gray-600'}`}>Analytics</button>
            </div>

            {adminTab === 'ANALYTICS' ? renderAdminAnalytics() : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.filter(u => u.status === adminTab).map(u => (
                  <div key={u.id} className="bg-white/95 backdrop-blur-sm rounded-xl shadow-sm border border-white/50 p-6 flex flex-col animate-fadeIn">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden">
                          {u.avatarUrl ? <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover