
import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
}

const db = admin.firestore();

async function checkOdds() {
    console.log("Checking bets for 'odds' field...");
    const snapshot = await db.collection('bets').limit(10).get();
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`Match: ${data.match}, Odds: ${data.odds}, Status: ${data.status}`);
    });
}

checkOdds();
