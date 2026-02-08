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
        // In v5, createWorker is async and returns a worker ready to use
        worker = await Tesseract.createWorker("eng");
        // Use PSM 6 (Assume a single uniform block of text) to help with tabular data
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
        // properly await the write operation
        await image.greyscale().invert().write(outputPath);
    } catch (e) {
        console.error("❌ Image Processing Failed:", e);
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

        const betData = parseOCRText(textPass1, message.date);

        // If we found everything (Odds + Stake), we are good.
        if (betData && betData.odds > 0 && betData.stake > 1) {
            console.log(`✅ OCR Success (Pass 1): Odds ${betData.odds}, Stake ${betData.stake}`);
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            return betData;
        }

        // --- PASS 2: Inverted OCR (Targeting Header: Odds) ---
        // Only run if Odds are missing
        if (!betData.odds || betData.odds === 0) {
            console.log("⚠️ Odds missing in Pass 1. Attempting Image Inversion for Header...");

            // Generate Inverted Image
            await processImageForHeader(tempPath, tempInvertedPath);

            // Wait for file write (Jimp write is async but we awaited promise? Jimp docs say write is async but returns promise in some versions, callback in others. 
            // Better to use writeAsync if available or await the write. 
            // In v0.16+ it returns a promise.
            // Let's assume standard behavior or add a small delay if needed or use buffer directly.
            // Actually, newer Jimp versions: await image.writeAsync(path)

            // Re-run OCR on inverted image
            console.log("🔍 Running OCR Pass 2 (Inverted)...");
            const { data: { text: textPass2 } } = await worker.recognize(tempInvertedPath);
            // console.log(`📝 Text Pass 2:`, textPass2);

            const betDataPass2 = parseOCRText(textPass2, message.date);

            if (betDataPass2 && betDataPass2.odds > 0) {
                console.log(`💡 Found Odds in Pass 2: ${betDataPass2.odds}`);
                betData.odds = betDataPass2.odds; // Merge Odds into main result
            }
        }

        // Cleanup
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        if (fs.existsSync(tempInvertedPath)) fs.unlinkSync(tempInvertedPath);

        // Return combined result
        if (betData.odds > 0 || betData.stake > 1) {
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

        const explicitMatch = line.match(/(?:@|Odds|Cot|Quota|Single):?\s*(\d+\.\d{2})/i); // Added "Single" for the blue bubble
        if (explicitMatch) {
            odds = parseFloat(explicitMatch[1]);
            break;
        }

        const standaloneMatch = line.match(/\b(\d+\.\d{2})\b/);
        if (standaloneMatch) {
            const val = parseFloat(standaloneMatch[1]);
            if (val > 1.0 && val < 50.0) {
                odds = val;
            }
        }
    }

    if (odds === 0) {
        const globalMatch = cleanText.match(/(?:Single|@)?\s*(\d+\.\d{2})/); // Relaxed regex
        if (globalMatch) {
            const val = parseFloat(globalMatch[1]);
            if (val < 50.0 && !cleanText.includes(`€ ${val}`) && !cleanText.includes(`$ ${val}`)) {
                odds = val;
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
