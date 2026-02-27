# OSS Maintenance Cost Analyser - Marketing Website

A static marketing website for the OSS Maintenance Cost Analyser tool.

## Design Concept

**Editorial Financial Data Aesthetic** - Inspired by Bloomberg Terminal and modern financial dashboards, combined with developer tool aesthetics. The design uses:

- **Typography**: Instrument Serif (display) + DM Mono (body/code) for a sophisticated editorial feel
- **Color Palette**: Dark theme with cyan primary accent (#00d9ff) suggesting data visualization and terminal interfaces
- **Visual Language**: High contrast, grid-based layouts, terminal-inspired code blocks, and data-driven sections
- **Motion**: Subtle scroll animations and hover states that feel purposeful and refined

## Structure

```
website/
├── index.html          # Main HTML structure
├── styles.css          # All styles (CSS custom properties, responsive design)
├── script.js           # Interactive features (tabs, scroll effects, animations)
└── README.md          # This file
```

## Key Sections

1. **Hero** - Bold headline with animated stats and terminal-style code preview
2. **Concept** - Explains OSS budgeting philosophy with sample budget card
3. **Problem** - Grid of hidden costs (security patches, updates, lag, dependencies)
4. **Philosophy** - Large quote emphasizing this is NOT technical debt
5. **Solution** - Feature cards showing the tool's methodology (CVE analysis, maintenance health, etc.)
6. **Demo** - Live terminal output example
7. **Evaluate** - NEW: Three-step workflow for checking packages before installation (compare alternatives, check budget, make trade-offs)
8. **Install** - Tabbed installation instructions with copy-to-clipboard
9. **Footer** - Links to documentation and resources

## Features

- **Responsive Design** - Works on desktop, tablet, and mobile
- **Smooth Scrolling** - Anchor links with offset for fixed header
- **Tab Navigation** - Installation code examples with three tabs (npm, usage, CI/CD)
- **Copy to Clipboard** - One-click code copying with visual feedback
- **Scroll Animations** - Sections fade in as you scroll
- **Intersection Observer** - Performance-optimized animations
- **Fixed Header** - Navigation stays accessible with dynamic shadow on scroll

## Deployment

This is a static site - no build process required. Simply upload the files to any static hosting:

### GitHub Pages

```bash
# From the oss-maintainance-cost-analyser root directory
git add website/
git commit -m "Add marketing website"
git push origin main

# Enable GitHub Pages in repo settings
# Set source to /website directory
```

### Netlify

Drag and drop the `website/` folder to Netlify's deployment interface.

### Vercel

```bash
cd website
vercel --prod
```

### Any Static Host

Upload `index.html`, `styles.css`, and `script.js` to your hosting provider.

## Customization

### Colors

Edit CSS custom properties in `styles.css`:

```css
:root {
    --color-primary: #00d9ff;      /* Main accent color */
    --color-bg: #0a0e14;           /* Background */
    --color-text: #e6e8eb;         /* Text color */
    /* ... more variables */
}
```

### Content

All content is in `index.html`. Key areas to customize:

- Hero stats (lines 50-66)
- Budget card example (lines 108-130)
- Problem cards (lines 150-210)
- Feature cards (lines 260-310)
- Demo terminal output (lines 340-380)

### Fonts

Currently using Google Fonts:
- **Instrument Serif** - Elegant serif for headings
- **DM Mono** - Clean monospace for body text and code

To change fonts, update the Google Fonts link in `<head>` and CSS variables:

```css
--font-display: 'YourDisplayFont', serif;
--font-mono: 'YourMonoFont', monospace;
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

Uses modern CSS features:
- CSS Grid
- CSS Custom Properties
- Intersection Observer API
- CSS backdrop-filter

## Performance

- No external dependencies (except Google Fonts)
- Pure vanilla JavaScript
- CSS-only animations where possible
- Optimized scroll listeners with requestAnimationFrame
- Lazy loading for scroll-triggered animations

## Accessibility

- Semantic HTML5 structure
- Proper heading hierarchy (h1-h4)
- ARIA labels where needed
- Keyboard navigation support
- Focus states on interactive elements
- Sufficient color contrast ratios
- Reduced motion support (respects `prefers-reduced-motion`)

## License

MIT License - Same as the main OSS Maintenance Cost Analyser project
