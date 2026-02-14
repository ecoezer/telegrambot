
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
        });
    }
}

const db = admin.firestore();

async function analyzeAdvancedStrategies() {
    console.log("Fetching bets...");
    const snapshot = await db.collection('bets').get();
    const bets = [];
    snapshot.forEach(doc => {
        bets.push({ id: doc.id, ...doc.data() });
    });

    bets.sort((a, b) => new Date(a.date) - new Date(b.date));

    const validBets = bets.filter(b =>
        (b.status === 'win' || b.status === 'won' || b.status === 'loss' || b.status === 'lost') &&
        parseFloat(b.odds) > 1
    );

    console.log(`Analyzing ${validBets.length} valid bets...`);

    const BASE_STAKE = 50; // Unit size

    const strategies = [
        { name: 'Reverse Martingale (Paroli) [Limit 3 Wins]', run: (b) => runParoli(b, BASE_STAKE, 3) },
        { name: 'D\'Alembert (Unit 50€)', run: (b) => runDalembert(b, BASE_STAKE) },
        { name: 'Fibonacci (Unit 50€)', run: (b) => runFibonacci(b, BASE_STAKE) },
        { name: '1-3-2-6 System (Unit 50€)', run: (b) => run1326(b, BASE_STAKE) },
        // Optimized Filters
        { name: "D'Alembert (Unit 50€) [Odds 1.5-2.0]", run: (b) => runDalembert(b.filter(x => x.odds >= 1.5 && x.odds <= 2.0), BASE_STAKE) },
        { name: "Fibonacci (Unit 50€) [Odds 1.5-2.0]", run: (b) => runFibonacci(b.filter(x => x.odds >= 1.5 && x.odds <= 2.0), BASE_STAKE) },
        { name: "Reverse Martingale (Paroli) [Odds > 2.0]", run: (b) => runParoli(b.filter(x => x.odds > 2.0), BASE_STAKE, 3) }
    ];

    const results = strategies.map(s => {
        const stats = s.run(validBets);
        return {
            Strategy: s.name,
            'Net Profit': `${stats.profit.toFixed(2)}€`,
            'Max Drawdown': `${stats.drawdown.toFixed(2)}€`,
            'ROI': `${((stats.profit / stats.totalWagered) * 100).toFixed(2)}%`,
            'Max Bet': `${stats.maxBet.toFixed(2)}€`
        };
    });

    console.table(results);
    process.exit(0);
}

function runParoli(bets, baseStake, winLimit) {
    let profit = 0;
    let bankroll = 0;
    let lowestBankroll = 0;
    let currentStake = baseStake;
    let maxBet = baseStake;
    let winStreak = 0;
    let totalWagered = 0;

    bets.forEach(b => {
        const odds = parseFloat(b.odds);
        const isWin = (b.status === 'win' || b.status === 'won');

        totalWagered += currentStake;
        if (currentStake > maxBet) maxBet = currentStake;

        if (isWin) {
            profit += currentStake * (odds - 1);
            bankroll += currentStake * (odds - 1);
            winStreak++;

            if (winStreak >= winLimit) {
                // Reset after limit reached (take profit)
                currentStake = baseStake;
                winStreak = 0;
            } else {
                // Double stake + profit? Or just double stake? Paroli usually doubles.
                // Let's assume strict Paroli: Double stake.
                currentStake *= 2;
            }
        } else {
            profit -= currentStake;
            bankroll -= currentStake;
            // Reset on loss
            currentStake = baseStake;
            winStreak = 0;
        }

        if (bankroll < lowestBankroll) lowestBankroll = bankroll;
    });

    return { profit, drawdown: lowestBankroll, totalWagered, maxBet };
}

function runDalembert(bets, unit) {
    let profit = 0;
    let bankroll = 0;
    let lowestBankroll = 0;
    let currentStake = unit;
    let maxBet = unit;
    let totalWagered = 0;

    bets.forEach(b => {
        const odds = parseFloat(b.odds);
        const isWin = (b.status === 'win' || b.status === 'won');

        totalWagered += currentStake;
        if (currentStake > maxBet) maxBet = currentStake;

        if (isWin) {
            profit += currentStake * (odds - 1);
            bankroll += currentStake * (odds - 1);
            // Decrease stake by one unit, min 1 unit
            currentStake = Math.max(unit, currentStake - unit);
        } else {
            profit -= currentStake;
            bankroll -= currentStake;
            // Increase stake by one unit
            currentStake += unit;
        }

        if (bankroll < lowestBankroll) lowestBankroll = bankroll;
    });

    return { profit, drawdown: lowestBankroll, totalWagered, maxBet };
}

function runFibonacci(bets, unit) {
    let profit = 0;
    let bankroll = 0;
    let lowestBankroll = 0;
    const seq = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];
    let seqIndex = 0;
    let maxBet = unit;
    let totalWagered = 0;

    bets.forEach(b => {
        const odds = parseFloat(b.odds);
        const isWin = (b.status === 'win' || b.status === 'won');

        let multiplier = seq[Math.min(seqIndex, seq.length - 1)];
        let currentStake = unit * multiplier;

        totalWagered += currentStake;
        if (currentStake > maxBet) maxBet = currentStake;

        if (isWin) {
            profit += currentStake * (odds - 1);
            bankroll += currentStake * (odds - 1);
            // Move back 2 steps
            seqIndex = Math.max(0, seqIndex - 2);
        } else {
            profit -= currentStake;
            bankroll -= currentStake;
            // Move forward 1 step
            seqIndex++;
        }

        if (bankroll < lowestBankroll) lowestBankroll = bankroll;
    });

    return { profit, drawdown: lowestBankroll, totalWagered, maxBet };
}

function run1326(bets, unit) {
    let profit = 0;
    let bankroll = 0;
    let lowestBankroll = 0;
    // Sequence: 1, 3, 2, 6 units
    const multipliers = [1, 3, 2, 6];
    let step = 0;
    let maxBet = unit;
    let totalWagered = 0;

    bets.forEach(b => {
        const odds = parseFloat(b.odds);
        const isWin = (b.status === 'win' || b.status === 'won');

        let currentStake = unit * multipliers[step];
        totalWagered += currentStake;
        if (currentStake > maxBet) maxBet = currentStake;

        if (isWin) {
            profit += currentStake * (odds - 1);
            bankroll += currentStake * (odds - 1);

            step++;
            if (step >= multipliers.length) {
                // Completed cycle
                step = 0;
            }
        } else {
            profit -= currentStake;
            bankroll -= currentStake;
            // Reset on loss
            step = 0;
        }

        if (bankroll < lowestBankroll) lowestBankroll = bankroll;
    });

    return { profit, drawdown: lowestBankroll, totalWagered, maxBet };
}

analyzeAdvancedStrategies();
