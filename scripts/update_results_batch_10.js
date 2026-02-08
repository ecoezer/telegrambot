import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();

const resolutions = [
    { id: 'G1unthDzQE0aF5924NMp', match: 'Fulham VS Brighton', status: 'win', score: '2-1' },
    { id: 'G9wrGBuT1JTU0ZOlxWe5', match: 'Denmark VS Scotland', status: 'loss', score: '0-0' },
    { id: 'Igi11s3SzxSlgmW2TPBq', match: 'Bournemouth VS Arsenal', status: 'win', score: '2-3' },
    { id: 'IsiQxRP6nfXSzljtAwO8', match: 'Sunderland VS Brentford', status: 'win', score: '2-1' },
    { id: 'JeDXkE0jRGmmyGmcgGNf', match: 'Liverpool VS Arsenal', status: 'loss', score: '1-0' },
    { id: 'JoIkNAzyS2lRNwcS0dPR', match: 'Barcelona VS PSG', status: 'win', score: '1-2' },
    { id: 'GHg2ymWo0uJ6ilA4m5Ip', match: 'Khachanov VS De Minaur', status: 'win', score: '0-2' },
    { id: 'Gupp4yqZY0CEUw8qqoGG', match: 'Tiafoe VS Humbert', status: 'loss', score: '2-0' },
    { id: 'He7nHFMotvAweJdDatqq', match: 'Collignon VS Kopriva', status: 'win', score: '1-2' },
    { id: 'J4Ed3vwCTO598RSqWobc', match: 'Korda VS Kecmanovic', status: 'loss', score: '2-0' }
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
    console.log("🚀 Batch 10 Resolved.");
}
resolveBets().catch(console.error);
