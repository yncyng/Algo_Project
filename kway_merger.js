const fs = require('fs');
const path = require('path');
const readline = require('readline');

const TEMP_DIR = path.join(__dirname, 'temp_chunks');
const OUTPUT_FILE = path.join(__dirname, 'network_logs_5GB_SORTED.csv');

// Super fast helper to grab just the timestamp string from the CSV line
const getTimestamp = (csvLine) => {
    const tsString = csvLine.substring(0, csvLine.indexOf(','));
    return new Date(tsString).getTime();
};

async function mergeChunks() {
    console.log('Starting Phase 2: K-Way Merge (OPTIMIZED)...');
    const startTime = Date.now();

    const files = fs.readdirSync(TEMP_DIR).filter(f => f.startsWith('chunk_') && f.endsWith('.csv'));
    console.log(`Found ${files.length} chunks to merge.`);

    // OPTIMIZATION 1: Add 'currentTimestamp' to the state object
    const streams = files.map(file => {
        const rl = readline.createInterface({
            input: fs.createReadStream(path.join(TEMP_DIR, file)),
            crlfDelay: Infinity
        });
        const iterator = rl[Symbol.asyncIterator]();
        return { file, iterator, currentLine: null, currentTimestamp: null, isDone: false };
    });

    const outStream = fs.createWriteStream(OUTPUT_FILE);
    outStream.write("Timestamp,Source IP,Destination IP,Protocol,Packet Size\n");

    console.log('Loading the first row of each chunk and caching timestamps...');
    let activeStreams = 0;
    for (const stream of streams) {
        const result = await stream.iterator.next();
        if (!result.done) {
            stream.currentLine = result.value;
            stream.currentTimestamp = getTimestamp(stream.currentLine); // Cache it once
            activeStreams++;
        } else {
            stream.isDone = true;
        }
    }

    let rowsMerged = 0;

    console.log('Merging streams at turbo speed...');

    while (activeStreams > 0) {
        let oldestStream = null;
        let oldestTime = Infinity;

        // Loop 184 times per row, but NO date parsing! Just raw number comparison.
        for (const stream of streams) {
            if (!stream.isDone && stream.currentTimestamp < oldestTime) {
                oldestTime = stream.currentTimestamp;
                oldestStream = stream;
            }
        }

        outStream.write(oldestStream.currentLine + '\n');
        rowsMerged++;

        const result = await oldestStream.iterator.next();
        if (!result.done) {
            oldestStream.currentLine = result.value;
            // OPTIMIZATION 2: Update cache ONLY for the winning stream
            oldestStream.currentTimestamp = getTimestamp(result.value); 
        } else {
            oldestStream.isDone = true;
            activeStreams--;
        }

        if (rowsMerged % 5000000 === 0) {
            console.log(`Merged ${rowsMerged.toLocaleString()} rows...`);
        }
    }

    outStream.end();
    const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n--- K-WAY MERGE COMPLETE ---');
    console.log(`Total Rows Merged: ${rowsMerged.toLocaleString()}`);
    console.log(`Time Taken: ${timeTaken} seconds`);
    console.log(`Final sorted file created: ${OUTPUT_FILE}`);
}

mergeChunks().catch(console.error);