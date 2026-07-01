const fs = require('fs');
const path = require('path');
const readline = require('readline');

// This path is based on the output file from kway_merger.js
const SORTED_FILE = path.join(__dirname, 'tc03_99percent_dupes_5GB_SORTED.csv');

/**
 * Validator for Test Case TC-03.
 *
 * This script checks for two critical conditions:
 * 1.  **Chronological Order**: Verifies that the entire file is sorted correctly by timestamp.
 * 2.  **Sort Stability**: For entries with identical timestamps, it verifies that their original
 *     relative order has been preserved.
 *
 * This stability check relies on a special test file where an extra column containing the
 * original line number was added to each row before sorting.
 */
async function validate() {
    console.log('--- TC-03 VALIDATION (Chronological Order & Stability) ---');

    if (!fs.existsSync(SORTED_FILE)) {
        console.error(`❌ FAILURE: The sorted file was not found.`);
        console.error(`   File not found at: ${SORTED_FILE}`);
        process.exit(1);
    }

    const rl = readline.createInterface({
        input: fs.createReadStream(SORTED_FILE),
        crlfDelay: Infinity
    });

    let isFirstLine = true;
    let lineCounter = 1;
    let previousTimestamp = -Infinity;
    let lastOriginalLineNumberForTimestamp = -1; // Used to track stability for a given timestamp

    let isChronologicallySorted = true;
    let isStable = true;

    for await (const line of rl) {
        lineCounter++;

        if (isFirstLine) {
            isFirstLine = false;
            continue; // Skip header row
        }

        if (!line) continue; // Skip any empty lines

        const columns = line.split(',');
        const timestampStr = columns[0];
        // Assumption: The original line number is the last column in the CSV.
        const originalLineNumber = parseInt(columns[columns.length - 1], 10);

        if (isNaN(originalLineNumber)) {
            console.error(`❌ FAILURE at line ${lineCounter}: Could not parse the original line number.`);
            console.error(`   Please ensure it exists as the last column in each row of the sorted file.`);
            isStable = false;
            break;
        }

        const currentTimestamp = new Date(timestampStr).getTime();

        // 1. Check for correct chronological order
        if (currentTimestamp < previousTimestamp) {
            isChronologicallySorted = false;
            console.error(`❌ FAILURE: Chronological order is broken at line ${lineCounter}.`);
            console.error(`   > Previous Timestamp: ${new Date(previousTimestamp).toISOString()}`);
            console.error(`   > Current Timestamp:  ${new Date(currentTimestamp).toISOString()}`);
            break;
        }

        // 2. Check for sort stability
        if (currentTimestamp === previousTimestamp) {
            // If timestamps are identical, the original line number must be greater than the last one we saw.
            if (originalLineNumber < lastOriginalLineNumberForTimestamp) {
                isStable = false;
                console.error(`❌ FAILURE: Sort is not stable. The relative order of duplicate timestamps is broken at line ${lineCounter}.`);
                console.error(`   > Timestamp: ${new Date(currentTimestamp).toISOString()}`);
                console.error(`   > Previous Original Line #: ${lastOriginalLineNumberForTimestamp}`);
                console.error(`   > Current Original Line #:  ${originalLineNumber}`);
                break;
            }
        }

        // Update state for the next line
        previousTimestamp = currentTimestamp;
        lastOriginalLineNumberForTimestamp = (currentTimestamp === previousTimestamp) ? originalLineNumber : -1;
    }

    console.log('\n--- VALIDATION SUMMARY ---');
    if (isChronologicallySorted) {
        console.log('✅ Pass: File is chronologically sorted.');
    } else {
        console.log('❌ Fail: File is NOT chronologically sorted.');
    }

    if (isStable) {
        console.log('✅ Pass: Sort is stable (relative order of duplicates was preserved).');
    } else {
        console.log('❌ Fail: Sort is NOT stable.');
    }

    if (isChronologicallySorted && isStable) {
        console.log('\n🎉 TC-03 Validation Successful! 🎉');
    } else {
        console.log('\n😞 TC-03 Validation Failed. See error messages above. 😞');
    }
}

validate().catch(console.error);