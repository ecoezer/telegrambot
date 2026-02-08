
import { useMemo } from 'react';

export default function StatsGeneral({ bets }) {
    const stats = useMemo(() => {
        // Sort bets by date ascending for streak calculation
        const sortedBets = [...bets].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        let currentWinStreak = 0;
        let maxWinStreak = 0;
        let currentLossStreak = 0;
        let maxLossStreak = 0;
        let currentStreakType = null; // 'win' or 'loss'
        let currentStreakCount = 0;

        // Daily P/L for consecutive days
        const dailyProfit = {};

        sortedBets.forEach(bet => {
            const status = bet.status?.toLowerCase();
            const date = new Date(bet.timestamp).toLocaleDateString();

            if (!dailyProfit[date]) dailyProfit[date] = 0;

            if (status === 'win' || status === 'won') {
                currentWinStreak++;
                currentLossStreak = 0;
                if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;

                if (currentStreakType === 'win') {
                    currentStreakCount++;
                } else {
                    currentStreakType = 'win';
                    currentStreakCount = 1;
                }

                // Profit logic (assuming 1 unit stake constant for simplified stats)
                // Real profit depends on odds.
                dailyProfit[date] += (bet.odds ? bet.odds - 1 : 0);

            } else if (status === 'loss' || status === 'lost') {
                currentLossStreak++;
                currentWinStreak = 0;
                if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;

                if (currentStreakType === 'loss') {
                    currentStreakCount++;
                } else {
                    currentStreakType = 'loss';
                    currentStreakCount = 1;
                }

                dailyProfit[date] -= 1;
            }
        });

        // Calculate consecutive profitable days
        const days = Object.keys(dailyProfit).sort((a, b) => new Date(a) - new Date(b));
        let maxProfitableDays = 0;
        let currentProfitableDays = 0;
        let maxLosingDays = 0;
        let currentLosingDays = 0;

        days.forEach(day => {
            if (dailyProfit[day] > 0) {
                currentProfitableDays++;
                currentLosingDays = 0;
                if (currentProfitableDays > maxProfitableDays) maxProfitableDays = currentProfitableDays;
            } else if (dailyProfit[day] < 0) {
                currentLosingDays++;
                currentProfitableDays = 0;
                if (currentLosingDays > maxLosingDays) maxLosingDays = currentLosingDays;
            } else {
                // Break streaks on break-even days? Or ignore? Let's break.
                currentProfitableDays = 0;
                currentLosingDays = 0;
            }
        });

        return {
            maxWinStreak,
            maxLossStreak,
            currentStreakType,
            currentStreakCount,
            maxProfitableDays,
            maxLosingDays
        };
    }, [bets]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatBox
                label="Max Win Streak"
                value={stats.maxWinStreak}
                icon="🔥"
                color="text-emerald-400"
                borderColor="border-emerald-500/30"
            />
            <StatBox
                label="Max Loss Streak"
                value={stats.maxLossStreak}
                icon="❄️"
                color="text-rose-400"
                borderColor="border-rose-500/30"
            />
            <StatBox
                label="Max Profitable Days"
                value={`${stats.maxProfitableDays} Days`}
                icon="📈"
                color="text-blue-400"
                borderColor="border-blue-500/30"
            />
            <StatBox
                label="Max Losing Days"
                value={`${stats.maxLosingDays} Days`}
                icon="📉"
                color="text-orange-400"
                borderColor="border-orange-500/30"
            />

            <div className="col-span-full glass-card p-6 rounded-3xl border border-white/10 flex items-center justify-between">
                <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Current Streak</p>
                    <p className={`text-3xl font-bold font-outfit ${stats.currentStreakType === 'win' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {stats.currentStreakType === 'win' ? 'Winning' : 'Losing'} {stats.currentStreakCount} in a row
                    </p>
                </div>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl
                    ${stats.currentStreakType === 'win' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                    {stats.currentStreakType === 'win' ? '🚀' : '💀'}
                </div>
            </div>
        </div>
    );
}

function StatBox({ label, value, icon, color, borderColor }) {
    return (
        <div className={`glass-card p-6 rounded-2xl border ${borderColor} bg-white/5 backdrop-blur-md`}>
            <div className="flex justify-between items-start mb-4">
                <div className="text-2xl">{icon}</div>
            </div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-3xl font-black font-outfit ${color}`}>{value}</p>
        </div>
    );
}
