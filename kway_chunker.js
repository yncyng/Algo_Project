const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const INPUT_FILE = path.join(__dirname, 'tc03_99percent_dupes_5GB.csv');
const TEMP_DIR = path.join(__dirname, 'temp_chunks');

// Ensure the temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR);
}

// Memory safety: 500,000 rows is roughly 150MB of RAM
const CHUNK_LIMIT = 500000; 
let currentChunk = [];
let chunkCounter = 1;
let rowCount = 0;

console.log('Starting Phase 1: Chunking and Sorting...');
let startTime = Date.now();

const readStream = fs.createReadStream(INPUT_FILE).pipe(csv());

// Helper function to write the sorted chunk to disk
function writeChunkToFile(chunkData, chunkId) {
    const filePath = path.join(TEMP_DIR, `chunk_${chunkId}.csv`);
    
    // Sort chronologically before writing
    chunkData.sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp));
    
    // Format back to CSV string (with OriginalLineNumber as 6th column)
    const csvContent = chunkData.map(row => 
        `${row.Timestamp},${row['Source IP']},${row['Destination IP']},${row.Protocol},${row['Packet Size']},${row.OriginalLineNumber}`
    ).join('\n') + '\n';
    
    fs.writeFileSync(filePath, csvContent);
    console.log(`Wrote chunk_${chunkId}.csv (${chunkData.length} rows)`);
}

readStream.on('data', (row) => {
    rowCount++;
    row.OriginalLineNumber = rowCount;
    currentChunk.push(row);
    
    if (currentChunk.length >= CHUNK_LIMIT) {
        // Pause the stream while we sort and write to disk
        readStream.pause(); 
        
        writeChunkToFile(currentChunk, chunkCounter);
        
        // Clear array from memory and resume reading
        currentChunk = []; 
        chunkCounter++;
        
        // Quick garbage collection hint (optional but good practice)
        if (global.gc) { global.gc(); }
        
        readStream.resume();
    }
})
.on('end', () => {
    // Write any remaining rows in the final chunk
    if (currentChunk.length > 0) {
        writeChunkToFile(currentChunk, chunkCounter);
    }
    
    const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n--- CHUNKING COMPLETE ---');
    console.log(`Total Rows Processed: ${rowCount.toLocaleString()}`);
    console.log(`Total Chunks Created: ${chunkCounter}`);
    console.log(`Time Taken: ${timeTaken} seconds`);
})
.on('error', (err) => {
    console.error('Stream encountered an error:', err);
});