
import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
}

const db = admin.firestore();


async function checkBets() {
    console.log("Analyzing bets...");
    const snapshot = await db.collection('bets').get();

    let total = 0;
    let resolved = 0;
    let missingScore = 0;
    const missingExamples = [];


    // Save to file for processing
    const fs = await import('fs');
    snapshot.forEach(doc => {
        total++;
        const data = doc.data();
        if (data.status === 'win' || data.status === 'loss' || data.status === 'won' || data.status === 'lost') {
            resolved++;
            if (!data.score) {
                missingScore++;
                missingExamples.push({
                    id: doc.id,
                    match: data.match,
                    selection: data.selection,
                    status: data.status,
                    date: data.formattedDate || new Date(data.timestamp._seconds * 1000).toLocaleDateString()
                });
            }
        }
    });

    console.log(`Total Bets: ${total}`);
    console.log(`Resolved Bets: ${resolved}`);
    console.log(`Resolved but Missing Score: ${missingScore}`);

    fs.writeFileSync('missing_bets.json', JSON.stringify(missingExamples, null, 2));
    console.log("Saved missing bets to missing_bets.json");
}

checkBets().catch(console.error);
