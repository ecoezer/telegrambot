
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

async function analyzeStrategies() {
    console.log("Fetching all bets...");
    const snapshot = await db.collection('bets').get();
    const bets = [];
    snapshot.forEach(doc => {
        bets.push({ id: doc.id, ...doc.data() });
    });

    // Sort by date
    bets.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Filter valid bets
    const validBets = bets.filter(b =>
        (b.status === 'win' || b.status === 'won' || b.status === 'loss' || b.status === 'lost') &&
        parseFloat(b.odds) > 1
    );

    console.log(`Analyzing ${validBets.length} valid bets...`);

    const TARGET_PROFIT = 50;

    const strategies = [
        { name: 'Flat Betting (50€)', run: (b) => runFlat(b, 50) },
        { name: 'Martingale (Target 50€, Limit 2)', run: (b) => runMartingale(b, TARGET_PROFIT, 2) },
        { name: 'Martingale (Target 50€, Limit 3)', run: (b) => runMartingale(b, TARGET_PROFIT, 3) },
        { name: 'Martingale (Target 50€, Limit 4)', run: (b) => runMartingale(b, TARGET_PROFIT, 4) },
        { name: 'Martingale (Target 50€, Limit 5)', run: (b) => runMartingale(b, TARGET_PROFIT, 5) },
        { name: 'Martingale (Target 50€, Unlimited)', run: (b) => runMartingale(b, TARGET_PROFIT, Infinity) },
        { name: 'Cyclic Martingale (3-4-2)', run: (b) => runCyclic(b, TARGET_PROFIT) },
        // Deep Scan Filters
        { name: 'Martingale (Unlimited) [Odds 1.5-2.0]', run: (b) => runMartingale(b.filter(x => x.odds >= 1.5 && x.odds <= 2.0), TARGET_PROFIT, Infinity) },
        { name: 'Martingale (Unlimited) [Odds > 2.0]', run: (b) => runMartingale(b.filter(x => x.odds > 2.0), TARGET_PROFIT, Infinity) },
        { name: 'Martingale (Limit 3) [Odds 1.5-2.0]', run: (b) => runMartingale(b.filter(x => x.odds >= 1.5 && x.odds <= 2.0), TARGET_PROFIT, 3) }
    ];

    const results = strategies.map(s => {
        const stats = s.run(validBets);
        return {
            Strategy: s.name,
            'Net Profit': `${stats.profit.toFixed(2)}€`,
            'Max Drawdown': `${stats.drawdown.toFixed(2)}€`,
            'ROI': `${((stats.profit / stats.totalWagered) * 100).toFixed(2)}%`,
            'Busts': stats.busts
        };
    });

    console.table(results);
    process.exit(0);
}

function runFlat(bets, stake) {
    let profit = 0;
    let bankroll = 0;
    let lowestBankroll = 0;
    let totalWagered = 0;

    bets.forEach(b => {
        const odds = parseFloat(b.odds);
        const isWin = (b.status === 'win' || b.status === 'won');
        totalWagered += stake;

        if (isWin) {
            profit += stake * (odds - 1);
            bankroll += stake * (odds - 1);
        } else {
            profit -= stake;
            bankroll -= stake;
        }
        if (bankroll < lowestBankroll) lowestBankroll = bankroll;
    });

    return { profit, drawdown: lowestBankroll, totalWagered, busts: 0 };
}

function runMartingale(bets, target, limit) {
    let profit = 0;
    let bankroll = 0;
    let accumulatedLoss = 0;
    let lowestBankroll = 0;
    let lossStreak = 0;
    let totalWagered = 0;
    let busts = 0;

    bets.forEach(b => {
        const odds = parseFloat(b.odds);
        const isWin = (b.status === 'win' || b.status === 'won');

        // Calculate stake required to win target + recover losses
        let stake = (accumulatedLoss + target) / (odds - 1);
        stake = Math.round(stake * 100) / 100;

        totalWagered += stake;

        if (isWin) {
            const winAmount = stake * (odds - 1);
            profit += winAmount;
            bankroll += winAmount;

            // Reset
            accumulatedLoss = 0;
            lossStreak = 0;
        } else {
            profit -= stake;
            bankroll -= stake;
            accumulatedLoss += stake;
            lossStreak++;

            // Check Limit
            if (lossStreak >= limit) {
                // Bust
                busts++;
                accumulatedLoss = 0; // Accept loss
                lossStreak = 0;
            }
        }
        if (bankroll < lowestBankroll) lowestBankroll = bankroll;
    });

    return { profit, drawdown: lowestBankroll, totalWagered, busts };
}

function runCyclic(bets, target) {
    let profit = 0;
    let bankroll = 0;
    let accumulatedLoss = 0;
    let lowestBankroll = 0;
    let lossStreak = 0;
    let totalWagered = 0;
    let busts = 0;

    const limits = [3, 4, 2];
    let limitIndex = 0;

    bets.forEach(b => {
        const odds = parseFloat(b.odds);
        const isWin = (b.status === 'win' || b.status === 'won');

        let stake = (accumulatedLoss + target) / (odds - 1);
        stake = Math.round(stake * 100) / 100;
        totalWagered += stake;

        if (isWin) {
            const winAmount = stake * (odds - 1);
            profit += winAmount;
            bankroll += winAmount;

            accumulatedLoss = 0;
            lossStreak = 0;
            limitIndex = 0; // Reset cycle on win? Or keep? Usually reset.
        } else {
            profit -= stake;
            bankroll -= stake;
            accumulatedLoss += stake;
            lossStreak++;

            const currentLimit = limits[limitIndex];
            if (lossStreak >= currentLimit) {
                busts++;
                accumulatedLoss = 0; // Accept loss
                lossStreak = 0;
                limitIndex = (limitIndex + 1) % limits.length; // Next limit
            }
        }
        if (bankroll < lowestBankroll) lowestBankroll = bankroll;
    });

    return { profit, drawdown: lowestBankroll, totalWagered, busts };
}

analyzeStrategies();
