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
    { id: '2Wmlt6ghGhBosC5nxleJ', match: 'Monaco VS Fenerbahce', status: 'win' },
    { id: '2dNvKHEZGtQUB1vk3cu3', match: 'Wolves VS Leeds', status: 'win' },
    { id: '2xdcjKp8uCrRfgT4eKVh', match: 'Chelsea VS Everton', status: 'win' },
    { id: '34C1pp3XDpkGdm65CqMD', match: 'Musetti VS Mpetshi', status: 'win' },
    { id: '37eVGwAUaaDHHpa8kdbh', match: 'Serbia VS Czech Republic', status: 'win' },
    { id: '3RA4SwHunQw7azqSO8Vu', match: 'Sweden VS England', status: 'win' },
    { id: '3WCvSRSeg83GNlx99uJU', match: 'Bublik VS Cazaux', status: 'win' },
    { id: '3eHoIo1sWkD9WrQiMIBG', match: 'Rangers VS Braga', status: 'win' },
    { id: '3sdRdXgrza7on6tN8zBW', match: 'Leeds VS Chelsea', status: 'win' },
    { id: '47fN8WOSKLY0q58eRJqe', match: 'Tottenham VS West Ham', status: 'win' }
];

async function resolveBets() {
    for (const res of resolutions) {
        const docRef = db.collection('bets').doc(res.id);
        const doc = await docRef.get();
        if (!doc.exists) continue;
        const data = doc.data();
        const odds = data.odds || 0;
        const stake = data.stake || 1;
        const resultAmount = (stake * odds); // All are wins in this batch
        await docRef.update({
            status: 'win',
            resultAmount: resultAmount,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Result: ${res.match || res.id} -> WIN (Payout: ${resultAmount})`);
    }
}

resolveBets().catch(console.error);
