import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'; 
import { getFirestore, doc, setDoc, collection, query, onSnapshot, updateDoc, arrayUnion, getDoc, getDocs, limit } from 'firebase/firestore';
import { Settings, LogIn, LayoutDashboard, Coins, Users, ListTodo, Store, Trophy, Star, BarChart3, Check, X, HelpCircle, Edit, Lock, ClipboardCopy, Send, Eye } from 'lucide-react';

// --- ফায়ারবেস ইনিশিয়ালাইজেশন এবং কনফিগারেশন ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-coinhub-user-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const MAX_RETRIES = 5;
const INITIAL_ADMIN_EMAIL = "admin@coinhub.com";
const INITIAL_ADMIN_PASSWORD = "adminpassword123"; 

const mockOffers = [
    { id: 'o1', title: 'মোবাইল গেম খেলুন', points: 750, provider: 'OfferToro', type: 'Game', os: 'Android', image: 'https://placehold.co/60x60/8b5cf6/ffffff?text=G' },
    { id: 'o2', title: 'একটি সার্ভে পূরণ করুন', points: 1500, provider: 'Pollfish', type: 'Survey', os: 'Desktop', image: 'https://placehold.co/60x60/3b82f6/ffffff?text=S' },
    { id: 'o3', title: 'অ্যাপ ডাউনলোড করুন', points: 500, provider: 'AdGem', type: 'App', os: 'iOS', image: 'https://placehold.co/60x60/ec4899/ffffff?text=A' },
    { id: 'o4', title: 'রেজিস্ট্রেশন কমপ্লিট করুন', points: 200, provider: 'CPX Research', type: 'Sign+Up', os: 'Desktop', image: 'https://placehold.co/60x60/10b981/ffffff?text=R' },
    { id: 'o5', title: 'Monopoly Game', points: 4897, provider: 'Monlix', type: 'Game', os: 'Android', image: 'https://placehold.co/60x60/34d399/ffffff?text=M' },
    { id: 'o6', title: 'Cash King App', points: 1200, provider: 'Wannads', type: 'App', os: 'iOS', image: 'https://placehold.co/60x60/f97316/ffffff?text=C' },
    { id: 'o7', title: 'Pirate Treasure', points: 950, provider: 'AdscendMedia', type: 'Game', os: 'Desktop', image: 'https://placehold.co/60x60/06b6d4/ffffff?text=P' },
    { id: 'o8', title: 'Quick Survey', points: 300, provider: 'Pollfish', type: 'Survey', os: 'Android', image: 'https://placehold.co/60x60/a855f7/ffffff?text=Q' },
    { id: 'o9', title: 'TikTok Download', points: 180, provider: 'Lootably', type: 'App', os: 'iOS', image: 'https://placehold.co/60x60/000000/ffffff?text=T' },
    { id: 'o10', title: 'Word Connect', points: 543, provider: 'OfferToro', type: 'Game', os: 'Desktop', image: 'https://placehold.co/60x60/ef4444/ffffff?text=W' },
    { id: 'o11', title: 'Block Smash', points: 800, provider: 'AdGem', type: 'Game', os: 'Android', image: 'https://placehold.co/60x60/007fff/ffffff?text=B' },
    { id: 'o12', title: 'Magic Miner', points: 2045, provider: 'OfferToro', type: 'Game', os: 'iOS', image: 'https://placehold.co/60x60/4c4c4c/ffffff?text=MM' },
];


const offerwallPartners = [
    { name: 'OfferToro', color: 'bg-yellow-500/20 text-yellow-300', icon: 'https://placehold.co/40x40/facc15/000?text=OT' },
    { name: 'AdGem', color: 'bg-pink-500/20 text-pink-300', icon: 'https://placehold.co/40x40/ec4899/000?text=AG' },
    { name: 'Pollfish', color: 'bg-blue-500/20 text-blue-300', icon: 'https://placehold.co/40x40/3b82f6/000?text=PF' },
    { name: 'CPX Research', color: 'bg-green-500/20 text-green-300', icon: 'https://placehold.co/40x40/10b981/000?text=CPX' },
    { name: 'Monlix', color: 'bg-indigo-500/20 text-indigo-300', icon: 'https://placehold.co/40x40/6366f1/000?text=ML' },
    { name: 'AdscendMedia', color: 'bg-red-500/20 text-red-300', icon: 'https://placehold.co/40x40/ef4444/000?text=AM' },
    { name: 'Lootably', color: 'bg-cyan-500/20 text-cyan-300', icon: 'https://placehold.co/40x40/06b6d4/000?text=LB' },
    { name: 'Wannads', color: 'bg-orange-500/20 text-orange-300', icon: 'https://placehold.co/40x40/f97316/000?text=WN' },
];

// --- ফায়ারবেস হেল্পার ফাংশন ---

