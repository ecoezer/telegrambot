
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
    { id: 'gZLWCMOlDdsDtt9PDBbu', score: '2-0', status: 'loss' },      // Bublik vs Medvedev (Medvedev Win) => Bublik won 2-0. Loss.
    // Chelsea vs Hotspur (ggWOp2djqwCYgVeeEIYi) Skipped (Future)
    { id: 'gnToiDGx2ezet6CluAFL', score: '0-2', status: 'win' },       // Parry vs Kartal (Kartal Win) => Kartal won 2-0. Win.
    // Mainz vs Bayer (gpZLfAKhBRdL5rF99jlU) Skipped (Future)
    { id: 'hEvk8JAzm6cpzk2F9pPA', score: '4-2', status: 'win' },       // Wolves vs Tottenham (BTTS YES) => 4-2. Win.
    { id: 'hLqAxa9on285e5wreufL', score: '3-0', status: 'loss' },      // Sinner vs Bublik (Over 28.5) => 25 games. Loss.
    { id: 'i0Zyftl2gG5URBvsUSIF', score: '1-3', status: 'loss' },      // PSG vs Nice (Under 3.5) => 4 goals. Loss.
    { id: 'iLDy5v9OZbPW7pCt26pI', score: '88-79', status: 'loss' },    // ASVEL vs Zalgiris (Zalgiris Win) => ASVEL won. Loss.
    { id: 'idbw7lzYZsUWxaHy4wOf', score: '1-0', status: 'loss' },      // Zurich vs Kloten (Zurich -1.5) => Won by 1. Loss.
    { id: 'ixMSrudhyRiRdhMZT3Gh', score: '1-2', status: 'loss' },      // Palace vs Everton (BTTS NO) => Both scored. Loss.
    { id: 'jez1AkWpOzGXIfJR8SXw', score: '0-1', status: 'loss' },      // West Ham vs Newcastle (Over 2.5) => 1 goal. Loss.
    { id: 'jrnKsk4uHKG3u4w5YzGU', score: '2-3', status: 'loss' },      // Sinner vs Alcaraz (Sinner Win) => Alcaraz won. Loss.
    { id: 'k0Ow9CIfk0aG60NTPtjR', score: '3-3', status: 'win' },       // Brondby vs Silkeborg (BTTS YES) => 3-3. Win.
    { id: 'kbeLqMXWhv9hzNb2WLma', score: '2-2', status: 'win' },       // Man United vs Lyon (BTTS YES) => 2-2 Regular Time. Win.
    { id: 'kfXFQlbyeKc8CxlTnw5z', score: '1-0', status: 'loss' },      // Liverpool vs Everton (Liverpool Over 1.5) => 1 goal. Loss.
    { id: 'kqlJ9j5W5V2K0geaktf7', score: '1-2', status: 'loss' },      // Liu vs Fruhvirtova (Liu Win) => Fruhvirtova won. Loss.
    { id: 'l9QTMKuslb0PbfizSavb', score: '3-1', status: 'win' },       // Maroszan vs Alcaraz (Over 29.5) => 32 games. Win.
    { id: 'lNAecpU4728NifMo2RTT', score: '2-4', status: 'win' },       // Atletico vs Barcelona (Over 2.5) => 6 goals. Win.
    { id: 'lZra2G7LHmlktOadxm4L', score: '0-2', status: 'loss' },      // Anisimova vs Maria (Anisimova -3.5) => Maria won. Loss.
    { id: 'lhv7ONOGzOmAeTCfgRK1', score: '2-1', status: 'loss' },      // Norrie vs Djokovic (Djokovic -4.5) => Diff 4 games. Loss.
    // Arnaldi vs Struff (m2OXLwmt2xfKZpSgVYsl) Skipped (Future)
    { id: 'mhqYTkuJynz33sjORkN3', score: '76-74', status: 'win' },     // Olympiacos vs Panathinaikos (Panathinaikos +7.5) => Lost by 2. Win.
    { id: 'oO273AkqerEE26glkdb6', score: '3-2', status: 'win' },       // Ilves vs Tappara (Ilves Win) => 3-2. Win.
    { id: 'oUSNGW8vYzdawNNs3VnU', score: '0-1', status: 'win' },       // Getafe vs Real Madrid (Real Madrid Win) => 0-1. Win.
    // Paris vs Fenerbahce (ouMwHQzHZwDF5pXy9iKB) Skipped (Future)
    { id: 'ovHNcVUCWpegNJTexx3I', score: '0-3', status: 'win' },       // Legia vs Chelsea (Over 2.5) => 3 goals. Win.
    { id: 'oy3NBdW140LRrQiJhtvg', score: '1-3', status: 'win' },       // Italy vs Spain (BTTS YES) => 1-3. Win.
    { id: 'qG2EGtD3vhUN6TkNBWR9', score: '2-0', status: 'win' },       // Mpetshi vs Zhang (Mpetshi Win) => 2-0. Win.
    { id: 'qWsKtHnthjT8d5IMGdln', score: '2-2', status: 'win' },       // Arsenal vs PSV (PSV Over 0.5) => PSV scored 2. Win.
    { id: 'qYu5v6RGswROiIYMg9C7', score: '0-2', status: 'loss' },      // Tien vs Moutet (Tien Win) => Moutet won. Loss.
    { id: 'rmpaifqgeT1W9uYl9L5z', score: '2-1', status: 'loss' },      // Tiafoe vs Kecmanovic (Kecmanovic -2.5) => Tiafoe won. Loss.
    { id: 's1OytRon74b3OchQVZJP', score: '5-2', status: 'win' },       // Sweden vs Czech Republic (Sweden Win) => 5-2. Win.
    { id: 'sFu1dxrD9t4eIMokpvtw', score: '2-3', status: 'loss' },      // Shevchenko vs Quinn (Shevchenko Win) => Quinn won. Loss.
    { id: 'twp9db849L3YfOqLMVGS', score: '4-3', status: 'win' },       // Newcastle vs Nottingham (Newcastle Win) => 4-3. Win.
    { id: 'uFARdbWPhWc9oFoZF69I', score: '1-0', status: 'win' },       // Montenegro vs Faroe (Under 2.5) => 1 goal. Win.
    { id: 'uKZdcWWiU633Dd3Uf1Cu', score: '2-0', status: 'loss' },      // Zheng vs Raducanu (Raducanu Win) => Zheng won. Loss.
    { id: 'uzRwbnMErndkA80HSuPd', score: '4-0', status: 'win' },       // PSG vs Real Madrid (Over 2.5) => 4 goals. Win.
    { id: 'v3rFP4mqHY2TX86BmguC', score: '1-2', status: 'win' },       // Khachanov vs Paul (Paul Win) => Paul won. Win.
    { id: 'v4jjjZAjlsiO5fEu6d6o', score: '0-2', status: 'loss' },      // Altmaier vs Medvedev (Over 21.5) => 18 games. Loss.
    { id: 'vqR0K3FtS4qvVOqkCyZI', score: '0-3', status: 'win' },       // Leicester vs Newcastle (Over 2.5) => 3 goals. Win.
    { id: 'w9GCEnFEb3Icbetrj5ih', score: '0-2', status: 'loss' },      // Baena vs Lajovic (Baena -2.5) => Lajovic won. Loss.
    { id: 'x9rih48YrBEDRRddWPsM', score: '3-1', status: 'win' },       // Tottenham vs Bodo (Over 3) => 4 goals. Win.
    { id: 'xZXoUnV2830JfAUiNjRr', score: '1-3', status: 'win' },       // Estonia vs Israel (BTTS YES) => 1-3. Win.
    { id: 'xaxX00PBNaqmaPUtdxLY', score: '0-2', status: 'loss' },      // Mpetshi vs Auger (Mpetshi +3.5) => Lost by 6. Loss.
    { id: 'yIJRP1WRpws9lPmazT8t', score: '3-1', status: 'win' },       // River Plate vs Urawa (River Plate Over 1.5) => 3 goals. Win.
    { id: 'yhCWJwzKyPlESXjDFLVm', score: '0-2', status: 'loss' },      // Alexandrova vs Bencic (Alexandrova -3.5) => Bencic won. Loss.
    { id: 'yt4zeYsibjM1e03TVA7W', score: '85-84', status: 'loss' },    // Monaco vs Barcelona (Monaco -3.5) => Won by 1. Loss.
    { id: 'yuCgQmDqph77YV4qzDxp', score: '0-0', status: 'win' },       // Tsitsipas vs Fils (Fils Win) => Fils won (Retirement). Win.
    { id: 'zKOkTZ37GTI2rjauFBhw', score: '2-0', status: 'win' },       // Palmeiras vs Al Ahly (BTTS NO) => 2-0. Win.
    { id: 'zv5qd2mPEIJLE34DmN0K', score: '0-0', status: 'loss' }       // Sundowns vs Fluminese (BTTS YES) => 0-0. Loss.
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
