import React, { useState } from 'react';
import { 
  User, Product, ViewState, UserRole, UserStatus, Message, 
  RecipeSuggestion, Review
} from './types';
import ChatInterface from './components/ChatInterface';
import { generateProductDescription, suggestRecipe, smartSearch } from './services/geminiService';
import { 
  ShoppingBasket, MessageCircle, Search, 
  Sparkles, Heart, X, Leaf, Calendar as CalendarIcon, 
  LayoutGrid, ChevronLeft, ChevronRight, Edit, Plus, Store, ChefHat, 
  Image as ImageIcon, Upload, Star, Check, XCircle, UserCheck, Shield, LogOut,
  BadgeCheck
} from 'lucide-react';

// --- Mock Data ---
const MOCK_USERS: User[] = [
  {
    id: 'u1', name: 'Green Valley Farm', email: 'contact@greenvalley.com', role: UserRole.PRODUCER,
    location: 'Portland, OR', status: UserStatus.APPROVED, isVerified: true,
    bio: 'Family owned organic farm since 1985.',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop'
  },
  {
    id: 'u2', name: 'Alice Smith', email: 'alice@example.com', role: UserRole.CONSUMER,
    status: UserStatus.APPROVED, isVerified: true,
    location: 'Portland, OR'
  },
  {
    id: 'u3', name: 'Urban Roots', email: 'info@urbanroots.org', role: UserRole.PRODUCER,
    location: 'Seattle, WA', status: UserStatus.PENDING, isVerified: false,
    bio: 'Hydroponic urban farming initiative awaiting approval.'
  },
  {
    id: 'u4', name: 'Admin User', email: 'admin@localroots.com', role: UserRole.ADMIN,
    status: UserStatus.APPROVED, isVerified: true,
    location: 'HQ'
  }
];

const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1', producerId: 'u1', name: 'Heirloom Tomatoes', description: 'Juicy, colorful tomatoes.',
    price: 4.50, unit: 'lb', category: 'Vegetables', inStock: true,
    imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop',
    availableFrom: '2023-06-01', availableUntil: '2023-08-30'
  },
  {
    id: 'p2', producerId: 'u1', name: 'Fresh Basil', description: 'Aromatic sweet basil.',
    price: 2.00, unit: 'bunch', category: 'Herbs', inStock: true,
    imageUrl: 'https://images.unsplash.com/photo-1618164436241-4473940d1f5c?w=400&h=300&fit=crop',
    availableFrom: '2023-05-15', availableUntil: '2023-09-15'
  },
  {
    id: 'p3', producerId: 'u3', name: 'Microgreens Mix', description: 'Nutrient dense greens.',
    price: 6.00, unit: 'box', category: 'Greens', inStock: true,
    imageUrl: 'https://images.unsplash.com/photo-1535242208474-9a2793260ca8?w=400&h=300&fit=crop',
    availableFrom: '2023-01-01', availableUntil: '2023-12-31'
  }
];

const MOCK_MESSAGES: Message[] = [
  { id: 'm1', senderId: 'u2', receiverId: 'u1', content: 'Do you have bulk pricing?', timestamp: Date.now() - 100000 },
  { id: 'm2', senderId: 'u1', receiverId: 'u2', content: 'Yes, for orders over 10lbs.', timestamp: Date.now() - 50000 }
];

const MOCK_REVIEWS: Review[] = [
  { id: 'r1', producerId: 'u1', userId: 'u2', userName: 'Alice Smith', rating: 5, comment: 'Amazing tomatoes! Tastes like summer.', timestamp: Date.now() - 86400000 },
  { id: 'r2', producerId: 'u1', userId: 'u99', userName: 'John Doe', rating: 4, comment: 'Great quality, but parking was tricky.', timestamp: Date.now() - 172800000 }
];

const PRODUCT_UNITS = ['lb', 'oz', 'kg', 'g', 'bunch', 'piece', 'box', 'dozen', 'pint', 'quart'];

