import { useState, useMemo } from 'react';
import { useBets } from '../hooks/useBets';
import { useAuth } from '../contexts/AuthContext';
import BetCard from './BetCard';

export default function Dashboard() {
    const { bets, loading } = useBets();
    const { logout, currentUser } = useAuth();
    const [stakeAmount, setStakeAmount] = useState(100);
    const [timeFilter, setTimeFilter] = useState('all');

    // Filter bets by time period
    const filteredBets = useMemo(() => {
        const now = new Date();
        return bets.filter(bet => {
            if (timeFilter === 'all') return true;
            const betDate = new Date(bet.timestamp);
            const diffDays = (now - betDate) / (1000 * 60 * 60 * 24);

            if (timeFilter === '7d') return diffDays <= 7;
            if (timeFilter === '30d') return diffDays <= 30;
            if (timeFilter === '90d') return diffDays <= 90;
            return true;
        });
    }, [bets, timeFilter]);

    // Sort bets by most recent
    const sortedBets = useMemo(() =>
        [...filteredBets].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
        [filteredBets]
    );

    const totalBets = sortedBets.length;
    const wonBets = sortedBets.filter(b => b.status?.toLowerCase() === 'win' || b.status?.toLowerCase() === 'won').length;
    const lostBets = sortedBets.filter(b => b.status?.toLowerCase() === 'loss' || b.status?.toLowerCase() === 'lost').length;
    const winRate = totalBets > 0 ? ((wonBets / totalBets) * 100).toFixed(1) : 0;

    const unitProfit = sortedBets.reduce((acc, bet) => {
        const status = bet.status?.toLowerCase();
        if (status === 'win' || status === 'won') return acc + ((bet.odds || 1) - 1);
        if (status === 'loss' || status === 'lost') return acc - 1;
        return acc;
    }, 0);

    const totalProfit = (unitProfit * stakeAmount).toFixed(2);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="mt-4 text-blue-400 font-outfit font-semibold animate-pulse uppercase tracking-[0.2em]">Synchronizing...</p>
        </div>
    );

    return (
        <div className="min-h-screen pb-20">
            {/* Header / Navbar */}
            <nav className="glass-card sticky top-0 z-50 px-6 py-4 flex justify-between items-center border-b border-white/5 backdrop-blur-3xl">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-tr from-blue-600 to-emerald-400 p-2 rounded-xl shadow-[0_0_20px_rgba(0,209,255,0.3)]">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold font-outfit tracking-tight neon-text-blue">YRL<span className="text-white font-light">BETS</span></h1>
                        <p className="text-[10px] text-gray-500 font-bold tracking-[0.3em] uppercase opacity-60">Professional Analytics</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-2xl">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>
                        <span className="text-xs font-semibold text-emerald-400">Live Listening</span>
                    </div>
                    <button
                        onClick={logout}
                        className="group flex items-center gap-2 hover:text-red-400 transition-all font-semibold text-sm"
                    >
                        <span className="text-gray-400 group-hover:text-red-400">{currentUser?.email}</span>
                        <div className="p-2 rounded-lg bg-white/5 group-hover:bg-red-500/10 border border-white/10 group-hover:border-red-500/30 transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </div>
                    </button>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-6 pt-10">
                {/* Dashboard Intro */}
                <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h2 className="text-4xl font-bold font-outfit mb-2">Performance <span className="text-blue-400">Hub</span></h2>
                        <p className="text-gray-500 max-w-lg">Track your strategy effectiveness with real-time data streaming directly from elite trading channels.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="text-right">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Projected ROI</p>
                            <p className={`text-2xl font-outfit font-bold ${Number(totalProfit) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {Number(totalProfit) > 0 ? '+' : ''}{totalProfit}€
                            </p>
                        </div>
                        <div className="w-[1px] h-12 bg-white/10"></div>
                        <div className="text-right">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Win Rate</p>
                            <p className="text-2xl font-outfit font-bold text-blue-400">{winRate}%</p>
                        </div>
                    </div>
                </div>

                {/* Calculator & Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    <div className="glass-card p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row items-center gap-6">
                        <div className="flex-1 w-full">
                            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 block">Invest per game (€)</label>
                            <input
                                type="number"
                                value={stakeAmount}
                                onChange={(e) => setStakeAmount(Number(e.target.value))}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-outfit font-bold text-xl focus:neon-border-blue outline-none transition-all"
                                placeholder="e.g. 100"
                            />
                        </div>
                        <div className="flex-1 w-full">
                            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 block">Time Period</label>
                            <div className="grid grid-cols-4 gap-2">
                                {['7d', '30d', '90d', 'all'].map((range) => (
                                    <button
                                        key={range}
                                        onClick={() => setTimeFilter(range)}
                                        className={`px-2 py-3 rounded-xl border text-[10px] font-bold uppercase transition-all ${timeFilter === range
                                            ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                                            : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'
                                            }`}
                                    >
                                        {range}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6 rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-600/10 to-emerald-400/5 flex items-center justify-between group">
                        <div>
                            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1">Projected {timeFilter.toUpperCase()} Net Profit</p>
                            <p className={`text-4xl font-bold font-outfit tracking-tighter ${Number(totalProfit) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {Number(totalProfit) > 0 ? '+' : ''}{totalProfit}€
                            </p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                            💰
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <StatCard
                        title="Total Volume"
                        value={totalBets}
                        icon="📊"
                        trend="+12%"
                        chart={<Sparkline color="#00D1FF" data={[40, 60, 45, 90, 65, 80, 70]} />}
                    />
                    <StatCard
                        title="Profit"
                        value={`${unitProfit.toFixed(2)}u`}
                        icon="💎"
                        color={unitProfit >= 0 ? "text-emerald-400" : "text-red-400"}
                        trend={unitProfit >= 0 ? "Bullish" : "Bearish"}
                        chart={<Sparkline color={unitProfit >= 0 ? "#00FF94" : "#EF4444"} data={[20, 30, 80, 45, 60, 40, 90]} />}
                    />
                    <StatCard
                        title="Active Signal"
                        value={bets.filter(b => b.status === 'pending').length}
                        icon="🔥"
                        color="text-yellow-400"
                        chart={<Sparkline color="#FBBF24" data={[50, 40, 30, 45, 50, 40, 50]} />}
                    />
                    <StatCard
                        title="Win Streak"
                        value="5"
                        icon="🏆"
                        color="text-purple-400"
                        chart={<Sparkline color="#BD00FF" data={[10, 40, 60, 40, 70, 90, 80]} />}
                    />
                </div>

                {/* Main Content */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold font-outfit flex items-center gap-2">
                            Recent Signals
                            <span className="bg-blue-500/10 text-blue-400 text-[10px] px-2 py-0.5 rounded-full border border-blue-500/20">{totalBets} TOTAL</span>
                        </h3>
                    </div>

                    <div className="flex flex-col space-y-3">
                        {sortedBets.map((bet) => (
                            <BetCard key={bet.id} bet={bet} />
                        ))}

                        {sortedBets.length === 0 && (
                            <div className="py-20 bg-white/5 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center text-gray-500">
                                <div className="p-4 bg-white/5 rounded-full mb-4">
                                    <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0l-8 8-8-8" />
                                    </svg>
                                </div>
                                <p className="font-semibold uppercase tracking-widest text-sm">Quiet Market...</p>
                                <p className="text-xs mt-1">Waiting for the next signal from Telegram.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, color = "text-white", icon, trend, chart }) {
    return (
        <div className="glass-card p-6 rounded-3xl border border-white/10 group hover:neon-border-blue transition-all duration-500">
            <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-xl shadow-inner">
                    {icon}
                </div>
                {trend && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/5 ${color.includes('red') ? 'text-red-400' : 'text-emerald-400'}`}>
                        {trend}
                    </span >
                )}
            </div>
            <h3 className="text-gray-500 text-[11px] font-bold uppercase tracking-[0.2em] mb-1">{title}</h3>
            <p className={`text-4xl font-bold font-outfit ${color} tracking-tight mb-4`}>{value}</p>
            <div className="h-10 opacity-70 group-hover:opacity-100 transition-opacity">
                {chart}
            </div>
        </div>
    );
}

function Sparkline({ color, data }) {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min;
    const width = 100;
    const height = 40;

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
                style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}
            />
        </svg>
    );
}
