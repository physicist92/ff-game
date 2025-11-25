import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  RotateCcw, 
  Trophy, 
  Share2, 
  Gem, 
  Loader2,
  X,
  Wallet
} from 'lucide-react';

// --- ÖNEMLİ: CANLIYA ALIRKEN (VERCEL) BU KISMI DÜZENLEYİN ---
// 1. Aşağıdaki satırın başındaki '//' işaretlerini kaldırın (Aktif edin):
// import sdk from '@farcaster/frame-sdk';

// 2. Aşağıdaki 'const sdk = ...' bloğunu SİLİN veya YORUM SATIRI YAPIN (Pasif edin):
const sdk = {
  context: Promise.resolve({ user: { fid: 19267, username: 'sedat' } }),
  actions: {
    ready: () => console.log("SDK Ready (Mock)"),
    openUrl: (url) => window.open(url, '_blank'),
    sendTransaction: async () => {
      console.log("Transaction sent (Mock)");
      await new Promise(r => setTimeout(r, 2000));
      return { hash: "0x123456..." };
    }
  }
};
// -------------------------------------------------------------

export default function App() {
  const [gameState, setGameState] = useState('start'); 
  const [level, setLevel] = useState(1);
  const [pinsLeft, setPinsLeft] = useState(6);
  const [score, setScore] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [hasMinted, setHasMinted] = useState(false);

  const canvasRef = useRef(null);
  const requestRef = useRef();
  
  // OYUN FİZİĞİ
  const game = useRef({
    rotation: 0, baseSpeed: 0.02, speed: 0.02,
    pins: [], redZones: [], frameCount: 0, mode: 'normal'
  });

  // MOCK DATA
  const mockLeaderboard = [
    { name: '@dwr', score: 450, level: 22 },
    { name: '@vitalik', score: 320, level: 15 },
    { name: '@sedat', score: 95, level: 7 },
    { name: '@horsefacts', score: 80, level: 6 },
    { name: '@linda', score: 45, level: 3 },
  ];

  // LEVEL CONFIG
  const getLevelConfig = (lvl) => {
    let config = { speed: 0.02, count: 6, initialPins: [], redZones: [], mode: 'normal' };
    if (lvl <= 10) { config.speed = 0.02 + (lvl * 0.0015); config.count = 4 + Math.floor(lvl / 2); }
    else if (lvl <= 20) { config.speed = -1 * (0.025 + ((lvl - 10) * 0.002)); config.count = 8 + Math.floor((lvl - 10) / 2); config.mode = 'reverse'; }
    else if (lvl <= 30) { config.speed = 0.035 + ((lvl - 20) * 0.002); config.count = 10 + Math.floor((lvl - 20) / 2); config.redZones = [{ start: Math.random() * Math.PI * 2, end: (Math.random() * Math.PI * 2) + (Math.PI / 4) }]; }
    else if (lvl <= 40) { config.speed = 0.04; config.count = 12; config.initialPins = Array.from({length: 3}, () => Math.random() * Math.PI * 2); config.mode = Math.random() > 0.5 ? 'normal' : 'reverse'; }
    else { config.speed = 0.05; config.count = 15; config.mode = 'chaos'; config.redZones = [{ start: 0, end: 0.6 }, { start: 3, end: 3.6 }]; }
    return config;
  };

  // SDK INITIALIZATION
  useEffect(() => {
    const init = async () => {
      try { 
        // Mock SDK kullanırken await gerekmez ama gerçek SDK asenkrondur
        await sdk.actions.ready(); 
        console.log("Farcaster SDK Ready");
      } catch(e) {
        console.error("SDK Error:", e);
      }
    };
    init();
  }, []);

  // OYUN DÖNGÜSÜ (Render)
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = 250; 
    const radius = 60;

    ctx.clearRect(0, 0, width, height);

    if (gameState === 'playing') {
      game.current.frameCount++;
      if (game.current.mode === 'chaos') game.current.speed = Math.sin(game.current.frameCount * 0.05) * 0.08;
      game.current.rotation += game.current.speed;
    }

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(game.current.rotation);

    game.current.redZones.forEach(zone => {
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, radius, zone.start, zone.end); ctx.lineTo(0, 0);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.6)'; ctx.fill();
    });

    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = gameState === 'lost' ? '#ef4444' : (gameState === 'won' ? '#22c55e' : 'white'); ctx.fill();

    game.current.pins.forEach(angle => {
      ctx.save(); ctx.rotate(angle); ctx.beginPath(); ctx.moveTo(radius, 0); ctx.lineTo(radius + 60, 0);
      ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(radius + 60, 0, 6, 0, Math.PI * 2); ctx.fillStyle = 'white'; ctx.fill();
      ctx.restore();
    });
    ctx.restore(); 

    ctx.fillStyle = 'black'; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(level, centerX, centerY);

    if (gameState === 'playing') {
        const shootY = 500;
        ctx.beginPath(); ctx.moveTo(centerX, shootY); ctx.lineTo(centerX, shootY - 60);
        ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.arc(centerX, shootY, 6, 0, Math.PI * 2); ctx.fillStyle = 'white'; ctx.fill();
    }
    requestRef.current = requestAnimationFrame(animate);
  }, [gameState, level]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);

  // ATIŞ
  const handleShoot = () => {
    if (gameState !== 'playing') return;
    let pinAngle = (Math.PI / 2) - game.current.rotation;
    pinAngle = (pinAngle % (Math.PI * 2)); if (pinAngle < 0) pinAngle += Math.PI * 2;

    const pinCollision = game.current.pins.some(angle => {
        let diff = Math.abs(angle - pinAngle); if (diff > Math.PI) diff = 2 * Math.PI - diff; return diff < 0.25;
    });
    const redZoneCollision = game.current.redZones.some(zone => {
        let normAngle = pinAngle % (Math.PI * 2); return (normAngle >= zone.start && normAngle <= zone.end);
    });

    if (pinCollision || redZoneCollision) {
        setGameState('lost'); if (navigator.vibrate) navigator.vibrate(200);
    } else {
        game.current.pins.push(pinAngle); setPinsLeft(p => p - 1); setScore(s => s + 10);
        if (pinsLeft - 1 <= 0) { setGameState('won'); setHasMinted(false); }
    }
  };

  // OYUN YÖNETİMİ
  const initLevel = (lvl) => {
    const config = getLevelConfig(lvl);
    game.current.rotation = 0; game.current.frameCount = 0; game.current.speed = config.speed;
    game.current.baseSpeed = config.speed; game.current.mode = config.mode;
    game.current.pins = [...config.initialPins]; game.current.redZones = config.redZones || [];
    setPinsLeft(config.count); setLevel(lvl); setGameState('playing');
  };

  const startGame = () => { setScore(0); initLevel(1); };
  const nextLevel = () => { initLevel(level + 1); };
  const retryLevel = () => { initLevel(level); };

  // MINT
  const handleMintNFT = async () => {
    setIsMinting(true);
    const MY_WALLET = "0x89725B54965c706100A2B24f78AEc268ADC25D3B"; 
    
    try {
      // Base Chain ID: 8453
      if (sdk.actions?.sendTransaction) {
        const result = await sdk.actions.sendTransaction({
          transaction: {
            to: MY_WALLET,
            value: "370000000000000", // 0.00037 ETH
            chainId: 8453 // Base Mainnet
          }
        });
        console.log("Tx Result:", result);
        alert("Transaction sent! Waiting for confirmation...");
        setHasMinted(true);
      } else {
        // HATA DURUMU
        alert("Wallet not found! Please try opening this in Warpcast mobile app.");
      }
    } catch (error) {
      console.error("Mint Error:", error);
      alert("Transaction failed or rejected.");
    } finally {
      setIsMinting(false);
    }
  };

  const handleShare = () => {
    const myAppUrl = "https://ff-game.vercel.app";
    const text = `Played ff on Farcaster! Reached Level ${level}. Score: ${score}`;
    const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${myAppUrl}`;
    
    if (sdk.actions?.openUrl) {
      sdk.actions.openUrl(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="w-full h-screen flex flex-col items-center bg-black text-white font-mono overflow-hidden select-none relative">
      <div className="w-full flex justify-between p-6 z-10">
        <div className="text-xl font-bold text-slate-500">LVL {level}</div>
        <button onClick={() => setShowLeaderboard(true)} className="flex items-center gap-2 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800 hover:bg-slate-800">
            <Trophy size={16} className="text-yellow-500" />
            <span className="text-sm font-bold">Top 5</span>
        </button>
        <div className="text-xl font-bold">{score}</div>
      </div>

      <div className="flex-1 w-full flex items-center justify-center cursor-pointer active:scale-[0.98] transition-transform" onPointerDown={handleShoot}>
        <canvas ref={canvasRef} width={400} height={600} className="max-w-full h-full object-contain" />
      </div>

      {/* MODALS */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-20 p-4 text-center">
            <h1 className="text-8xl font-black mb-2 tracking-tighter">ff</h1>
            <p className="text-slate-400 mb-8 text-lg">Farcaster Focus</p>
            <button onClick={startGame} className="bg-white text-black px-12 py-5 rounded-full font-bold text-2xl hover:scale-105 transition-transform flex items-center gap-2">
               <Play fill="black" /> START
            </button>
        </div>
      )}

      {gameState === 'lost' && (
        <div className="absolute inset-0 bg-red-950/90 flex flex-col items-center justify-center z-20 animate-in zoom-in">
            <h2 className="text-6xl font-black mb-4 text-red-500">FAILED!</h2>
            <p className="text-xl mb-8">Score: {score}</p>
            <div className="flex flex-col gap-4 w-64">
                <button onClick={retryLevel} className="bg-white text-red-900 py-4 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-slate-200">
                    <RotateCcw /> TRY AGAIN
                </button>
                <button onClick={handleShare} className="bg-red-800 text-white py-4 rounded-xl font-bold flex justify-center items-center gap-2 border border-red-700">
                    <Share2 /> SHARE
                </button>
            </div>
        </div>
      )}

      {gameState === 'won' && (
        <div className="absolute inset-0 bg-green-950/95 flex flex-col items-center justify-center z-20 animate-in fade-in">
            <Trophy size={80} className="text-yellow-400 mb-4 animate-bounce" />
            <h2 className="text-3xl font-bold mb-2 text-center">LEVEL {level} COMPLETE!</h2>
            <div className="flex flex-col gap-3 w-72 mt-8">
                <button onClick={handleMintNFT} disabled={isMinting || hasMinted} className={`w-full py-4 rounded-xl font-bold flex justify-center items-center gap-2 border ${hasMinted ? 'bg-slate-800 text-slate-500' : 'bg-purple-600 text-white hover:bg-purple-500'}`}>
                    {isMinting ? <Loader2 className="animate-spin" /> : <Gem />}
                    {hasMinted ? "Minted ✅" : "Mint Level NFT ($1)"}
                </button>
                <button onClick={nextLevel} className="bg-white text-green-900 w-full py-4 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-green-100">
                    <Play fill="currentColor" /> NEXT LEVEL
                </button>
                <button onClick={handleShare} className="text-green-200 text-sm underline hover:text-white mt-2">
                    Cast this achievement
                </button>
            </div>
        </div>
      )}

      {showLeaderboard && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-30 p-6 animate-in slide-in-from-bottom">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-6 relative shadow-2xl">
                <button onClick={() => setShowLeaderboard(false)} className="absolute right-4 top-4 text-slate-500 hover:text-white"><X size={24} /></button>
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Trophy className="text-yellow-500" /> Leaderboard</h3>
                {mockLeaderboard.map((player, idx) => (
                    <div key={idx} className="flex justify-between items-center border-b border-slate-800 pb-2 last:border-0 mb-2">
                        <div className="flex items-center gap-3">
                            <div className={`font-bold w-6 text-center ${idx < 3 ? 'text-yellow-500' : 'text-slate-500'}`}>#{idx + 1}</div>
                            <div className="text-slate-300">{player.name}</div>
                        </div>
                        <div className="text-white font-bold">{player.score}</div>
                    </div>
                ))}
                <div className="mt-6 pt-4 border-t border-slate-800 text-center">
                    <div className="text-xs text-slate-500 mb-1">YOUR SCORE</div>
                    <div className="text-xl font-bold text-white">{score}</div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
