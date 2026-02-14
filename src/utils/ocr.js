import fs from "fs";
import path from "path";
import Tesseract from "tesseract.js";
import { fileURLToPath } from 'url';
import { Jimp } from "jimp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let worker = null;

export const initOCR = async () => {
    if (!worker) {
        console.log("⚙️  Initializing generic Tesseract worker...");
        worker = await Tesseract.createWorker("eng");
        await worker.setParameters({
            tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
        });
        console.log("✅ OCR Worker Ready (PSM: 6).");
    }
    return worker;
};

export const terminateOCR = async () => {
    if (worker) {
        await worker.terminate();
        worker = null;
        console.log("🛑 OCR Worker Terminated.");
    }
};

// New Helper: Process image to invert colors (White on Blue -> Black on White-ish)
const processImageForHeader = async (inputPath, outputPath) => {
    try {
        const image = await Jimp.read(inputPath);
        // Increase contrast to max (1) to make text pop against background, then invert
        await image.greyscale().contrast(1).invert().write(outputPath);
    } catch (e) {
        console.error("❌ Image Processing Failed:", e);
    }
};

// New Helper: Crop Header Strip (Top 25%) for "Single - Odds"
const processImageForHeaderCrop = async (inputPath, outputPath) => {
    try {
        const image = await Jimp.read(inputPath);
        const w = image.bitmap.width;
        const h = image.bitmap.height;

        // Target Full Width Header (Top 25% - increased from 20%)
        // FIXED: Using object syntax for crop (Jimp v1.0+)
        await image.crop({ x: 0, y: 0, w: w, h: Math.floor(h * 0.25) })
            .scale(2) // Scale up 2x
            .invert() // White text on blue -> Black on White
            .contrast(1) // High contrast
            .write(outputPath);
    } catch (e) {
        console.error("❌ Header Crop Processing Failed:", e);
    }
};

