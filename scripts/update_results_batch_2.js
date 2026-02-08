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
    { id: 'mv3jHt1KjJjFq1Egk64d', match: 'Napoli VS Juventus', status: 'win' },
    { id: 'r0VGMaDP3CeWws2kASWK', match: 'Porto VS Malmo', status: 'win' },
    { id: 'zliedAPyN9dK2FpTN3Km', match: 'Bologna VS Inter Milan', status: 'win' },
    { id: 'pKpotXKin7ki0rih9341', match: 'Braga VS Santa Clara', status: 'loss' }, // 1-0 win didn't cover -1
    { id: 'fXGP4agGBSXRBDepr4ba', match: 'Olimpia Milano VS Fenerbahce', status: 'win' },
    { id: 'e8gv5QXcdTLkkZDzLlsy', match: 'Chelsea VS Arsenal', status: 'win' }
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
        await docRef.update({ status: res.status, resultAmount: resultAmount });
        console.log(`✅ Result: ${res.match} -> ${res.status.toUpperCase()} (Payout: ${resultAmount})`);
    }
}

resolveBets().catch(console.error);
