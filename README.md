# Amazon Price Tracker Chrome Extension

A Chrome extension that tracks price changes for products in your Amazon cart and wishlist, displaying historical price charts directly on the page.

## Features

- **Real-time Price Tracking**: Automatically tracks prices of items in your cart and wishlist
- **Visual Price History**: Displays compact sparkline charts next to each product price
- **Interactive Charts**: Hover over any chart to see a detailed view with min/max prices
- **Price Drop Notifications**: Get browser notifications when prices drop below your threshold
- **Multi-Region Support**: Works with all 25 Amazon domains worldwide
- **Smart Indicators**: Shows if current price is the lowest, near lowest, or how much above the lowest historical price
- **Data Export**: Export your price history data as JSON for analysis
- **Privacy Focused**: All data stored locally in your browser

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/J4GL/AmzPriceTracker.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top right corner

4. Click "Load unpacked" and select the cloned repository folder

5. The extension icon will appear in your Chrome toolbar

## Usage

### Viewing Price History
- Navigate to your Amazon cart or wishlist
- Small price charts will automatically appear next to product prices
- Charts show price trends with color-coded indicators:
  - **Green "LOWEST"**: Current price is the lowest ever tracked
  - **Green "≈LOW"**: Current price is very close to the lowest
  - **Red "+X%"**: Current price is X% above the lowest price
  - **Gray "NEW"**: First time tracking this product

### Interactive Charts
- Hover over any chart to see a larger, detailed view
- The tooltip shows minimum and maximum prices at the bottom
- All price points are visible in the detailed view

### Extension Popup
Click the extension icon to access:
- **Statistics**: Total products tracked, average price drops, biggest price drop
- **Settings**: 
  - Enable/disable notifications
  - Set check interval (15-240 minutes)
  - Set price drop threshold (1-20%)
- **Actions**:
  - Check prices now
  - Export data
  - Clear history
  - Test with randomized prices (for development)

## Supported Amazon Domains

The extension works with all Amazon regional sites:
- amazon.com.au (Australia)
- amazon.com.be (Belgium)
- amazon.com.br (Brazil)
- amazon.ca (Canada)
- amazon.cn (China)
- amazon.fr (France)
- amazon.de (Germany)
- amazon.in (India)
- amazon.it (Italy)
- amazon.co.jp (Japan)
- amazon.com.mx (Mexico)
- amazon.nl (Netherlands)
- amazon.pl (Poland)
- amazon.sa (Saudi Arabia)
- amazon.sg (Singapore)
- amazon.es (Spain)
- amazon.se (Sweden)
- amazon.com.tr (Turkey)
- amazon.ae (UAE)
- amazon.co.uk (United Kingdom)
- amazon.com (United States)
- amazon.eg (Egypt)
- amazon.nl (Netherlands)
- amazon.co.za (South Africa)
- amazon.com.ng (Nigeria)

## Privacy

- All price data is stored locally in your browser
- No data is sent to external servers
- The extension only accesses Amazon cart and wishlist pages
- No personal information is collected or transmitted

## Development

### Project Structure
```
AmzPriceTracker/
├── manifest.json           # Extension configuration
├── src/
│   ├── background/
│   │   └── service-worker.js    # Background tasks and notifications
│   ├── content/
│   │   └── cart-tracker.js      # Main content script
│   └── popup/
│       ├── popup.html           # Extension popup UI
│       ├── popup.css            # Popup styles
│       └── popup.js             # Popup logic
├── icons/                  # Extension icons
└── tests/
    └── e2e/
        └── extension.test.js    # Playwright E2E tests
```

### Testing

Run Playwright tests:
```bash
npm test
```

### Building

No build process required - the extension runs directly from source.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues, questions, or suggestions, please open an issue on [GitHub](https://github.com/J4GL/AmzPriceTracker/issues).

## Acknowledgments

- Icons designed for clear price trend visualization
- Charts rendered using HTML5 Canvas for performance
- Inspired by the need for transparent price tracking on Amazon

---

**Note**: This extension is not affiliated with or endorsed by Amazon. Amazon is a trademark of Amazon.com, Inc.