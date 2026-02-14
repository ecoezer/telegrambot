export default function BetCard({ bet }) {
    const statusStyles = {
        win: { text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        won: { text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        loss: { text: 'text-rose-400', bg: 'bg-rose-500/10' },
        lost: { text: 'text-rose-400', bg: 'bg-rose-500/10' },
        push: { text: 'text-gray-400', bg: 'bg-gray-500/10' },
        refund: { text: 'text-gray-400', bg: 'bg-gray-500/10' },
        void: { text: 'text-gray-400', bg: 'bg-gray-500/10' },
        pending: { text: 'text-yellow-400', bg: 'bg-yellow-500/10' }
    };

    const normalizedStatus = (bet.status || 'pending').toLowerCase();
    const style = statusStyles[normalizedStatus] || statusStyles.pending;

    const dateStr = bet.formattedDate || new Date(bet.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const [day, month, year] = dateStr.replace(',', '').split(' ');

    const profit = normalizedStatus === 'win' || normalizedStatus === 'won'
        ? ((bet.odds || 0) - 1) * (bet.stake || 0)
        : normalizedStatus === 'loss' || normalizedStatus === 'lost'
            ? -(bet.stake || 0)
            : 0; // Push/Refund/Void is 0 profit/loss

    return (
        <div className="flex gap-4 items-stretch mb-3 group">
            {/* Date Column (Outside Card) */}
            <div className={`hidden md:flex flex-col items-end justify-center min-w-[60px] text-right transition-colors duration-300 ${normalizedStatus === 'win' ? 'text-emerald-400' : normalizedStatus === 'loss' ? 'text-rose-400' : 'text-white/80'}`}>
                <span className="font-bold font-mono text-sm leading-none">{day}</span>
                <span className="font-bold text-[10px] uppercase tracking-wider opacity-60">{month}</span>
                <span className="text-[9px] opacity-40">{year}</span>
            </div>

            {/* Main Card */}
            <div className={`flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-4 rounded-xl border transition-all duration-300 ${style.bg} ${style.bg.replace('/10', '/15')} ${style.text.replace('text-', 'border-').replace('400', '500/30')} hover:brightness-110 relative overflow-hidden`}>

                {/* Status Indicator Bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${normalizedStatus === 'win' ? 'bg-emerald-500' : normalizedStatus === 'loss' ? 'bg-rose-500' : 'bg-yellow-500/50'}`} />

                {/* Col 1-4: Match Info */}
                <div className="md:col-span-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${style.bg.replace('/10', '/20')} border border-white/5`}>
                        {bet.sport === '🏀' || bet.sport?.includes('Basketball') ? '🏀' : '⚽'}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-white font-outfit font-semibold text-sm md:text-base leading-tight">{bet.match}</h4>
                            {bet.score && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] md:text-xs font-mono font-bold border ${normalizedStatus === 'win' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : normalizedStatus === 'loss' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                    {bet.score}
                                </span>
                            )}
                        </div>
                        <p className="md:hidden text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                            {dateStr}
                        </p>
                    </div>
                </div>

                {/* Col 5-7: Selection */}
                <div className="md:col-span-3 text-right md:text-left">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Selection</p>
                    <p className="text-white font-medium text-sm whitespace-normal break-words leading-tight" title={bet.selection}>{bet.selection}</p>
                </div>

                {/* Col 8: Odds */}
                <div className="md:col-span-1 text-right">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Odds</p>
                    <p className="text-blue-400 font-mono font-bold text-lg">{bet.odds || '-'}</p>
                </div>

                {/* Col 9: Stake */}
                <div className="md:col-span-1 text-right hidden md:block">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Stake</p>
                    <p className="text-gray-300 font-mono text-sm">€{bet.stake}</p>
                </div>

                {/* Col 10-12: Status & Profit */}
                <div className="md:col-span-3 flex items-center justify-end gap-4">
                    {profit !== 0 && (
                        <div className="text-right hidden sm:block">
                            <p className="text-[9px] text-gray-500 uppercase font-bold">Profit/Loss</p>
                            <p className={`font-mono font-bold text-sm ${profit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {profit > 0 ? '+' : ''}{profit.toFixed(2)}€
                            </p>
                        </div>
                    )}

                    <div className={`px-2 py-2 md:px-4 rounded-lg border font-bold uppercase tracking-[0.1em] text-[10px] min-w-[80px] md:min-w-[90px] text-center shadow-sm transition-all duration-300
                        ${normalizedStatus === 'win' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10' :
                            normalizedStatus === 'loss' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-rose-500/10' :
                                ['push', 'refund', 'void'].includes(normalizedStatus) ? 'bg-gray-500/20 text-gray-400 border-gray-500/30' :
                                    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                        {normalizedStatus === 'win' ? '✨ WINNER' :
                            normalizedStatus === 'loss' ? '💀 LOSS' :
                                ['push', 'refund', 'void'].includes(normalizedStatus) ? '♻️ REFUND' :
                                    '⏳ PENDING'}
                    </div>
                </div>
            </div>
        </div>
    );
}
