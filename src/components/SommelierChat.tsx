import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Mic, Sparkles, ChevronRight, Brain, Volume2, Loader2 } from 'lucide-react';
import { GoogleGenAI, Type, Schema, ThinkingLevel, Modality } from '@google/genai';
import WinePourLoader from './WinePourLoader';
import { WINE_FARMS_KNOWLEDGE } from '../data/wineKnowledge';
import { WINE_COURSE_KNOWLEDGE } from '../data/educationalCourseKnowledge';
import { WINE_WISE_KNOWLEDGE } from '../data/wineWiseKnowledge';

export default function SommelierChat({ onClose, initialMessage }: { onClose: () => void, initialMessage?: { role: 'user' | 'model', text: string, autoVoice?: boolean } | null }) {
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string, data?: any}[]>(() => {
    if (initialMessage && initialMessage.role === 'model') {
      return [{ role: 'model', text: initialMessage.text }];
    }
    return [{ role: 'model', text: 'Good evening. I am your AI Sommelier. What are we drinking tonight?' }];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isDeepAnalysis, setIsDeepAnalysis] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-ZA'; // South African English

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setInput(finalTranscript);
          handleSend(finalTranscript);
        } else {
          setInput(interimTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    if (initialMessage?.autoVoice) {
      toggleListening();
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setInput('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Handle initial user message if provided
  useEffect(() => {
    if (initialMessage && initialMessage.role === 'user') {
      handleSend(initialMessage.text);
    }
  }, [initialMessage]);

  const handleSend = async (overrideInput?: string) => {
    const userMsg = overrideInput || input.trim();
    if (!userMsg || isLoading) return;

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
        model: isDeepAnalysis ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview",
        contents: contents as any,
        tools: [{ googleSearch: {} }],
        config: {
          systemInstruction: `You are a Master Sommelier specializing in South African wines. Keep your answers concise, elegant, and helpful.
          
          Here is some specific knowledge about South African wine farms and their 2026 rankings:
          ${WINE_FARMS_KNOWLEDGE}
          
          Here is the official South African Wine Educational Course knowledge:
          ${WINE_COURSE_KNOWLEDGE}
          
          Here is the Wine Wise South African Wine Knowledge:
          ${WINE_WISE_KNOWLEDGE}`,
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          ...(isDeepAnalysis ? { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } } : {})
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

  const handleTTS = async (text: string) => {
    if (isPlayingTTS) return;
    setIsPlayingTTS(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Puck' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const int16Array = new Int16Array(bytes.buffer);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
          float32Array[i] = int16Array[i] / 32768.0;
        }

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = audioContext.createBuffer(1, float32Array.length, 24000);
        audioBuffer.getChannelData(0).set(float32Array);

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.onended = () => setIsPlayingTTS(false);
        source.start(0);
      } else {
        setIsPlayingTTS(false);
      }
    } catch (error) {
      console.error("TTS error:", error);
      setIsPlayingTTS(false);
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
          <div>
            <h2 className="font-serif text-xl font-medium text-ivory">Sommelier AI</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <button 
                onClick={() => setIsDeepAnalysis(!isDeepAnalysis)}
                className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full border transition-colors ${isDeepAnalysis ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' : 'bg-glass border-glass-border text-gray-400'}`}
              >
                <Brain size={10} />
                Deep Analysis {isDeepAnalysis ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
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
              <div className={`max-w-[85%] p-4 rounded-2xl mb-2 relative group ${
                msg.role === 'user' 
                  ? 'bg-wine-800 text-ivory rounded-tr-sm' 
                  : 'glass-panel text-ivory rounded-tl-sm'
              }`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
                {msg.role === 'model' && (
                  <button 
                    onClick={() => handleTTS(msg.text)}
                    className="absolute -right-10 top-2 p-2 text-gray-400 hover:text-gold-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    {isPlayingTTS ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
                  </button>
                )}
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
          <button 
            onClick={toggleListening}
            className={`absolute left-4 transition-colors ${isListening ? 'text-pink-500 animate-pulse' : 'text-gray-400 hover:text-gold-500'}`}
          >
            <Mic size={20} />
          </button>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isListening ? "Listening..." : "Ask your sommelier..."} 
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
