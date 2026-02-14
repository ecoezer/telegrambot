
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
    { id: 'PKNzhpP1tzdWr32mKdmm', score: '2-0', status: 'loss' },       // Leicester vs Ipswich (Over 2.5) => 2 goals. Loss.
    { id: 'PLc7lrDwVTur31BUgEg4', score: '1-2', status: 'loss' },       // Sabalenka (-3.5) vs Anisimova => Anisimova won. Loss.
    { id: 'PbRjIpjDONaeuX16FfKO', score: '0-2', status: 'loss' },       // Finland vs Netherlands (Over 2.5) => 2 goals. Loss.
    { id: 'QaPuOnVFGNyZdNEUfiVs', score: '2-0', status: 'win' },        // Croatia vs France (Under 2.5) => 2 goals. Win.
    { id: 'SY4dxlrIjKiZK0ADeawJ', score: '2-5', status: 'loss' },       // Norway vs Germany (Under 5.5) => 7 goals. Loss.
    { id: 'SdZXQQm9O0HH1jtqMl2u', score: '1-0', status: 'loss' },       // Valencia vs Sevilla (BTTS Yes) => 1-0. Loss.
    { id: 'Selt4wAiNACQfG41YKHH', score: '5-0', status: 'loss' },       // Sweden vs Slovakia (Slovakia Over 1.5) => 0 goals. Loss.
    { id: 'Su5806TbWBnVbO3ENEJC', score: '1-2', status: 'win' },        // Celtic vs Bayern (BTTS Yes) => 1-2. Win.
    { id: 'SuNIukBxYKcRs3zdpsMx', score: '1-1', status: 'win' },        // Milan vs Feyenoord (Under 3.5) => 2. Win.
    { id: 'TfebXAiqKZ65XdrZskzc', score: '0-2', status: 'win' },        // Iraq vs South Korea (Under 2.5) => 2. Win.
    { id: 'TrIe2IMjuWpqvIW4gWaA', score: '1-2', status: 'win' },        // Southampton vs Fulham (Over 2.5) => 3. Win.
    { id: 'TvrPFycDSBwguJL8xLNh', score: '2-0', status: 'loss' },       // Griekspoor vs Auger (Auger Win) => Griekspoor won. Loss.
    { id: 'UIew5ZH1srwIk2B4Aa7t', score: '2-1', status: 'loss' },       // Bublik vs Khachanov (Khachanov Win) => Bublik won. Loss.
    { id: 'VXMZR5AaRf0trlFZkn9k', score: '0-2', status: 'win' },        // Bu vs Darderi (-2.5) => Darderi 13 games, Bu 9. 13-2.5>9. Win.
    { id: 'VYsxr5EV8lwBVtWP1NDk', score: '1-4', status: 'win' },        // France vs Latvia (Latvia Win) => 1-4. Win.
    // Comesana vs Baez (Vv2gptS0fFB1og8ZmIOJ) Skipped (Future)
    // Bublik vs Draper (WH6tTeC7BDwEEyZWWiB2) Skipped (Future)
    { id: 'XWu3WhJssunwMEgKjQDE', score: '1-0', status: 'loss' },       // Benfica vs Bayern (Bayern Win) => Benfica won. Loss.
    { id: 'Xa1XrSNMTTAjQagx8Y0N', score: '0-3', status: 'loss' },       // Cerundolo vs Diallo (Over 33.5) => 31 games. Loss.
    // Cerundolo vs Gaston (YHwICIOHcMbeQJmo46Ir) Skipped (Future)
    { id: 'YXRtByrXj904gHBon9VU', score: '1-2', status: 'loss' },       // Hurkacz vs Djokovic (Djokovic Set -1.5) => won 2-1. Loss.
    { id: 'Z0BE67zfxuMX1Pe3Zbfe', score: '2-1', status: 'loss' },       // Hijikata vs Medjedovic (Medjedovic -2.5) => Hijikata won. Loss.
    { id: 'ZPFx0zs58kvDOWywxkwF', score: '1-1', status: 'win' },        // Sociedad vs Man Utd (BTTS Yes) => 1-1. Win.
    { id: 'Zi7DsN5sr9dOXMZenOgv', score: '2-2', status: 'loss' },       // Lithuania vs Finland (Finland Win) => Draw. Loss.
    { id: 'Zty42bHKvsc2dZ5cZAma', score: '2-1', status: 'loss' },       // Cerundolo vs Etcheverry (Etcheverry Win) => Cerundolo won. Loss.
    { id: 'aCfEYxZTiVXDv4AEdTHj', score: '0-2', status: 'win' },        // Lys vs Paolini (Paolini -3.5) => 6-2 6-1. 12-3. Win.
    { id: 'ac8isk71iwNf9kJ5PCti', score: '3-1', status: 'win' },        // Musetti vs Tiafoe (Over 36.5) => 38 games. Win.
    { id: 'bA2OYi0mqItXXkH6pn7D', score: '0-1', status: 'loss' },       // France vs Slovenia (France Win) => Slovenia won. Loss.
    { id: 'bqmz2U2knj7rOaj6NVL0', score: '6-2', status: 'win' },        // Sweden vs Denmark (Over 6) => 8 goals. Win.
    { id: 'dASPL8v2Qx9yQlaGASVL', score: '1-1', status: 'loss' },       // Toulouse vs Monaco (Over 2.5) => 2. Loss.
    { id: 'dNOBekE5I5Fb0WGSlJle', score: '0-1', status: 'loss' },       // Leicester vs Liverpool (Over 3.5) => 1. Loss.
    { id: 'eGi5lwsKYEfbuqYYNNTJ', score: '0-0', status: 'loss' },       // Lecce vs Bologna (Bologna Win) => Draw. Loss.
    // Man City vs Wydad (f6Nx6WCBnExu3v6HsI8d) Skipped (Corners unknown)
    // Betis vs Las Palmas (fb0Z4ZTFRAqRq2W7Udkr) Skipped (Future)
    { id: 'fccs1qjmZDCuQiubXFyy', score: '0-2', status: 'loss' },       // Fernandez vs Li (Fernandez Win) => Li won. Loss.
    { id: 'fnOp9PDcwES0H5uXoKo4', score: '1-2', status: 'win' }         // Tottenham vs Nottingham (Over 2.5) => 3. Win.
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
