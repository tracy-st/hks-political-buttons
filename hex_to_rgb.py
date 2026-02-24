import csv
import re
import os

def hex_to_rgb(hex_code: str):
    hex_code = hex_code.strip().lstrip("#")
    if not re.fullmatch(r"[0-9a-fA-F]{6}", hex_code):
        raise ValueError(f"Invalid hex code: {hex_code}")
    return (
        int(hex_code[0:2], 16),
        int(hex_code[2:4], 16),
        int(hex_code[4:6], 16),
    )

# Input / output files
input_txt = "data/pylette_hex.txt"   # one hex code per line
output_csv = "data/rgb_colors.csv"

with open(input_txt, "r", encoding="utf-8") as infile, \
     open(output_csv, "w", newline="", encoding="utf-8") as outfile:

    writer = csv.writer(outfile)
    writer.writerow(["hex_code", "R", "G", "B"])

    for line_number, line in enumerate(infile, start=1):
        hex_code = line.strip()
        if not hex_code:
            continue  # skip empty lines

        try:
            r, g, b = hex_to_rgb(hex_code)
            print(r)
        except ValueError as e:
            print(f"Line {line_number}: {e}")
            continue

        writer.writerow([hex_code, r, g, b])

print(f"Wrote {output_csv}")