export const performOCR = async (client, message) => {
    if (!message.media) return null;

    // Ensure worker is ready
    if (!worker) await initOCR();

    const tempPath = path.join(__dirname, `../../temp_bet_${message.id}.jpg`);
    const tempInvertedPath = path.join(__dirname, `../../temp_bet_inverted_${message.id}.jpg`);

    try {
        console.log("📸 Downloading media for OCR...", tempPath);
        const buffer = await client.downloadMedia(message.media);
        if (!buffer) {
            console.log("❌ Failed to download media.");
            return null;
        }

        fs.writeFileSync(tempPath, buffer);

        // --- PASS 1: Standard OCR (Best for Body Text: Stake, Teams) ---
        console.log("🔍 Running OCR Pass 1 (Standard)...");
        const { data: { text: textPass1 } } = await worker.recognize(tempPath);
        // console.log(`📝 Text Pass 1:`, textPass1);

        let betData = parseOCRText(textPass1, message.date);

        // If we found everything (Odds + Stake), we are good.
        if (betData && betData.odds > 0 && betData.stake > 1) {
            console.log(`✅ OCR Success (Pass 1): Odds ${betData.odds}, Stake ${betData.stake}`);
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            return betData;
        }

        // --- PASS 2: Inverted OCR (Targeting Header: Odds) ---
        // Only run if Odds are missing or betData is null
        if (!betData || !betData.odds || betData.odds === 0) {
            console.log("⚠️ Odds missing in Pass 1. Attempting Image Inversion for Header...");

            // Generate Inverted Image
            await processImageForHeader(tempPath, tempInvertedPath);

            // Re-run OCR on inverted image
            console.log("🔍 Running OCR Pass 2 (Inverted + High Contrast)...");
            const { data: { text: textPass2 } } = await worker.recognize(tempInvertedPath);
            console.log(`📝 Text Pass 2:`, textPass2.substring(0, 100).replace(/\n/g, ' '));

            const betDataPass2 = parseOCRText(textPass2, message.date);

            if (betDataPass2 && betDataPass2.odds > 0) {
                console.log(`💡 Found Odds in Pass 2: ${betDataPass2.odds}`);
                if (!betData) betData = {}; // Init if null
                betData.odds = betDataPass2.odds; // Merge Odds into main result
                // If Pass 1 was null, we might need other fields from Pass 2
                if (!betData.match) Object.assign(betData, betDataPass2);
            }
        }

        // --- PASS 3: Header Crop (Top 25%) ---
        // Only run if Odds are STILL missing
        if (!betData || !betData.odds || betData.odds === 0) {
            console.log("⚠️ Odds still missing. Attempting Header Crop (Top 25%)...");
            const tempHeaderCropPath = path.join(__dirname, `../../temp_bet_headercrop_${message.id}.jpg`);

            await processImageForHeaderCrop(tempPath, tempHeaderCropPath);

            console.log("🔍 Running OCR Pass 3 (Header Crop)...");
            const { data: { text: textPass3 } } = await worker.recognize(tempHeaderCropPath);
            console.log(`📝 Text Pass 3:`, textPass3.substring(0, 100).replace(/\n/g, ' '));

            const betDataPass3 = parseOCRText(textPass3, message.date);

            if (betDataPass3 && betDataPass3.odds > 0) {
                console.log(`💡 Found Odds in Pass 3: ${betDataPass3.odds}`);
                if (!betData) betData = {};
                betData.odds = betDataPass3.odds;
                if (!betData.match) Object.assign(betData, betDataPass3);
            }
            if (fs.existsSync(tempHeaderCropPath)) fs.unlinkSync(tempHeaderCropPath);
        }

        // Cleanup
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        if (fs.existsSync(tempInvertedPath)) fs.unlinkSync(tempInvertedPath);

        // Return combined result
        if (betData && (betData.odds > 0 || betData.stake > 1)) {
            console.log(`✅ Final OCR Result: Odds ${betData.odds}, Stake ${betData.stake}`);
            return betData;
        }

        console.log("⚠️ OCR failed to find valid Odds or Stake.");
        return null;

    } catch (ocrError) {
        console.error("❌ OCR Error:", ocrError);
        // Cleanup on error
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        if (fs.existsSync(tempInvertedPath)) fs.unlinkSync(tempInvertedPath);
        return null;
    }
};