/** Firebase-এ ইউজার প্রোফাইল তৈরি বা আপডেট করে */
const saveUserProfile = async (uid, email, username, role = 'user', initialData = {}) => {
    const userRef = doc(db, 'artifacts', appId, 'users', uid, 'user_data', 'profile');
    const defaultData = {
        username: username,
        email: email,
        role: role,
        coins: 500,
        xp: 0,
        totalEarning: 500,
        todayEarning: 0,
        completedOffers: [],
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        streakDays: 3,
        ...initialData
    };

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            await setDoc(userRef, defaultData, { merge: true });
            return defaultData;
        } catch (error) {
            if (i === MAX_RETRIES - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
    }
    return defaultData;
};

/** এডমিন অ্যাকাউন্টের জন্য initial setup করে */
const setupInitialData = async () => {
    try {
        const adminUsersRef = collection(db, 'artifacts', appId, 'public', 'data', 'admin_users');
        const adminDocRef = doc(adminUsersRef, INITIAL_ADMIN_EMAIL);

        const adminDoc = await getDoc(adminDocRef);
        if (!adminDoc.exists()) {
            await setDoc(adminDocRef, {
                email: INITIAL_ADMIN_EMAIL,
                password: INITIAL_ADMIN_PASSWORD,
                isSetup: true,
                role: 'admin',
                createdAt: new Date().toISOString()
            });
        }

        const offersRef = collection(db, 'artifacts', appId, 'public', 'data', 'offers');
        const q = query(offersRef, limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            for (const offer of mockOffers) {
                const newOfferRef = doc(offersRef, offer.id);
                await setDoc(newOfferRef, offer);
            }
        }

    } catch (e) {
        console.error("Error setting up initial data:", e);
    }
};

// --- সাধারণ হেল্পার কম্পোনেন্ট ---

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-gray-800 p-6 rounded-xl shadow-2xl flex items-center justify-between">
        <div>
            <p className="text-sm font-medium text-gray-400">{title}</p>
            <p className="text-3xl font-bold text-white mt-1">{value}</p>
        </div>
        <Icon className={`w-8 h-8 ${color}`} />
    </div>
);

const OfferCard = ({ offer, onComplete }) => (
    <div 
        className="flex flex-col w-36 h-48 bg-gray-700/70 p-2 rounded-xl shadow-lg border border-gray-700 transition-all duration-300 hover:bg-gray-700 hover:border-purple-500/50 cursor-pointer flex-shrink-0"
        onClick={() => onComplete(offer)} 
    >
        <div className="relative w-full h-2/3 bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center">
            <img 
                src={offer.image} 
                alt={offer.title} 
                className="w-full h-full object-cover p-2" 
                onError={(e) => e.currentTarget.src = `https://placehold.co/60x60/${Math.floor(Math.random()*16777215).toString(16)}/ffffff?text=${offer.title[0]}`}
            />
        </div>
        <div className="mt-2 text-center">
            <p className="text-xs font-semibold text-white truncate">{offer.title}</p>
            <div className="flex items-center justify-center space-x-1 mt-1">
                <Coins className="w-3 h-3 text-yellow-400" />
                <p className="text-sm text-green-400 font-bold">{offer.points}</p>
            </div>
        </div>
    </div>
);

