
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

const updates = [
    { id: 'HrBwpNmGRAhUpPPm0dCK', score: '6-4 2-6 7-6', status: 'win' }, // Fils vs Medvedev (Over 20.5 Games) => 31 games. Win.
    { id: 'I8hCMkiPCfzOb2bmFU3S', score: '0-0', status: 'loss' },        // Man Utd vs Man City (Over 2.5) => 0. Loss.
    { id: 'IzZIYj8ve2kcVTyXBYld', score: '2-2', status: 'win' },         // Brighton vs Leicester (Over 2.5) => 4. Win.
    // Southampton vs Brighton (id JGsCh4y8IVKKmUytbnEE) Skipped (Future/No Result)
    { id: 'JikEHHsrpbOQHpgYwtZK', score: '4-0', status: 'win' },         // Leicester vs Brentford (Over 3) => 4. Win. NOTE: Search said Brentford beat Leicester 4-0.
    { id: 'JtTU1w6HTb7WYRBJvTIZ', score: '2-0', status: 'win' },         // Moutet vs Griekspoor (-2.5) => Griekspoor won 7-5 7-6 (14-11 games). 14-2.5=11.5 > 11. Win.
    { id: 'Kl6r56ccnEzvruYMlAjg', score: '0-2', status: 'loss' },        // Inter vs Fluminense (Inter Win) => Fluminense won. Loss.
    { id: 'KuhQ3pMPEWhnyUXKh8HD', score: '2-0', status: 'win' },         // Tauson vs Kalinskaya (Tauson Win) => Win.
    { id: 'Kw7dxBk2BwDVZOrsNcYP', score: '3-0', status: 'win' },         // Misolic vs Djokovic (Under 30.5) => 27 games. Win.
    { id: 'KwYN9xAqTKtezGBmySc8', score: '2-1', status: 'win' },         // Brighton vs Bournemouth (Over 2.5) => 3. Win.
    { id: 'LS6vEl9X11M77myqhAId', score: '2-1', status: 'win' },         // Juventus vs PSV (BTTS Yes) => 2-1. Win.
    { id: 'LTwOxSSOPa2RQZ6d3NBy', score: '0-2', status: 'win' },         // Everton vs Man City (City Win) => 0-2. Win.
    { id: 'LujTnri0SlEO1gfIjebr', score: '1-0', status: 'loss' },        // Man City vs Wolves (BTTS Yes) => 1-0. Loss.
    { id: 'N8h1nIjxFxTE555eyHd8', score: '3-1', status: 'win' },         // Barcelona vs Benfica (Over 3.5) => 4. Win.
    { id: 'NQhEjwo4lfem5u7LMMIX', score: '1-0', status: 'win' },         // Tottenham vs Man Utd (Under 3.5) => 1. Win.
    { id: 'NtmJxfwICUwSoTAYxnme', score: '1-2', status: 'loss' },        // Alexandrova vs Kudermetova (Alexandrova Win) => Loss.
    // R.Union vs Ajax (id O1c3cISgHURq52bPPc2l) Skipped (Future)
    // Espanyol vs Atletico (id OTtOpJjySyABWkJv59OY) Skipped (Future)
    { id: 'P2zCMDLkilmAitGovcS9', score: '3-2', status: 'loss' }         // De Jong vs Eubanks (Eubanks Win) => De Jong won. Loss.
];

async function updateBatch() {
    const batch = db.batch();

    updates.forEach(u => {
        const ref = db.collection('bets').doc(u.id);
        batch.update(ref, {
            score: u.score,
            status: u.status
        });
    });

    await batch.commit();
    console.log(`Updated ${updates.length} bets.`);
    process.exit(0);
}

updateBatch();
