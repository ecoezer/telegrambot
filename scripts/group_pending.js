import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
}

const db = admin.firestore();

async function groupPending() {
    const snapshot = await db.collection('bets').where('status', '==', 'pending').get();
    const dates = {};

    snapshot.forEach(doc => {
        const data = doc.data();
        const date = data.formattedDate || 'Unknown';
        if (!dates[date]) dates[date] = [];
        dates[date].push({ id: doc.id, match: data.match, selection: data.selection });
    });

    const sortedDates = Object.keys(dates).sort((a, b) => new Date(b) - new Date(a));
    const output = sortedDates.map(date => ({
        date,
        count: dates[date].length,
        bets: dates[date]
    }));

    fs.writeFileSync('pending_by_date.json', JSON.stringify(output, null, 2));
    console.log(`✅ Grouped ${snapshot.size} bets into ${sortedDates.length} unique dates.`);
}

groupPending().catch(console.error);
