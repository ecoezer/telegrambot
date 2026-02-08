import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();

const resolutions = [
    { id: 'YaAbnE9hr4n1qVnLSFp4', match: 'West Ham VS Tottenham', status: 'win', score: '0-3' },
    { id: 'YW6fLGYoMib6biPVrcXp', match: 'Arsenal VS Athletic Bilbao', status: 'win', score: '3-0' },
    { id: 'XiuDlHID3sZ79gI8NqPC', match: 'Greece VS Denmark', status: 'win', score: '0-3' },
    { id: 'xnsgIa2jqLS1q8xOSA72', match: 'Hapoel VS Maccabi', status: 'win', score: '90-103' },
    { id: 'Ezxa2qolaycYC6EO1AQR', match: 'Lille VS Marseille', status: 'loss', score: '1-0' },
    { id: 'YHVDt9Idd6nszBXjogm6', match: 'ASVEL VS Bayern', status: 'loss', score: '76-74' },
    { id: 'Y3ffda9CglrQo0oyqP24', match: 'Tien VS Rublev', status: 'win', score: '0-2' },
    { id: 'XxQMY0ZABTCaTZMo2nxj', match: 'Osaka VS Sevastova', status: 'loss', score: '2-0' },
    { id: 'X5dpfeEl3hi4Df02vD5F', match: 'Fucsovics VS Shapovalov', status: 'win', score: '0-3' },
    { id: 'K5CTeeSqx4tzuctnHOUm', match: 'Zhu VS Lamens', status: 'loss', score: '2-0' }
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
    console.log("🚀 Batch 11 Resolved.");
}
resolveBets().catch(console.error);
