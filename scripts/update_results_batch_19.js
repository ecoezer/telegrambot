import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();

const resolutions = [
    { id: 'tYIqFSU5eDcrv1MqKSHi', match: 'Austria VS Latvia', status: 'win', score: '68-86' },
    { id: 'tyyFmhFgKGr0Yo65bkT4', match: 'Liverpool VS Bournemouth', status: 'win', score: '4-2' },
    { id: 'vvG6aLBw7UJ8qepnuyVe', match: 'Sunderland VS Man City', status: 'loss', score: '0-0' },
    { id: 'xCryamQ0WFM0zKzxGeae', match: 'Leeds VS West Ham', status: 'win', score: '2-1' },
    { id: 'y2Wq574QQ8MhCCVpeoYH', match: 'Netherlands VS France', status: 'win', score: '2-5' },
    { id: 'sOdYQncx84NWWgqw5dJz', match: 'Qarabag VS Chelsea', status: 'win', score: '2-2' },
    { id: 'kusQLYDsZ9ElSh8E3nBq', match: 'Randers VS Odense', status: 'loss', score: '0-0' },
    { id: 'w0UI8SgILgdVDERvJvac', match: 'Penguins VS Predators', status: 'win', score: '4-0' },
    { id: 'lzK71rJd3ZsYWNcoaVKm', match: 'Knights VS Predators', status: 'win', score: '2-4' }
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
    console.log("🚀 Batch 19 Resolved.");
}
resolveBets().catch(console.error);
