import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
}

const db = admin.firestore();

const RESULTS_MAP = {
    "Leeds VS Liverpool": { score: "3-3", status: "WIN" },
    "ASVEL VS Bayern": { score: "76-74", status: "LOSS" },
    "Dubai VS Zalgiris": { score: "95-89", status: "WIN" },
    "Fulham VS Nottingham": { score: "1-0", status: "LOSS" },
    "Knights VS Predators": { score: "2-4", status: "WIN" },
    "Chelsea VS Arsenal": { score: "1-1", status: "WIN" },
    "Fulham VS Liverpool": { score: "2-2", status: "WIN" },
    "Bologna VS Inter Milan": { score: "1-1", status: "WIN" },
    "Chelsea VS Aston Villa": { score: "1-2", status: "WIN" },
    "Osasuna VS Levante": { score: "2-0", status: "WIN" },
    "Crystal Palace VS Tottenham": { score: "0-1", status: "LOSS" },
    "Indiana Pacers vs Charlotte Hornets": { score: "127-118", status: "LOSS" },
    "Austria VS Latvia": { score: "68-86", status: "WIN" },
    "Brentford VS Leeds": { score: "1-1", status: "LOSS" },
    "Getafe VS Elche": { score: "1-0", status: "LOSS" },
    "Man City VS Liverpool": { score: "3-0", status: "WIN" },
    "Efes VS Zvezda": { score: "65-87", status: "LOSS" },
    "Musetti VS De Minaur": { score: "2-1", status: "WIN" },
    "Braga VS Santa Clara": { score: "1-0", status: "VOID" },
    "Olympiacos VS Paris": { score: "98-86", status: "WIN" },
    "Rangers VS Braga": { score: "1-1", status: "WIN" },
    "Dortmund VS Bodo/Glimt": { score: "2-2", status: "WIN" }
};

const bulkUpdate = async () => {
    const snapshot = await db.collection('bets').where('status', '==', 'pending').get();
    const batch = db.batch();
    let updated = 0;

    snapshot.forEach(doc => {
        const bet = doc.data();
        const result = RESULTS_MAP[bet.match];
        if (result) {
            batch.update(doc.ref, {
                status: result.status,
                score: result.score,
                lastVerified: new Date().toISOString()
            });
            updated++;
        }
    });

    if (updated > 0) {
        await batch.commit();
        console.log(`✅ Final bulk updated ${updated} bets.`);
    } else {
        console.log("No bets matched for update.");
    }
    process.exit(0);
};

bulkUpdate().catch(console.error);
