import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Mic, Sparkles, ChevronRight } from 'lucide-react';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import WinePourLoader from './WinePourLoader';

export default function SommelierChat({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string, data?: any}[]>([
    { role: 'model', text: 'Good evening. I am your AI Sommelier. What are we drinking tonight?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const contents = [
        ...messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
        { role: 'user', parts: [{ text: userMsg }] }
      ];

      const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
          message: {
            type: Type.STRING,
            description: "A conversational, elegant response from the sommelier."
          },
          wines: {
            type: Type.ARRAY,
            description: "A list of 1 to 3 recommended wines based on the user's request.",
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                vintage: { type: Type.STRING },
                region: { type: Type.STRING },
                price: { type: Type.STRING },
                reason: { type: Type.STRING, description: "Why this wine is recommended." }
              },
              required: ["name", "vintage", "region", "price", "reason"]
            }
          }
        },
        required: ["message", "wines"]
      };

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: contents as any,
        config: {
          systemInstruction: "You are a Master Sommelier specializing in South African wines. Keep your answers concise, elegant, and helpful.",
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      });

      const data = JSON.parse(response.text || "{}");
      
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: data.message || 'I apologize, I could not process that.',
        data: data.wines
      }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', text: 'My apologies, I am having trouble connecting to my cellar right now. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed inset-0 z-50 flex flex-col bg-wine-900/95 backdrop-blur-xl"
    >
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-glass-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-wine-800 flex items-center justify-center relative overflow-hidden shadow-[0_0_15px_rgba(198,169,107,0.3)]">
            <div className="absolute inset-0 bg-gold-500/20 blur-md animate-pulse"></div>
            <Sparkles size={18} className="text-gold-500 relative z-10" />
          </div>
          <h2 className="font-serif text-xl font-medium text-ivory">Sommelier AI</h2>
        </div>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-ivory transition-colors">
          <X size={24} />
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 hide-scrollbar">
        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className={`max-w-[85%] p-4 rounded-2xl mb-2 ${
                msg.role === 'user' 
                  ? 'bg-wine-800 text-ivory rounded-tr-sm' 
                  : 'glass-panel text-ivory rounded-tl-sm'
              }`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
              </div>
              
              {/* Render Structured Wine Cards */}
              {msg.data && msg.data.length > 0 && (
                <div className="flex flex-col gap-3 w-full max-w-[85%]">
                  {msg.data.map((wine: any, wIdx: number) => (
                    <div key={wIdx} className="glass-panel p-4 rounded-xl flex gap-4 items-center group cursor-pointer hover:bg-white/5 transition-colors">
                      <div className="w-12 h-16 bg-wine-800 rounded-md overflow-hidden shrink-0">
                        <img src="https://images.unsplash.com/photo-1584916201218-f4242ceb4809?q=80&w=100&auto=format&fit=crop" alt="wine" className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-serif font-medium text-sm truncate">{wine.name}</h4>
                        <p className="text-xs text-gray-400 truncate">{wine.region}, {wine.vintage}</p>
                        <p className="text-xs text-gold-500 mt-1">{wine.price}</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-500 group-hover:text-gold-500 transition-colors" />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="glass-panel rounded-2xl rounded-tl-sm flex items-center justify-center min-w-[120px]">
                <WinePourLoader />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 pb-10">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-4">
          <button onClick={() => setInput('Wine for braai')} className="px-4 py-2 rounded-full border border-glass-border bg-glass text-xs whitespace-nowrap hover:bg-white/10 transition-colors">Wine for braai</button>
          <button onClick={() => setInput('Under R200')} className="px-4 py-2 rounded-full border border-glass-border bg-glass text-xs whitespace-nowrap hover:bg-white/10 transition-colors">Under R200</button>
          <button onClick={() => setInput('Bold red')} className="px-4 py-2 rounded-full border border-glass-border bg-glass text-xs whitespace-nowrap hover:bg-white/10 transition-colors">Bold red</button>
        </div>
        
        <div className="relative flex items-center">
          <button className="absolute left-4 text-gray-400 hover:text-gold-500 transition-colors">
            <Mic size={20} />
          </button>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask your sommelier..." 
            className="w-full bg-glass border border-glass-border rounded-full py-4 pl-12 pr-14 text-sm text-ivory placeholder-gray-400 focus:outline-none focus:border-gold-500 transition-colors"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 w-10 h-10 rounded-full bg-gold-500 text-wine-900 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
