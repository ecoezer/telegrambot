import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

dotenv.config();

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error("Missing FIREBASE_SERVICE_ACCOUNT in .env");
    process.exit(1);
}

try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    const db = admin.firestore();

    const testBet = {
        match: "Test Match - ES Module Check",
        selection: "Test Selection",
        sport: "Debug",
        timestamp: new Date().toISOString(),
        status: 'debug'
    };

    console.log("Attempting to write to Firestore...");

    db.collection('bets').add(testBet)
        .then(docRef => {
            console.log("✅ SUCCESS! Document written with ID: ", docRef.id);
            console.log("Database connection is working.");
            process.exit(0);
        })
        .catch(error => {
            console.error("❌ Error adding document: ", error);
            process.exit(1);
        });

} catch (e) {
    console.error("❌ Failed to parse Service Account JSON:", e);
}
