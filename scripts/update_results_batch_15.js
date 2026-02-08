import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();

const resolutions = [
    { id: 'PzkaVZuUsDO4Ng5L7Z0d', match: 'Popyrin VS Rublev', status: 'loss', score: '2-1' },
    { id: 'Q6pgwyn6I1mpqGaHmhmZ', match: 'Tien VS Rublev', status: 'win', score: '0-2' },
    { id: 'S6LmwhZMNE2c63gvFHrj', match: 'Pellegrino VS Molleker', status: 'win', score: '2-0' },
    { id: 'SgCicqYfm41QF7sQTBzG', match: 'Stricked VS Herbert', status: 'win', score: '2-1' },
    { id: 'U2CAWrn2CudljJwEGw8D', match: 'Everton VS West Ham', status: 'win', score: '1-1' },
    { id: 'U3BeauBmJTjNDjkUuA0B', match: 'St Pauli VS Leipzig', status: 'loss', score: '1-1' },
    { id: 'UF3OldvE9CGGT0Ka8wUr', match: 'Indiana Pacers vs Charlotte Hornets', status: 'loss', score: '127-118' },
    { id: 'UObKeoSeuvOW3OcRHYFm', match: 'Napoli VS Pisa', status: 'win', score: '3-2' },
    { id: 'UgzU6dKyGZUGbKjZG7sh', match: 'Wu VS Popyrin', status: 'loss', score: '2-1' },
    { id: 'UhH4CswqRjiYIohGkD5e', match: 'Bodo/Glimt VS Man City', status: 'win', score: '3-1' }
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
    console.log("🚀 Batch 15 Resolved.");
}
resolveBets().catch(console.error);
