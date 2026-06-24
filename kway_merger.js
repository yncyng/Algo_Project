const fs = require('fs');
const path = require('path');
const readline = require('readline');

const TEMP_DIR = path.join(__dirname, 'temp_chunks');
const OUTPUT_FILE = path.join(__dirname, 'tc03_99percent_dupes_5GB_SORTED.csv');

// Super fast helper to grab just the timestamp string from the CSV line
const getTimestamp = (csvLine) => {
    // Added a check for empty or invalid lines
    if (!csvLine) return null;
    const tsString = csvLine.substring(0, csvLine.indexOf(','));
    if (!tsString) return null;
    return new Date(tsString).getTime();
};

// Helper function to handle backpressure when writing to the output stream
function writeAndDrain(stream, data) {
    return new Promise((resolve) => {
        if (!stream.write(data)) {
            stream.once('drain', resolve);
        } else {
            // Using process.nextTick to avoid deep call stacks and allow other I/O to happen.
            process.nextTick(resolve);
        }
    });
}


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
    // Writing header separately
    await new Promise(resolve => outStream.write("Timestamp,Source IP,Destination IP,Protocol,Packet Size\n", resolve));


    console.log('Loading the first row of each chunk and caching timestamps...');
    let activeStreams = 0;
    for (const stream of streams) {
        const result = await stream.iterator.next();
        if (!result.done && result.value) { // Check for empty lines at the end of files
            stream.currentLine = result.value;
            stream.currentTimestamp = getTimestamp(stream.currentLine); // Cache it once
            if (stream.currentTimestamp === null) { // Handle potentially invalid first lines
                stream.isDone = true;
            } else {
                activeStreams++;
            }
        } else {
            stream.isDone = true;
        }
    }

    let rowsMerged = 0;

    console.log('Merging streams at turbo speed...');

    while (activeStreams > 0) {
        let oldestStream = null;
        let oldestTime = Infinity;

        // Loop through active streams to find the one with the oldest timestamp
        for (const stream of streams) {
            if (!stream.isDone && stream.currentTimestamp < oldestTime) {
                oldestTime = stream.currentTimestamp;
                oldestStream = stream;
            }
        }

        if (oldestStream === null) {
            // This can happen if remaining streams have invalid data
            console.log('No oldest stream found, breaking loop.');
            break;
        }

        // Write the line and handle backpressure
        await writeAndDrain(outStream, oldestStream.currentLine + '\n');
        rowsMerged++;

        const result = await oldestStream.iterator.next();
        if (!result.done && result.value) {
            oldestStream.currentLine = result.value;
            const newTimestamp = getTimestamp(result.value);
            if (newTimestamp === null) { // Handle invalid lines mid-file
                oldestStream.isDone = true;
                activeStreams--;
            } else {
                oldestStream.currentTimestamp = newTimestamp;
            }
        } else {
            oldestStream.isDone = true;
            activeStreams--;
        }

        if (rowsMerged % 5000000 === 0) {
            console.log(`Merged ${rowsMerged.toLocaleString()} rows...`);
        }
    }

    await new Promise(resolve => outStream.end(resolve));
    const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n--- K-WAY MERGE COMPLETE ---');
    console.log(`Total Rows Merged: ${rowsMerged.toLocaleString()}`);
    console.log(`Time Taken: ${timeTaken} seconds`);
    console.log(`Final sorted file created: ${OUTPUT_FILE}`);
}

mergeChunks().catch(console.error);