// --- Custom Message Box (No alert/confirm) ---
const showMessageBox = (message, type = 'info') => {
    const box = document.createElement('div');
    const color = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';
    const icon = type === 'success' ? Check : type === 'error' ? X : HelpCircle;

    box.className = `${color} text-white p-4 rounded-lg shadow-xl flex items-center space-x-3 transition-opacity duration-300`;
    box.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${icon.prototype.render().props.children.map(c => c.props.d).join('')}</svg>
        <span class="text-sm font-medium">${message}</span>
    `;

    const container = document.getElementById('message-box');
    if (container) {
        container.prepend(box);
        setTimeout(() => {
            box.classList.add('opacity-0');
            box.addEventListener('transitionend', () => box.remove());
        }, 5000);
    }
};

const Header = ({ username, coins, onLogout }) => {
    const scrollingItems = useMemo(() => [
        { label: "🚨 Win up to ৳800! WhatsApp: +88017xXXxXX", color: "text-red-400" },
        { label: `💰 Earn ${coins} coins today!`, color: "text-green-400" },
        { label: "⭐ New surveys are available!", color: "text-yellow-400" },
    ], [coins]);

    return (
        <header className="sticky top-0 z-10">
            <div className="overflow-hidden bg-gray-800/80 text-sm text-white py-1.5 border-b border-purple-800">
                <style jsx global>{`
                    @keyframes marquee {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-50%); }
                    }
                    .animate-marquee {
                        animation: marquee 10s linear infinite;
                    }
                `}</style>
                <div className="flex animate-marquee whitespace-nowrap">
                    {scrollingItems.map((item, index) => (
                        <span key={index} className={`mx-4 font-semibold ${item.color}`}>
                            {item.label}
                        </span>
                    ))}
                    {scrollingItems.map((item, index) => (
                        <span key={index + scrollingItems.length} className={`mx-4 font-semibold ${item.color}`}>
                            {item.label}
                        </span>
                    ))}
                </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700 shadow-md">
                <h1 className="text-xl font-bold text-white md:hidden">CoinHub</h1>
                <div className="hidden md:block"></div>
                <div className="flex items-center space-x-4">
                    <div className="bg-purple-600/50 text-white px-3 py-2 rounded-full font-semibold flex items-center space-x-2">
                        <Coins className="w-5 h-5 text-yellow-300" />
                        <span>{coins} কয়েন</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-sm font-semibold text-white">
                        {username ? username[0].toUpperCase() : 'U'}
                    </div>
                    <button onClick={onLogout} className="text-red-400 hover:text-red-300 transition-colors">
                        <LogIn className="w-5 h-5 inline-block mr-1 rotate-180" />
                        লগইন বন্ধ
                    </button>
                </div>
            </div>
        </header>
    );
};

const Sidebar = ({ username, coins, onNavigate, activeView }) => {
    const navItems = useMemo(() => [
        { id: 'dashboard', label: 'হোম', icon: LayoutDashboard }, 
        { id: 'earn', label: 'আয় করুন', icon: Coins },
        { id: 'offers', label: 'অফার', icon: ListTodo },
        { id: 'surveys', label: 'সার্ভে', icon: BarChart3 },
        { id: 'shop', label: 'শপ', icon: Store },
        { id: 'leaderboard', label: 'লিডারবোর্ড', icon: Trophy },
        { id: 'referrals', label: 'রেফারেল', icon: Users },
        { id: 'rewards', label: 'রেওয়ার্ডস', icon: Star },
        { id: 'profile', label: 'প্রোফাইল', icon: Edit },
        { id: 'support', label: 'সাপোর্ট', icon: HelpCircle },
    ], []);

    return (
        <div className="w-56 bg-gray-900 text-white min-h-screen p-4 border-r border-gray-800 hidden md:block">
            <h1 className="text-3xl font-extrabold mb-6 text-purple-400">CoinHub+</h1>
            <div className="flex items-center space-x-2 p-3 bg-gray-800 rounded-lg mb-6">
                <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-sm font-semibold">{username ? username[0].toUpperCase() : 'U'}</div>
                <div>
                    <p className="text-sm font-semibold truncate w-24">{username}</p>
                    <p className="text-xs text-green-400">{coins} কয়েন</p>
                </div>
            </div>

            <ul className="space-y-1">
                {navItems.map((item) => (
                    <li key={item.id}>
                        <button
                            onClick={() => onNavigate(item.id)}
                            className={`flex items-center w-full p-3 rounded-lg text-sm transition-colors duration-200 ${activeView === item.id
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900'
                                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                }`}
                        >
                            <item.icon className="w-5 h-5 mr-3" />
                            {item.label}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

// --- নতুন সেকশন কম্পোনেন্ট ---

const OffersSection = ({ offers, handleOfferComplete }) => {
    const [selectedFilter, setSelectedFilter] = useState('Most Popular');
    const [selectedDevice, setSelectedDevice] = useState('All Devices');
    
    const filters = ['Most Popular', 'Highest Reward', 'Lowest Reward', 'Recently Added'];
    const devices = ['All Devices', 'Desktop', 'Android', 'iOS'];

    const filteredOffers = useMemo(() => {
        let list = [...offers];
        
        if (selectedFilter === 'Highest Reward') {
            list.sort((a, b) => b.points - a.points);
        } else if (selectedFilter === 'Lowest Reward') {
            list.sort((a, b) => a.points - b.points);
        }

        if (selectedDevice !== 'All Devices') {
            list = list.filter(o => o.os === selectedDevice);
        }
        
        return list;
    }, [offers, selectedFilter, selectedDevice]);

    return (
        <div className="p-4 sm:p-8 space-y-6">
            <h2 className="text-3xl font-bold text-white mb-6">অফার্স</h2>
            
            <div className="flex flex-wrap gap-2 mb-4 bg-gray-800 p-3 rounded-lg">
                <input type="text" placeholder="অফার সার্চ করুন..." className="flex-1 min-w-[200px] p-2 bg-gray-700 text-white rounded-md border border-gray-600" />
                
                <div className="flex space-x-2">
                    <select 
                        value={selectedFilter}
                        onChange={(e) => setSelectedFilter(e.target.value)}
                        className="bg-purple-600 text-white p-2 rounded-md appearance-none cursor-pointer"
                    >
                        {filters.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select 
                        value={selectedDevice}
                        onChange={(e) => setSelectedDevice(e.target.value)}
                        className="bg-purple-600 text-white p-2 rounded-md appearance-none cursor-pointer"
                    >
                        {devices.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {filteredOffers.map(offer => (
                    <OfferCard key={offer.id} offer={offer} onComplete={handleOfferComplete} />
                ))}
            </div>

            {filteredOffers.length === 0 && (
                <p className="text-center text-gray-400 p-10 bg-gray-800 rounded-xl">এই ফিল্টারে কোনো অফার পাওয়া যায়নি।</p>
            )}
        </div>
    );
}

const ReferralsSection = ({ user }) => {
    const referralLink = `https://coinhub.com/r/${user.uid}`;
    
    const copyToClipboard = () => {
        // Fallback for document.execCommand('copy') in a sandbox environment
        const el = document.createElement('textarea');
        el.value = referralLink;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        showMessageBox('রেফারেল লিংক কপি করা হয়েছে!', 'success');
    };

    return (
        <div className="p-4 sm:p-8 space-y-6">
            <h2 className="text-3xl font-bold text-white mb-6">রেফারেল</h2>

            <div className="bg-gray-800 p-6 rounded-xl shadow-2xl">
                <h3 className="text-xl font-semibold text-white mb-4 border-b border-gray-700 pb-3">বন্ধু রেফার করুন</h3>
                <p className="text-gray-400 mb-4">আপনার রেফারেল লিংকের মাধ্যমে বন্ধু সাইন আপ করলে, আপনি তাদের আয়ের **৫% বোনাস** পাবেন।</p>
                
                <div className="flex items-center space-x-2 bg-gray-700 p-3 rounded-lg">
                    <input type="text" readOnly value={referralLink} className="flex-1 bg-transparent text-sm text-purple-400 truncate" />
                    <button onClick={copyToClipboard} className="p-2 bg-purple-600 rounded-lg text-white hover:bg-purple-700 transition-colors">
                        <ClipboardCopy className="w-5 h-5" />
                    </button>
                </div>
                
                <p className="text-sm text-gray-500 mt-4">রেফারেল আর্নিং: <span className="text-green-400">0 কয়েন</span></p>
                <p className="text-sm text-gray-500">মোট রেফারেল: <span className="text-white">0 জন</span></p>
            </div>
        </div>
    );
};

