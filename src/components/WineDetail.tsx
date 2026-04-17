import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, Heart, Share, Star, Leaf, Activity, Droplet, Edit3, Check, ShoppingCart, Music, Image as ImageIcon, Loader2 } from 'lucide-react';
import { collection, addDoc, deleteDoc, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { GoogleGenAI, Modality } from '@google/genai';
import LogGlassModal from './LogGlassModal';

export default function WineDetail({ wine, onClose }: { wine: any, onClose: () => void }) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistDocId, setWishlistDocId] = useState<string | null>(null);
  const [personalNotes, setPersonalNotes] = useState(wine.personalNotes || '');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [showLogGlass, setShowLogGlass] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

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
    setIsLiking(true);
    
    // Vibrate if supported
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    try {
      if (isWishlisted && wishlistDocId) {
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
        const docRef = await addDoc(collection(db, `users/${auth.currentUser.uid}/wishlist`), {
          ...wine,
          addedAt: new Date().toISOString()
        });
        setIsWishlisted(true);
        setWishlistDocId(docRef.id);
        
        // Track event
        console.log("Event logged:", {
          event: "like_wine",
          wine_id: wine.id || wine.name,
          user_id: auth.currentUser.uid,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      handleFirestoreError(error, isWishlisted ? OperationType.DELETE : OperationType.CREATE, `users/${auth.currentUser.uid}/wishlist`);
    } finally {
      setTimeout(() => setIsLiking(false), 300);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `Discover ${wine.name} on AfriSommelier`,
      text: `Check out this amazing wine: ${wine.name} from ${wine.region || 'South Africa'}.`,
      url: `${window.location.origin}/share?wine_id=${wine.id || encodeURIComponent(wine.name)}`
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert("Link copied to clipboard!");
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
  };

  const handleBuy = () => {
    // Track event
    console.log("Event logged:", {
      event: "buy_now_click",
      wine_id: wine.id || wine.name,
      user_id: auth?.currentUser?.uid || 'anonymous',
      timestamp: new Date().toISOString()
    });
    
    // In a real app, this would open a checkout modal or redirect to a partner
    alert(`Redirecting to partner retailer to purchase ${wine.name}...`);
  };

  const saveNotes = async () => {
    if (!auth.currentUser || !wine.id) return;
    setIsSavingNotes(true);
    try {
      const wineRef = doc(db, `users/${auth.currentUser.uid}/cellar`, wine.id);
      await updateDoc(wineRef, {
        personalNotes: personalNotes
      });
      setIsEditingNotes(false);
    } catch (error) {
      console.error("Error saving notes:", error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}/cellar/${wine.id}`);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const generateMusic = async () => {
    try {
      if (!(await (window as any).aistudio.hasSelectedApiKey())) {
        await (window as any).aistudio.openSelectKey();
      }
    } catch (e) {
      console.error("API key selection failed", e);
      return;
    }

    setIsGeneratingMusic(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContentStream({
        model: "lyria-3-clip-preview",
        contents: `Generate a 30-second track inspired by this wine: ${wine.name}, a ${wine.grape} from ${wine.region}. The vibe should be ${wine.notes || 'elegant and complex'}.`,
      });

      let audioBase64 = "";
      let mimeType = "audio/wav";

      for await (const chunk of response) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (!audioBase64 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioBase64 += part.inlineData.data;
          }
        }
      }

      if (audioBase64) {
        const binary = atob(audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: mimeType });
        setMusicUrl(URL.createObjectURL(blob));
      }
    } catch (error) {
      console.error("Error generating music:", error);
      alert("Failed to generate music.");
    } finally {
      setIsGeneratingMusic(false);
    }
  };

  const generateImage = async () => {
    try {
      if (!(await (window as any).aistudio.hasSelectedApiKey())) {
        await (window as any).aistudio.openSelectKey();
      }
    } catch (e) {
      console.error("API key selection failed", e);
      return;
    }

    setIsGeneratingImage(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'imagen-3.0-generate-002',
        contents: {
          parts: [
            {
              text: `A beautiful, artistic visualization of the flavors of this wine: ${wine.name}. It is a ${wine.grape} from ${wine.region}. Tasting notes: ${wine.notes || 'elegant and complex'}. Make it look like a high-end editorial photo or abstract art.`,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
          }
        },
      });
      
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          setGeneratedImageUrl(`data:image/png;base64,${base64EncodeString}`);
        }
      }
    } catch (error) {
      console.error("Error generating image:", error);
      alert("Failed to generate image.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="fixed inset-0 z-[60] bg-wine-900/90 overflow-y-auto hide-scrollbar backdrop-blur-sm"
    >
     <div className="w-full max-w-3xl mx-auto bg-wine-900 min-h-screen relative shadow-2xl">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10">
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div className="flex gap-3">
          <motion.button 
            onClick={toggleWishlist}
            animate={isLiking ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.3 }}
            className={`w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center transition-colors ${isWishlisted ? 'text-pink-500 hover:bg-black/60' : 'text-white hover:bg-black/60'}`}
          >
            <Heart size={20} className={isWishlisted ? 'fill-pink-500' : ''} />
          </motion.button>
          <button onClick={handleShare} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors">
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

        {/* AI Features */}
        <div className="mb-10">
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Star size={20} className="text-gold-500" />
            AI Experiences
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-panel p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-3">
              {musicUrl ? (
                <audio controls src={musicUrl} className="w-full h-10" />
              ) : (
                <button 
                  onClick={generateMusic}
                  disabled={isGeneratingMusic}
                  className="w-full h-full flex flex-col items-center justify-center gap-2 text-gold-500 hover:text-gold-400 transition-colors disabled:opacity-50"
                >
                  {isGeneratingMusic ? <Loader2 size={24} className="animate-spin" /> : <Music size={24} />}
                  <span className="text-sm font-medium">{isGeneratingMusic ? 'Composing...' : 'Generate Vibe Music'}</span>
                </button>
              )}
            </div>
            <div className="glass-panel p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-3">
              {generatedImageUrl ? (
                <img src={generatedImageUrl} alt="Visualized Wine" className="w-full h-24 object-cover rounded-lg" />
              ) : (
                <button 
                  onClick={generateImage}
                  disabled={isGeneratingImage}
                  className="w-full h-full flex flex-col items-center justify-center gap-2 text-gold-500 hover:text-gold-400 transition-colors disabled:opacity-50"
                >
                  {isGeneratingImage ? <Loader2 size={24} className="animate-spin" /> : <ImageIcon size={24} />}
                  <span className="text-sm font-medium">{isGeneratingImage ? 'Visualizing...' : 'Visualize Flavor'}</span>
                </button>
              )}
            </div>
          </div>
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
            onClick={() => setShowLogGlass(true)}
            className="w-full mt-4 py-3 rounded-xl border border-gold-500/30 text-gold-500 font-medium hover:bg-gold-500/10 transition-colors flex items-center justify-center gap-2"
          >
            <Droplet size={16} />
            Log a Glass
          </button>
        </div>

        {/* Personal Notes */}
        {wine.id && (
          <div className="mb-10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">My Tasting Notes</h3>
              {!isEditingNotes ? (
                <button 
                  onClick={() => setIsEditingNotes(true)}
                  className="text-gold-500 hover:text-gold-400 flex items-center gap-1 text-sm font-medium transition-colors"
                >
                  <Edit3 size={16} /> Edit
                </button>
              ) : (
                <button 
                  onClick={saveNotes}
                  disabled={isSavingNotes}
                  className="text-green-400 hover:text-green-300 flex items-center gap-1 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Check size={16} /> {isSavingNotes ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
            
            {isEditingNotes ? (
              <textarea
                value={personalNotes}
                onChange={(e) => setPersonalNotes(e.target.value)}
                placeholder="Add your personal tasting notes, memories, or pairing ideas here..."
                className="w-full h-32 bg-glass border border-gold-500/50 rounded-xl p-4 text-ivory placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-all resize-none"
              />
            ) : (
              <div 
                className="w-full min-h-[5rem] bg-glass border border-glass-border rounded-xl p-4 text-gray-300 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setIsEditingNotes(true)}
              >
                {personalNotes ? (
                  <p className="whitespace-pre-wrap">{personalNotes}</p>
                ) : (
                  <p className="text-gray-500 italic">Tap to add your personal tasting notes...</p>
                )}
              </div>
            )}
          </div>
        )}

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
            <button 
              onClick={handleBuy}
              className="flex-2 bg-gold-500 text-wine-900 font-medium py-4 px-8 rounded-2xl hover:scale-[0.98] transition-transform flex items-center gap-2"
            >
              <ShoppingCart size={18} />
              Buy Now
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showLogGlass && (
          <LogGlassModal wine={wine} onClose={() => setShowLogGlass(false)} />
        )}
      </AnimatePresence>
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
