import React, { useState, useEffect, useRef, useCallback } from 'react';
import sdk from '@farcaster/frame-sdk';
import {
    Play,
    RotateCcw,
    Trophy,
    Share2,
    Gem,
    Loader2,
    X
} from 'lucide-react';

export default function App() {
    // --- STATE ---
    const [gameState, setGameState] = useState('start');
    const [level, setLevel] = useState(1);
    const [pinsLeft, setPinsLeft] = useState(6);
    const [score, setScore] = useState(0);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [isMinting, setIsMinting] = useState(false);
    const [hasMinted, setHasMinted] = useState(false);

    const canvasRef = useRef(null);
    const requestRef = useRef();

    // OYUN MOTORU VERİLERİ
    const game = useRef({
        rotation: 0,
        baseSpeed: 0.02,
        speed: 0.02,
        pins: [],
        redZones: [],
        frameCount: 0,
        mode: 'normal'    // 'normal', 'chaos', 'reverse'
    });

    // Sahte Liderlik Tablosu
    const mockLeaderboard = [
        { name: '@dwr', score: 450, level: 22 },
        { name: '@vitalik', score: 320, level: 15 },
        { name: '@sedat', score: 95, level: 7 },
        { name: '@horsefacts', score: 80, level: 6 },
        { name: '@linda', score: 45, level: 3 },
    ];

    // --- ZORLUK SEVİYELERİ ---
    const getLevelConfig = (lvl) => {
        let config = {
            speed: 0.02,
            count: 6,
            initialPins: [],
            redZones: [],
            mode: 'normal'
        };

        if (lvl <= 10) {
            // KOLAY: Yavaş
            config.speed = 0.02 + (lvl * 0.0015);
            config.count = 4 + Math.floor(lvl / 2);
            config.mode = 'normal';
        }
        else if (lvl <= 20) {
            // KOLAY-ORTA: Ters Yön
            config.speed = -1 * (0.025 + ((lvl - 10) * 0.002));
            config.count = 8 + Math.floor((lvl - 10) / 2);
            config.mode = 'reverse';
        }
        else if (lvl <= 30) {
            // ORTA: Kırmızı Yasak Bölgeler
            config.speed = 0.035 + ((lvl - 20) * 0.002);
            config.count = 10 + Math.floor((lvl - 20) / 2);
            const start = Math.random() * Math.PI * 2;
            config.redZones = [{ start: start, end: start + (Math.PI / 4) }];
            config.mode = 'normal';
        }
        else if (lvl <= 40) {
            // ORTA-ZOR: Hazır İğneler
            config.speed = 0.04 + ((lvl - 30) * 0.002);
            config.count = 12;
            config.initialPins = Array.from({ length: 3 }, () => Math.random() * Math.PI * 2);
            config.mode = Math.random() > 0.5 ? 'normal' : 'reverse';
        }
        else if (lvl <= 50) {
            // ZOR: Kaos (Hız Değişken)
            config.speed = 0.05;
            config.count = 15;
            config.mode = 'chaos';
            config.redZones = [
                { start: 0, end: 0.6 },
                { start: 3, end: 3.6 }
            ];
        }
        else {
            // ÇOK ZOR
            config.speed = 0.06 + ((lvl - 50) * 0.005);
            config.count = 15 + (lvl - 50);
            config.initialPins = Array.from({ length: 6 }, () => Math.random() * Math.PI * 2);
            config.mode = 'chaos';
        }

        return config;
    };

    useEffect(() => {
        const init = async () => {
            try {
                await sdk.actions.ready();
            } catch (e) {
                // Tarayıcıda hata vermemesi için boş catch
            }
        };
        init();
    }, []);

    // --- OYUN ÇİZİM DÖNGÜSÜ ---
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

        // Hız ve Dönüş
        if (gameState === 'playing') {
            game.current.frameCount++;
            if (game.current.mode === 'chaos') {
                game.current.speed = Math.sin(game.current.frameCount * 0.05) * 0.08;
            }
            game.current.rotation += game.current.speed;
        }

        // Daire ve Nesneler
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(game.current.rotation);

        // Kırmızı Alanlar
        game.current.redZones.forEach(zone => {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, radius, zone.start, zone.end);
            ctx.lineTo(0, 0);
            ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
            ctx.fill();
        });

        // Ana Daire
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = gameState === 'lost' ? '#ef4444' : (gameState === 'won' ? '#22c55e' : 'white');
        ctx.fill();

        // Saplanan İğneler
        game.current.pins.forEach(angle => {
            ctx.save();
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(radius, 0);
            ctx.lineTo(radius + 60, 0);
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(radius + 60, 0, 6, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.restore();
        });

        ctx.restore();

        // Level Yazısı
        ctx.fillStyle = 'black';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(level, centerX, centerY);

        // Atılacak İğne
        const shootY = 500;
        if (gameState === 'playing') {
            ctx.beginPath();
            ctx.moveTo(centerX, shootY);
            ctx.lineTo(centerX, shootY - 60);
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(centerX, shootY, 6, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
        }

        requestRef.current = requestAnimationFrame(animate);
    }, [gameState, level]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [animate]);

    // --- ATIŞ MANTIĞI ---
    const handleShoot = () => {
        if (gameState !== 'playing') return;

        let pinAngle = (Math.PI / 2) - game.current.rotation;
        pinAngle = (pinAngle % (Math.PI * 2));
        if (pinAngle < 0) pinAngle += Math.PI * 2;

        // Çarpışma Kontrolü
        const pinCollision = game.current.pins.some(angle => {
            let diff = Math.abs(angle - pinAngle);
            if (diff > Math.PI) diff = 2 * Math.PI - diff;
            return diff < 0.25;
        });

        // Kırmızı Alan Kontrolü
        const redZoneCollision = game.current.redZones.some(zone => {
            let normAngle = pinAngle % (Math.PI * 2);
            return (normAngle >= zone.start && normAngle <= zone.end);
        });

        if (pinCollision || redZoneCollision) {
            setGameState('lost');
            if (navigator.vibrate) navigator.vibrate(200);
        } else {
            game.current.pins.push(pinAngle);
            const newPinsLeft = pinsLeft - 1;
            setPinsLeft(newPinsLeft);
            setScore(s => s + 10);

            if (newPinsLeft <= 0) {
                setGameState('won');
                setHasMinted(false);
            }
        }
    };

    // --- YÖNETİM ---
    const initLevel = (lvl) => {
        const config = getLevelConfig(lvl);
        game.current.rotation = 0;
        game.current.frameCount = 0;
        game.current.speed = config.speed;
        game.current.baseSpeed = config.speed;
        game.current.mode = config.mode;
        game.current.pins = [...config.initialPins];
        game.current.redZones = config.redZones || [];
        setPinsLeft(config.count);
        setLevel(lvl);
        setGameState('playing');
    };

    const startGame = () => {
        setScore(0);
        initLevel(1);
    };

    const nextLevel = () => {
        initLevel(level + 1);
    };

    const retryLevel = () => {
        initLevel(level);
    };

    // MINT İŞLEMİ (GERÇEK PARA TRANSFERİ)
    const handleMintNFT = async () => {
        setIsMinting(true);
        // SENİN CÜZDAN ADRESİN
        const MY_WALLET = "0x89725B54965c706100A2B24f78AEc268ADC25D3B";

        try {
            // SDK varsa gerçek işlem yap
            if (sdk.actions?.sendTransaction) {
                await sdk.actions.sendTransaction({
                    transaction: {
                        to: MY_WALLET,
                        value: "370000000000000", // 0.00037 ETH
                    }
                });
                alert("İşlem gönderildi! Onaylanınca NFT senin.");
                setHasMinted(true);
            } else {
                // SDK yoksa (Test için)
                alert("Tarayıcıda test ediyorsun. Mobilde gerçek cüzdan açılır.");
                setHasMinted(true);
            }
        } catch (error) {
            console.error(error);
            alert("İşlem iptal edildi.");
        } finally {
            setIsMinting(false);
        }
    };

    const handleShare = () => {
        // Bu linki Vercel'den aldıktan sonra güncelle:
        const myAppUrl = "https://fc-aa-game.vercel.app";
        const text = `Played ff on Farcaster! Reached Level ${level}. Score: ${score}`;
        const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${myAppUrl}`;

        // SDK üzerinden paylaşımı dene, olmazsa yeni pencere aç
        try {
            sdk.actions.openUrl(url);
        } catch (e) {
            window.open(url, '_blank');
        }
    };

    return (
        <div className="w-full h-screen flex flex-col items-center bg-black text-white font-mono overflow-hidden select-none relative">

            {/* Header */}
            <div className="w-full flex justify-between p-6 z-10">
                <div className="text-xl font-bold text-slate-500">LVL {level}</div>
                <button onClick={() => setShowLeaderboard(true)} className="flex items-center gap-2 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800 hover:bg-slate-800">
                    <Trophy size={16} className="text-yellow-500" />
                    <span className="text-sm font-bold">Top 5</span>
                </button>
                <div className="text-xl font-bold">{score}</div>
            </div>

            {/* Game Area */}
            <div className="flex-1 w-full flex items-center justify-center cursor-pointer" onPointerDown={handleShoot}>
                <canvas ref={canvasRef} width={400} height={600} className="max-w-full h-full object-contain" />
            </div>

            {/* Modals */}
            {gameState === 'start' && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-20 p-4 text-center">
                    <h1 className="text-8xl font-black mb-2 tracking-tighter">ff</h1>
                    <p className="text-slate-400 mb-8 text-lg">Farcaster Focus</p>
                    <button onClick={startGame} className="bg-white text-black px-12 py-5 rounded-full font-bold text-2xl flex items-center gap-2 hover:scale-105 transition-transform">
                        <Play fill="black" /> BAŞLA
                    </button>
                </div>
            )}

            {gameState === 'lost' && (
                <div className="absolute inset-0 bg-red-950/90 flex flex-col items-center justify-center z-20 animate-in zoom-in">
                    <h2 className="text-6xl font-black mb-4 text-red-500">YANLIŞ!</h2>
                    <p className="text-xl mb-8">Skor: {score}</p>
                    <div className="flex flex-col gap-4 w-64">
                        <button onClick={retryLevel} className="bg-white text-red-900 py-4 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-slate-200">
                            <RotateCcw /> TEKRAR DENE
                        </button>
                        <button onClick={handleShare} className="bg-red-800 text-white py-4 rounded-xl font-bold flex justify-center items-center gap-2 border border-red-700">
                            <Share2 /> PAYLAŞ
                        </button>
                    </div>
                </div>
            )}

            {gameState === 'won' && (
                <div className="absolute inset-0 bg-green-950/95 flex flex-col items-center justify-center z-20 animate-in fade-in">
                    <Trophy size={80} className="text-yellow-400 mb-4 animate-bounce" />
                    <h2 className="text-4xl font-bold mb-2">SEVİYE {level} BİTTİ!</h2>
                    <div className="flex flex-col gap-3 w-72 mt-8">
                        <button onClick={handleMintNFT} disabled={isMinting || hasMinted} className={`w-full py-4 rounded-xl font-bold flex justify-center items-center gap-2 border ${hasMinted ? 'bg-slate-800 text-slate-500' : 'bg-purple-600 text-white hover:bg-purple-500'}`}>
                            {isMinting ? <Loader2 className="animate-spin" /> : <Gem />}
                            {hasMinted ? "Mintlendi" : "Mint Level NFT ($1)"}
                        </button>
                        <button onClick={nextLevel} className="bg-white text-green-900 w-full py-4 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-green-100">
                            <Play fill="currentColor" /> SONRAKİ
                        </button>
                    </div>
                </div>
            )}

            {/* Leaderboard */}
            {showLeaderboard && (
                <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-30 p-6 animate-in slide-in-from-bottom">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-6 relative shadow-2xl">
                        <button onClick={() => setShowLeaderboard(false)} className="absolute right-4 top-4 text-slate-500 hover:text-white"><X size={24} /></button>
                        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Trophy className="text-yellow-500" /> Liderler</h3>
                        {mockLeaderboard.map((player, idx) => (
                            <div key={idx} className="flex justify-between items-center border-b border-slate-800 pb-2 last:border-0 mb-2">
                                <div className="flex items-center gap-3">
                                    <div className={`font-bold w-6 text-center ${idx < 3 ? 'text-yellow-500' : 'text-slate-500'}`}>#{idx + 1}</div>
                                    <div className="text-slate-300">{player.name}</div>
                                </div>
                                <div className="text-white font-bold">{player.score}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}