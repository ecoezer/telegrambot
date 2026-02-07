export default function BetCard({ bet }) {
    const statusStyles = {
        win: {
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/30',
            text: 'text-emerald-400',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
            )
        },
        won: { // Keep won for compatibility
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/30',
            text: 'text-emerald-400',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
            )
        },
        loss: {
            bg: 'bg-rose-500/10',
            border: 'border-rose-500/30',
            text: 'text-rose-400',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            )
        },
        lost: { // Keep lost for compatibility
            bg: 'bg-rose-500/10',
            border: 'border-rose-500/30',
            text: 'text-rose-400',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            )
        },
        pending: {
            bg: 'bg-yellow-500/10',
            border: 'border-yellow-500/30',
            text: 'text-yellow-400',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        }
    };

    const normalizedStatus = (bet.status || 'pending').toLowerCase();
    const style = statusStyles[normalizedStatus] || statusStyles.pending;
    const isLoss = normalizedStatus === 'loss' || normalizedStatus === 'lost';

    return (
        <div className={`glass-card rounded-2xl p-5 hover:scale-[1.01] transition-all duration-300 relative overflow-hidden group ${isLoss ? 'opacity-40 grayscale-[0.3]' : 'opacity-100'
            }`}>
            {/* Status Indicator Bar */}
            <div className={`absolute top-0 left-0 w-1 h-full ${style.bg.replace('/10', '/50')}`}></div>

            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:neon-border-blue transition-all">
                        <span className="text-xl">{bet.sport === '🏀' || bet.sport?.includes('Basketball') ? '🏀' : '⚽'}</span>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{bet.sport}</p>
                        <h4 className="text-white font-outfit text-lg font-semibold leading-tight">{bet.match}</h4>
                    </div>
                </div>
                <div className={`px-3 py-1 rounded-lg border ${style.bg} ${style.border} ${style.text} flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider`}>
                    {style.icon}
                    {bet.status}
                </div>
            </div>

            <div className="flex flex-col gap-4">
                {/* Result Score */}
                {bet.score && (
                    <div className="bg-white/5 border border-white/5 rounded-lg py-1 px-3 self-start flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Result</span>
                        <span className="text-sm font-mono font-bold text-white">{bet.score}</span>
                    </div>
                )}

                {/* Vertical Info Stack */}
                <div className="space-y-4">
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Selection</p>
                        <p className="text-white font-semibold text-base leading-snug">{bet.selection}</p>
                    </div>

                    <div className="flex gap-8">
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Odds</p>
                            <p className="neon-text-blue text-xl font-mono font-bold">{bet.odds || '-'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Stake</p>
                            <p className="text-blue-400 font-mono font-bold">{bet.stake} UNIT</p>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-white/5">
                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Date</p>
                        <div className="flex items-center gap-2 text-white font-medium text-sm">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {bet.formattedDate || new Date(bet.timestamp).toLocaleDateString()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
