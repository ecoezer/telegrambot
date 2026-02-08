import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();

const resolutions = [
    { id: '9vTcywmG41pIooOlfO63', match: 'Newcastle VS Leeds', status: 'win', score: '4-3' },
    { id: 'AYyp1mpm63QVXdhXw9LG', match: 'HJK VS Inter Turku', status: 'win', score: '1-4' },
    { id: 'DuBznHWRtk8lLFxwdQRj', match: 'Dubai VS Zalgiris', status: 'win', score: '95-89' },
    { id: 'GEyFkg2UmZ4wKDypuF6e', match: 'Inter Milan VS Napoli', status: 'loss', score: '2-2' },
    { id: 'Hj23bIrKanSTUBvM40V5', match: 'Dortmund VS Werder Bremen', status: 'win', score: '3-0' },
    { id: 'KDmDLbQrvQamhqSlEx9S', match: 'Diallo VS Medjedovic', status: 'win', score: '0-2' },
    { id: 'KfXsuYMkOQgZNmHdCUfH', match: 'Bournemouth VS Newcastle', status: 'win', score: '0-0' },
    { id: 'LgF3ml3thHtzq5L9mULC', match: 'Arsenal VS Crystal Palace', status: 'win', score: '1-1' },
    { id: 'M0u1Gp6VWNX07obuhGtG', match: 'Bouzkova VS Valentova', status: 'win', score: '2-0' },
    { id: 'FBTL4hmPe6FHDlpJfIIr', match: 'Man City VS Man United', status: 'win', score: '3-0' }
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
    console.log("🚀 Batch 13 Resolved.");
}
resolveBets().catch(console.error);
