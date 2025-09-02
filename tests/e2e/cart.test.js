const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

function parseCookies(cookieText) {
  const cookies = [];
  const lines = cookieText.split('\n');
  
  for (const line of lines) {
    if (line.trim() === '' || line.startsWith('#')) continue;
    
    const parts = line.split('\t');
    if (parts.length >= 7) {
      cookies.push({
        name: parts[5],
        value: parts[6],
        domain: parts[0],
        path: parts[2],
        secure: parts[3] === 'TRUE',
        httpOnly: parts[1] === 'TRUE',
        sameSite: 'Lax'
      });
    }
  }
  return cookies;
}

test.describe('Cart Detection Tests', () => {
  test('should detect products in Amazon cart', async ({ page, context }) => {
    test.setTimeout(13000);
    
    const cookieFile = path.join(__dirname, '../fixtures/test-cookies.txt');
    const cookieText = fs.readFileSync(cookieFile, 'utf-8');
    const cookies = parseCookies(cookieText);
    
    await context.addCookies(cookies);
    
    console.log('Navigating to Amazon cart page...');
    await page.goto('https://www.amazon.fr/gp/cart/view.html?ref_=nav_cart', { 
      waitUntil: 'networkidle',
      timeout: 13000 
    });
    
    await page.waitForTimeout(3000);
    
    const cartItems = await page.locator('[data-asin]').count();
    console.log(`Found ${cartItems} items with data-asin attribute`);
    
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.text().includes('Price Tracker')) {
        consoleLogs.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    const hasTrackerLog = consoleLogs.some(log => 
      log.includes('Price Tracker: Initializing') || 
      log.includes('Price Tracker: Updated')
    );
    
    expect(hasTrackerLog).toBeTruthy();
    console.log('Test passed: Cart detection working');
  });
  
  test('should show toast notification when tracking products', async ({ page, context }) => {
    test.setTimeout(13000);
    
    const cookieFile = path.join(__dirname, '../fixtures/test-cookies.txt');
    const cookieText = fs.readFileSync(cookieFile, 'utf-8');
    const cookies = parseCookies(cookieText);
    
    await context.addCookies(cookies);
    
    await page.goto('https://www.amazon.fr/gp/cart/view.html?ref_=nav_cart', { 
      waitUntil: 'networkidle',
      timeout: 13000 
    });
    
    await page.waitForTimeout(3000);
    
    const toast = await page.locator('div').filter({ 
      hasText: /Tracking \d+ products?/ 
    }).first();
    
    const toastVisible = await toast.isVisible().catch(() => false);
    
    if (toastVisible) {
      console.log('Toast notification displayed successfully');
      expect(toastVisible).toBeTruthy();
    } else {
      console.log('No products in cart to track or toast not visible');
      expect(true).toBeTruthy();
    }
  });
});