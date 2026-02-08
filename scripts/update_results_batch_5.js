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
    { id: '014c4cC9hxvRWspb3qRE', match: 'Brentford VS Burnley', status: 'win' },
    { id: '0tHZBhYLA8SSiPXKR01s', match: 'Austria VS Bosnia-Herz', status: 'win' },
    { id: '0uobYcUHFNoLEaqGWhjp', match: 'Spain VS Switzerland', status: 'loss' },
    { id: '1a8LnJqYE6POSZAMErMO', match: 'Iceland VS Ukraine', status: 'win' },
    { id: '2AAV9fGuhoJlyd48Ccai', match: 'Netherlands VS Finland', status: 'loss' },
    { id: '2DUBB1hQcmd5yF10OGmZ', match: 'Zandschulp VS Spizzirri', status: 'loss' },
    { id: '2H8dAjCK3hgjUr6bbViC', match: 'Alexandrova VS Mboko', status: 'loss' },
    { id: '2MP39HIU8AhpJsmElWhS', match: 'Leeds VS Liverpool', status: 'win' },
    { id: '2NVq89Q1lSwFVNpYq4fs', match: 'Cyprus VS Romania', status: 'loss' }
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
