import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Heart, Wine } from 'lucide-react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

function calculateSmartAlert(vintage: string) {
  const currentYear = new Date().getFullYear();
  const year = parseInt(vintage, 10);
  if (isNaN(year)) return { status: 'Drink Now', color: 'text-green-400' };
  
  const age = currentYear - year;
  if (age > 15) return { status: 'Past Peak ⚠️', color: 'text-red-400' };
  if (age >= 8 && age <= 15) return { status: 'Peak Window ✨', color: 'text-gold-500' };
  if (age >= 4 && age < 8) return { status: 'Drink Now', color: 'text-green-400' };
  return { status: 'Hold ⏳', color: 'text-blue-400' };
}

export default function CellarTab({ onSelectWine }: { onSelectWine: (wine: any) => void }) {
  const [wines, setWines] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cellar' | 'wishlist'>('cellar');
  const [sortBy, setSortBy] = useState<'name' | 'vintage' | 'price'>('name');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  useEffect(() => {
    if (!auth.currentUser) return;

    const qCellar = query(
      collection(db, `users/${auth.currentUser.uid}/cellar`)
    );
    const qWishlist = query(
      collection(db, `users/${auth.currentUser.uid}/wishlist`)
    );

    const unsubscribeCellar = onSnapshot(qCellar, (snapshot) => {
      const fetchedWines = snapshot.docs.map(doc => {
        const data = doc.data();
        const smartAlert = calculateSmartAlert(data.vintage);
        return { id: doc.id, ...data, status: smartAlert.status, statusColor: smartAlert.color };
      });
      setWines(fetchedWines);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, `users/${auth.currentUser?.uid}/cellar`);
    });

    const unsubscribeWishlist = onSnapshot(qWishlist, (snapshot) => {
      const fetchedWishlist = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWishlist(fetchedWishlist);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${auth.currentUser?.uid}/wishlist`);
    });

    return () => {
      unsubscribeCellar();
      unsubscribeWishlist();
    };
  }, []);

  const totalValue = wines.reduce((acc, wine) => {
    const priceStr = wine.price ? wine.price.replace(/[^0-9]/g, '') : '0';
    return acc + parseInt(priceStr, 10);
  }, 0);

  const drinkNowCount = wines.filter(w => w.status.includes('Drink Now')).length;
  const agingWellCount = wines.filter(w => w.status.includes('Hold') || w.status.includes('Peak Window')).length;
  const pastPeakCount = wines.filter(w => w.status.includes('Past Peak')).length;

  let displayData = viewMode === 'cellar' ? wines : wishlist;

  // Apply Filter
  if (viewMode === 'cellar' && filterStatus !== 'All') {
    if (filterStatus === 'Peak/Hold') {
      displayData = displayData.filter(w => w.status.includes('Hold') || w.status.includes('Peak Window'));
    } else {
      displayData = displayData.filter(w => w.status.includes(filterStatus));
    }
  }

  // Apply Sort
  displayData = [...displayData].sort((a, b) => {
    if (sortBy === 'name') {
      return (a.name || '').localeCompare(b.name || '');
    } else if (sortBy === 'vintage') {
      const yearA = parseInt(a.vintage, 10) || 0;
      const yearB = parseInt(b.vintage, 10) || 0;
      return yearB - yearA; // Newest first
    } else if (sortBy === 'price') {
      const priceA = a.price ? parseInt(a.price.replace(/[^0-9]/g, ''), 10) : 0;
      const priceB = b.price ? parseInt(b.price.replace(/[^0-9]/g, ''), 10) : 0;
      return priceB - priceA; // Highest first
    }
    return 0;
  });

  return (
    <div className="pb-32 pt-12 px-6">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl font-serif font-semibold mb-1">My Collection</h2>
          <p className="text-gray-400 text-sm">{wines.length} Bottles • R {totalValue.toLocaleString()}</p>
        </div>
        <button className="w-10 h-10 rounded-full bg-glass border border-glass-border flex items-center justify-center hover:bg-white/10 transition-colors">
          <Plus size={20} />
        </button>
      </div>

      {/* View Toggle and Sort */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex bg-glass border border-glass-border rounded-xl p-1">
          <button 
            onClick={() => setViewMode('cellar')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${viewMode === 'cellar' ? 'bg-wine-800 text-ivory' : 'text-gray-400 hover:text-ivory'}`}
          >
            <Wine size={16} /> Cellar
          </button>
          <button 
            onClick={() => setViewMode('wishlist')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${viewMode === 'wishlist' ? 'bg-wine-800 text-ivory' : 'text-gray-400 hover:text-ivory'}`}
          >
            <Heart size={16} /> Wishlist
          </button>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Sort by:</span>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-glass border border-glass-border rounded-lg py-1.5 px-3 text-sm text-ivory focus:outline-none focus:border-gold-500"
          >
            <option value="name">Name (A-Z)</option>
            <option value="vintage">Vintage (Newest)</option>
            <option value="price">Price (Highest)</option>
          </select>
        </div>
      </div>

      {/* AI Insights (Only for Cellar) */}
      <AnimatePresence>
        {viewMode === 'cellar' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-4 mb-8 overflow-x-auto hide-scrollbar pb-2"
          >
            <InsightChip label="All" count={wines.length} active={filterStatus === 'All'} onClick={() => setFilterStatus('All')} />
            <InsightChip label="Drink Now" count={drinkNowCount} active={filterStatus === 'Drink Now'} onClick={() => setFilterStatus('Drink Now')} />
            <InsightChip label="Peak/Hold" count={agingWellCount} active={filterStatus === 'Peak/Hold'} onClick={() => setFilterStatus('Peak/Hold')} />
            <InsightChip label="Past Peak" count={pastPeakCount} active={filterStatus === 'Past Peak'} onClick={() => setFilterStatus('Past Peak')} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      {loading ? (
        <div className="text-center text-gold-500 py-10">Loading...</div>
      ) : displayData.length === 0 ? (
        <div className="text-center text-gray-400 py-10">
          <p>Your {viewMode} is empty.</p>
          <p className="text-sm mt-2">Scan or discover a bottle to add it.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {displayData.map((wine) => (
            <CellarBottle 
              key={wine.id}
              name={wine.name} 
              vintage={wine.vintage} 
              status={viewMode === 'cellar' ? wine.status : 'Wishlist'} 
              statusColor={viewMode === 'cellar' ? wine.statusColor : 'text-pink-400'}
              image={wine.image || "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?q=80&w=400&auto=format&fit=crop"} 
              onClick={() => onSelectWine(wine)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InsightChip({ label, count, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 rounded-full border whitespace-nowrap text-sm font-medium transition-colors ${
        active 
          ? 'bg-ivory text-wine-900 border-ivory' 
          : 'bg-glass border-glass-border text-gray-400 hover:text-ivory'
      }`}
    >
      {label} <span className="ml-1 opacity-60">{count}</span>
    </button>
  );
}

function CellarBottle({ name, vintage, status, statusColor, image, onClick }: any) {
  return (
    <motion.div 
      onClick={onClick}
      whileHover={{ y: -5, rotate: 2 }}
      className="glass-panel p-3 cursor-pointer group relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      <div className="aspect-[3/4] rounded-lg overflow-hidden mb-3 relative">
        <img src={image} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </div>
      <h4 className="font-serif text-sm font-medium leading-tight mb-1">{name}</h4>
      <p className="text-xs text-gray-400 mb-2">{vintage}</p>
      <p className={`text-[10px] uppercase tracking-wider font-semibold ${statusColor}`}>{status}</p>
    </motion.div>
  );
}
