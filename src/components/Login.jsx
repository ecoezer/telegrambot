import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const { login, signup } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            setError('');
            if (isSignUp) {
                await signup(email, password); // Make sure to add this to AuthContext
            } else {
                await login(email, password);
            }
            navigate('/');
        } catch (err) {
            console.error(err);
            setError(`Failed to ${isSignUp ? 'sign up' : 'log in'}. Check credentials.`);
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-500/20 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-purple-500/20 rounded-full blur-[100px] animate-pulse transition-all duration-1000"></div>

            <div className="w-full max-w-md p-10 glass-card rounded-3xl relative z-10 neon-border-blue backdrop-blur-2xl">
                <div className="text-center mb-10">
                    <div className="inline-block p-3 rounded-2xl bg-blue-500/10 mb-4 neon-border-blue">
                        <svg className="w-10 h-10 text-[#00D1FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h2 className="text-4xl font-bold font-outfit tracking-tight neon-text-blue">
                        {isSignUp ? "Join YRL" : "YRL BETS"}
                    </h2>
                    <p className="text-gray-400 mt-2 text-sm">Elevate your game with real-time insights</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-sm flex items-center gap-3">
                        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 ml-1">Email Address</label>
                        <input
                            type="email"
                            className="w-full premium-input"
                            placeholder="admin@bettracker.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 ml-1">Secure Password</label>
                        <input
                            type="password"
                            className="w-full premium-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {isSignUp ? "Create Account" : "Enter Dashboard"}
                    </button>

                    <div className="text-center mt-8 pt-6 border-t border-white/5">
                        <p className="text-gray-400 text-sm">
                            {isSignUp ? "Already a member? " : "New to the platform? "}
                            <button
                                type="button"
                                onClick={() => setIsSignUp(!isSignUp)}
                                className="text-[#00D1FF] hover:text-white transition-colors font-semibold"
                            >
                                {isSignUp ? "Log In" : "Get Started"}
                            </button>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
