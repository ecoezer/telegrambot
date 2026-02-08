import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();

const resolutions = [
    { id: 'MDjCi9HHARd1d10wX0oO', match: 'Iceland VS France', status: 'win', score: '1-2' },
    { id: 'MQXKziCQdZPUrSV8Z8M2', match: 'Man United VS West Ham', status: 'win', score: '1-1' },
    { id: 'MVzTuWhtNah3tu8wyVcH', match: 'Dortmund VS Villarreal', status: 'win', score: '4-0' },
    { id: 'NTgp9pkBFoxJsGoQ5qzK', match: 'Alcaraz VS Musetti', status: 'win', score: '6-4, 6-1' },
    { id: 'OXKO6BBl2V6pEgCerMpy', match: 'Basel VS FCSB', status: 'win', score: '3-1' },
    { id: 'PHDICGGZ80GQiQbA1zY0', match: 'Man City VS Napoli', status: 'win', score: '2-0' },
    { id: 'PctvZKYbKJh9WsXd0f9r', match: 'Sinner VS Zverev', status: 'loss', score: '6-4, 6-3' },
    { id: 'Pq6rd4s0W3b0TbuYTp8G', match: 'Moutet VS Bublik', status: 'win', score: '0-2' },
    { id: 'RThzpC3uW6sazfEAEM5r', match: 'Knicks VS Cavaliers', status: 'win', score: '126-124' },
    { id: 'RogvFs7EkEs0lI5KntuP', match: 'Chelsea VS Aston Villa', status: 'win', score: '1-2' }
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
    console.log("🚀 Batch 14 Resolved.");
}
resolveBets().catch(console.error);