const VerifiedBadge = () => (
  <span className="inline-flex items-center ml-1" title="Verified Producer">
     <BadgeCheck className="w-4 h-4 text-white fill-blue-500" />
  </span>
);

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('MARKETPLACE');
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [reviews, setReviews] = useState<Review[]>(MOCK_REVIEWS);
  const [selectedProducer, setSelectedProducer] = useState<User | null>(null);
  
  // Recipe State
  const [aiRecipe, setAiRecipe] = useState<RecipeSuggestion | null>(null);
  const [isRecipeLoading, setIsRecipeLoading] = useState(false);
  const [pantryIngredients, setPantryIngredients] = useState('');

  // Dashboard State
  const [dashboardView, setDashboardView] = useState<'LIST' | 'CALENDAR'>('CALENDAR');
  const [calendarDate, setCalendarDate] = useState(new Date(2023, 5, 1)); // Start in June 2023 for demo data
  
  // Add Product Form State
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Vegetables');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdUnit, setNewProdUnit] = useState('lb');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdImage, setNewProdImage] = useState('');
  const [newProdFrom, setNewProdFrom] = useState('');
  const [newProdUntil, setNewProdUntil] = useState('');

  // Review State
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const keywords = await smartSearch(searchQuery);
    console.log("AI suggested keywords:", keywords);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGenerateRecipe = async () => {
    setIsRecipeLoading(true);
    // Use top product names for "Inspire Me"
    const ingredients = products.slice(0, 5).map(p => p.name).join(", ");
    const recipe = await suggestRecipe(ingredients);
    setAiRecipe(recipe);
    setIsRecipeLoading(false);
  };

  const handlePantryRecipe = async () => {
    if (!pantryIngredients.trim()) return;
    setIsRecipeLoading(true);
    const recipe = await suggestRecipe(pantryIngredients);
    setAiRecipe(recipe);
    setIsRecipeLoading(false);
  };

  const handleSendMessage = (receiverId: string, content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      receiverId,
      content,
      timestamp: Date.now()
    };
    setMessages([...messages, newMessage]);
  };

  const enhanceDescription = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const newDesc = await generateProductDescription(product.name, product.category);
    setProducts(products.map(p => p.id === productId ? { ...p, description: newDesc } : p));
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
    const newProduct: Product = {
      id: Date.now().toString(),
      producerId: currentUser.id,
      name: newProdName,
      category: newProdCategory,
      price: parseFloat(newProdPrice) || 0,
      unit: newProdUnit,
      description: newProdDesc,
      imageUrl: newProdImage || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop', // Fallback
      inStock: true,
      availableFrom: newProdFrom,
      availableUntil: newProdUntil
    };
    setProducts([...products, newProduct]);
    setIsAddProductOpen(false);
    // Reset form
    setNewProdName('');
    setNewProdPrice('');
    setNewProdDesc('');
    setNewProdImage('');
  };

  const handleSubmitReview = () => {
    if (!selectedProducer) return;
    const newReview: Review = {
      id: Date.now().toString(),
      producerId: selectedProducer.id,
      userId: currentUser.id,
      userName: currentUser.name,
      rating: newReviewRating,
      comment: newReviewComment,
      timestamp: Date.now()
    };
    setReviews([newReview, ...reviews]);
    setIsReviewFormOpen(false);
    setNewReviewComment('');
    setNewReviewRating(5);
  };

  const handleAdminAction = (userId: string, action: 'APPROVE' | 'REJECT') => {
    setUsers(users.map(u => 
      u.id === userId 
        ? { ...u, status: action === 'APPROVE' ? UserStatus.APPROVED : UserStatus.REJECTED, isVerified: action === 'APPROVE' } 
        : u
    ));
  };

  // Calendar Logic
  const myProducts = products.filter(p => p.producerId === currentUser.id);
  
  const isProductAvailableOnDate = (product: Product, date: Date) => {
    if (!product.availableFrom || !product.availableUntil) return false;
    
    // Parse YYYY-MM-DD string to local date object (midnight)
    const parseDate = (str: string) => {
        const [y, m, d] = str.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    const start = parseDate(product.availableFrom);
    const end = parseDate(product.availableUntil);
    const check = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    return check >= start && check <= end;
  };

  const renderCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
    
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDay }, (_, i) => i);
    const monthName = calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
           <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
             <CalendarIcon className="w-5 h-5 text-green-600"/> {monthName}
           </h2>
           <div className="flex bg-white rounded-lg shadow-sm border border-gray-200">
             <button onClick={() => setCalendarDate(new Date(year, month - 1))} className="p-2 hover:bg-gray-50 border-r border-gray-200">
               <ChevronLeft className="w-5 h-5 text-gray-600"/>
             </button>
             <button onClick={() => setCalendarDate(new Date(year, month + 1))} className="p-2 hover:bg-gray-50">
               <ChevronRight className="w-5 h-5 text-gray-600"/>
             </button>
           </div>
        </div>
        
        <div className="grid grid-cols-7 border-b border-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider bg-white">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-[120px] bg-gray-100 gap-px border-b border-gray-200">
           {blanks.map((b) => <div key={`blank-${b}`} className="bg-white/50" />)}
           
           {days.map((day) => {
             const currentDate = new Date(year, month, day);
             const availableProducts = myProducts.filter(p => isProductAvailableOnDate(p, currentDate));
             
             return (
               <div key={day} className="bg-white p-2 relative hover:bg-gray-50 transition-colors group">
                 <span className={`text-sm font-medium ${availableProducts.length > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                   {day}
                 </span>
                 
                 <div className="mt-1 flex flex-col gap-1 overflow-y-auto max-h-[85px] scrollbar-hide">
                    {availableProducts.map(p => (
                      <div 
                        key={p.id} 
                        className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded border border-green-200 truncate cursor-pointer hover:bg-green-200 transition-colors"
                        title={`${p.name} (${p.category})`}
                      >
                        {p.name}
                      </div>
                    ))}
                 </div>
               </div>
             );
           })}
        </div>
      </div>
    );
  };

  const producerReviews = selectedProducer ? reviews.filter(r => r.producerId === selectedProducer.id) : [];
  const averageRating = producerReviews.length > 0 
    ? (producerReviews.reduce((acc, r) => acc + r.rating, 0) / producerReviews.length).toFixed(1)
    : 'New';

  const pendingUsers = users.filter(u => u.status === UserStatus.PENDING);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 relative">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('MARKETPLACE')}>
               <div className="bg-green-600 p-2 rounded-lg">
                  <Leaf className="text-white w-6 h-6" />
               </div>
               <span className="text-xl font-bold text-green-900">FarmConnect</span>
            </div>

            <nav className="hidden md:flex gap-4">
               {currentUser.role === UserRole.PRODUCER && (
                 <button 
                    onClick={() => setView('DASHBOARD')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${view === 'DASHBOARD' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:text-green-600'}`}
                 >
                    Producer Dashboard
                 </button>
               )}
               {currentUser.role === UserRole.ADMIN && (
                 <button 
                    onClick={() => setView('ADMIN')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${view === 'ADMIN' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:text-green-600'}`}
                 >
                    Admin Panel
                 </button>
               )}
               <button 
                  onClick={() => setView('MARKETPLACE')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${view === 'MARKETPLACE' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:text-green-600'}`}
               >
                  Marketplace
               </button>
            </nav>
          </div>

          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <input 
                type="text" 
                placeholder="Search fresh produce..." 
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
              />
              <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Demo User Switcher */}
            <select 
              className="text-xs border border-gray-200 rounded p-1"
              value={currentUser.id}
              onChange={(e) => {
                const user = users.find(u => u.id === e.target.value);
                if (user) {
                  setCurrentUser(user);
                  setView(user.role === UserRole.ADMIN ? 'ADMIN' : (user.role === UserRole.PRODUCER ? 'DASHBOARD' : 'MARKETPLACE'));
                }
              }}
            >
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>

            <button onClick={() => setView('MESSAGES')} className="relative p-2 text-gray-600 hover:text-green-600 transition-colors">
              <MessageCircle className="w-6 h-6" />
              {messages.some(m => m.receiverId === currentUser.id) && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
            </button>
            <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded-full pr-3 transition-colors">
               <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold overflow-hidden">
                 {currentUser.avatarUrl ? <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover"/> : currentUser.name[0]}
               </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {view === 'ADMIN' && currentUser.role === UserRole.ADMIN && (
          <div className="animate-fadeIn">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Shield className="w-8 h-8 text-blue-600" /> Admin Dashboard
            </h1>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-800">Pending Approvals</h2>
                <p className="text-sm text-gray-500">Review producer verification requests.</p>
              </div>
              
              {pendingUsers.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <UserCheck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No pending approvals at this time.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {pendingUsers.map(user => (
                    <div key={user.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                          {user.name[0]}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{user.name}</h3>
                          <p className="text-sm text-gray-500">{user.email} • {user.location}</p>
                          {user.bio && <p className="text-sm text-gray-600 mt-1 italic">"{user.bio}"</p>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleAdminAction(user.id, 'REJECT')}
                          className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium flex items-center gap-2"
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                        <button 
                          onClick={() => handleAdminAction(user.id, 'APPROVE')}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-2 shadow-sm"
                        >
                          <Check className="w-4 h-4" /> Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'DASHBOARD' && currentUser.role === UserRole.PRODUCER && (
          <div className="animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
               <div>
                  <h1 className="text-2xl font-bold text-gray-900">Producer Dashboard</h1>
                  <p className="text-gray-500">Manage your farm's inventory and availability.</p>
               </div>
               <div className="flex bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                  <button 
                    onClick={() => setDashboardView('LIST')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${dashboardView === 'LIST' ? 'bg-green-100 text-green-800 shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <LayoutGrid className="w-4 h-4" /> List
                  </button>
                  <button 
                    onClick={() => setDashboardView('CALENDAR')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${dashboardView === 'CALENDAR' ? 'bg-green-100 text-green-800 shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <CalendarIcon className="w-4 h-4" /> Calendar
                  </button>
               </div>
            </div>

            {dashboardView === 'CALENDAR' ? renderCalendar() : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                 <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800">Product Inventory</h2>
                    <button 
                      onClick={() => setIsAddProductOpen(true)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                       <Plus className="w-4 h-4" /> Add Product
                    </button>
                 </div>
                 <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                       <tr>
                          <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                          <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Price</th>
                          <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Availability</th>
                          <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                       {myProducts.map(p => (
                          <tr key={p.id} className="hover:bg-gray-50">
                             <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                   <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100"/>
                                   <div>
                                      <p className="font-medium text-gray-900">{p.name}</p>
                                      <p className="text-xs text-gray-500">{p.category}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="px-6 py-4 text-sm text-gray-600">${p.price.toFixed(2)} / {p.unit}</td>
                             <td className="px-6 py-4 text-sm">
                                {p.availableFrom && p.availableUntil ? (
                                   <div className="flex flex-col">
                                      <span className="text-green-700 font-medium text-xs bg-green-50 px-2 py-1 rounded w-fit">
                                         {new Date(p.availableFrom).toLocaleDateString()}
                                      </span>
                                      <span className="text-gray-400 text-[10px] my-0.5 ml-2">to</span>
                                      <span className="text-orange-700 font-medium text-xs bg-orange-50 px-2 py-1 rounded w-fit">
                                         {new Date(p.availableUntil).toLocaleDateString()}
                                      </span>
                                   </div>
                                ) : (
                                   <span className="text-gray-400 text-sm italic">Not set</span>
                                )}
                             </td>
                             <td className="px-6 py-4">
                                <button className="p-2 text-gray-400 hover:text-green-600 transition-colors">
                                   <Edit className="w-4 h-4" />
                                </button>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
            )}
          </div>
        )}
        
        {view === 'MARKETPLACE' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Marketplace</h1>
              <button 
                onClick={handleGenerateRecipe}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
                disabled={isRecipeLoading}
              >
                <Sparkles className="w-4 h-4" />
                {isRecipeLoading ? 'Thinking...' : 'Inspire Me'}
              </button>
            </div>

            {/* AI Recipe Input Section */}
            <div className="mb-8 p-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100 animate-fadeIn shadow-sm">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-sm font-semibold text-orange-900 mb-2 flex items-center gap-2">
                    <ChefHat className="w-4 h-4" /> Fridge-to-Table
                  </label>
                  <input 
                    type="text"
                    value={pantryIngredients}
                    onChange={(e) => setPantryIngredients(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePantryRecipe()}
                    placeholder="Enter ingredients you have (e.g. carrots, eggs, flour)..."
                    className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none bg-white"
                  />
                </div>
                <button 
                  onClick={handlePantryRecipe}
                  disabled={!pantryIngredients.trim() || isRecipeLoading}
                  className="px-6 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isRecipeLoading ? 'Cooking up ideas...' : 'Get Recipe'}
                </button>
              </div>
            </div>

            {aiRecipe && (
              <div className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100 animate-fadeIn shadow-sm">
                 <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-purple-900 mb-2">{aiRecipe.title}</h3>
                    <button onClick={() => setAiRecipe(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                 </div>
                 <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-purple-800 mb-1">Ingredients</h4>
                      <ul className="list-disc list-inside text-gray-700 text-sm">
                        {aiRecipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                      </ul>
                    </div>
                    <div>
                       <h4 className="font-semibold text-purple-800 mb-1">Instructions</h4>
                       <p className="text-gray-700 text-sm">{aiRecipe.instructions}</p>
                    </div>
                 </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map(product => {
                const producer = users.find(u => u.id === product.producerId);
                return (
                  <div key={product.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden group">
                    <div className="h-48 overflow-hidden relative">
                       <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                       <button className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full hover:text-red-500 transition-colors shadow-sm">
                          <Heart className="w-4 h-4" />
                       </button>
                    </div>
                    
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                         <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-semibold uppercase tracking-wide rounded-full">{product.category}</span>
                         <span className="font-bold text-green-700">${product.price.toFixed(2)} <span className="text-gray-400 text-xs font-normal">/ {product.unit}</span></span>
                      </div>

                      <h3 className="font-bold text-gray-900 mb-1 leading-tight group-hover:text-green-700 transition-colors">{product.name}</h3>
                      
                      <div 
                        className="mb-3 cursor-pointer group/producer" 
                        onClick={(e) => { e.stopPropagation(); setSelectedProducer(producer || null); }}
                      >
                         <div className="flex items-center gap-1">
                            <p className="text-xs text-gray-500 truncate group-hover/producer:text-green-600 group-hover/producer:underline transition-colors">{producer?.name}</p>
                            {producer?.status === UserStatus.APPROVED && <VerifiedBadge />}
                         </div>
                         {producer?.bio && (
                           <p className="text-[10px] text-gray-400 truncate mt-0.5" title={producer.bio}>{producer.bio}</p>
                         )}
                      </div>

                      {product.availableFrom && (
                        <p className="text-[10px] text-gray-400 mb-2">
                           Harvested: {new Date(product.availableFrom).toLocaleDateString()}
                        </p>
                      )}

                      <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px]">{product.description}</p>
                      
                      <div className="flex gap-2">
                        <button className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                           <ShoppingBasket className="w-4 h-4" /> Add
                        </button>
                        <button 
                          onClick={() => enhanceDescription(product.id)}
                          className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
                          title="Enhance with Gemini"
                        >
                           <Sparkles className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {view === 'MESSAGES' && (
          <div className="h-[calc(100vh-140px)] animate-fadeIn">
             <ChatInterface 
                currentUser={currentUser} 
                users={users} 
                messages={messages} 
                onSendMessage={handleSendMessage}
                initialSelectedUserId={selectedProducer?.id}
             />
          </div>
        )}
      </main>

      {/* Add Product Modal */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-modalPop">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Add New Product</h2>
              <button onClick={() => setIsAddProductOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <div className="space-y-4">
                {/* Image Upload with Preview */}
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
                   <div className="flex items-center justify-center w-full">
                      {newProdImage ? (
                        <div className="relative w-full h-48 rounded-lg overflow-hidden group">
                           <img src={newProdImage} alt="Preview" className="w-full h-full object-cover" />
                           <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => setNewProdImage('')} 
                                className="bg-white/90 text-red-600 px-3 py-1 rounded-full text-sm font-medium"
                              >
                                Remove
                              </button>
                           </div>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <ImageIcon className="w-8 h-8 mb-4 text-gray-500" />
                                <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span></p>
                                <p className="text-xs text-gray-500">SVG, PNG, JPG or GIF (MAX. 5MB)</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </label>
                      )}
                   </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    placeholder="e.g. Organic Carrots"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                      <div className="relative">
                         <span className="absolute left-3 top-2 text-gray-500">$</span>
                         <input 
                           type="number" 
                           className="w-full pl-6 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                           value={newProdPrice}
                           onChange={(e) => setNewProdPrice(e.target.value)}
                           placeholder="0.00"
                         />
                      </div>
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                      <select 
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                        value={newProdUnit}
                        onChange={(e) => setNewProdUnit(e.target.value)}
                      >
                         {PRODUCT_UNITS.map(unit => (
                           <option key={unit} value={unit}>{unit}</option>
                         ))}
                      </select>
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                   <textarea 
                     className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none h-24"
                     value={newProdDesc}
                     onChange={(e) => setNewProdDesc(e.target.value)}
                     placeholder="Describe your product..."
                   />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Available From</label>
                      <input 
                        type="date"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                        value={newProdFrom}
                        onChange={(e) => setNewProdFrom(e.target.value)}
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Available Until</label>
                      <input 
                        type="date"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                        value={newProdUntil}
                        onChange={(e) => setNewProdUntil(e.target.value)}
                      />
                   </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
               <button 
                  onClick={() => setIsAddProductOpen(false)}
                  className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg"
               >
                  Cancel
               </button>
               <button 
                  onClick={handleAddProduct}
                  className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
               >
                  Create Product
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Producer Profile Modal */}
      {selectedProducer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fadeIn">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-modalPop max-h-[90vh] flex flex-col">
              <div className="h-32 bg-green-600 relative">
                 <button 
                   onClick={() => setSelectedProducer(null)} 
                   className="absolute top-4 right-4 p-2 bg-black/20 text-white rounded-full hover:bg-black/40 transition-colors"
                 >
                    <X size={20} />
                 </button>
                 <div className="absolute -bottom-12 left-8">
                    <div className="w-24 h-24 rounded-full border-4 border-white bg-white shadow-md overflow-hidden">
                       <img src={selectedProducer.avatarUrl || `https://ui-avatars.com/api/?name=${selectedProducer.name}`} alt={selectedProducer.name} className="w-full h-full object-cover"/>
                    </div>
                 </div>
              </div>
              
              <div className="pt-16 px-8 pb-6 overflow-y-auto flex-1">
                 <div className="flex justify-between items-start mb-2">
                    <div>
                       <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                          {selectedProducer.name}
                          {selectedProducer.status === UserStatus.APPROVED && <VerifiedBadge />}
                       </h2>
                       <p className="text-gray-500 flex items-center gap-1 text-sm"><Leaf className="w-3 h-3"/> {selectedProducer.role}</p>
                       <p className="text-gray-500 text-sm">{selectedProducer.location}</p>
                    </div>
                    <div className="flex flex-col items-end">
                       <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-bold text-gray-900">{averageRating}</span>
                          <span className="text-xs text-gray-400">({producerReviews.length})</span>
                       </div>
                    </div>
                 </div>
                 
                 <p className="text-gray-700 my-4 bg-gray-50 p-4 rounded-lg border border-gray-100">"{selectedProducer.bio || 'No bio available.'}"</p>
                 
                 <div className="flex gap-3 mb-8 border-b border-gray-100 pb-6">
                    <button 
                       onClick={() => { setView('MESSAGES'); setSelectedProducer(null); }}
                       className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                       <MessageCircle className="w-4 h-4" /> Message Producer
                    </button>
                    <button 
                       onClick={() => setIsReviewFormOpen(!isReviewFormOpen)}
                       className="flex-1 bg-white border border-gray-200 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                       <Star className="w-4 h-4" /> Write a Review
                    </button>
                 </div>

                 {isReviewFormOpen && (
                    <div className="mb-8 bg-gray-50 p-4 rounded-xl border border-gray-200 animate-fadeIn">
                       <h3 className="font-bold text-gray-800 mb-3">Rate your experience</h3>
                       <div className="flex gap-2 mb-4">
                          {[1, 2, 3, 4, 5].map(star => (
                             <button 
                               key={star} 
                               onClick={() => setNewReviewRating(star)}
                               className="hover:scale-110 transition-transform"
                             >
                                <Star className={`w-8 h-8 ${star <= newReviewRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                             </button>
                          ))}
                       </div>
                       <textarea 
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none mb-3"
                          rows={3}
                          placeholder="Share your thoughts about this producer..."
                          value={newReviewComment}
                          onChange={(e) => setNewReviewComment(e.target.value)}
                       />
                       <div className="flex justify-end gap-2">
                          <button onClick={() => setIsReviewFormOpen(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
                          <button onClick={handleSubmitReview} className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">Submit Review</button>
                       </div>
                    </div>
                 )}

                 <div>
                    <h3 className="font-bold text-gray-900 mb-4 text-lg">Reviews</h3>
                    {producerReviews.length > 0 ? (
                       <div className="space-y-4">
                          {producerReviews.map(review => (
                             <div key={review.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                                <div className="flex justify-between mb-1">
                                   <span className="font-medium text-gray-900">{review.userName}</span>
                                   <div className="flex items-center gap-0.5">
                                      {Array.from({length: 5}).map((_, i) => (
                                         <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                                      ))}
                                   </div>
                                </div>
                                <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
                                <p className="text-xs text-gray-400 mt-1">{new Date(review.timestamp).toLocaleDateString()}</p>
                             </div>
                          ))}
                       </div>
                    ) : (
                       <div className="text-center py-8 bg-gray-50 rounded-lg text-gray-500 text-sm">
                          No reviews yet. Be the first to review!
                       </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default App;