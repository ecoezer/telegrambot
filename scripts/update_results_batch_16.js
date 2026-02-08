import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();

const resolutions = [
    { id: 'QbkJbcCU1zQKQMuyIjUZ', match: 'Lazio VS Como', status: 'win', score: '0-3' },
    { id: 'oiSdbOQl15cpyKtPXW5x', match: 'West Ham VS Bretnford', status: 'loss', score: '0-2' },
    { id: 'qr1Y6xCJLLPBIsF5DKDp', match: 'Tottenham VS Aston Villa', status: 'win', score: '1-2' },
    { id: 'rQ3WJhzvlSsfokVYd93C', match: 'Liverpool VS Atletico Madrid', status: 'win', score: '3-2' },
    { id: 'cjJOdGzUo4678mcSY4Ak', match: 'Feyenoord VS Aston Villa', status: 'loss', score: '0-2' },
    { id: 'tM8t0LMoJj2mWAnBCRoQ', match: 'Dynamo Kyiv VS Pafos', status: 'loss', score: '0-1' },
    { id: 'sVvK88hRCDqpqGyVseNS', match: 'Italy VS Slovenia', status: 'loss', score: '77-84' },
    { id: 'sWgSoI23S7X5qv9H83tI', match: 'Kovacevic VS Wong', status: 'loss', score: '0-2' },
    { id: 'szTw3GisuT1L7rDVAV84', match: 'Nakashima VS Quinn', status: 'win', score: '2-0' }
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
    console.log("🚀 Batch 16 Resolved.");
}
resolveBets().catch(console.error);
