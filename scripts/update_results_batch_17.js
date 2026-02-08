import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();

const resolutions = [
    { id: 'J3KzTGhqgdgitKAAohLR', match: 'Napoli VS Parma', status: 'loss', score: '0-0' },
    { id: 'OYIB2wUUFogBkkgOVAW0', match: 'Getafe VS Elche', status: 'loss', score: '1-0' },
    { id: 'V3cteZrJXGDa6a64ljFM', match: 'Barcelona VS Eintracht', status: 'win', score: '2-1' },
    { id: 'YS6I0sNqnofTYOaAfdkS', match: 'Stuttgart VS St Pauli', status: 'loss', score: '2-0' },
    { id: 'Zk7kI9Jvp2yIqJT2KYS5', match: 'Leeds VS Everton', status: 'loss', score: '1-0' },
    { id: 'a1B0vOh9paKARJJeF4Zi', match: 'Como VS Genoa', status: 'loss', score: '1-1' },
    { id: 'aphoil50o3PQvoU5wUyC', match: 'Sevastova VS Pegula', status: 'win', score: '2-1' },
    { id: 'cQCKyRmhpKkGMc7d6NDS', match: 'Kairat Almaty VS Real Madrid', status: 'win', score: '0-5' },
    { id: 'gDw8Ov6nwtVVzisOOI9r', match: 'Man United VS Sunderland', status: 'win', score: '2-0' }
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
    console.log("🚀 Batch 17 Resolved.");
}
resolveBets().catch(console.error);
