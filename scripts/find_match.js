import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();
async function findMatch() {
    const snapshot = await db.collection('bets').orderBy('timestamp', 'desc').limit(10).get();
    console.log("Recently added bets:");
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`- [${doc.id}] ${data.match} | Status: ${data.status} | Date: ${data.formattedDate}`);
    });

    // Specifically search for Wolves vs Chelsea
    const search = await db.collection('bets').where('match', '>=', 'Wolves').where('match', '<=', 'Wolves\uf8ff').get();
    console.log("\nSearch results for 'Wolves':");
    search.forEach(doc => {
        const data = doc.data();
        console.log(`- [${doc.id}] ${data.match} | Status: ${data.status} | Selection: ${data.selection}`);
    });
}
findMatch().catch(console.error);
