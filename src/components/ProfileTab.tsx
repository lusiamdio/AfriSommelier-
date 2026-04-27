import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Settings, Award, Flame, LogOut, Wine, Activity, MapPin, Grape, BookOpen, Hexagon, Shield, Star } from 'lucide-react';
import { collection, query, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';

export default function ProfileTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [stats, setStats] = useState({ 
    glasses: 0, 
    streak: 3, 
    uniqueWines: 0,
    topVarietal: 'Pinotage',
    topRegion: 'Stellenbosch',
    memberTier: 'AfriSommelier Initiate'
  });
  const [loading, setLoading] = useState(true);
  
  // Refined Palate DNA for a "Professional" feel
  const [tasteDNA, setTasteDNA] = useState({
    Boldness: 85,
    Tannin: 70,
    Sweetness: 15,
    Acidity: 65,
    Fruitiness: 60,
    Earthiness: 50
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(collection(db, `users/${auth.currentUser.uid}/consumption`));
        const snapshot = await getDocs(q);
        
        const unique = new Set();
        let regionCounts: Record<string, number> = {};
        let varietalCounts: Record<string, number> = {};

        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.wineName) unique.add(data.wineName);
          if (data.region) regionCounts[data.region] = (regionCounts[data.region] || 0) + 1;
          if (data.grape) varietalCounts[data.grape] = (varietalCounts[data.grape] || 0) + 1;
        });

        // Calculate top region & varietal
        const topRegion = Object.keys(regionCounts).sort((a,b) => regionCounts[b] - regionCounts[a])[0] || 'Stellenbosch';
        const topVarietal = Object.keys(varietalCounts).sort((a,b) => varietalCounts[b] - varietalCounts[a])[0] || 'Pinotage';

        // Determine tier
        let tier = 'AfriSommelier Initiate';
        if (snapshot.size >= 10) tier = 'Estate Explorer';
        if (snapshot.size >= 30) tier = 'Terroir Master';
        if (snapshot.size >= 50) tier = 'Grand Sommelier';

        setStats({
          glasses: snapshot.size,
          streak: Math.max(3, Math.floor(snapshot.size / 3)), 
          uniqueWines: unique.size,
          topRegion,
          topVarietal,
          memberTier: tier
        });
      } catch (error) {
        import('../utils/firestoreErrorHandler').then(({ handleFirestoreError, OperationType }) => {
          handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser?.uid}/consumption`);
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="min-h-screen bg-[#0B0F14] pb-32"
    >
      <div className="w-full max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 pt-12">
          <button onClick={() => onNavigate('home')} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-xl font-serif font-medium text-white tracking-wide uppercase text-sm">Dossier</h2>
          <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <Settings size={20} />
          </button>
        </div>

        <div className="px-6 space-y-8">
          {/* Identity Card */}
          <div className="relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-b from-gold-500/50 via-gold-500/10 to-transparent">
            <div className="bg-[#121820] rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
              
              <div className="flex flex-col items-center relative z-10">
                <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-gold-500/40 p-1 mb-4 shadow-[0_0_30px_rgba(212,175,55,0.15)]">
                  <div className="w-full h-full rounded-full overflow-hidden">
                    <img 
                      src={auth.currentUser?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop"} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
                
                <h1 className="text-3xl font-serif font-semibold text-white mb-1">
                  {auth.currentUser?.displayName || 'Connoisseur'}
                </h1>
                
                <div className="flex items-center gap-2 text-gold-500 mb-6">
                  <Shield size={16} />
                  <span className="text-sm tracking-widest uppercase font-medium">{stats.memberTier}</span>
                </div>

                <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-6"></div>

                <p className="text-center text-gray-400 text-sm font-serif italic max-w-sm leading-relaxed">
                  "A passionate explorer of South African terroirs. Curator of fine Cap Classiques and robust Stellenbosch reds."
                </p>
              </div>
            </div>
          </div>

          {/* Core Analytics Grid */}
          <div>
            <h3 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-4 ml-2">Cellar Analytics</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col justify-between">
                <WindIcon className="text-gray-400 mb-3" />
                <div>
                  <p className="text-3xl font-serif font-medium text-white mb-1">{stats.glasses}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Tastings Logged</p>
                </div>
              </div>
              
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col justify-between">
                <Flame className="text-gold-500 mb-3" size={22} />
                <div>
                  <p className="text-3xl font-serif font-medium text-gold-500 mb-1">{stats.streak}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Day Streak</p>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col justify-between">
                <MapPin className="text-gray-400 mb-3" size={22} />
                <div>
                  <p className="text-xl font-serif font-medium text-white mb-1 truncate">{stats.topRegion}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Top Region</p>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col justify-between">
                <Grape className="text-purple-400 mb-3" size={22} />
                <div>
                  <p className="text-xl font-serif font-medium text-white mb-1 truncate">{stats.topVarietal}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Top Cultivar</p>
                </div>
              </div>
            </div>
          </div>

          {/* TasteDNA Matrix */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-gold-500 to-purple-500 opacity-50"></div>
            <div className="mb-8 flex justify-between items-end">
              <div>
                <h3 className="text-lg font-serif text-white mb-1">Palate Matrix</h3>
                <p className="text-gray-400 text-sm">Your evolving sensory profile</p>
              </div>
              <Activity size={24} className="text-gold-500 opacity-50" />
            </div>
            
            <div className="space-y-5">
              <TasteBar label="Structure & Boldness" value={tasteDNA.Boldness} color="bg-red-500/80" onChange={(val) => setTasteDNA(prev => ({ ...prev, Boldness: val }))} />
              <TasteBar label="Tannin Profile" value={tasteDNA.Tannin} color="bg-amber-600/80" onChange={(val) => setTasteDNA(prev => ({ ...prev, Tannin: val }))} />
              <TasteBar label="Residual Sugar" value={tasteDNA.Sweetness} color="bg-pink-500/80" onChange={(val) => setTasteDNA(prev => ({ ...prev, Sweetness: val }))} />
              <TasteBar label="Crispness & Acidity" value={tasteDNA.Acidity} color="bg-green-500/80" onChange={(val) => setTasteDNA(prev => ({ ...prev, Acidity: val }))} />
              <TasteBar label="Fruit Concentration" value={tasteDNA.Fruitiness} color="bg-purple-500/80" onChange={(val) => setTasteDNA(prev => ({ ...prev, Fruitiness: val }))} />
              <TasteBar label="Earth & Minerality" value={tasteDNA.Earthiness} color="bg-stone-500/80" onChange={(val) => setTasteDNA(prev => ({ ...prev, Earthiness: val }))} />
            </div>
          </div>

          {/* Certifications & Badges */}
          <div>
            <h3 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-4 ml-2">Certifications & Honors</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-4 hover:border-gold-500/30 transition-colors">
                <div className="w-12 h-12 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-500 shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                  <Star size={20} />
                </div>
                <div>
                  <h4 className="font-medium text-sm text-white font-serif">Cap Classique Society</h4>
                  <p className="text-xs text-gray-400 mt-1">Founding Member</p>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-4 hover:border-red-500/30 transition-colors">
                <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                  <Flame size={20} />
                </div>
                <div>
                  <h4 className="font-medium text-sm text-white font-serif">Pinotage Virtuoso</h4>
                  <p className="text-xs text-gray-400 mt-1">Level II Explorer</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-6">
            <button 
              onClick={handleLogout}
              className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-center gap-2 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all font-medium"
            >
              <LogOut size={18} />
              Sign Out of Dossier
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function WindIcon({ className }: { className?: string }) {
  return <Wine size={22} className={className} />;
}

function TasteBar({ label, value, color, onChange }: { label: string, value: number, color: string, onChange: (val: number) => void }) {
  return (
    <div className="group">
      <div className="flex justify-between text-xs mb-2">
        <span className="text-gray-300 font-medium tracking-wide">{label}</span>
        <span className="text-gray-500 font-mono">{value}%</span>
      </div>
      <div className="relative h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
        <motion.div 
          animate={{ width: `${value}%` }}
          transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
          className={`absolute top-0 left-0 h-full ${color} pointer-events-none`} 
        />
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={value} 
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}
