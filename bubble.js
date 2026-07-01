const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const INPUT_FILE = path.join(__dirname, 'network_logs_5GB.csv');

// We will benchmark Bubble Sort and Built-in Sort for various sizes
const SIZES = [1000, 5000, 10000, 20000];

function bubbleSort(arr) {
    const len = arr.length;
    let swapped;
    for (let i = 0; i < len - 1; i++) {
        swapped = false;
        for (let j = 0; j < len - 1 - i; j++) {
            // Compare timestamps chronologically
            const dateA = new Date(arr[j].Timestamp);
            const dateB = new Date(arr[j + 1].Timestamp);
            if (dateA > dateB) {
                // Swap
                const temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
                swapped = true;
            }
        }
        // If no two elements were swapped by inner loop, then break
        if (!swapped) break;
    }
}

async function loadRows(limit) {
    return new Promise((resolve, reject) => {
        const rows = [];
        const stream = fs.createReadStream(INPUT_FILE)
            .pipe(csv())
            .on('data', (row) => {
                if (rows.length < limit) {
                    rows.push(row);
                }
                if (rows.length === limit) {
                    stream.destroy();
                }
            })
            .on('close', () => {
                resolve(rows);
            })
            .on('error', (err) => {
                reject(err);
            });
    });
}

async function runBenchmark() {
    console.log(`=== BASELINE BENCHMARK: BUBBLE SORT VS BUILT-IN SORT ===`);
    console.log(`Input File: ${INPUT_FILE}\n`);
    
    console.log('| Dataset Size (N) | Bubble Sort Time (ms) | Built-In Sort Time (ms) | Speedup Factor |');
    console.log('|------------------|-----------------------|-------------------------|----------------|');

    for (const size of SIZES) {
        const rows = await loadRows(size);
        
        // Clone rows for bubble sort
        const rowsForBubble = rows.map(r => ({ ...r }));
        // Clone rows for built-in sort
        const rowsForBuiltin = rows.map(r => ({ ...r }));

        // Benchmark Bubble Sort
        const bubbleStart = performance.now();
        bubbleSort(rowsForBubble);
        const bubbleEnd = performance.now();
        const bubbleTime = bubbleEnd - bubbleStart;

        // Benchmark Built-In Sort
        const builtinStart = performance.now();
        rowsForBuiltin.sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp));
        const builtinEnd = performance.now();
        const builtinTime = builtinEnd - builtinStart;

        const speedup = bubbleTime / builtinTime;

        console.log(`| ${size.toLocaleString().padEnd(16)} | ${bubbleTime.toFixed(2).toString().padEnd(21)} | ${builtinTime.toFixed(2).toString().padEnd(23)} | ${speedup.toFixed(1)}x |`);
    }

    console.log('\nBenchmarking complete.');
}

runBenchmark().catch(console.error);
