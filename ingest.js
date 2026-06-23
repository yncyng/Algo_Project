const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const INPUT_FILE = path.join(__dirname, 'network_logs_5GB.csv');

let rowCount = 0;
let startTime = Date.now();

console.log(`Initializing Read Stream for ${INPUT_FILE}...`);

// Monitor memory every 1 second
const memoryMonitor = setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
    console.log(`[Memory Check] Heap Used: ${heapUsedMB} MB`);
}, 1000);

fs.createReadStream(INPUT_FILE)
    .pipe(csv()) 
    .on('data', (row) => {
        rowCount++;
        
        // Print the first 10 rows to verify our parser works
        if (rowCount <= 10) {
            console.log(`Row ${rowCount}:`, row);
        }
    })
    .on('end', () => {
        clearInterval(memoryMonitor);
        const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log('\n--- INGESTION COMPLETE ---');
        console.log(`Total Rows Processed: ${rowCount.toLocaleString()}`);
        console.log(`Time Taken: ${timeTaken} seconds`);
        
        const finalMemory = process.memoryUsage();
        console.log(`Final Heap Used: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    })
    .on('error', (err) => {
        console.error('Stream encountered an error:', err);
    });