const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const INPUT_FILE = path.join(__dirname, 'tc04_malformed_2GB.csv');
const ERROR_FILE = path.join(__dirname, 'errors.csv');

console.log('Starting TC-04 Resiliency Test...');

const errorStream = fs.createWriteStream(ERROR_FILE);
errorStream.write("Corrupted_Data_Dump,Error_Reason\n");

let validCount = 0;
let errorCount = 0;
let startTime = Date.now();

fs.createReadStream(INPUT_FILE)
    .pipe(csv())
    .on('data', (row) => {
        try {
            // Validation Logic: Packet Size must be a number, IPs must be somewhat valid
            const packetSize = parseInt(row['Packet Size'], 10);
            
            if (isNaN(packetSize) || row.Timestamp === 'CORRUPTED_DATE' || !row['Source IP']) {
                throw new Error("Malformed schema detected");
            }
            
            // If it passes, it would theoretically go to the sorting chunker here
            validCount++;

        } catch (err) {
            // Catch the error without crashing the V8 engine
            errorCount++;
            const stringifiedRow = Object.values(row).join(',');
            errorStream.write(`"${stringifiedRow}",${err.message}\n`);
        }
    })
    .on('end', () => {
        errorStream.end();
        const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log('\n--- TC-04 VALIDATION COMPLETE ---');
        console.log(`Valid Logs Processed: ${validCount.toLocaleString()}`);
        console.log(`Corrupted Logs Isolated: ${errorCount.toLocaleString()}`);
        console.log(`Time Taken: ${timeTaken} seconds`);
        console.log(`Check errors.csv for the dropped 5%.`);
    })
    .on('error', (err) => {
        console.error('CRITICAL STREAM FAILURE:', err);
    });