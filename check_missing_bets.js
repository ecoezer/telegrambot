import admin from 'firebase-admin';
import dotenv from "dotenv";

dotenv.config();

if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
        });
    } else {
        process.exit(1);
    }
}
const db = admin.firestore();

const formatDate = (date) => {
    return date.toISOString().split('T')[0];
};

const checkMissingBets = async () => {
    console.log("🔍 Scanning ENTIRE Firestore Database for missing bets...");

    // Get ALL bets
    const snapshot = await db.collection('bets').get();
    const allBets = [];
    let invalidCount = 0;

    snapshot.forEach(doc => {
        const data = doc.data();
        let dateObj = null;
        if (data.timestamp) {
            if (typeof data.timestamp.toDate === 'function') {
                dateObj = data.timestamp.toDate();
            } else {
                dateObj = new Date(data.timestamp);
            }
        }

        if (dateObj && !isNaN(dateObj)) {
            allBets.push({
                id: doc.id,
                match: data.match,
                selection: data.selection,
                date: dateObj,
                formattedDate: formatDate(dateObj),
                status: data.status,
                odds: data.odds
            });
        } else {
            invalidCount++;
        }
    });

    console.log(`✅ Total Bets Found: ${allBets.length}`);
    if (invalidCount > 0) {
        console.warn(`⚠️  WARNING: Found ${invalidCount} bets with invalid/missing timestamps.`);
    }

    if (allBets.length === 0) {
        console.log("❌ No bets found in database at all.");
        return;
    }

    // Sort Ascending (Oldest First)
    allBets.sort((a, b) => a.date - b.date);

    const firstBetDate = allBets[0].date;
    const lastBetDate = new Date(); // To Today

    console.log(`📅 Full Range Analysis: ${formatDate(firstBetDate)} to ${formatDate(lastBetDate)}`);
    console.log("---------------------------------------------------");

    const betsByDate = {};
    allBets.forEach(bet => {
        if (!betsByDate[bet.formattedDate]) betsByDate[bet.formattedDate] = [];
        betsByDate[bet.formattedDate].push(bet);
    });

    let currentDate = new Date(firstBetDate);
    // Align to start of day
    currentDate.setHours(0, 0, 0, 0);

    const endDate = new Date(lastBetDate);
    endDate.setHours(0, 0, 0, 0);

    const missingDates = [];

    // Safety Loop limit (10 years)
    let safetyCounter = 0;
    const MAX_DAYS = 365 * 10;

    while (currentDate <= endDate) {
        const dateStr = formatDate(currentDate);
        const count = betsByDate[dateStr] ? betsByDate[dateStr].length : 0;

        if (count === 0) {
            missingDates.push(dateStr);
        }

        // Next day
        currentDate.setDate(currentDate.getDate() + 1);

        safetyCounter++;
        if (safetyCounter > MAX_DAYS) {
            console.error("🛑 Emergency Stop: Exceeded 10 years of scanning.");
            break;
        }
    }

    // FORCE CHECK: Jan 2026
    console.log("\n🔎 DEBUG: Checking January 2026 specifically...");
    const janStart = new Date('2026-01-01T00:00:00.000Z');
    const janEnd = new Date('2026-01-31T23:59:59.999Z');

    let debugDate = new Date(janStart);
    while (debugDate <= janEnd) {
        const dStr = formatDate(debugDate);
        const bets = betsByDate[dStr] || [];
        console.log(`[${dStr}] Count: ${bets.length}`);
        if (bets.length === 0) {
            console.log(`   ❌ MISSING!`);
        } else {
            bets.forEach(b => console.log(`   - [${b.status}] ${b.match} (${b.selection}) | ODSS: ${b.odds}`));
        }
        debugDate.setDate(debugDate.getDate() + 1);
    }
};

checkMissingBets().catch(console.error);
