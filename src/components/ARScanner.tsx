import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ScanLine, Wine, Info, Sparkles, Image as ImageIcon, FileText, Moon, Sun, MessageSquare } from 'lucide-react';
import { callOpenRouter } from '../services/openRouterService';

export default function ARScanner({ onClose, onSave }: { onClose: () => void, onSave: (data: any) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [arData, setArData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // New Advanced Features State
  const [scanMode, setScanMode] = useState<'bottle' | 'menu'>('bottle');
  const [lowLightMode, setLowLightMode] = useState(false);
  const [userQuery, setUserQuery] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [lowLightMode]);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in this browser.");
      }
      // Apply advanced constraints if requested
      const constraints: MediaStreamConstraints = {
        video: { 
          facingMode: 'environment',
          // Optionally request advanced settings (some browsers support this)
          ...(lowLightMode && { advanced: [{ exposureMode: 'continuous' } as any] })
        }
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
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

  const processImage = async (base64Image: string, mimeType: string) => {
    setIsScanning(true);
    setArData(null);
    setError(null);

    const promptText = scanMode === 'bottle' 
      ? `Analyze this wine bottle label accurately. Extract details such as name, vintage, region, and grape. ${userQuery ? `\nThe user also asked: "${userQuery}". Answer this directly in the recommendationReason field.` : ''}`
      : `Analyze this restaurant menu. Identify the main dishes visible. Recommend the 3 best South African wine pairings for these dishes. ${userQuery ? `\nThe user asked: "${userQuery}". Adjust recommendations accordingly.` : ''}`;

    try {
      const systemPrompt = `You are a sommelier. You must return your response strictly as a JSON object responding with valid JSON only.
Structure:
{
  "type": "string ('label' or 'menu')",
  "wines": [
    {
      "name": "string",
      "vintage": "string",
      "region": "string",
      "grape": "string",
      "notes": "string",
      "price": "string",
      "rating": number,
      "awards": "string",
      "abv": "string",
      "isOrganic": boolean,
      "caloriesPerGlass": number,
      "match": "string",
      "recommendationReason": "string"
    }
  ]
}
For notes, keep them concise and relevant. Make reasonable estimations for missing data.`;

      const responseText = await callOpenRouter({
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: promptText },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
            ]
          }
        ],
        responseFormat: { type: "json_object" }
      });

      const data = JSON.parse(responseText || "{}");
      // Normalize data
      const isMenu = scanMode === 'menu' || data.type === 'menu';
      const winesList = Array.isArray(data.wines) ? data.wines : [data];

      setArData({
        type: isMenu ? 'menu' : 'label',
        wines: winesList
      });

    } catch (err) {
      console.error("AR Scan Error:", err);
      setError("Failed to analyze the image. Please try again or switch modes.");
    } finally {
      setIsScanning(false);
    }
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Simulate low light enhancement directly in canvas extraction
    if (lowLightMode) {
      ctx.filter = 'brightness(1.4) contrast(1.2)';
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];
    
    await processImage(base64Image, 'image/jpeg');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const base64Image = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onloadend = () => {
          resolve((r.result as string).split(',')[1]);
        };
        r.readAsDataURL(file);
      });
      await processImage(base64Image, file.type);
    } catch (err) {
      console.error("Upload error", err);
      setError("Failed to process uploaded file.");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col font-sans"
    >
      {/* Camera Feed with possible low light UI filter */}
      <div className="absolute inset-0 overflow-hidden bg-black">
         {/* Grid overlay for tech feel */}
         <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0"></div>
        
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className={`w-full h-full object-cover transition-all duration-500 ${lowLightMode ? 'brightness-[1.2] contrast-[1.2] saturate-[1.2]' : 'opacity-80'}`}
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Header & Modes */}
      <div className="relative z-10 flex flex-col p-6 bg-gradient-to-b from-black/90 pb-8 to-transparent">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-serif text-xl text-ivory flex items-center gap-2">
            <Sparkles size={18} className="text-gold-500" />
            Vision AI Engine
          </h2>
          <div className="flex gap-3">
             <button 
                onClick={() => setLowLightMode(!lowLightMode)} 
                className={`p-2 rounded-full backdrop-blur-md transition-colors ${lowLightMode ? 'bg-gold-500 text-wine-900 border border-gold-400' : 'text-white bg-black/50 border border-white/10'}`}
             >
                {lowLightMode ? <Sun size={20} /> : <Moon size={20} />}
             </button>
            <button onClick={onClose} className="p-2 text-white bg-black/50 border border-white/10 rounded-full backdrop-blur-md">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Mode Toggle */}
        {!arData && (
          <div className="flex bg-black/40 border border-white/10 backdrop-blur-md rounded-full p-1 self-center w-64 shadow-2xl">
            <button 
              onClick={() => setScanMode('bottle')}
              className={`flex-1 py-2 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all ${scanMode === 'bottle' ? 'bg-gold-500 text-wine-900 shadow-md' : 'text-gray-400 hover:text-white'}`}
            >
              <Wine size={16} /> Bottle
            </button>
            <button 
              onClick={() => setScanMode('menu')}
              className={`flex-1 py-2 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all ${scanMode === 'menu' ? 'bg-gold-500 text-wine-900 shadow-md' : 'text-gray-400 hover:text-white'}`}
            >
              <FileText size={16} /> Menu
            </button>
          </div>
        )}
      </div>

      {/* AR Overlay Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-end p-6 pb-12 pointer-events-none">
        
        {/* Ask a Question Input */}
        {!arData && !isScanning && (
          <div className="absolute top-32 left-6 right-6 pointer-events-auto">
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex items-center gap-2 shadow-2xl transition-all focus-within:bg-black/60 focus-within:border-gold-500/50">
              <MessageSquare size={18} className="text-gold-500 ml-2" />
              <input 
                type="text" 
                placeholder="Ask AI... (e.g., 'Is this good with steak?')" 
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-white text-sm w-full placeholder:text-gray-400 py-1"
              />
            </div>
          </div>
        )}

        {/* Scanning Reticle */}
        {!arData && !isScanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {scanMode === 'bottle' ? (
              <div className="w-64 h-96 border-2 border-gold-500/30 rounded-[40px] relative transition-all duration-300">
                <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-gold-500 rounded-tl-[40px]"></div>
                <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-gold-500 rounded-tr-[40px]"></div>
                <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-gold-500 rounded-bl-[40px]"></div>
                <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-gold-500 rounded-br-[40px]"></div>
                <p className="absolute -bottom-10 w-full text-center text-ivory/80 text-sm font-medium tracking-wider drop-shadow-md">Align bottle label within frame</p>
              </div>
            ) : (
                <div className="w-80 h-96 border border-gold-500/30 relative bg-gold-500/5 transition-all duration-300">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-gold-500"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-gold-500"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-gold-500"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-gold-500"></div>
                <p className="absolute -bottom-10 w-full text-center text-ivory/80 text-sm font-medium tracking-wider drop-shadow-md">Capture full menu page</p>
              </div>
            )}
          </div>
        )}

        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="glass-panel p-6 rounded-3xl flex flex-col items-center bg-black/60 shadow-2xl border border-white/10 backdrop-blur-xl">
              <ScanLine size={48} className="text-gold-500 animate-pulse mb-4" />
              <p className="text-ivory font-serif text-lg">{scanMode === 'bottle' ? 'Analyzing Label & Vintage...' : 'Extracting OCR & Pairing Dishes...'}</p>
              <div className="w-48 h-1 bg-white/10 rounded-full mt-6 overflow-hidden">
                 <motion.div 
                    className="w-1/2 h-full bg-gold-500 rounded-full"
                    animate={{ x: [-100, 200] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                 />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/80 border border-red-500/50 backdrop-blur-md text-white p-4 rounded-xl mb-4 pointer-events-auto">
            <p className="mb-3 text-sm">{error}</p>
            <div className="flex gap-4">
              <button onClick={() => { setError(null); startCamera(); }} className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium hover:bg-white/20">Retry Camera</button>
              <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-white/20">
                <ImageIcon size={14} /> Upload Map
              </button>
            </div>
          </div>
        )}

        {/* AR Data Hover Review - Instantly passes to ScanTab for full UI rendering if it's a menu, or previews bottle here */}
        <AnimatePresence>
          {arData && (
             <motion.div 
               initial={{ opacity: 0, y: 50, scale: 0.9 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               className="pointer-events-auto w-full max-w-sm mx-auto"
             >
                <div className="bg-black/70 backdrop-blur-2xl p-6 rounded-[32px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/20 blur-[50px] rounded-full point-events-none"></div>
                  
                  <div className="flex items-start gap-4 mb-6 relative z-10">
                    <div className="w-12 h-12 bg-gold-500 text-wine-900 rounded-full flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(198,169,107,0.5)]">
                        {arData.type === 'menu' ? <FileText size={24} /> : <Sparkles size={24} />}
                    </div>
                    <div>
                        <h3 className="font-serif text-xl text-ivory mb-1">
                            {arData.type === 'menu' ? 'Menu Analyzed' : (arData.wines[0]?.name || 'Unknown')}
                        </h3>
                        <p className="text-gold-500 text-sm font-medium">
                            {arData.type === 'menu' ? `Found ${arData.wines.length} Perfect Pairings` : `${arData.wines[0]?.vintage || 'NV'} • ${arData.wines[0]?.region || 'Unknown Region'}`}
                        </p>
                    </div>
                  </div>

                  {arData.type === 'label' && arData.wines[0]?.recommendationReason && (
                      <div className="bg-white/5 border border-white/10 p-3 rounded-xl mb-6 relative z-10">
                          <p className="text-xs text-gold-500 font-medium tracking-wide uppercase mb-1">AI Answer</p>
                          <p className="text-sm text-ivory/90 leading-relaxed">{arData.wines[0].recommendationReason}</p>
                      </div>
                  )}

                  <div className="flex flex-col gap-3 relative z-10">
                     <button 
                       onClick={() => {
                         // Pass back to ScanTab for full detailed breakdown
                         onSave(arData);
                         onClose();
                       }}
                       className="w-full py-4 rounded-xl bg-gold-500 text-wine-900 font-semibold hover:bg-gold-400 hover:scale-[1.02] transition-all shadow-[0_0_20px_rgba(198,169,107,0.3)] flex items-center justify-center gap-2"
                     >
                       {arData.type === 'menu' ? 'View Pairings' : 'View Full Details'}
                     </button>
                     <button 
                       onClick={() => setArData(null)}
                       className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-ivory font-medium hover:bg-white/10 transition-colors"
                     >
                       Scan Again
                     </button>
                  </div>
                </div>
             </motion.div>
          )}
        </AnimatePresence>

        {/* Capture Button */}
        {!arData && !isScanning && (
          <div className="flex justify-center mt-8 pointer-events-auto items-center gap-8 relative z-20">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 rounded-full bg-black/50 border border-white/10 backdrop-blur-xl flex items-center justify-center text-white hover:bg-black/70 hover:scale-105 transition-all shadow-xl"
            >
              <ImageIcon size={20} />
            </button>
            
            <button 
              onClick={captureAndScan}
              className="w-20 h-20 rounded-full border-4 border-gold-500 flex items-center justify-center hover:scale-105 transition-transform bg-black/20 backdrop-blur-sm shadow-[0_0_30px_rgba(198,169,107,0.3)] group"
            >
              <div className="w-[60px] h-[60px] bg-white rounded-full group-hover:bg-gold-100 transition-colors"></div>
            </button>
            
            {/* Symmetrical placeholder wrapper to balance layout */}
            <div className="w-12 h-12 flex justify-center">
              <Info size={20} className="text-white/50 hover:text-white transition-colors cursor-pointer" />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
