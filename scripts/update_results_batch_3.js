import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
}

const db = admin.firestore();

const resolutions = [
    { id: '0m4M02K2wlSyjwNE7vYv', match: 'Sunderland VS Burnley', status: 'win' },
    { id: '5dBxJ1DucZOsA6zseXpN', match: 'Napoli VS Chelsea', status: 'win' },
    { id: 'KHpdYCvi6M9YR5LWCPex', match: 'Aston Villa VS Brentford', status: 'win' },
    { id: 'LdYBTRPRlDOp3BHNO4eK', match: 'Arsenal VS Chelsea', status: 'loss' },
    { id: 'NqKKbeCnpq61Coxhbn6U', match: 'Wolves VS Bournemouth', status: 'loss' },
    { id: 'DgZmUKCWZqjcrDrmxMHW', match: 'Real Betis VS Atletico Madrid', status: 'loss' }, // Selection was BTTS YES, score was 0-5
    { id: 'H3xtA4j1aC6fCCrWtWVM', match: 'Efes VS Zalgiris', status: 'win' }
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
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Result: ${res.match} -> ${res.status.toUpperCase()} (Payout: ${resultAmount})`);
    }
    console.log("🚀 Batch 3 Resolved.");
}

resolveBets().catch(console.error);
