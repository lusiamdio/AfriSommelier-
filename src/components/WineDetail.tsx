import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, ChevronLeft, Heart, Share, Star, Leaf, Activity, Droplet } from 'lucide-react';
import { collection, addDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export default function WineDetail({ wine, onClose }: { wine: any, onClose: () => void }) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistDocId, setWishlistDocId] = useState<string | null>(null);

  useEffect(() => {
    const checkWishlist = async () => {
      if (!auth.currentUser || !wine.name) return;
      try {
        const q = query(
          collection(db, `users/${auth.currentUser.uid}/wishlist`),
          where('name', '==', wine.name)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setIsWishlisted(true);
          setWishlistDocId(querySnapshot.docs[0].id);
        }
      } catch (error) {
        console.error("Error checking wishlist:", error);
      }
    };
    checkWishlist();
  }, [wine.name]);

  const toggleWishlist = async () => {
    if (!auth.currentUser) return;
    try {
      if (isWishlisted && wishlistDocId) {
        // Remove from wishlist
        // We need the doc reference, but we don't have it directly. 
        // We can just query and delete.
        const q = query(
          collection(db, `users/${auth.currentUser.uid}/wishlist`),
          where('name', '==', wine.name)
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(async (docSnap) => {
          await deleteDoc(docSnap.ref);
        });
        setIsWishlisted(false);
        setWishlistDocId(null);
      } else {
        // Add to wishlist
        const docRef = await addDoc(collection(db, `users/${auth.currentUser.uid}/wishlist`), {
          ...wine,
          addedAt: new Date().toISOString()
        });
        setIsWishlisted(true);
        setWishlistDocId(docRef.id);
      }
    } catch (error) {
      handleFirestoreError(error, isWishlisted ? OperationType.DELETE : OperationType.CREATE, `users/${auth.currentUser.uid}/wishlist`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="fixed inset-0 z-[60] bg-wine-900 overflow-y-auto hide-scrollbar"
    >
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-10">
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div className="flex gap-3">
          <button 
            onClick={toggleWishlist}
            className={`w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center transition-colors ${isWishlisted ? 'text-pink-500 hover:bg-black/60' : 'text-white hover:bg-black/60'}`}
          >
            <Heart size={20} className={isWishlisted ? 'fill-pink-500' : ''} />
          </button>
          <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors">
            <Share size={20} />
          </button>
        </div>
      </div>

      {/* Hero Image */}
      <div className="h-[60vh] relative">
        <motion.img 
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8 }}
          src={wine.image || "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?q=80&w=800&auto=format&fit=crop"} 
          alt={wine.name} 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-wine-900 via-wine-900/40 to-transparent"></div>
      </div>

      {/* Content */}
      <div className="px-6 -mt-32 relative z-10 pb-32">
        <div className="flex items-center gap-2 mb-3">
          {wine.rating && (
            <div className="bg-gold-500 text-wine-900 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
              <Star size={12} className="fill-wine-900" /> {wine.rating}
            </div>
          )}
          {wine.awards && (
            <div className="bg-white/10 border border-white/20 text-ivory px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
              🏆 {wine.awards}
            </div>
          )}
          <span className="text-gold-500 text-sm font-medium">{wine.match || '95%'} Match for you</span>
        </div>

        <h1 className="text-4xl font-serif font-semibold mb-1">{wine.name}</h1>
        <p className="text-gray-400 font-serif italic mb-8">{wine.region || 'Stellenbosch'}, {wine.vintage || '2019'}</p>

        {/* AI Summary / Tasting Notes */}
        <div className="glass-panel p-6 mb-8">
          <h3 className="text-sm uppercase tracking-widest text-gray-400 mb-2">Tasting Notes & Insights</h3>
          <p className="text-lg font-serif leading-relaxed">
            "{wine.notes || wine.recommendationReason || "Bold, smoky, with hints of blackberry and cedar. It perfectly matches your preference for full-bodied reds with structured tannins."}"
          </p>
        </div>

        {/* Wellness & Health */}
        <div className="mb-10">
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Activity size={20} className="text-gold-500" />
            Wellness & Health
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-panel p-4 rounded-2xl flex flex-col items-center justify-center text-center">
              <Droplet size={20} className="text-blue-400 mb-2" />
              <p className="text-xs text-gray-400 mb-1">ABV</p>
              <p className="font-medium text-ivory">{wine.abv || '13.5%'}</p>
            </div>
            <div className="glass-panel p-4 rounded-2xl flex flex-col items-center justify-center text-center">
              <Activity size={20} className="text-orange-400 mb-2" />
              <p className="text-xs text-gray-400 mb-1">Calories</p>
              <p className="font-medium text-ivory">{wine.caloriesPerGlass || '120'} <span className="text-[10px] text-gray-500">/glass</span></p>
            </div>
            <div className={`glass-panel p-4 rounded-2xl flex flex-col items-center justify-center text-center ${wine.isOrganic ? 'border border-green-500/30 bg-green-500/5' : ''}`}>
              <Leaf size={20} className={wine.isOrganic ? 'text-green-400 mb-2' : 'text-gray-500 mb-2'} />
              <p className="text-xs text-gray-400 mb-1">Farming</p>
              <p className={`font-medium ${wine.isOrganic ? 'text-green-400' : 'text-ivory'}`}>
                {wine.isOrganic ? 'Organic' : 'Standard'}
              </p>
            </div>
          </div>
          <button 
            onClick={async () => {
              if (!auth.currentUser) return;
              try {
                await addDoc(collection(db, `users/${auth.currentUser.uid}/consumption`), {
                  wineName: wine.name,
                  calories: wine.caloriesPerGlass || 120,
                  date: new Date().toISOString(),
                });
                alert("Glass logged to your Mindful Tracker!");
              } catch (error) {
                console.error("Error logging glass:", error);
              }
            }}
            className="w-full mt-4 py-3 rounded-xl border border-gold-500/30 text-gold-500 font-medium hover:bg-gold-500/10 transition-colors flex items-center justify-center gap-2"
          >
            <Droplet size={16} />
            Log a Glass
          </button>
        </div>

        {/* Taste Graph */}
        <div className="mb-10">
          <h3 className="text-xl font-semibold mb-6">Taste Profile</h3>
          <div className="space-y-4">
            <TasteBar label="Boldness" value={90} />
            <TasteBar label="Tannin" value={85} />
            <TasteBar label="Sweetness" value={15} />
            <TasteBar label="Acidity" value={60} />
            <TasteBar label="Fruit" value={75} />
          </div>
        </div>

        {/* Pairings */}
        <div className="mb-10">
          <h3 className="text-xl font-semibold mb-6">Perfect Pairings</h3>
          <div className="flex overflow-x-auto hide-scrollbar gap-4 -mx-6 px-6">
            <PairingCard food="Braai Ribeye" image="https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=400&auto=format&fit=crop" />
            <PairingCard food="Aged Cheddar" image="https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?q=80&w=400&auto=format&fit=crop" />
            <PairingCard food="Venison" image="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=400&auto=format&fit=crop" />
          </div>
        </div>

        {/* Buy Section */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-wine-900 via-wine-900 to-transparent z-20">
          <div className="flex gap-4 items-center max-w-md mx-auto">
            <div className="flex-1">
              <p className="text-sm text-gray-400">Best Price</p>
              <p className="text-2xl font-serif font-semibold text-gold-500">{wine.price || 'R 950'}</p>
            </div>
            <button className="flex-2 bg-gold-500 text-wine-900 font-medium py-4 px-8 rounded-2xl hover:scale-[0.98] transition-transform">
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TasteBar({ label, value }: { label: string, value: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-300">{label}</span>
      </div>
      <div className="h-2 bg-glass rounded-full overflow-hidden">
        <div className="h-full bg-gold-500 rounded-full" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function PairingCard({ food, image }: any) {
  return (
    <div className="min-w-[140px] relative rounded-2xl overflow-hidden aspect-square shrink-0">
      <img src={image} alt={food} className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
      <div className="absolute inset-0 bg-gradient-to-t from-wine-900/90 to-transparent"></div>
      <div className="absolute bottom-0 left-0 p-4">
        <p className="font-serif font-medium">{food}</p>
      </div>
    </div>
  );
}
