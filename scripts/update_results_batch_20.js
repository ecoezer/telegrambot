import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();

const resolutions = [
    { id: 'J5WtKP4wFPyw9E3x4whD', match: 'Hellas Verona VS Sassuolo', status: 'win', score: '0-1' },
    { id: 'KZ7YHBtuk03ah95pbxo6', match: 'Muller VS Nakashima', status: 'win', score: '2-0' },
    { id: 'McIl6RUMPaie9gUuOWxf', match: 'Bondar VS Juvan', status: 'loss', score: '2-1' },
    { id: 'XHYS6XNm5psaaYDM28iC', match: 'Lille VS Brann', status: 'win', score: '2-1' },
    { id: 'ZPVy9rgU6UIKKxnAGPbw', match: 'Musetti VS De Minaur', status: 'win', score: '2-1' },
    { id: 'ZQ0VJeHsqbP5dUHZuHsE', match: 'Sctotland VS Greece', status: 'win', score: '3-1' },
    { id: 'ZZqDRzhYUOwnUWhaMCjB', match: 'Sinner VS Auger', status: 'loss', score: '2-0' },
    { id: 'bcDEL6sAS8t4zQvziJql', match: 'Milano VS Hapoel', status: 'win', score: '83-105' },
    { id: 'cJ8PrX6074CwoqholCNb', match: 'Monchengladbach VS Eintracht', status: 'win', score: '4-6' },
    { id: 'W0RGcIZvLplKRlTkqLYQ', match: 'Watanuki VS Altmaier', status: 'win', score: '2-1' }
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
    console.log("🚀 Batch 20 Resolved.");
}
resolveBets().catch(console.error);
