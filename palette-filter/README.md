# Palette Filter App

A simple web app to filter political button images based on their color palettes from `pylette_metadata.csv`.

## Features

- **Color Picker**: Select a color to find images that contain similar colors.
- **Minimum Percentage**: Set the minimum percentage of the selected color in the image.
- **Tolerance**: Adjust the color matching tolerance.
- **Exclude Colors**: Exclude images that contain certain colors (by name, e.g., red, blue).
- **Dominant Only**: Option to consider only the dominant color or the entire palette.

## Usage

1. Open `index.html` in a web browser.
2. Adjust the filters as needed.
3. Click "Filter" to see matching images.
4. Click "Clear" to reset filters.

## Dependencies

- PapaParse for CSV parsing
- Chroma.js for color manipulation

Both are loaded via CDN.

## Data

The app loads `../data/pylette_metadata.csv` which contains color palette data for images.