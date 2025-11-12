# Johnny Depp Art Collection Gallery

An interactive web gallery showcasing Johnny Depp's artwork collection with customizable viewing options.

## Features

### 🎨 Gallery View
- Clean grid layout displaying artwork
- Customizable background colors with preset options
- Custom color picker for personalized backgrounds
- Professional presentation with drop shadows

### 🏠 Room View
- View artwork in realistic room settings
- Four different room styles:
  - Modern Room
  - Traditional Room
  - Scandinavian Room
  - Industrial Room
- Artwork automatically positioned on walls
- Realistic shadows for depth

## Live Demo

Visit the live site: [https://[your-username].github.io/ProductPageTest/](https://[your-username].github.io/ProductPageTest/)

## File Structure

```
ProductPageTest/
├── index.html          # Main gallery page
├── README.md           # Documentation
├── Images/             # Artwork images
│   ├── A Rose Is A Rose Is A Rose - Johnny Depp - 3950.jpg
│   ├── Cosmic - Johnny Depp - 4500.jpg
│   ├── Strength - Johnny Depp - 3950.jpg
│   ├── The Emporer - Johnny Depp - 3950.jpg
│   ├── The Empress - Johnny Depp - 3950.jpg
│   └── Example.jpg
└── Roomsets/           # Room background images
    ├── Modern.png
    ├── Traditional.png
    ├── Scandinavian.png
    └── Industrial.png
```

## Setup Instructions

1. **Clone or Download** this repository
2. **Open** `index.html` in a web browser
3. **Or deploy** to GitHub Pages:
   - Push this folder to a GitHub repository
   - Go to Settings > Pages
   - Select source: Deploy from a branch
   - Select branch: main (or master)
   - Select folder: / (root)
   - Save and wait a few minutes
   - Your site will be available at `https://[your-username].github.io/[repository-name]/`

## How to Use

### Gallery View
1. Default view shows artwork on light gray backgrounds
2. Click color swatches to change background color
3. Use custom color picker for any color

### Room View
1. Select a room style from the "View Mode" dropdown
2. Artwork automatically appears mounted on the room walls
3. Each room has optimized positioning for realistic placement

## Adding New Artwork

To add new artwork to the gallery:

1. Add image to the `Images/` folder
2. Name format: `Title - Artist - Price.jpg`
3. Update the `products` array in `index.html`:

```javascript
{
    image: 'Images/Your Image Name.jpg',
    title: 'Artwork Title',
    artist: 'Artist Name',
    price: '£X,XXX.00',
    edition: 'Limited Edition'
}
```

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers

## Technologies Used

- HTML5
- CSS3 (Grid, Flexbox)
- Vanilla JavaScript
- Responsive Design

## License

This project is for demonstration purposes. All artwork © Johnny Depp.

## Contact

For questions or issues, please open an issue in this repository.