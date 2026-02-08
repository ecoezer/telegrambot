
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

function normalizeStatus(status) {
    if (!status) return 'pending';
    return status.toLowerCase().trim();
}

function parseScore(scoreStr) {
    if (!scoreStr) return null;
    // Remove "Home " or "Away " if present (unlikely but safe)
    // Matches "3-1", "3 - 1", "3:1", "3 : 1"
    const clean = scoreStr.replace(/[a-zA-Z]/g, '').trim();
    const parts = clean.split(/[-:]/).map(s => s.trim());
    if (parts.length < 2) return null;
    const home = parseFloat(parts[0]);
    const away = parseFloat(parts[1]);
    if (isNaN(home) || isNaN(away)) return null;
    return { home, away };
}

function determineStatus(bet, scoreObj) {
    const selection = bet.selection.toLowerCase().trim();
    const match = bet.match.toLowerCase().trim();
    const parts = match.split(' vs ');

    // Fallback split if ' vs ' not found? Usually strict format.
    const homeTeam = parts[0] ? parts[0].trim() : '';
    const awayTeam = parts[1] ? parts[1].trim() : '';

    const { home, away } = scoreObj;
    const totalGoals = home + away;

    // 1. Over/Under
    if (selection.includes('over')) {
        const thresholdMatch = selection.match(/over\s*(\d+(\.\d+)?)/);
        if (thresholdMatch) {
            const threshold = parseFloat(thresholdMatch[1]);
            return totalGoals > threshold ? 'win' : 'loss';
        }
    }
    if (selection.includes('under')) {
        const thresholdMatch = selection.match(/under\s*(\d+(\.\d+)?)/);
        if (thresholdMatch) {
            const threshold = parseFloat(thresholdMatch[1]);
            return totalGoals < threshold ? 'win' : 'loss';
        }
    }

    // 2. BTTS
    if (selection.includes('btts') || selection.includes('both teams to score')) {
        if (selection.includes('yes')) {
            return (home > 0 && away > 0) ? 'win' : 'loss';
        }
        if (selection.includes('no')) {
            return (home === 0 || away === 0) ? 'win' : 'loss';
        }
    }

    // 3. Handicap
    // "Fenerbahce Handicap (+7.5)" or "Team (+1)"
    if (selection.includes('handicap') || selection.includes(')')) { // Parenthesis often implies handicap/spread
        // Try to find the handicap number
        const handicapMatch = selection.match(/\(([-+]?\d+(\.\d+)?)\)/);
        if (handicapMatch) {
            const handicap = parseFloat(handicapMatch[1]);
            let teamName = selection.split('handicap')[0].trim();
            if (!teamName) teamName = selection.split('(')[0].trim(); // "Team (+1)"

            // Identify which team
            let adjHome = home;
            let adjAway = away;

            if (homeTeam.includes(teamName) || teamName.includes(homeTeam)) {
                adjHome += handicap;
                return adjHome > away ? 'win' : 'loss';
            } else if (awayTeam.includes(teamName) || teamName.includes(awayTeam)) {
                adjAway += handicap;
                return adjAway > home ? 'win' : 'loss';
            }
            // If implicit? usually first team listed? Risk.
        }
    }

    // 4. Match Winner (1X2)
    if (selection.includes('win') || (!selection.includes('over') && !selection.includes('under') && !selection.includes('btts'))) {
        let selectedTeam = selection.replace('win', '').trim();
        if (!selectedTeam && selection.includes('win')) {
            // Maybe "Home Win" / "Away Win"? Not standard but check.
            if (selection.includes('home')) return home > away ? 'win' : 'loss';
            if (selection.includes('away')) return away > home ? 'win' : 'loss';
        }

        if (selectedTeam) {
            // Clean emojis if any
            selectedTeam = selectedTeam.replace(/[\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF]/g, '').trim();
            const cleanHome = homeTeam.replace(/[\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF]/g, '').trim();
            const cleanAway = awayTeam.replace(/[\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF]/g, '').trim();

            if (cleanHome.includes(selectedTeam) || selectedTeam.includes(cleanHome)) {
                return home > away ? 'win' : 'loss';
            }
            if (cleanAway.includes(selectedTeam) || selectedTeam.includes(cleanAway)) {
                return away > home ? 'win' : 'loss';
            }
        }
    }

    return 'manual_check';
}

async function audit() {
    console.log("🔍 Starting Bet Audit...");
    const snapshot = await db.collection('bets').get();
    const discrepancies = [];
    let reviewedCount = 0;

    snapshot.forEach(doc => {
        const bet = doc.data();
        if (!bet.score || !bet.status) return;

        const currentStatus = normalizeStatus(bet.status);
        if (currentStatus === 'pending') return;

        const scoreObj = parseScore(bet.score);
        if (!scoreObj) return;

        // Skip future dates if somehow marked? No, check status.

        const calculated = determineStatus(bet, scoreObj);
        reviewedCount++;

        if (calculated === 'manual_check') {
            // console.log(`⚠️  Manual check needed: ${bet.match} -> ${bet.selection}`);
            return;
        }

        const isWin = currentStatus === 'win' || currentStatus === 'won';
        const calcIsWin = calculated === 'win';

        if (isWin !== calcIsWin) {
            console.log(`❌ MISMATCH Found: ${bet.match}`);
            console.log(`   Selection: ${bet.selection}`);
            console.log(`   Score: ${bet.score}`);
            console.log(`   DB Status: ${currentStatus} | Calculated: ${calculated}`);

            discrepancies.push({
                id: doc.id,
                match: bet.match,
                selection: bet.selection,
                score: bet.score,
                db_status: currentStatus,
                correct_status: calculated,
                timestamp: bet.timestamp
            });
        }
    });

    console.log(`\n📊 Audit Complete.`);
    console.log(`   Reviewed: ${reviewedCount} bets`);
    console.log(`   Discrepancies: ${discrepancies.length}`);

    if (discrepancies.length > 0) {
        fs.writeFileSync('audit_results.json', JSON.stringify(discrepancies, null, 2));
        console.log("📝 Discrepancies saved to audit_results.json");
    } else {
        console.log("✅ No logic errors found!");
    }
}

audit().catch(console.error);
