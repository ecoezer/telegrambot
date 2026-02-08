import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();

const resolutions = [
    { id: 'S70dwCHXVCGSx37SnxEW', match: 'Greece VS Italy', status: 'loss', score: '75-66' },
    { id: 'VcZM1CJH31LO4sv7JgvI', match: 'Lech Poznan VS Crvena Zvezda', status: 'win', score: '1-3' },
    { id: 'idZdQOQRzKMmS5gVUNy3', match: 'Ulm VS Panionios', status: 'loss', score: '103-96' },
    { id: 'lwBPoc4mXtzWPaywaEma', match: 'Getafe VS Atletico Madrid', status: 'loss', score: '0-1' }
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
    console.log("🏁 Backlog is ZERO. Task Complete.");
}
resolveBets().catch(console.error);
