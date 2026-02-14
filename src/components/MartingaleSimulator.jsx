import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function MartingaleSimulator({ bets }) {
    const [targetProfit, setTargetProfit] = useState(50);
    const [timeFilter, setTimeFilter] = useState(30); // Default to 30 days

    const simulation = useMemo(() => {
        const now = new Date();

        // 1. Sort ALL bets chronologically first (Global Simulation)
        const allSortedBets = [...bets]
            .filter(b => {
                const s = b.status?.toLowerCase();
                const validStatus = (s === 'win' || s === 'won' || s === 'loss' || s === 'lost' || s === 'push' || s === 'void' || s === 'refunded');
                return validStatus && b.odds > 1;
            })
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // 2. Run Martingale Simulation on FULL History
        let accumulatedLoss = 0;
        let runningBankroll = 0;

        const globalHistory = allSortedBets.map(bet => {
            const odds = parseFloat(bet.odds);
            const status = bet.status?.toLowerCase();

            // Martingale Logic (Fixed Profit Target)
            let stake = (accumulatedLoss + targetProfit) / (odds - 1);
            stake = Math.round(stake * 100) / 100;

            const isWin = status === 'win' || status === 'won';
            const isPush = status === 'push' || status === 'void' || status === 'refunded';

            let result = 0;

            if (isPush) {
                // Push: Stake returned. No profit, no loss.
                // We do NOT reset accumulated loss, nor add to it. We just continue.
                // Alternatively, some martingales reset on push? usually just continue or re-bet.
                // "Refund" means we treat it as if it didn't happen for the progression?
                // For simplicity/safety: Treat as neutral. 
                // Result for bankroll is 0 (we get stake back).
                // Do we repeat the step? Yes, usuallly.
                // Effectively, result = 0. Accumulated Loss stays same.
                result = 0;
            } else if (isWin) {
                result = stake * (odds - 1);
                accumulatedLoss = 0;
            } else {
                result = -stake;
                accumulatedLoss += stake;
            }

            runningBankroll += result;

            return {
                ...bet,
                calculatedStake: stake,
                result: result,
                runningBankroll: runningBankroll,
                isWin,
                isPush
            };
        });

        // 3. Filter for Display/Stats based on TimeFrame
        const filteredHistory = globalHistory.filter(b => {
            if (timeFilter === 'all') return true;
            const betDate = new Date(b.timestamp);
            const diffTime = Math.abs(now - betDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= timeFilter;
        });

        // 4. Calculate Stats on Filtered Set
        let maxDrawdown = 0;
        let highestBet = 0;
        let highestBetId = null;
        let currentWinStreak = 0;
        let currentLossStreak = 0;
        let maxWinStreak = 0;
        let maxLossStreak = 0;
        let maxWinStreakId = null;
        let maxLossStreakId = null;
        let windowProfit = 0;
        let lowestPeriodBankroll = 0;
        let winCount = 0;
        let runningPeriodBankroll = 0; // Starts at 0 for the filtered period

        // We map to a new array to attach 'periodBankroll' without mutating the global history objects
        const displayHistory = filteredHistory.map((bet) => {
            // Highest Bet
            if (bet.calculatedStake > highestBet) {
                highestBet = bet.calculatedStake;
                highestBetId = bet.id;
            }

            // Window Profit (Cumulative sum of results in this window)
            windowProfit += bet.result;
            runningPeriodBankroll += bet.result; // Relative to start of period

            // Drawdown inside window (Simplification: Lowest point of cumulative profit)
            if (runningPeriodBankroll < lowestPeriodBankroll) lowestPeriodBankroll = runningPeriodBankroll;

            // Streaks (Ignore Push for streaks?)
            if (bet.isPush) {
                // Do not increment streaks, do not reset streaks?
                // Or treat as "no streak change"?
                // Let's keep streaks as is.
            } else if (bet.isWin) {
                winCount++;
                currentWinStreak++;
                currentLossStreak = 0;
                if (currentWinStreak > maxWinStreak) {
                    maxWinStreak = currentWinStreak;
                    maxWinStreakId = bet.id;
                }
            } else {
                currentLossStreak++;
                currentWinStreak = 0;
                if (currentLossStreak > maxLossStreak) {
                    maxLossStreak = currentLossStreak;
                    maxLossStreakId = bet.id;
                }
            }

            return {
                ...bet,
                periodBankroll: runningPeriodBankroll
            };
        });

        maxDrawdown = lowestPeriodBankroll;

        // Win Rate excludes Pushes from denominator as well? Or includes?
        // Usually Win Rate = Wins / (Wins + Losses). Pushes ignored.
        const decidableBets = displayHistory.filter(b => !b.isPush).length;
        const winRate = decidableBets > 0 ? (winCount / decidableBets) * 100 : 0;

        // Chart Data Preparation
        const chartData = displayHistory.map((b, i) => ({
            name: i, // Index as x-axis for sequence
            bankroll: b.periodBankroll,
            date: new Date(b.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) // DD/MM
        }));

        return {
            history: displayHistory,
            chartData,
            finalBankroll: windowProfit,
            maxDrawdown,
            highestBet,
            highestBetId,
            maxWinStreak,
            maxWinStreakId,
            maxLossStreak,
            maxLossStreakId,
            winRate,
            roi: 0
        };

    }, [bets, targetProfit, timeFilter]);

    // Calculate Gradient Offset for Red/Green Line
    const gradientOffset = () => {
        if (!simulation.chartData || simulation.chartData.length === 0) return 0;
        const dataMax = Math.max(...simulation.chartData.map((i) => i.bankroll));
        const dataMin = Math.min(...simulation.chartData.map((i) => i.bankroll));

        if (dataMax <= 0) return 0;
        if (dataMin >= 0) return 1;

        return dataMax / (dataMax - dataMin);
    };

    const off = gradientOffset();

    // Scroll Handler
    const scrollToBet = (betId) => {
        if (!betId) return;
        const element = document.getElementById(`bet-${betId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add momentary highlight
            element.classList.add('bg-blue-500/20');
            setTimeout(() => element.classList.remove('bg-blue-500/20'), 2000);
        }
    };

    return (
        <div className="space-y-8">
            {/* Control Panel */}
            <div className="glass-card p-6 rounded-3xl border border-white/10">
                <h3 className="text-xl font-bold font-outfit mb-4">Martingale Configuration</h3>
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 block">Target Profit per Win (€)</label>
                        <input
                            type="number"
                            value={targetProfit}
                            onChange={(e) => setTargetProfit(Number(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-bold text-xl focus:neon-border-blue transition-all outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            The system calculates the stake needed to recover ALL previous losses + target profit.
                        </p>
                    </div>
                    <div className="flex-1">
                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 block">Time Frame</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[7, 15, 30, 60, 90, 150].map(days => (
                                <button
                                    key={days}
                                    onClick={() => setTimeFilter(days)}
                                    className={`px-3 py-3 rounded-xl border text-[10px] font-bold uppercase transition-all duration-300 ${timeFilter === days
                                        ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                                        : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
                                        }`}
                                >
                                    Last {days} Days
                                </button>
                            ))}
                            <button
                                onClick={() => setTimeFilter('all')}
                                className={`col-span-3 px-3 py-2 rounded-xl border text-[10px] font-bold uppercase transition-all duration-300 ${timeFilter === 'all'
                                    ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                                    : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
                                    }`}
                            >
                                All Time
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Visuals */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className={`glass-card p-6 rounded-3xl border ${simulation.finalBankroll >= 0 ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total System Profit</p>
                    <p className={`text-3xl lg:text-4xl font-black font-outfit ${simulation.finalBankroll >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {simulation.finalBankroll.toFixed(2)}€
                    </p>
                </div>

                <div className="glass-card p-6 rounded-3xl border border-rose-500/30">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Max Drawdown</p>
                    <p className="text-3xl lg:text-4xl font-black font-outfit text-rose-500">
                        {simulation.maxDrawdown.toFixed(2)}€
                    </p>
                </div>

                {/* Clickable Highest Bet */}
                <div
                    onClick={() => scrollToBet(simulation.highestBetId)}
                    className="glass-card p-6 rounded-3xl border border-yellow-500/30 cursor-pointer hover:bg-yellow-500/10 transition-colors group relative"
                >
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                        Highest Bet
                        <svg className="w-3 h-3 text-yellow-500 opacity-50 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </p>
                    <p className="text-3xl lg:text-4xl font-black font-outfit text-yellow-400">
                        {simulation.highestBet.toFixed(2)}€
                    </p>
                    <p className="text-[9px] text-yellow-500/60 mt-1 font-mono uppercase tracking-wide">Click to view</p>
                </div>

                {/* Clickable Streaks */}
                <div className="glass-card p-6 rounded-3xl border border-purple-500/30">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Max Streaks</p>
                    <div className="flex items-baseline gap-3">
                        <div
                            onClick={() => scrollToBet(simulation.maxWinStreakId)}
                            className="text-emerald-400 cursor-pointer hover:opacity-80 transition-opacity"
                            title="Scroll to longest winning streak"
                        >
                            <span className="text-2xl font-black font-outfit">{simulation.maxWinStreak}</span>
                            <span className="text-[10px] font-bold uppercase ml-1 opacity-70">Win</span>
                        </div>
                        <div className="w-[1px] h-8 bg-white/10"></div>
                        <div
                            onClick={() => scrollToBet(simulation.maxLossStreakId)}
                            className="text-rose-400 cursor-pointer hover:opacity-80 transition-opacity"
                            title="Scroll to longest losing streak"
                        >
                            <span className="text-2xl font-black font-outfit">{simulation.maxLossStreak}</span>
                            <span className="text-[10px] font-bold uppercase ml-1 opacity-70">Loss</span>
                        </div>
                    </div>
                </div>

                {/* Success Ratio */}
                <div className="glass-card p-6 rounded-3xl border border-teal-500/30">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Success Ratio</p>
                    <p className="text-3xl lg:text-4xl font-black font-outfit text-teal-400">
                        {simulation.winRate.toFixed(1)}%
                    </p>
                </div>

                {/* Multiplier */}
                <div className={`glass-card p-6 rounded-3xl border ${simulation.finalBankroll >= 0 ? 'border-indigo-500/30' : 'border-rose-500/30'}`}>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Multiplier</p>
                    <p className={`text-3xl lg:text-4xl font-black font-outfit ${simulation.finalBankroll >= 0 ? 'text-indigo-400' : 'text-rose-500'}`}>
                        {(simulation.finalBankroll / (targetProfit || 1)).toFixed(2)}x
                    </p>
                </div>

                <div className="glass-card p-6 rounded-3xl border border-blue-500/30">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Volume</p>
                    <p className="text-3xl lg:text-4xl font-black font-outfit text-blue-400">
                        {simulation.history.length}
                    </p>
                </div>
            </div>

            {/* Bankroll Chart */}
            <div className="glass-card p-6 rounded-3xl border border-white/10 h-[300px] w-full">
                <h3 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4">Bankroll Evolution</h3>
                <div className="w-full h-full pb-6">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={simulation.chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <defs>
                                <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset={off} stopColor="#10b981" stopOpacity={1} />
                                    <stop offset={off} stopColor="#ef4444" stopOpacity={1} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="date"
                                hide={false}
                                tick={{ fill: '#6b7280', fontSize: 10 }}
                                tickFormatter={(value) => {
                                    const parts = value.split('/');
                                    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : value;
                                }}
                                minTickGap={30}
                            />
                            <YAxis
                                width={40}
                                tick={{ fill: '#6b7280', fontSize: 10 }}
                                tickFormatter={(value) => `${value}€`}
                                stroke="rgba(255,255,255,0.1)"
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                labelStyle={{ display: 'none' }}
                                formatter={(value) => [`${value.toFixed(2)}€`, 'Bankroll']}
                            />
                            <Line
                                type="monotone"
                                dataKey="bankroll"
                                stroke="url(#splitColor)"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4, fill: '#fff' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5 text-[10px] uppercase tracking-widest text-gray-400">
                                <th className="p-4 font-bold">Date</th>
                                <th className="p-4 font-bold">Match</th>
                                <th className="p-4 font-bold">Score</th>
                                <th className="p-4 font-bold">Odds</th>
                                <th className="p-4 font-bold text-right">Stake</th>
                                <th className="p-4 font-bold text-center">Result</th>
                                <th className="p-4 font-bold text-right">P/L</th>
                                <th className="p-4 font-bold text-right">Bankroll</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {simulation.history.slice().reverse().map((bet, idx) => (
                                <tr key={bet.id} id={`bet-${bet.id}`} className="border-b border-white/5 hover:bg-white/5 transition-colors duration-500">
                                    <td className="p-4 text-gray-400 whitespace-nowrap">
                                        {new Date(bet.timestamp).toLocaleDateString('en-GB', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric'
                                        })}
                                    </td>
                                    <td className="p-4 max-w-[200px] truncate">
                                        <div className="font-bold text-white">{bet.match}</div>
                                        <div className="text-xs text-gray-500">{bet.selection}</div>
                                    </td>
                                    <td className="p-4 font-mono font-bold text-yellow-400">{bet.score || '-'}</td>
                                    <td className="p-4 font-mono text-blue-300">{bet.odds}</td>
                                    <td className="p-4 text-right font-mono font-bold">{bet.calculatedStake.toFixed(2)}€</td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${bet.isWin ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                bet.isPush ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' :
                                                    'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                            {bet.isWin ? 'WIN' : bet.isPush ? 'PUSH' : 'LOSS'}
                                        </span>
                                        {bet.note && (
                                            <div className="mt-1 text-[9px] text-orange-400 font-bold uppercase tracking-wide">
                                                {bet.note}
                                            </div>
                                        )}
                                    </td>
                                    <td className={`p-4 text-right font-mono font-bold ${bet.result > 0 ? 'text-emerald-400' : bet.result < 0 ? 'text-rose-400' : 'text-gray-400'}`}>
                                        {bet.result > 0 ? '+' : ''}{bet.result.toFixed(2)}€
                                    </td>
                                    <td className={`p-4 text-right font-mono font-bold ${bet.periodBankroll >= 0 ? 'text-white' : 'text-rose-400'}`}>
                                        {bet.periodBankroll.toFixed(2)}€
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
