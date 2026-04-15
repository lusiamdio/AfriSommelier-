import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ScanLine, Wine, Info, Sparkles, Image as ImageIcon } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

export default function ARScanner({ onClose, onSave }: { onClose: () => void, onSave: (wine: any) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [arData, setArData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in this browser.");
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      let errorMessage = "Could not access camera. Please ensure permissions are granted.";
      if (err.name === 'NotAllowedError' || err.message === 'Permission denied') {
        errorMessage = "Camera permission was denied. Please allow camera access in your browser settings, or use the image upload fallback below.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsScanning(true);
    setArData(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
              { text: `Analyze this wine bottle. Extract the name, vintage, region, and grape. 
                Also provide a short 'story' about the winery or region, and 2 food pairings.
                Return JSON with: name, vintage, region, grape, story, pairings (array of strings), rating (number out of 100), awards (string, e.g., 'Platter 5 Star'), abv (string, e.g., '13.5%'), isOrganic (boolean), caloriesPerGlass (number).` }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
        }
      });

      const data = JSON.parse(response.text || "{}");
      setArData(data);
    } catch (err) {
      console.error("AR Scan Error:", err);
      setError("Failed to analyze the bottle. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setArData(null);
    setError(null);

    try {
      const base64Image = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onloadend = () => {
          resolve((r.result as string).split(',')[1]);
        };
        r.readAsDataURL(file);
      });

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { data: base64Image, mimeType: file.type } },
              { text: `Analyze this wine bottle. Extract the name, vintage, region, and grape. 
                Also provide a short 'story' about the winery or region, and 2 food pairings.
                Return JSON with: name, vintage, region, grape, story, pairings (array of strings), rating (number out of 100), awards (string, e.g., 'Platter 5 Star'), abv (string, e.g., '13.5%'), isOrganic (boolean), caloriesPerGlass (number).` }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
        }
      });

      const data = JSON.parse(response.text || "{}");
      setArData(data);
    } catch (err) {
      console.error("AR Scan Error:", err);
      setError("Failed to analyze the bottle. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
    >
      {/* Camera Feed */}
      <div className="absolute inset-0 overflow-hidden">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover opacity-80"
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex justify-between items-center p-6 bg-gradient-to-b from-black/80 to-transparent">
        <h2 className="font-serif text-xl text-ivory flex items-center gap-2">
          <Sparkles size={18} className="text-gold-500" />
          AR Experience
        </h2>
        <button onClick={onClose} className="p-2 text-white bg-black/50 rounded-full backdrop-blur-md">
          <X size={24} />
        </button>
      </div>

      {/* AR Overlay Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-end p-6 pb-12 pointer-events-none">
        
        {/* Scanning Reticle */}
        {!arData && !isScanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-80 border-2 border-gold-500/50 rounded-3xl relative">
              <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-gold-500 rounded-tl-3xl"></div>
              <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-gold-500 rounded-tr-3xl"></div>
              <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-gold-500 rounded-bl-3xl"></div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-gold-500 rounded-br-3xl"></div>
              <p className="absolute -bottom-10 w-full text-center text-ivory/80 text-sm font-medium tracking-wider">Point at wine label</p>
            </div>
          </div>
        )}

        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="glass-panel p-6 rounded-2xl flex flex-col items-center">
              <ScanLine size={40} className="text-gold-500 animate-pulse mb-4" />
              <p className="text-ivory font-serif">Analyzing bottle...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/80 backdrop-blur-md text-white p-4 rounded-xl mb-4 pointer-events-auto">
            <p className="mb-2">{error}</p>
            <div className="flex gap-4">
              <button onClick={() => { setError(null); startCamera(); }} className="underline text-sm font-medium">Retry Camera</button>
              <button onClick={() => fileInputRef.current?.click()} className="underline text-sm font-medium flex items-center gap-1">
                <ImageIcon size={14} /> Upload Image
              </button>
            </div>
          </div>
        )}

        {/* AR Data Cards */}
        <AnimatePresence>
          {arData && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 pointer-events-auto"
            >
              {/* Main Info Card */}
              <div className="glass-panel p-5 rounded-2xl border border-gold-500/30 shadow-[0_0_30px_rgba(198,169,107,0.15)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 blur-3xl rounded-full"></div>
                <h3 className="font-serif text-2xl text-ivory mb-1">{arData.name || 'Unknown Wine'}</h3>
                <p className="text-gold-500 text-sm mb-4">{arData.vintage} • {arData.region}</p>
                
                <div className="flex gap-4 mb-4">
                  <div className="bg-wine-900/50 rounded-lg p-3 flex-1">
                    <p className="text-xs text-gray-400 mb-1">Grape</p>
                    <p className="text-sm text-ivory font-medium">{arData.grape}</p>
                  </div>
                  <div className="bg-wine-900/50 rounded-lg p-3 flex-1">
                    <p className="text-xs text-gray-400 mb-1">Rating</p>
                    <p className="text-sm text-ivory font-medium">{arData.rating}/100</p>
                  </div>
                  {arData.awards && (
                    <div className="bg-wine-900/50 rounded-lg p-3 flex-1">
                      <p className="text-xs text-gray-400 mb-1">Awards</p>
                      <p className="text-sm text-ivory font-medium">{arData.awards}</p>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-ivory mb-2">
                    <Info size={16} className="text-gold-500" />
                    The Story
                  </h4>
                  <p className="text-sm text-gray-300 leading-relaxed">{arData.story}</p>
                </div>

                <div>
                  <h4 className="flex items-center gap-2 text-sm font-medium text-ivory mb-2">
                    <Wine size={16} className="text-gold-500" />
                    Perfect Pairings
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {arData.pairings?.map((pairing: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-white/10 rounded-full text-xs text-ivory">
                        {pairing}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button 
                  onClick={() => setArData(null)}
                  className="flex-1 py-4 rounded-xl glass-panel text-ivory font-medium hover:bg-white/10 transition-colors"
                >
                  Scan Another
                </button>
                <button 
                  onClick={() => {
                    onSave(arData);
                    onClose();
                  }}
                  className="flex-1 py-4 rounded-xl bg-gold-500 text-wine-900 font-medium hover:bg-gold-400 transition-colors shadow-[0_0_20px_rgba(198,169,107,0.4)]"
                >
                  Save to Cellar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Capture Button */}
        {!arData && !isScanning && (
          <div className="flex justify-center mt-8 pointer-events-auto items-center gap-6">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors"
            >
              <ImageIcon size={24} />
            </button>
            <button 
              onClick={captureAndScan}
              className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center relative group"
            >
              <div className="w-16 h-16 bg-white rounded-full group-hover:scale-90 transition-transform"></div>
            </button>
            <div className="w-12 h-12"></div> {/* Spacer to center capture button */}
          </div>
        )}
      </div>
    </motion.div>
  );
}
