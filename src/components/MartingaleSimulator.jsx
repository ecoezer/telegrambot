
import { useState, useMemo } from 'react';

export default function MartingaleSimulator({ bets }) {
    const [targetProfit, setTargetProfit] = useState(50);
    const [timeFilter, setTimeFilter] = useState(30); // Default to 30 days

    const simulation = useMemo(() => {
        const now = new Date();

        // Filter and Sort bets
        const sortedBets = [...bets]
            .filter(b => {
                // Status check
                const validStatus = (b.status?.toLowerCase() === 'win' || b.status?.toLowerCase() === 'won' || b.status?.toLowerCase() === 'loss' || b.status?.toLowerCase() === 'lost');
                if (!validStatus) return false;
                if (b.odds <= 1) return false;

                // Time check
                if (timeFilter !== 'all') {
                    const betDate = new Date(b.timestamp);
                    const diffTime = Math.abs(now - betDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays > timeFilter) return false;
                }
                return true;
            })
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        let accumulatedLoss = 0;
        let bankroll = 0;
        let maxDrawdown = 0;
        let lowestBankroll = 0;

        const history = sortedBets.map(bet => {
            const odds = parseFloat(bet.odds);

            // Martingale Logic (Fixed Profit Target)
            let stake = (accumulatedLoss + targetProfit) / (odds - 1);

            // Round stake to 2 decimals
            stake = Math.round(stake * 100) / 100;

            const isWin = bet.status?.toLowerCase() === 'win' || bet.status?.toLowerCase() === 'won';
            let result = 0;

            if (isWin) {
                const profit = stake * (odds - 1);
                result = profit;
                accumulatedLoss = 0; // Reset system after a win
            } else {
                result = -stake;
                accumulatedLoss += stake;
            }

            bankroll += result;
            if (bankroll < lowestBankroll) lowestBankroll = bankroll;

            return {
                ...bet,
                calculatedStake: stake,
                result: result,
                runningBankroll: bankroll,
                isWin
            };
        });

        maxDrawdown = lowestBankroll;

        return {
            history,
            finalBankroll: bankroll,
            maxDrawdown,
            roi: 0
        };

    }, [bets, targetProfit, timeFilter]);

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
                            The system calculates the exact stake needed to make this profit, recovering strictly previous losses.
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`glass-card p-6 rounded-3xl border ${simulation.finalBankroll >= 0 ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total System Profit</p>
                    <p className={`text-4xl font-black font-outfit ${simulation.finalBankroll >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {simulation.finalBankroll.toFixed(2)}€
                    </p>
                </div>
                <div className="glass-card p-6 rounded-3xl border border-rose-500/30">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Max Drawdown</p>
                    <p className="text-4xl font-black font-outfit text-rose-500">
                        {simulation.maxDrawdown.toFixed(2)}€
                    </p>
                </div>
                <div className="glass-card p-6 rounded-3xl border border-blue-500/30">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Bets Processed</p>
                    <p className="text-4xl font-black font-outfit text-blue-400">
                        {simulation.history.length}
                    </p>
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
                                <tr key={bet.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="p-4 text-gray-400 whitespace-nowrap">{new Date(bet.timestamp).toLocaleDateString()}</td>
                                    <td className="p-4 max-w-[200px] truncate">
                                        <div className="font-bold text-white">{bet.match}</div>
                                        <div className="text-xs text-gray-500">{bet.selection}</div>
                                    </td>
                                    <td className="p-4 font-mono font-bold text-yellow-400">{bet.score || '-'}</td>
                                    <td className="p-4 font-mono text-blue-300">{bet.odds}</td>
                                    <td className="p-4 text-right font-mono font-bold">{bet.calculatedStake.toFixed(2)}€</td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${bet.isWin ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                            {bet.isWin ? 'WIN' : 'LOSS'}
                                        </span>
                                    </td>
                                    <td className={`p-4 text-right font-mono font-bold ${bet.result >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {bet.result > 0 ? '+' : ''}{bet.result.toFixed(2)}€
                                    </td>
                                    <td className={`p-4 text-right font-mono font-bold ${bet.runningBankroll >= 0 ? 'text-white' : 'text-rose-400'}`}>
                                        {bet.runningBankroll.toFixed(2)}€
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