// Helper to parse specific bet slip formats
const parseOCRText = (text, messageDate) => {
    // Clean up text
    const cleanText = text.replace(/\n/g, " ").replace(/\s+/g, " ");

    // 1. Stake Extraction
    const stakeRegex = /(?:Bet amount|Stake)(?:[^€$£\d]{0,40})?(?:€|\$|£)\s*([\d,]+\.?\d*)/i;
    const stakeMatch = cleanText.match(stakeRegex);
    let stake = 1;

    if (stakeMatch) {
        stake = parseFloat(stakeMatch[1].replace(/,/g, ""));
    } else {
        const simpleStakeRegex = /(?:Stake|Unit|Units|💎):?\s*(\d+(?:\.\d+)?)(?:\/10|u)?/i;
        const simpleMatch = cleanText.match(simpleStakeRegex);
        if (simpleMatch) {
            stake = parseFloat(simpleMatch[1]);
        }
    }

    // 2. Odds Extraction
    const lines = cleanText.split('\n');
    let odds = 0;

    for (const line of lines) {
        if (/Cash out|Possible win|Return|Total/i.test(line)) continue;

        const explicitMatch = line.match(/(?:@|Odds|Cot|Quota|Single)[\s—:-]*(\d+[\.,]?\d*)/i);
        if (explicitMatch) {
            let val = parseFloat(explicitMatch[1].replace(',', '.'));
            // Heuristic: If missing decimal point, e.g. 188 -> 1.88
            if (val > 100 && val < 5000) {
                val = val / 100;
            }
            // Heuristic: If single decimal place e.g. 1.6
            if (val > 1.0 && val < 50.0) {
                odds = val;
                break;
            }
        }

        const standaloneMatch = line.match(/\b(\d+[\.,]\d{1,2})\b/); // Allow 1 or 2 decimals
        if (standaloneMatch) {
            const val = parseFloat(standaloneMatch[1].replace(',', '.'));
            if (val > 1.0 && val < 50.0) {
                odds = val;
            }
        }
    }

    if (odds === 0) {
        const globalMatch = cleanText.match(/(?:@|Single)[\s—:-]*(\d+\.\d{2})/);
        if (globalMatch) {
            const val = parseFloat(globalMatch[1]);
            if (val < 50.0 && !cleanText.includes(`€ ${val}`) && !cleanText.includes(`$ ${val}`)) {
                odds = val;
            }
        }
    }

    // Heuristic: Calculate Odds from Possible Win / Stake
    if (odds === 0) {
        const winRegex = /(?:Possible win|Return|To Win)[\s:€$£]*([\d,]+\.?\d*)/i;
        const winMatch = cleanText.match(winRegex);

        if (winMatch) {
            const possibleWin = parseFloat(winMatch[1].replace(/,/g, ""));
            let calcStake = stake;

            if (calcStake > 1 && possibleWin > calcStake) {
                const calculatedOdds = possibleWin / calcStake;
                // Round to 2 decimal places
                const roundedOdds = Math.round(calculatedOdds * 100) / 100;
                if (roundedOdds > 1.01 && roundedOdds < 50.0) {
                    console.log(`💡 Calculated Odds from Win/Stake: ${possibleWin} / ${calcStake} = ${roundedOdds}`);
                    odds = roundedOdds;
                }
            }
        }
    }

    // Heuristic: Stake from Cash Out
    if (stake === 1) {
        const notStarted = /Not started|Pending/i.test(cleanText);
        const cashOutMatch = cleanText.match(/Cash out.*(?:€|\$|£|:\s*)\s*([\d,]+\.?\d*)/i);

        if (cashOutMatch && notStarted) {
            const cashOutValue = parseFloat(cashOutMatch[1].replace(/,/g, ""));
            if (cashOutValue > 10) {
                stake = cashOutValue;
                console.log(`💡 Inferred Stake from Cash Out: ${stake}`);
            }
        }
    }

    // 3. Match/Selection Extraction
    const winnerRegex = /Winner.*,\s*([A-Za-z0-9 ]+)/i;
    const winnerMatch = cleanText.match(winnerRegex);

    const idRegex = /ID\s*(\d+)/i;
    const idMatch = cleanText.match(idRegex);
    const uniqueId = idMatch ? idMatch[1] : null;

    let match = "Unknown Match";
    let selection = "Unknown Selection";

    if (winnerMatch) {
        selection = winnerMatch[1].trim();
        match = `${selection} Match`;
    } else if (uniqueId) {
        match = `Bet Slip #${uniqueId}`;
    }

    if (odds === 0 && stake === 1) return null;

    // Date Handling
    const dateRegex = /(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})/i;
    const dateMatch = cleanText.match(dateRegex);
    let dateObj;

    if (dateMatch) {
        const timeStr = dateMatch[1];
        const dateStr = dateMatch[2];
        try {
            const [day, month, year] = dateStr.split('/');
            const combinedString = `${year}-${month}-${day} ${timeStr}`;
            dateObj = new Date(combinedString);

            if (isNaN(dateObj.getTime())) {
                console.log("⚠️ OCR Date Parse Failed (Invalid), falling back to message date.");
                dateObj = messageDate ? new Date(messageDate * 1000) : new Date();
            } else {
                console.log(`📅 Extracted Match Date: ${dateObj.toISOString()}`);
            }
        } catch (e) {
            console.log("⚠️ OCR Date Parse Error:", e);
            dateObj = messageDate ? new Date(messageDate * 1000) : new Date();
        }
    } else {
        dateObj = messageDate ? new Date(messageDate * 1000) : new Date();
    }

    return {
        match: match,
        selection: selection,
        odds: odds,
        stake: stake,
        sport: "Specials",
        status: 'pending',
        timestamp: dateObj.toISOString(),
        formattedDate: new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(dateObj),
        source: 'OCR'
    };
};
