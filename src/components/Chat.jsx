
import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

export default function Chat() {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [username, setUsername] = useState('');
    const [isMinimized, setIsMinimized] = useState(false);
    const [typingUsers, setTypingUsers] = useState([]);
    const { currentUser } = useAuth();
    const dummy = useRef();
    const typingTimeoutRef = useRef(null);

    const messagesContainerRef = useRef();

    useEffect(() => {
        // Generate random guest name if not logged in
        if (!currentUser) {
            const randomID = Math.floor(Math.random() * 10000);
            const storedName = localStorage.getItem('chat_username');
            if (storedName) {
                setUsername(storedName);
            } else {
                const name = `Guest_${randomID}`;
                localStorage.setItem('chat_username', name);
                setUsername(name);
            }
        } else {
            setUsername(currentUser.email.split('@')[0]);
        }

        // Messages Listener
        const q = query(
            collection(db, 'messages'),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const unsubscribeMsg = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).reverse();
            setMessages(msgs);
            if (!isMinimized && messagesContainerRef.current) {
                // Fix: Scroll only the container, not the whole page
                setTimeout(() => {
                    if (messagesContainerRef.current) {
                        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                    }
                }, 100);
            }
        }, (error) => {
            console.error("Chat permission error:", error);
        });

        // Typing Listener
        const qTyping = query(collection(db, 'typing'));
        const unsubscribeTyping = onSnapshot(qTyping, (snapshot) => {
            const now = Date.now();
            const activeTypers = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(Typer => Typer.id !== username && (now - (Typer.timestamp?.toMillis() || 0)) < 5000) // Active in last 5s
                .map(Typer => Typer.user);

            setTypingUsers(activeTypers);
        }, (error) => {
            // Silently fail if typing permissions are stricter
            console.warn("Typing indicator perm error (harmless)", error);
        });

        return () => {
            unsubscribeMsg();
            unsubscribeTyping();
        };
    }, [currentUser, isMinimized, username]);

    const handleTyping = async () => {
        if (!username) return;

        // Update typing status
        try {
            await setDoc(doc(db, 'typing', username), {
                user: username,
                timestamp: serverTimestamp()
            });
        } catch (err) {
            console.error("Error setting typing status", err);
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        // Set new timeout to clear status
        typingTimeoutRef.current = setTimeout(async () => {
            try {
                // We use update or delete. Delete is cleaner.
                await deleteDoc(doc(db, 'typing', username));
            } catch (err) {
                console.error("Error clearing typing status", err);
            }
        }, 3000);
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            await addDoc(collection(db, 'messages'), {
                text: newMessage,
                user: username,
                uid: currentUser ? currentUser.uid : 'anonymous',
                createdAt: serverTimestamp()
            });
            setNewMessage('');

            // Fix: Scroll container immediately
            if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            }

            // Clear typing status immediately on send
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            await deleteDoc(doc(db, 'typing', username));

        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    // Mobile Toggle Handler
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <>
            {/* Mobile Toggle Button (Floating) */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.5)] flex items-center justify-center text-white transition-transform active:scale-95"
            >
                {mobileOpen ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                )}
                {!mobileOpen && messages.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-[#0f172a]">
                        {messages.length > 9 ? '9+' : messages.length}
                    </span>
                )}
            </button>

            {/* Chat Container */}
            <div className={`
                fixed lg:static inset-x-0 bottom-0 z-40 lg:z-auto
                bg-[#0f172a] lg:bg-transparent
                transition-transform duration-300 ease-in-out
                ${mobileOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
                flex flex-col glass-card rounded-t-3xl lg:rounded-3xl border-t lg:border border-white/10 overflow-hidden 
                ${isMinimized ? 'h-[60px]' : 'h-[80vh] lg:h-[500px]'}
            `}>
                {/* Header */}
                <div
                    className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => {
                        if (window.innerWidth >= 1024) setIsMinimized(!isMinimized);
                        else setMobileOpen(false); // Close on mobile header click (drag down feel)
                    }}
                >
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full bg-emerald-500 ${!isMinimized ? 'animate-pulse' : ''}`}></div>
                        <h3 className="font-outfit font-bold text-white uppercase tracking-wider text-sm">Live Community</h3>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-500 font-mono">
                            {messages.length > 0 ? `${messages.length} msgs` : 'No messages'}
                        </span>
                        <button className="text-gray-400 hover:text-white transition-colors hidden lg:block">
                            <svg className={`w-5 h-5 transform transition-transform duration-300 ${isMinimized ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        <button className="text-gray-400 hover:text-white transition-colors lg:hidden">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content (Hidden if minimized) */}
                {!isMinimized && (
                    <>
                        {/* Messages */}
                        <div
                            ref={messagesContainerRef}
                            className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar relative"
                        >
                            {messages.map(msg => (
                                <div key={msg.id} className={`flex flex-col ${msg.user === username ? 'items-end' : 'items-start'}`}>
                                    <div className={`flex items-baseline gap-2 mb-1 ${msg.user === username ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <span className="text-[10px] font-bold text-gray-400 opacity-70">{msg.user}</span>
                                    </div>
                                    <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${msg.user === username
                                        ? 'bg-blue-600/20 text-blue-100 border border-blue-500/30 rounded-tr-sm'
                                        : 'bg-white/5 text-gray-200 border border-white/10 rounded-tl-sm'
                                        }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}

                            {/* Typing Indicator */}
                            {typingUsers.length > 0 && (
                                <div className="flex items-center gap-2 ml-2 animate-pulse">
                                    <div className="flex space-x-1">
                                        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-75"></div>
                                        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-150"></div>
                                        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-300"></div>
                                    </div>
                                    <span className="text-[10px] text-gray-500 italic">
                                        {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <form onSubmit={sendMessage} className="p-4 border-t border-white/10 bg-white/5 pb-8 lg:pb-4">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => {
                                        setNewMessage(e.target.value);
                                        handleTyping();
                                    }}
                                    placeholder={`Message as ${username}...`}
                                    className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="p-2 bg-blue-600 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </>
    );
}
