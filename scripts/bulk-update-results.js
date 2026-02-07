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
    "Alcaraz VS Musetti": { score: "2-0", winner: "Alcaraz" },
    "Alcaraz VS Auger": { score: "2-0", winner: "Alcaraz" },
    "Chelsea VS Arsenal": { score: "1-1" },
    "Sunderland VS Man City": { score: "0-0" },
    "Leeds VS Chelsea": { score: "3-1", winner: "Leeds" },
    "Man United VS West Ham": { score: "1-1" },
    "Lille VS Marseille": { score: "1-0", winner: "Lille" },
    "Porto VS Malmo": { score: "2-1", winner: "Porto" },
    "Chelsea VS Everton": { score: "2-0", winner: "Chelsea" },
    "Dortmund VS Villarreal": { score: "4-0", winner: "Dortmund" },
    "Sinner VS Zverev": { score: "2-0", winner: "Sinner" },
    "Sinner VS Auger": { score: "2-0", winner: "Sinner" },
    "Monaco VS Fenerbahce": { score: "86-91", winner: "Fenerbahce" },
    "Olimpia Milano VS Fenerbahce": { score: "72-87", winner: "Fenerbahce" },
    "Aston Villa VS Man United": { score: "2-1", winner: "Aston Villa" },
    "Topuria VS Almakhan": { score: "3-0", winner: "Topuria" },
    "Brentford VS Burnley": { score: "3-1", winner: "Brentford" },
    "Malta VS Poland": { score: "2-3", winner: "Poland" },
    "Milano VS Hapoel": { score: "83-105", winner: "Hapoel" },
    "Randers VS Odense": { score: "0-0" },
    "Tottenham VS Liverpool": { score: "1-2", winner: "Liverpool" },
    "Fulham VS Nottingham": { score: "1-0", winner: "Fulham" },
    "Bologna VS Inter Milan": { score: "1-1" },
    "Fulham VS Man City": { score: "4-5", winner: "Man City" },
    "Penguins VS Predators": { score: "4-0", winner: "Penguins" },
    "Austria VS Bosnia-Herz": { score: "1-1" },
    "PSG VS Tottenham": { score: "5-3", winner: "PSG" },
    "Rangers VS Braga": { score: "1-1" },
    "West Ham VS Brighton": { score: "2-2" },
    "Roma VS Genoa": { score: "3-1", winner: "Roma" },
    "Chelsea VS Aston Villa": { score: "1-2", winner: "Aston Villa" },
    "Bournemouth VS Arsenal": { score: "3-2", winner: "Bournemouth" },
    "Leeds VS Liverpool": { score: "3-3" },
    "Olympiacos VS Valencia": { score: "92-99", winner: "Valencia" },
    "Leicester VS West Brom": { score: "2-1", winner: "Leicester" },
    "Knicks VS Cavaliers": { score: "126-124", winner: "Knicks" },
    "Fulham VS Liverpool": { score: "2-2" },
    "Crystal Palace VS Tottenham": { score: "0-1", winner: "Tottenham" },
    "Newcastle VS Leeds": { score: "4-3", winner: "Newcastle" },
    "Napoli VS Juventus": { score: "2-1", winner: "Napoli" },
    "Efes VS Zvezda": { score: "65-87", winner: "Zvezda" },
    "Man United VS Newcastle": { score: "1-0", winner: "Man United" },
    "Barcelona VS Eintracht": { score: "2-1", winner: "Barcelona" },
    "Getafe VS Atletico Madrid": { score: "0-1", winner: "Atletico" },
    "ASVEL VS Real Madrid": { score: "69-80", winner: "Real Madrid" },
    "ASVEL VS Bayern": { score: "76-74", winner: "ASVEL" },
    "Arsenal VS Crystal Palace": { score: "1-1" }
};

const determineStatus = (bet, result) => {
    const selection = bet.selection.toLowerCase();
    const score = result.score;
    const winner = result.winner;

    // 1. Over/Under Check
    const overMatch = selection.match(/over\s*(\d+\.?\d*)/);
    const underMatch = selection.match(/under\s*(\d+\.?\d*)/);

    if (overMatch || underMatch) {
        const parts = score.split(/[-:]/).map(p => parseInt(p.trim()));
        const total = parts[0] + parts[1];
        if (overMatch) {
            return total > parseFloat(overMatch[1]) ? "WIN" : "LOSS";
        }
        if (underMatch) {
            return total < parseFloat(underMatch[1]) ? "WIN" : "LOSS";
        }
    }

    // 2. Winner Check
    if (winner) {
        if (selection.includes(winner.toLowerCase())) return "WIN";
        if (selection.includes("winner") || selection.includes("full time result") || selection.includes("handicap")) {
            // For handicap, it depends, but we usually look for the selection name
            // For simplicity, if selection mentions a name other than winner, it's a loss
            return "LOSS";
        }
    }

    // 3. Both teams to score
    if (selection.includes("both teams to score")) {
        const parts = score.split(/[-:]/).map(p => parseInt(p.trim()));
        if (selection.includes("yes")) {
            return (parts[0] > 0 && parts[1] > 0) ? "WIN" : "LOSS";
        }
        if (selection.includes("no")) {
            return (parts[0] === 0 || parts[1] === 0) ? "WIN" : "LOSS";
        }
    }

    return "pending";
};

const bulkUpdate = async () => {
    const snapshot = await db.collection('bets').where('status', '==', 'pending').get();
    const batch = db.batch();
    let updated = 0;

    snapshot.forEach(doc => {
        const bet = doc.data();
        const result = RESULTS_MAP[bet.match];
        if (result) {
            const status = determineStatus(bet, result);
            if (status !== "pending") {
                batch.update(doc.ref, {
                    status: status,
                    score: result.score,
                    lastVerified: new Date().toISOString()
                });
                updated++;
            }
        }
    });

    if (updated > 0) {
        await batch.commit();
        console.log(`✅ Bulk updated ${updated} bets.`);
    } else {
        console.log("No bets matched for update.");
    }
    process.exit(0);
};

bulkUpdate().catch(console.error);
