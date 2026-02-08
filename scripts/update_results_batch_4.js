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
    { id: 'yr6YDP6skZRaiokitA64', match: 'Chelsea VS Wolves', status: 'win' },
    { id: 'DC6LaFT0cypZz7DnOwl4', match: 'Fulham VS Man City', status: 'win' },
    { id: 'h4InNlhHxEP3cMUsDDZy', match: 'Olympiacos VS Paris', status: 'win' }
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
        console.log(`✅ Result: ${res.match} -> ${res.status.toUpperCase()}`);
    }
}

resolveBets().catch(console.error);
