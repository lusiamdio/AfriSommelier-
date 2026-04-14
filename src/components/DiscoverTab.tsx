import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Gift, Users } from 'lucide-react';
import TasteDNA from './TasteDNA';
import GiftEngineModal from './GiftEngineModal';
import PartyModeModal from './PartyModeModal';
import RegionModal from './RegionModal';

export default function DiscoverTab({ onSelectWine }: { onSelectWine: (wine: any) => void }) {
  const [showGiftEngine, setShowGiftEngine] = useState(false);
  const [showPartyMode, setShowPartyMode] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  return (
    <div className="pb-32 pt-12">
      {/* Search Bar */}
      <div className="px-6 mb-8">
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="text-gray-400" size={20} />
          </div>
          <input 
            type="text" 
            placeholder="Search wines, regions, grapes..." 
            className="w-full bg-glass border border-glass-border rounded-full py-4 pl-12 pr-6 text-sm text-ivory placeholder-gray-400 focus:outline-none focus:border-gold-500 transition-colors"
          />
        </div>
      </div>

      {/* AI Tools */}
      <div className="px-6 mb-8 flex gap-4">
        <button 
          onClick={() => setShowPartyMode(true)}
          className="flex-1 bg-gradient-to-br from-pink-500/20 to-purple-600/20 border border-pink-500/30 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-pink-500/30 transition-colors"
        >
          <Users className="text-pink-400" size={24} />
          <span className="text-sm font-medium text-pink-100">Party Mode</span>
        </button>
        <button 
          onClick={() => setShowGiftEngine(true)}
          className="flex-1 bg-gradient-to-br from-gold-500/20 to-yellow-600/20 border border-gold-500/30 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-gold-500/30 transition-colors"
        >
          <Gift className="text-gold-400" size={24} />
          <span className="text-sm font-medium text-gold-100">Gift Engine</span>
        </button>
      </div>

      {/* Taste DNA Section */}
      <div className="px-6">
        <TasteDNA />
      </div>

      {/* Because you liked... */}
      <div className="mb-12">
        <h3 className="text-xl font-semibold px-6 mb-4">Because you liked Cabernet</h3>
        <div className="flex overflow-x-auto hide-scrollbar px-6 gap-4">
          <WineThumbnail 
            name="Meerlust Rubicon" 
            region="Stellenbosch" 
            image="https://images.unsplash.com/photo-1584916201218-f4242ceb4809?q=80&w=400&auto=format&fit=crop" 
            onClick={() => onSelectWine({
              name: "Meerlust Rubicon",
              vintage: "2017",
              region: "Stellenbosch",
              image: "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?q=80&w=400&auto=format&fit=crop"
            })}
          />
          <WineThumbnail 
            name="Vilafonté Series C" 
            region="Paarl" 
            image="https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?q=80&w=400&auto=format&fit=crop" 
            onClick={() => onSelectWine({
              name: "Vilafonté Series C",
              vintage: "2018",
              region: "Paarl",
              image: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?q=80&w=400&auto=format&fit=crop"
            })}
          />
          <WineThumbnail 
            name="Rust en Vrede" 
            region="Stellenbosch" 
            image="https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?q=80&w=400&auto=format&fit=crop" 
            onClick={() => onSelectWine({
              name: "Rust en Vrede",
              vintage: "2019",
              region: "Stellenbosch",
              image: "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?q=80&w=400&auto=format&fit=crop"
            })}
          />
        </div>
      </div>

      {/* Explore Regions */}
      <div className="mb-12">
        <h3 className="text-xl font-semibold px-6 mb-4">Explore Regions</h3>
        <div className="grid grid-cols-2 gap-4 px-6">
          <RegionCard name="Stellenbosch" image="https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=600&auto=format&fit=crop" onClick={() => setSelectedRegion("Stellenbosch")} />
          <RegionCard name="Franschhoek" image="https://images.unsplash.com/photo-1595854341625-f33ee10dbf94?q=80&w=600&auto=format&fit=crop" onClick={() => setSelectedRegion("Franschhoek")} />
          <RegionCard name="Swartland" image="https://images.unsplash.com/photo-1504279577054-acfeccf8fc52?q=80&w=600&auto=format&fit=crop" onClick={() => setSelectedRegion("Swartland")} />
          <RegionCard name="Hemel-en-Aarde" image="https://images.unsplash.com/photo-1502672260266-1c1c24240f38?q=80&w=600&auto=format&fit=crop" onClick={() => setSelectedRegion("Hemel-en-Aarde")} />
        </div>
      </div>

      {/* Grapes */}
      <div className="mb-12">
        <h3 className="text-xl font-semibold px-6 mb-4">Grapes</h3>
        <div className="flex flex-wrap gap-3 px-6">
          <GrapeChip name="Pinotage 🇿🇦" />
          <GrapeChip name="Chenin Blanc" />
          <GrapeChip name="Shiraz" />
          <GrapeChip name="Cabernet Sauvignon" />
          <GrapeChip name="Merlot" />
          <GrapeChip name="Chardonnay" />
        </div>
      </div>

      <AnimatePresence>
        {showGiftEngine && <GiftEngineModal onClose={() => setShowGiftEngine(false)} onSelectWine={onSelectWine} />}
        {showPartyMode && <PartyModeModal onClose={() => setShowPartyMode(false)} onSelectWine={onSelectWine} />}
        {selectedRegion && <RegionModal regionName={selectedRegion} onClose={() => setSelectedRegion(null)} />}
      </AnimatePresence>
    </div>
  );
}

function WineThumbnail({ name, region, image, onClick }: any) {
  return (
    <div onClick={onClick} className="min-w-[140px] shrink-0 group cursor-pointer">
      <div className="aspect-[2/3] rounded-xl overflow-hidden mb-3 relative">
        <img src={image} alt={name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-gradient-to-t from-wine-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </div>
      <h4 className="font-serif text-sm font-medium leading-tight mb-1">{name}</h4>
      <p className="text-xs text-gray-400">{region}</p>
    </div>
  );
}

function RegionCard({ name, image, onClick }: any) {
  return (
    <div onClick={onClick} className="relative aspect-video rounded-xl overflow-hidden cursor-pointer group">
      <img src={image} alt={name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <h4 className="font-serif text-lg font-medium tracking-wide">{name}</h4>
      </div>
    </div>
  );
}

function GrapeChip({ name }: { name: string }) {
  return (
    <button className="px-5 py-2.5 rounded-full border border-glass-border bg-glass hover:bg-white/10 transition-colors text-sm font-medium">
      {name}
    </button>
  );
}
