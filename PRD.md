# Amazon Price Tracker - Product Requirements Document

## Overview

Amazon Price Tracker is a Chrome extension that monitors price changes for items in your Amazon cart and wishlist. It solves the problem of missing price drops or increases by providing historical price data and visual charts directly on Amazon's website. This tool is valuable for savvy shoppers who want to make informed purchasing decisions based on price trends.

## Main Features

### 1. Automatic Price Detection
- **What it does**: Automatically detects and extracts product information from Amazon cart and wishlist pages
- **How it works**: Content script injected into Amazon pages parses DOM elements to identify products and their current prices

### 2. Price History Tracking
- **What it does**: Stores historical price data for each tracked product
- **How it works**: Background service worker maintains a database of price points using Chrome's storage API, recording timestamps and price changes

### 3. Visual Price Charts
- **What it does**: Displays interactive price history charts directly on Amazon product pages
- **How it works**: Injects Chart.js-based visualizations below product listings showing price trends over time

### 4. Cookie-based Authentication
- **What it does**: Uses existing Amazon session cookies to bypass login requirements
- **How it works**: Reads cookies from cookies.txt file and applies them to maintain authenticated sessions

### 5. Real-time Notifications
- **What it does**: Alerts users when prices drop below specified thresholds
- **How it works**: Background worker monitors price changes and triggers Chrome notifications for significant drops

### 6. Extension Popup Dashboard
- **What it does**: Provides quick access to tracking status and settings
- **How it works**: Popup interface shows summary of tracked items, recent price changes, and configuration options

## Development Order

1. **Foundation**: Setup project structure and Chrome extension manifest
2. **Authentication**: Implement cookie parsing and session management
3. **Content Detection**: Build content script for product extraction
4. **Data Layer**: Implement storage and background service
5. **Visualization**: Add Chart.js integration and UI components
6. **User Interface**: Create popup and settings panels
7. **Testing**: Setup Playwright tests with extension loading
8. **Validation**: Run comprehensive end-to-end tests

## Project Structure

```
AmzPriceTracker/
├── manifest.json           # Chrome extension manifest v3
├── package.json           # Node dependencies for testing
├── cookies.txt            # Amazon session cookies
├── PROMPT.txt            # Original user request
├── TASKS.md              # Task breakdown and tracking
├── PRD.md                # This document
│
├── src/
│   ├── background/
│   │   └── service-worker.js    # Background service worker
│   ├── content/
│   │   ├── cart-tracker.js      # Cart page content script
│   │   ├── wishlist-tracker.js  # Wishlist content script
│   │   └── chart-injector.js    # Chart UI injection
│   ├── popup/
│   │   ├── popup.html          # Extension popup UI
│   │   ├── popup.js            # Popup logic
│   │   └── popup.css           # Popup styles
│   └── lib/
│       ├── storage.js          # Storage API wrapper
│       ├── cookie-parser.js    # Cookie handling
│       └── chart.min.js        # Chart.js library
│
├── tests/
│   ├── playwright.config.js    # Playwright configuration
│   ├── e2e/
│   │   ├── cart.test.js       # Cart tracking tests
│   │   ├── chart.test.js      # Chart display tests
│   │   └── price.test.js      # Price tracking tests
│   └── fixtures/
│       └── test-cookies.txt   # Test cookie data
│
└── icons/
    ├── icon-16.svg            # Extension icons
    ├── icon-48.svg
    └── icon-128.svg
```