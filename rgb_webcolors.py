import csv
import re
import webcolors


def hex_to_rgb(hex_code: str):
    hex_code = hex_code.strip().lstrip("#")
    if not re.fullmatch(r"[0-9a-fA-F]{6}", hex_code):
        raise ValueError(f"Invalid hex code: {hex_code}")
    return (
        int(hex_code[0:2], 16),
        int(hex_code[2:4], 16),
        int(hex_code[4:6], 16),
    )


def rgb_to_css3_name(rgb):
    """
    Exact CSS3 name if available, otherwise closest CSS3 name.
    Compatible with all modern webcolors versions.
    """
    try:
        return webcolors.rgb_to_name(rgb, spec="css3")
    except ValueError:
        min_dist = float("inf")
        closest_name = None

        for name in webcolors.names("css3"):
            cr, cg, cb = webcolors.name_to_rgb(name, spec="css3")
            dist = (cr - rgb[0]) ** 2 + (cg - rgb[1]) ** 2 + (cb - rgb[2]) ** 2
            if dist < min_dist:
                min_dist = dist
                closest_name = name

        return closest_name


# ---- Pipeline ----
input_txt = "data/pylette_hex.txt"
output_csv = "data/rgb_names.csv"

with open(input_txt, "r", encoding="utf-8") as infile, \
     open(output_csv, "w", newline="", encoding="utf-8") as outfile:

    writer = csv.writer(outfile)
    writer.writerow(["filename", "hex_code", "R", "G", "B", "color_name"])

    for i, line in enumerate(infile, start=1):
        hex_code = line.strip()
        if not hex_code:
            continue

        try:
            r, g, b = hex_to_rgb(hex_code)
        except ValueError as e:
            print(f"Line {i}: {e}")
            continue

        color_name = rgb_to_css3_name((r, g, b))
        filename = f"color_{i}.png"

        writer.writerow([filename, hex_code, r, g, b, color_name])

print(f"Wrote {output_csv}")
