# Artist PDF Maker - Castle Fine Art

A professional PDF catalog generator for Castle Fine Art artists.

## Features

- 44 artist profiles with pre-generated bios
- Custom front pages with optional client names
- Product pages with images, titles, medium, size, and pricing
- Square format PDFs (1654x1654px at 200 DPI)
- Professional Castle Fine Art branding

## Usage

1. Open `index.html` in a web browser
2. Enter client name (optional) - will appear as "For [Name]" on front page
3. Select an artist from the dropdown
4. Upload product images
5. Fill in details for each product (title, medium, size, price)
6. Click "Generate PDF"

## Folder Structure

```
/
├── index.html          # Main application
├── bios/              # Pre-generated artist bio pages
├── front-pages/       # Artist front page images
└── fonts/             # Font files (optional)
```

## Deployment

This is a static website that can be deployed to:
- GitHub Pages
- Netlify
- Vercel
- Any static hosting service

Simply upload all files to your hosting provider.

## Technical Details

- Built with vanilla JavaScript
- Uses jsPDF library for PDF generation
- All assets are loaded locally (no external APIs required)
- Works in all modern browsers
- No backend required

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

## License

© Castle Fine Art
