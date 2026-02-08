import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();

const resolutions = [
    { id: '9BUFudkcLmsTCDFSPXLR', match: 'Roma VS Genoa', status: 'win', score: '3-1' },
    { id: '9bZLNRhm3uDMMlbQyI3p', match: 'Eintracht VS Dortmund', status: 'win', score: '3-3' },
    { id: 'AIyMGRBF0H0kEQWV2bnf', match: 'Iceland VS Slovenia', status: 'loss', score: '79-87' },
    { id: 'ALwFQ2uM19GhrKl8PMwA', match: 'Lithuania VS Sweden', status: 'loss', score: '74-71' },
    { id: 'BpeWmsMTriu23DBCdkH2', match: 'Moutet VS Brooksby', status: 'loss', score: '2-0' },
    { id: 'CAYkBKzllEbst1vNUXEo', match: 'Atalanta VS Torino', status: 'loss', score: '2-0' },
    { id: 'Du4sWVBpkJIn2rf3jFN6', match: 'Levante VS Real Madrid', status: 'win', score: '1-4' },
    { id: 'EFq3ysglcfhCgfcqFsGm', match: 'Wolves VS Burnley', status: 'loss', score: '2-3' },
    { id: 'EVfdAs7m7dPBtLcxYVjV', match: 'Giron VS Fokina', status: 'win', score: '1-2' },
    { id: 'FowojTHpSf3Ta2M0wg1r', match: 'ASVEL VS Hapoel', status: 'win', score: '73-81' }
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
    console.log("🚀 Batch 9 Resolved.");
}
resolveBets().catch(console.error);
