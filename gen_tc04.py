import random
import os

TARGET_SIZE_BYTES = 2 * 1024 * 1024 * 1024
FILE_NAME = "tc04_malformed_2GB.csv"

print(f"Generating TC-04 {FILE_NAME}...")

with open(FILE_NAME, "w", buffering=8192) as f:
    f.write("Timestamp,Source IP,Destination IP,Protocol,Packet Size\n")
    bytes_written = 0
    
    while bytes_written < TARGET_SIZE_BYTES:
        if random.random() < 0.05:
            # 5% Corrupted Data (Missing commas, letters in packet size, broken IPs)
            row = f"CORRUPTED_DATE,999.999.999.999,10.0.0.1,INVALID_PROTO,NOT_A_NUMBER\n"
        else:
            row = f"2026-06-15T12:00:00Z,192.168.1.50,10.0.0.1,HTTP,{random.randint(64, 1500)}\n"
            
        f.write(row)
        bytes_written += len(row.encode('utf-8'))

print("TC-04 Data generation complete!")