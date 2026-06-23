const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const INPUT_FILE = path.join(__dirname, 'network_logs_5GB.csv');
const BASELINE_LIMIT = 1000000; // Test on 1 million rows
const logs = [];

console.log(`Loading first ${BASELINE_LIMIT.toLocaleString()} rows for Baseline Sort...`);
let startTime = Date.now();

fs.createReadStream(INPUT_FILE)
    .pipe(csv())
    .on('data', function (row) {
        if (logs.length < BASELINE_LIMIT) {
            logs.push(row);
        }
        
        // The fix: forcefully close the stream once we hit our limit
        if (logs.length === BASELINE_LIMIT) {
            this.destroy(); 
        }
    })
    .on('close', () => {
        const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`Loaded ${logs.length.toLocaleString()} rows in ${loadTime} seconds.`);
        
        console.log('\nExecuting V8 Built-in Sort (Chronological)...');
        
        const sortStart = performance.now();
        
        logs.sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp));
        
        const sortTime = performance.now() - sortStart;
        
        console.log(`\n--- BASELINE METRICS ---`);
        console.log(`Execution Time: ${sortTime.toFixed(2)} ms`);
        console.log(`First row timestamp: ${logs[0].Timestamp}`);
        console.log(`Last row timestamp: ${logs[logs.length - 1].Timestamp}`);
    })
    .on('error', (err) => {
        console.error('Stream encountered an error:', err);
    });