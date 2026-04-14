/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { Home, Compass, ScanLine, MessageSquare, Grape } from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import HomeTab from './components/HomeTab';
import DiscoverTab from './components/DiscoverTab';
import ScanTab from './components/ScanTab';
import CellarTab from './components/CellarTab';
import SommelierChat from './components/SommelierChat';
import WineDetail from './components/WineDetail';
import LoginScreen from './components/LoginScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedWine, setSelectedWine] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-wine-900 flex items-center justify-center text-gold-500">Loading...</div>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-wine-900 text-ivory font-sans selection:bg-gold-500/30">
      <main className="h-screen overflow-y-auto hide-scrollbar relative">
        {activeTab === 'home' && <HomeTab onSelectWine={setSelectedWine} />}
        {activeTab === 'discover' && <DiscoverTab onSelectWine={setSelectedWine} />}
        {activeTab === 'scan' && <ScanTab onSelectWine={setSelectedWine} />}
        {activeTab === 'ai' && <SommelierChat onClose={() => setActiveTab('home')} />}
        {activeTab === 'cellar' && <CellarTab onSelectWine={setSelectedWine} />}
      </main>

      {/* Floating Glass Navigation Bar */}
      <nav className="fixed bottom-6 left-6 right-6 md:left-1/2 md:-translate-x-1/2 md:w-[500px] h-[72px] glass-panel flex justify-between items-center px-6 z-40">
        <NavItem icon={<Home size={24} />} active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <NavItem icon={<Compass size={24} />} active={activeTab === 'discover'} onClick={() => setActiveTab('discover')} />
        
        {/* Floating Center Scan Button */}
        <div className="relative -top-6">
          <button 
            onClick={() => setActiveTab('scan')}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-gold-300 to-gold-500 text-wine-900 flex items-center justify-center shadow-[0_8px_32px_rgba(198,169,107,0.4)] hover:scale-105 transition-transform"
          >
            <ScanLine size={28} />
          </button>
        </div>

        <NavItem icon={<MessageSquare size={24} />} active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} />
        <NavItem icon={<Grape size={24} />} active={activeTab === 'cellar'} onClick={() => setActiveTab('cellar')} />
      </nav>

      <AnimatePresence>
        {selectedWine && (
          <WineDetail wine={selectedWine} onClose={() => setSelectedWine(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon, active, onClick }: { icon: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`p-2 transition-colors duration-300 ${
        active ? 'text-gold-500' : 'text-gray-400 hover:text-ivory'
      }`}
    >
      {icon}
    </button>
  );
}
