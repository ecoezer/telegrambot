import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();

const resolutions = [
    { id: 'vxqjnRUrNVH39wGjLG9Y', match: 'West Ham VS Chelsea', status: 'win', score: '1-5' },
    { id: 'JeDXkE0jRGmmyGmcgGNf', match: 'Liverpool VS Arsenal', status: 'loss', score: '1-0' },
    { id: 'owZNTbAX4Vv1TjmhF6Ha', match: 'Real Betis VS Nottingham', status: 'win', score: '2-2' },
    { id: 'qzADh8MsChL165doZ4ph', match: 'Liverpool VS Real Madrid', status: 'win', score: '1-0' },
    { id: '6wiAzvPJxdFFe3ZlCAgc', match: 'Porto VS Rangers', status: 'loss', score: '3-1' },
    { id: 'XiuDlHID3sZ79gI8NqPC', match: 'Greece VS Denmark', status: 'win', score: '0-3' },
    { id: 'YaAbnE9hr4n1qVnLSFp4', match: 'West Ham VS Tottenham', status: 'win', score: '0-3' },
    { id: 'YW6fLGYoMib6biPVrcXp', match: 'Arsenal VS Athletic Bilbao', status: 'win', score: '3-0' },
    { id: 'xnsgIa2jqLS1q8xOSA72', match: 'Hapoel VS Maccabi', status: 'win', score: '90-103' },
    { id: 'G1unthDzQE0aF5924NMp', match: 'Fulham VS Brighton', status: 'win', score: '2-1' }
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
    console.log("🚀 Batch 12 Resolved.");
}
resolveBets().catch(console.error);