const LeaderboardSection = () => {
    const mockLeaders = [
        { rank: 1, username: 'DarkGhost', points: 12500, avatar: 'P' },
        { rank: 2, username: 'SilentWraith', points: 11200, avatar: 'S' },
        { rank: 3, username: 'CoinMaster', points: 9800, avatar: 'C' },
        { rank: 4, username: 'QuickBucks', points: 7500, avatar: 'Q' },
        { rank: 5, username: 'EarningPro', points: 6100, avatar: 'E' },
    ];
    
    return (
        <div className="p-4 sm:p-8 space-y-6">
            <h2 className="text-3xl font-bold text-white mb-6">লিডারবোর্ড</h2>

            <div className="bg-gray-800 p-6 rounded-xl shadow-2xl space-y-4">
                <h3 className="text-2xl font-bold text-yellow-400 text-center mb-4">দৈনিক শীর্ষ উপার্জনকারী</h3>
                <div className="text-center text-sm text-gray-400">পরবর্তী রিসেট: 23 ঘন্টা 45 মিনিট</div>
                
                <div className="space-y-3">
                    {mockLeaders.map((leader) => (
                        <div key={leader.rank} className={`flex items-center justify-between p-3 rounded-lg ${leader.rank <= 3 ? 'bg-purple-600/30 border border-purple-500' : 'bg-gray-700/50'}`}>
                            <div className="flex items-center space-x-3">
                                <span className={`w-6 h-6 rounded-full font-bold flex items-center justify-center ${leader.rank === 1 ? 'bg-yellow-500 text-gray-900' : 'bg-gray-600 text-white'}`}>
                                    {leader.rank}
                                </span>
                                <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-sm font-semibold">{leader.avatar}</div>
                                <span className="text-white font-semibold">{leader.username}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <Coins className="w-4 h-4 text-green-400" />
                                <span className="text-green-400 font-bold">{leader.points}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const RewardsSection = ({ user }) => {
    const [streakDays, setStreakDays] = useState(user.streakDays || 0);

    const handleClaim = () => {
        showMessageBox(`আপনি ${streakDays * 50 + 100} কয়েন স্ট্রিক রিওয়ার্ড ক্লেইম করেছেন!`, 'success');
        setStreakDays(streakDays + 1); // Simulate claiming
    };

    return (
        <div className="p-4 sm:p-8 space-y-6">
            <h2 className="text-3xl font-bold text-white mb-6">রেওয়ার্ডস</h2>

            <div className="bg-gray-800 p-6 rounded-xl shadow-2xl">
                <h3 className="text-xl font-semibold text-white mb-4 border-b border-gray-700 pb-3">দৈনিক স্ট্রাইক রেওয়ার্ড</h3>
                <p className="text-sm text-gray-400 mb-4">প্রতিদিন একটি অফার বা সার্ভে সম্পন্ন করে আপনার স্ট্রাইক বজায় রাখুন!</p>
                
                <div className="flex justify-between items-center bg-gray-700 p-4 rounded-lg">
                    <div>
                        <p className="text-3xl font-bold text-purple-400">{streakDays} দিনের স্ট্রাইক</p>
                        <p className="text-lg text-green-400 mt-1">আজকের রিওয়ার্ড: {streakDays * 50 + 100} কয়েন</p>
                    </div>
                    <button 
                        onClick={handleClaim} 
                        className="py-2 px-6 bg-yellow-500 text-gray-900 font-bold rounded-lg hover:bg-yellow-400 transition-colors shadow-lg"
                    >
                        রিওয়ার্ড ক্লেইম করুন
                    </button>
                </div>
            </div>
        </div>
    );
};

const SupportSection = () => {
    const mockTickets = [
        { id: 101, subject: 'Withdrawal Pending', status: 'Pending', date: '2025-09-20' },
        { id: 102, subject: 'Offer Not Credited', status: 'Closed', date: '2025-09-15' },
    ];
    
    return (
        <div className="p-4 sm:p-8 space-y-6">
            <h2 className="text-3xl font-bold text-white mb-6">সাপোর্ট</h2>

            <div className="bg-gray-800 p-6 rounded-xl shadow-2xl">
                <h3 className="text-xl font-semibold text-white mb-4 flex justify-between items-center">
                    আপনার সাপোর্ট টিকিট
                    <button className="py-1 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">
                        + নতুন টিকিট
                    </button>
                </h3>
                
                <div className="space-y-3">
                    {mockTickets.map(ticket => (
                        <div key={ticket.id} className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                            <div className="text-white">
                                <p className="font-semibold">{ticket.subject}</p>
                                <p className="text-xs text-gray-400">ID: {ticket.id} | {ticket.date}</p>
                            </div>
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                ticket.status === 'Pending' ? 'bg-yellow-500 text-gray-900' : 'bg-green-600 text-white'
                            }`}>
                                {ticket.status}
                            </span>
                        </div>
                    ))}
                    {mockTickets.length === 0 && <p className="text-center text-gray-400">কোনো টিকিট পাওয়া যায়নি।</p>}
                </div>
            </div>
        </div>
    );
};


// --- Main App Logic (পরিবর্তিত) ---

const UserDashboard = ({ user, handleOfferComplete, offers }) => {
    const topOffers = offers.slice(0, 10);
    const featuredOffers = offers.slice(2, 12);
    const surveyPartners = offerwallPartners.slice(0, 4);

    const OfferRow = ({ title, offersList }) => (
        <div className="bg-gray-800/70 p-4 sm:p-6 rounded-xl shadow-2xl space-y-4">
            <h3 className="text-xl font-semibold text-white flex justify-between items-center">
                {title} <span className="text-purple-400 text-sm cursor-pointer hover:underline">সব দেখুন</span>
            </h3>
            <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-purple-700 scrollbar-track-gray-800">
                {offersList.map(offer => (
                    <OfferCard key={offer.id} offer={offer} onComplete={handleOfferComplete} />
                ))}
            </div>
        </div>
    );

    const PartnerRow = ({ title, partnersList, isLocked = false }) => {
        const [isExpanded, setIsExpanded] = useState(false);
        const displayPartners = isExpanded ? partnersList : partnersList.slice(0, 8);

        return (
            <div className="bg-gray-800/70 p-4 sm:p-6 rounded-xl shadow-2xl space-y-4">
                <h3 className="text-xl font-semibold text-white flex justify-between items-center">
                    {title} 
                    <button onClick={() => setIsExpanded(!isExpanded)} className="text-purple-400 text-sm hover:underline">
                        {isExpanded ? 'কম দেখুন' : 'সব দেখুন'}
                    </button>
                </h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
                    {displayPartners.map((partner, index) => (
                        <div key={index} className={`relative flex flex-col items-center justify-center p-3 sm:p-4 h-24 rounded-lg cursor-pointer transition-transform duration-200 hover:scale-[1.02] ${partner.color}`}>
                            {isLocked && (
                                <div className="absolute inset-0 bg-gray-900/80 flex flex-col items-center justify-center rounded-lg">
                                    <Lock className="w-5 h-5 text-yellow-500 mb-1" />
                                    <p className="text-xs text-yellow-400">লেভেল {index + 1} প্রয়োজন</p>
                                </div>
                            )}
                            <img src={partner.icon} alt={partner.name} className="w-8 h-8 mb-1 rounded-full" />
                            <p className="text-sm font-semibold text-white text-center">{partner.name}</p>
                            <p className="text-xs mt-0.5 text-gray-300">({index * 50 + 100}k+)</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    };


    return (
        <div className="p-4 sm:p-8 space-y-8">
            <h2 className="text-3xl font-bold text-white mb-6">আয় করুন</h2>
            
            {/* Top Offers Section */}
            <OfferRow title="সেরা অফারসমূহ" offersList={topOffers} />

            {/* Featured Offers Section */}
            <OfferRow title="ফিচার্ড অফার" offersList={featuredOffers} />

            {/* Offer Partners Section */}
            <PartnerRow title="অফার পার্টনার্স" partnersList={offerwallPartners} isLocked={false} />
            
            {/* Survey Partners Section */}
            <PartnerRow title="সার্ভে পার্টনার্স" partnersList={surveyPartners} isLocked={false} />
        </div>
    );
};

const UserProfile = ({ user, updateProfile }) => {
    const [newUsername, setNewUsername] = useState(user.username);
    const [statsView, setStatsView] = useState('earnings'); // 'earnings' or 'pending'

    const handleUpdate = () => {
        if (newUsername.trim() !== '' && newUsername !== user.username) {
            updateProfile({ username: newUsername.trim() });
        } else {
            showMessageBox('কোনো পরিবর্তন নেই।', 'info');
        }
    };
    
    const UserStatBox = ({ title, value, icon: Icon, color }) => (
        <div className="flex flex-col items-center p-4 bg-gray-700 rounded-lg">
            <Icon className={`w-8 h-8 ${color} mb-1`} />
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-sm text-gray-400">{title}</p>
        </div>
    );
    
    // Mock Earning History
    const mockEarnings = [
        { id: 1, type: 'Offer Complete', amount: 750, date: '2025-09-26' },
        { id: 2, type: 'Daily Streak', amount: 150, date: '2025-09-25' },
        { id: 3, type: 'Referral Bonus', amount: 50, date: '2025-09-24' },
    ];
    
    // Mock Withdrawal History
    const mockWithdrawals = [
        { id: 101, method: 'Binance', amount: 2500, status: 'Pending', date: '2025-09-26' },
    ];


    return (
        <div className="p-4 sm:p-8 space-y-6">
            <h2 className="text-3xl font-bold text-white mb-6">প্রোফাইল</h2>
            <div className="bg-gray-800 p-6 rounded-xl shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-700 pb-4 mb-4">
                    <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 rounded-full bg-pink-500 flex items-center justify-center text-3xl font-bold text-white">{user.username ? user.username[0].toUpperCase() : 'U'}</div>
                        <div>
                            <p className="text-xl font-semibold text-white">{user.username}</p>
                            <p className="text-sm text-gray-400">{user.email}</p>
                        </div>
                    </div>
                    <button onClick={() => showMessageBox('এডিট প্রোফাইল সিমুলেশন', 'info')} className="p-2 bg-purple-600 rounded-lg text-white hover:bg-purple-700">
                        <Edit className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Stats Section */}
                <h3 className="text-lg font-semibold text-white mb-4">Stats</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <UserStatBox title="সম্পন্ন অফার" value={user.completedOffers.length} icon={Check} color="text-green-400" />
                    <UserStatBox title="রেফার ইউজার" value={0} icon={Users} color="text-blue-400" />
                    <UserStatBox title="মোট আয়" value={user.totalEarning} icon={Coins} color="text-yellow-400" />
                    <UserStatBox title="লাস্ট ৩০ দিন" value={user.totalEarning} icon={BarChart3} color="text-pink-400" />
                </div>
                
                {/* Earnings/Withdrawals */}
                <div className="flex space-x-4 border-b border-gray-700 mb-4">
                    <button onClick={() => setStatsView('earnings')} className={`py-2 text-sm font-semibold ${statsView === 'earnings' ? 'border-b-2 border-purple-500 text-purple-400' : 'text-gray-400'}`}>
                        আর্নিং
                    </button>
                    <button onClick={() => setStatsView('pending')} className={`py-2 text-sm font-semibold ${statsView === 'pending' ? 'border-b-2 border-purple-500 text-purple-400' : 'text-gray-400'}`}>
                        উইথড্রয়াল
                    </button>
                </div>

                <div className="max-h-60 overflow-y-auto">
                    {statsView === 'earnings' ? (
                        <div className="space-y-2">
                            {mockEarnings.map(e => (
                                <div key={e.id} className="flex justify-between p-3 bg-gray-700 rounded-lg text-sm">
                                    <span className="text-white">{e.type}</span>
                                    <span className="text-green-400 font-semibold">+ {e.amount} কয়েন</span>
                                    <span className="text-gray-500 text-xs">{e.date}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {mockWithdrawals.map(w => (
                                <div key={w.id} className="flex justify-between p-3 bg-gray-700 rounded-lg text-sm">
                                    <span className="text-white">{w.method} - {w.amount} কয়েন</span>
                                    <span className={`font-semibold ${w.status === 'Pending' ? 'text-yellow-400' : 'text-green-400'}`}>{w.status}</span>
                                    <span className="text-gray-500 text-xs">{w.date}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ShopSection = ({ user }) => {
    const cashoutOptions = [
        { name: 'Binance', logo: 'https://placehold.co/40x40/f3b20e/000?text=B', min: 2500, fee: 100, category: 'Crypto' },
        { name: 'Litecoin', logo: 'https://placehold.co/40x40/b8b8b8/000?text=L', min: 2500, fee: 100, category: 'Crypto' },
        { name: 'Bitcoin', logo: 'https://placehold.co/40x40/ff9900/000?text=BTC', min: 5000, fee: 200, category: 'Crypto' },
        
        { name: 'Google Play', logo: 'https://placehold.co/40x40/3c83f8/000?text=G', min: 10000, fee: 0, category: 'Gift Card' },
        { name: 'Walmart', logo: 'https://placehold.co/40x40/0071dc/000?text=W', min: 8000, fee: 0, category: 'Gift Card' },
        
        { name: 'PayPal', logo: 'https://placehold.co/40x40/003087/ffffff?text=P', min: 5000, fee: 250, category: 'Cash' },
        { name: 'Payeer', logo: 'https://placehold.co/40x40/00bcd4/000?text=PE', min: 3000, fee: 150, category: 'Cash' },
    ];
    
    const [selectedCategory, setSelectedCategory] = useState('Crypto');
    
    const categories = ['Crypto', 'Gift Card', 'Cash'];
    
    const filteredOptions = cashoutOptions.filter(opt => opt.category === selectedCategory);
    
    const handleWithdraw = (option) => {
        if (user.coins >= option.min) {
            showMessageBox(`আপনার ${option.name} উইথড্র রিকোয়েস্ট জমা দেওয়া হয়েছে। ${option.min} কয়েন কাটা হবে। (সিমুলেশন)`, 'success');
        } else {
            showMessageBox(`উইথড্র করার জন্য আপনার কমপক্ষে ${option.min} কয়েন প্রয়োজন।`, 'error');
        }
    };

    return (
        <div className="p-4 sm:p-8 space-y-6">
            <h2 className="text-3xl font-bold text-white mb-6">ক্যাশ আউট (Shop)</h2>

            <div className="flex space-x-3 border-b border-gray-700 pb-2 mb-4">
                {categories.map(cat => (
                    <button 
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`py-2 px-4 rounded-lg font-semibold transition-colors ${selectedCategory === cat ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
            
            <div className="bg-gray-800 p-6 rounded-xl shadow-2xl">
                <h3 className="text-xl font-semibold text-white mb-4">আপনার কয়েন: <span className="text-green-400">{user.coins}</span></h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredOptions.map(option => (
                        <div key={option.name} className="bg-gray-700 p-4 rounded-lg flex flex-col justify-between">
                            <div className="flex items-center space-x-3 mb-4">
                                <img src={option.logo} alt={option.name} className="w-10 h-10 rounded-full" />
                                <span className="text-lg font-semibold text-white">{option.name}</span>
                            </div>
                            <div className="text-sm text-gray-400 space-y-1 mb-4">
                                <p>ন্যূনতম: <span className="text-yellow-400">{option.min} কয়েন</span></p>
                                <p>ফি: <span className="text-red-400">{option.fee} কয়েন</span></p>
                            </div>
                            <button
                                onClick={() => handleWithdraw(option)}
                                className="w-full py-2 bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700 disabled:bg-gray-500 transition-colors"
                                disabled={user.coins < option.min}
                            >
                                উইথড্র রিকোয়েস্ট
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


const ComingSoonSection = ({ view }) => {
    const viewNameMap = {
        earn: 'আয় করুন', offers: 'অফার', surveys: 'সার্ভে', leaderboard: 'লিডারবোর্ড', support: 'সাপোর্ট', rewards: 'রেওয়ার্ডস', profile: 'প্রোফাইল'
    };
    const viewName = viewNameMap[view] || view;
    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[50vh] p-8">
            <Trophy className="w-16 h-16 text-purple-600 mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">{viewName}</h2>
            <p className="text-xl text-gray-400 text-center">এই সেকশনটি বর্তমানে তৈরি হচ্ছে।</p>
            <p className="mt-4 text-sm text-gray-500">আপনার বর্তমান ভিউ: {view}</p>
        </div>
    );
};

// --- Main App Logic ---

const App = () => {
    const [user, setUser] = useState(null);
    const [authUser, setAuthUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('dashboard');
    const [offers, setOffers] = useState([]);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [newUserCreated, setNewUserCreated] = useState(false); 

    useEffect(() => {
        setupInitialData();

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setAuthUser(currentUser);
            } else {
                try { 
                    await signInAnonymously(auth); 
                } catch (e) { 
                    console.error("Anonymous sign-in failed:", e); 
                }
            }
            setLoading(false);
            setIsAuthReady(true);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!isAuthReady || !authUser) return;
        
        const userRef = doc(db, 'artifacts', appId, 'users', authUser.uid, 'user_data', 'profile');
        const userUnsubscribe = onSnapshot(userRef, async (doc) => {
            if (doc.exists()) {
                const userData = { uid: authUser.uid, ...doc.data() };
                setUser(userData);
                if (userData.role === 'admin') {
                     showMessageBox('আপনি একজন অ্যাডমিন। অ্যাডমিন প্যানেল অ্যাপ্লিকেশনটি ব্যবহার করুন।', 'error');
                }
            } else if (!newUserCreated) { 
                const tempUsername = 'Guest-' + authUser.uid.substring(0, 4);
                const tempEmail = 'guest@anon.com';
                const newProfile = await saveUserProfile(authUser.uid, tempEmail, tempUsername, 'user', { lastLogin: new Date().toISOString(), streakDays: 3 }); 
                setUser({ uid: authUser.uid, ...newProfile });
                setNewUserCreated(true); 
            }
        }, (error) => console.error("Error fetching user data:", error));

        const offersRef = collection(db, 'artifacts', appId, 'public', 'data', 'offers');
        const offersUnsubscribe = onSnapshot(offersRef, (snapshot) => {
            const offersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOffers(offersList);
        }, (error) => console.error("Error fetching offers data:", error));
        
        return () => {
            userUnsubscribe();
            offersUnsubscribe();
        };

    }, [isAuthReady, authUser, newUserCreated]); 

    const updateProfile = useCallback(async (updates) => {
        if (!user) return;
        const userRef = doc(db, 'artifacts', appId, 'users', authUser.uid, 'user_data', 'profile');
        try {
            await updateDoc(userRef, updates);
            showMessageBox('প্রোফাইল সফলভাবে আপডেট করা হয়েছে।', 'success');
        } catch (e) {
            showMessageBox(`প্রোফাইল আপডেটে ত্রুটি: ${e.message}`, 'error');
        }
    }, [user, authUser]);

    const handleOfferComplete = useCallback(async (offer) => {
        if (!user || user.completedOffers.includes(offer.id)) {
            showMessageBox('এই অফারটি ইতিমধ্যেই সম্পন্ন হয়েছে।', 'error');
            return;
        }

        const isSuccess = Math.random() > 0.1;
        
        if (isSuccess) {
            const newCoins = user.coins + offer.points;
            const newEarning = (user.totalEarning || 0) + offer.points;
            const newTodayEarning = (user.todayEarning || 0) + offer.points;
            
            const userRef = doc(db, 'artifacts', appId, 'users', authUser.uid, 'user_data', 'profile');
            
            try {
                await updateDoc(userRef, {
                    coins: newCoins,
                    totalEarning: newEarning,
                    todayEarning: newTodayEarning,
                    completedOffers: arrayUnion(offer.id)
                });
                showMessageBox(`অফার সম্পন্ন! আপনি ${offer.points} কয়েন আয় করেছেন। (এটি কেবল সিমুলেশন)`, 'success');
            } catch (e) {
                 showMessageBox(`অফার আপডেটে ত্রুটি: ${e.message}`, 'error');
            }
        } else {
            showMessageBox('অফার সম্পন্ন করতে ব্যর্থ। পুনরায় চেষ্টা করুন। (এটি কেবল সিমুলেশন)', 'error');
        }

    }, [user, authUser]);

    const handleLogout = async () => {
        showMessageBox('লগইন বন্ধ আছে।', 'info');
    };


    // --- UI রেন্ডারিং ---
    
    if (loading || !isAuthReady || !user) {
        return <LoadingScreen />;
    }
    
    if (user.role === 'admin') {
        return <AdminCheckScreen />;
    }

    let content;
    switch (view) {
        case 'dashboard':
        case 'earn':
            content = <UserDashboard user={user} handleOfferComplete={handleOfferComplete} offers={offers} />;
            break;
        case 'offers':
            content = <OffersSection offers={offers} handleOfferComplete={handleOfferComplete} />;
            break;
        case 'surveys':
            // Surveys is identical to Offers but typically contains only survey type offers. Using OffersSection for simulation.
            const surveyOffers = offers.filter(o => o.type === 'Survey');
            content = <OffersSection offers={surveyOffers} handleOfferComplete={handleOfferComplete} />;
            break;
        case 'shop':
            content = <ShopSection user={user} />;
            break;
        case 'leaderboard':
            content = <LeaderboardSection user={user} />;
            break;
        case 'referrals':
            content = <ReferralsSection user={user} />;
            break;
        case 'rewards':
            content = <RewardsSection user={user} />;
            break;
        case 'profile':
            content = <UserProfile user={user} updateProfile={updateProfile} />;
            break;
        case 'support':
            content = <SupportSection />;
            break;
        default:
            content = <ComingSoonSection view={view} />;
    }


    return (
        <div className="flex h-screen bg-gray-900 font-[Inter] overflow-hidden">
            <Sidebar 
                username={user.username} 
                coins={user.coins} 
                onNavigate={setView} 
                activeView={view}
            />
            <div className="flex-1 flex flex-col overflow-y-auto">
                <Header username={user.username} coins={user.coins} onLogout={handleLogout} />
                <main className="flex-1 pb-10">
                    {content}
                </main>
            </div>
            <div id="message-box" className="fixed bottom-4 right-4 z-50 space-y-2"></div>
        </div>
    );
};

const AdminCheckScreen = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-red-400 p-4">
        <div className="text-center p-8 bg-gray-800 rounded-xl shadow-xl border border-red-700">
            <X className='w-12 h-12 mx-auto mb-4'/>
            <h2 className="text-2xl font-bold mb-2">অ্যাডমিন অ্যাক্সেস সনাক্ত করা হয়েছে</h2>
            <p className="text-gray-400">এই অ্যাপটি ইউজার প্যানেল। অ্যাডমিন কাজ করার জন্য অ্যাডমিন প্যানেল অ্যাপ্লিকেশনটি ব্যবহার করুন।</p>
        </div>
    </div>
);


const LoadingScreen = () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-purple-400">
        <svg className="animate-spin -ml-1 mr-3 h-10 w-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-xl font-semibold">কয়েনহাব লোড হচ্ছে...</p>
    </div>
);

export default App;
