import csv
import random
from datetime import datetime, timedelta
import os

# --- Configuration ---
BASE_DIR = os.path.dirname(__file__)
OUTPUT_SIZES = {
    "scaling_500MB.csv": 500 * 1024 * 1024,
    "scaling_1GB.csv": 1 * 1024 * 1024 * 1024,
    "scaling_2GB.csv": 2 * 1024 * 1024 * 1024,
}
START_DATE = datetime(2023, 1, 1)
IP_RANGE = [f"192.168.1.{i}" for i in range(1, 255)]
PROTOCOLS = ["TCP", "UDP", "ICMP", "HTTP", "DNS"]
HEADER = ["Timestamp", "Source IP", "Destination IP", "Protocol", "Packet Size"]

def generate_random_log_entry(current_time):
    """Generates a single pseudo-random log entry."""
    return [
        current_time.isoformat() + "Z",
        random.choice(IP_RANGE),
        random.choice(IP_RANGE),
        random.choice(PROTOCOLS),
        random.randint(60, 1500)
    ]

def get_avg_row_size(num_samples=1000):
    """Calculates the average size of a single row to estimate total rows needed."""
    total_size = 0
    now = datetime.now()
    for _ in range(num_samples):
        row = generate_random_log_entry(now)
        row_string = ",".join(map(str, row)) + "\n"
        total_size += len(row_string.encode('utf-8'))
    return total_size / num_samples

def generate_scaling_files():
    """Generates CSV files of specified target sizes."""
    print("Calculating average row size...")
    avg_size = get_avg_row_size()
    print(f"Average row size is ~{avg_size:.2f} bytes.")

    for filename, target_size_bytes in OUTPUT_SIZES.items():
        output_path = os.path.join(BASE_DIR, '..', filename)
        estimated_rows = int(target_size_bytes / avg_size)
        current_size = 0

        print(f"\nGenerating {filename} (Target: {target_size_bytes / (1024*1024):.0f}MB)...")
        print(f"Estimated rows to write: {estimated_rows:,}")

        time_tracker = START_DATE
        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(HEADER)

            for i in range(estimated_rows):
                # Add some randomness to time to ensure sorting is non-trivial
                time_tracker += timedelta(seconds=random.randint(1, 10))
                row = generate_random_log_entry(time_tracker)
                writer.writerow(row)

                if i % 50000 == 0:
                    current_size = f.tell()
                    progress = (current_size / target_size_bytes) * 100
                    print(f"  > Wrote {i:,} rows... {progress:.1f}% complete.", end='\r')

        final_size = os.path.getsize(output_path)
        print(f"\nFinished generating {filename}.")
        print(f"Final file size: {final_size / (1024*1024):.2f}MB")

if __name__ == "__main__":
    generate_scaling_files()
    print("\nAll scaling files generated successfully.")