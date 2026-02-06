import { useBets } from '../hooks/useBets';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
    const { bets, loading } = useBets();
    const { logout } = useAuth();

    // Simple Stats Calculation
    const totalBets = bets.length;
    const wonBets = bets.filter(b => b.status === 'won').length;
    const lostBets = bets.filter(b => b.status === 'lost').length;
    const winRate = totalBets > 0 ? ((wonBets / totalBets) * 100).toFixed(1) : 0;

    // Profit calculation would go here if we had stake/odds data 
    // For now assuming 1 unit flat stakes for demo if data missing
    const profit = bets.reduce((acc, bet) => {
        if (bet.status === 'won') return acc + ((bet.odds || 1) - 1);
        if (bet.status === 'lost') return acc - 1;
        return acc;
    }, 0).toFixed(2);

    if (loading) return <div className="text-white text-center mt-20">Loading bets...</div>;

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100">
            {/* Navbar */}
            <nav className="bg-gray-800 border-b border-gray-700 p-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-bold text-blue-400 tracking-wider">TELEGRAM BET TRACKER</h1>
                    <button
                        onClick={logout}
                        className="text-sm bg-red-600/20 text-red-400 px-3 py-1 rounded hover:bg-red-600/30 transition shadow-inner"
                    >
                        Logout
                    </button>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto p-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <StatCard title="Total Bets" value={totalBets} color="text-blue-400" />
                    <StatCard title="Win Rate" value={`${winRate}%`} color="text-green-400" />
                    <StatCard title="Profit (Units)" value={profit} color={profit >= 0 ? "text-green-400" : "text-red-400"} />
                    <StatCard title="Pending" value={bets.length - wonBets - lostBets} color="text-yellow-400" />
                </div>

                {/* Bets Table */}
                <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-700">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Sport</th>
                                    <th className="p-4">Match</th>
                                    <th className="p-4">Selection</th>
                                    <th className="p-4">Odds</th>
                                    <th className="p-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {bets.map((bet) => (
                                    <tr key={bet.id} className="hover:bg-gray-750 transition-colors">
                                        <td className="p-4 text-sm text-gray-400">
                                            {/* Handle Firestore Timestamp or ISO String */}
                                            {new Date(bet.timestamp).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-sm font-medium">{bet.sport}</td>
                                        <td className="p-4 text-sm">{bet.match}</td>
                                        <td className="p-4 text-sm font-bold text-white">{bet.selection}</td>
                                        <td className="p-4 text-sm font-mono text-yellow-400">{bet.odds || '-'}</td>
                                        <td className="p-4">
                                            <StatusBadge status={bet.status} />
                                        </td>
                                    </tr>
                                ))}
                                {bets.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="p-8 text-center text-gray-500">
                                            No bets recorded yet. Waiting for Telegram messages...
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, color }) {
    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
            <h3 className="text-gray-400 text-sm font-medium uppercase mb-1">{title}</h3>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
        </div>
    );
}

function StatusBadge({ status }) {
    const styles = {
        won: 'bg-green-500/20 text-green-400',
        lost: 'bg-red-500/20 text-red-400',
        pending: 'bg-yellow-500/20 text-yellow-400',
        debug: 'bg-purple-500/20 text-purple-400',
    };

    const formatted = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-700 text-gray-400'}`}>
            {formatted}
        </span>
    );
}
