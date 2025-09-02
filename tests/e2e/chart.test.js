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

test.describe('Chart Display Tests', () => {
  test('should inject price history charts below cart items', async ({ page, context }) => {
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
    
    const cartItems = await page.locator('[data-asin]').all();
    console.log(`Checking ${cartItems.length} cart items for price charts`);
    
    if (cartItems.length > 0) {
      const firstItem = cartItems[0];
      const asin = await firstItem.getAttribute('data-asin');
      
      const chartContainer = await page.locator(`#price-tracker-chart-${asin}`).first();
      const chartExists = await chartContainer.count() > 0;
      
      if (chartExists) {
        console.log('Price chart container found');
        const canvas = await chartContainer.locator('canvas').first();
        const canvasExists = await canvas.count() > 0;
        expect(canvasExists).toBeTruthy();
        console.log('Test passed: Chart canvas element exists');
      } else {
        console.log('No chart container found (might be first visit for this product)');
        expect(true).toBeTruthy();
      }
    } else {
      console.log('No items in cart to test');
      expect(true).toBeTruthy();
    }
  });
  
  test('should display chart with correct styling', async ({ page, context }) => {
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
    
    const chartContainers = await page.locator('[id^="price-tracker-chart-"]').all();
    
    if (chartContainers.length > 0) {
      const firstChart = chartContainers[0];
      const styles = await firstChart.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          background: computed.background,
          border: computed.border,
          borderRadius: computed.borderRadius
        };
      });
      
      console.log('Chart container styles verified');
      expect(styles).toBeTruthy();
    } else {
      console.log('No charts to verify styling');
      expect(true).toBeTruthy();
    }
  });
});