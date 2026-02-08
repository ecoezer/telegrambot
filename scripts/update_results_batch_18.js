import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();

const resolutions = [
    { id: 'cR16HPkOi80XSruTgF8k', match: 'Man City VS Bournemouth', status: 'win', score: '3-1' },
    { id: 'cU3gnzDnfNpyYKxtq6aO', match: 'Fulham VS Nottingham', status: 'loss', score: '1-0' },
    { id: 'epegtP7x2oGtAQBdC0uy', match: 'Korda VS Musetti', status: 'win', score: '1-2' },
    { id: 'gmgWY1V397LxfpntGniC', match: 'Osasuna VS Levante', status: 'win', score: '2-0' },
    { id: 'hJDu3wNEhjOuBji9L4Xq', match: 'Leicester VS West Brom', status: 'loss', score: '2-1' },
    { id: 'hRkGavNurGkfG39B66Jl', match: 'Wang VS Bejlek', status: 'win', score: '2-0' },
    { id: 'hjkH0HSaDXiXbXnELf6B', match: 'Latvia VS England', status: 'win', score: '0-5' },
    { id: 'iMLFTCk6d4HD4KhNdiQt', match: 'Shelton VS Lehecka', status: 'win', score: '2-0' },
    { id: 'jVT3jZ7QuSbb344RPOlX', match: 'Bournemouth VS Wolves', status: 'loss', score: '1-0' }
];

async function resolveBets() {
    for (const res of resolutions) {
        const docRef = db.collection('bets').doc(res.id);
        const doc = await docRef.get();
        if (!doc.exists) continue;
        const data = doc.data();
        const odds = data.odds || 0;
        const stake = data.stake || 1;
        const resultAmount = res.status === 'win' ? (stake * odds) : 0;
        await docRef.update({
            status: res.status,
            resultAmount: resultAmount,
            score: res.score,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ [${res.id}] ${res.match} -> ${res.status.toUpperCase()} (${res.score})`);
    }
    console.log("🚀 Batch 18 Resolved.");
}
resolveBets().catch(console.error);
