
import { useState } from 'react';
import { useBets } from '../hooks/useBets';
import { useNavigate } from 'react-router-dom';
import StatsGeneral from '../components/StatsGeneral';
import MartingaleSimulator from '../components/MartingaleSimulator';

export default function Stats() {
    const { bets, loading } = useBets();
    const [activeTab, setActiveTab] = useState('general');
    const navigate = useNavigate();

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="min-h-screen p-6 pb-20">
            {/* Header */}
            <div className="max-w-7xl mx-auto flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold font-outfit">Analytics <span className="text-blue-400">Lab</span></h1>
                        <p className="text-gray-500 text-sm">Deep dive into performance metrics and strategy simulation.</p>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all
                            ${activeTab === 'general' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        General Stats
                    </button>
                    <button
                        onClick={() => setActiveTab('martingale')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all
                            ${activeTab === 'martingale' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        Martingale Sim
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto">
                {activeTab === 'general' ? (
                    <StatsGeneral bets={bets} />
                ) : (
                    <MartingaleSimulator bets={bets} />
                )}
            </div>
        </div>
    );
}
