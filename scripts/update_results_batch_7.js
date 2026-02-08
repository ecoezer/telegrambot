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
    { id: '9dJKGfEFxE95PChHDuAt', match: 'Norway VS Israel', status: 'win' },
    { id: '9nh9Fmlv6uXwyXwl96Xc', match: 'Brentford VS Man City', status: 'loss' },
    { id: 'BLKNnGXuwZkDfqjesk3a', match: 'Brentford VS Liverpool', status: 'loss' },
    { id: 'BY4Oee8e8cZ2F0UHsaTS', match: 'Braga VS Nottingham', status: 'loss' },
    { id: 'CAbXegMCP1Sf6bCejX5W', match: 'PSG VS Tottenham', status: 'win' },
    { id: 'CEFFE4qxanoUbS8p5rPz', match: 'Fulham VS Liverpool', status: 'win' },
    { id: 'Dk0SPs6bthqzE0QPLhdm', match: 'Bayern VS Werder Bremen', status: 'win' },
    { id: 'Do0qgDbjnSYlstxsESk8', match: 'Fulham VS Man United', status: 'win' },
    { id: 'AijPQMs6IS6XzbItJWoZ', match: 'Bublik VS De Minaur', status: 'loss' },
    { id: 'D8NjlGpvbmKZWk6coI1k', match: 'Kessler VS Kostyuk', status: 'win' }
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
        console.log(`✅ Result: ${res.match} -> ${res.status.toUpperCase()}`);
    }
}

resolveBets().catch(console.error);
