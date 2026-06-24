import random
import os

TARGET_SIZE_BYTES = 5 * 1024 * 1024 * 1024
FILE_NAME = "tc03_99percent_dupes_5GB.csv"

# Hardcoded duplicates
DUP_IP = "192.168.1.100"
DUP_TIME = "2026-06-15T12:00:00Z"

def random_ip():
    return f"{random.randint(1, 255)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"

print(f"Generating TC-03 {FILE_NAME}...")

with open(FILE_NAME, "w", buffering=8192) as f:
    f.write("Timestamp,Source IP,Destination IP,Protocol,Packet Size\n")
    bytes_written = 0
    
    while bytes_written < TARGET_SIZE_BYTES:
        if random.random() < 0.99:
            # 99% identical Timestamp and Source IP
            row = f"{DUP_TIME},{DUP_IP},{random_ip()},TCP,{random.randint(64, 1500)}\n"
        else:
            # 1% random noise
            row = f"2026-06-1{random.randint(0,9)}T10:00:00Z,{random_ip()},{random_ip()},UDP,512\n"
            
        f.write(row)
        bytes_written += len(row.encode('utf-8'))
        
        if random.randint(1, 2000000) == 1:
            print(f"Progress: {bytes_written / (1024*1024*1024):.2f} GB / 5.00 GB")

print("TC-03 Data generation complete!")