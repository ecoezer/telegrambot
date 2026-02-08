export default function BetCard({ bet }) {
    const statusStyles = {
        win: { text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        won: { text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        loss: { text: 'text-rose-400', bg: 'bg-rose-500/10' },
        lost: { text: 'text-rose-400', bg: 'bg-rose-500/10' },
        pending: { text: 'text-yellow-400', bg: 'bg-yellow-500/10' }
    };

    const normalizedStatus = (bet.status || 'pending').toLowerCase();
    const style = statusStyles[normalizedStatus] || statusStyles.pending;
    // const isLoss = normalizedStatus === 'loss' || normalizedStatus === 'lost'; // Removed to keep red background visible

    const dateStr = bet.formattedDate || new Date(bet.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const [day, month, year] = dateStr.replace(',', '').split(' '); // simple split for styling if needed

    return (
        <div className="flex gap-4 items-stretch mb-3 group">
            {/* Date Column (Outside Card) */}
            <div className="hidden md:flex flex-col items-end justify-center min-w-[60px] text-right">
                <span className="text-white/80 font-bold font-mono text-sm leading-none">{day}</span>
                <span className="text-gray-500 font-bold text-[10px] uppercase tracking-wider">{month}</span>
                <span className="text-gray-600 text-[9px]">{year}</span>
            </div>

            {/* Mobile Date (Inside or above? Keeping inside for mobile for now, or maybe just hidden on mobile based on design? 
               User asked for "out of card box", likely desktop view. On mobile, side-by-side might be too cramped.
               Let's show it above on mobile, or keep inside. 
               Strategy: Show distinct date column on MD+, on mobile keep it simple or inside. 
               Actually, let's keep it consistent. If mobile, maybe row is too small. 
               I'll implement the side layout for MD screens, and maybe a top header for mobile?
               Let's stick to the user's request which looked like desktop. 
            */}

            {/* Main Card */}
            <div className={`flex-1 flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${style.bg} ${style.bg.replace('/10', '/20')} ${style.text.replace('text-', 'border-').replace('400', '500/20')} hover:brightness-110`}>

                {/* Left: Match Info */}
                <div className="flex items-center gap-4 min-w-[30%]">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-lg shrink-0">
                        {bet.sport === '🏀' || bet.sport?.includes('Basketball') ? '🏀' : '⚽'}
                    </div>
                    <div>
                        <h4 className="text-white font-outfit font-semibold text-sm md:text-base leading-tight">{bet.match}</h4>
                        {/* Mobile Date Fallback */}
                        <p className="md:hidden text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                            {dateStr}
                        </p>
                    </div>
                </div>

                {/* Middle: Selection & Odds */}
                <div className="flex items-center gap-8">
                    <div className="text-right">
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Selection</p>
                        <p className="text-white font-medium text-sm">{bet.selection}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Odds</p>
                        <p className="text-blue-400 font-mono font-bold text-lg">{bet.odds || '-'}</p>
                    </div>
                    <div className="hidden md:block text-right">
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Stake</p>
                        <p className="text-gray-300 font-mono text-sm">€{bet.stake}</p>
                    </div>
                </div>

                {/* Right: Status & Result */}
                <div className="flex items-center gap-4 min-w-[15%] justify-end">
                    {bet.score && (
                        <span className="hidden md:block font-mono text-white/60 text-sm font-bold bg-black/20 px-2 py-1 rounded">
                            {bet.score}
                        </span>
                    )}

                    <div className={`px-3 py-1.5 rounded-lg border border-transparent ${style.bg} ${style.text} text-[10px] font-bold uppercase tracking-wider min-w-[80px] text-center`}>
                        {bet.status}
                    </div>
                </div>
            </div>
        </div>
    );
}
