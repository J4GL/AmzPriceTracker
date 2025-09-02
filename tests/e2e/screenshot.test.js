const { test } = require('@playwright/test');
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

test('Take screenshot of extension working', async ({ page, context }) => {
  test.setTimeout(30000);
  
  const cookieFile = path.join(__dirname, '../fixtures/test-cookies.txt');
  const cookieText = fs.readFileSync(cookieFile, 'utf-8');
  const cookies = parseCookies(cookieText);
  
  await context.addCookies(cookies);
  
  console.log('Navigating to Amazon cart page...');
  await page.goto('https://www.amazon.fr/gp/cart/view.html?ref_=nav_cart', { 
    waitUntil: 'domcontentloaded',
    timeout: 20000 
  });
  
  await page.waitForTimeout(5000);
  
  console.log('Taking screenshot of the extension in action...');
  await page.screenshot({ 
    path: 'extension-screenshot.png',
    fullPage: true 
  });
  
  console.log('Screenshot saved as extension-screenshot.png');
});