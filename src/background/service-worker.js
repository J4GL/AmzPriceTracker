const ALARM_NAME = 'price-check';
const CHECK_INTERVAL = 60;
const NOTIFICATION_THRESHOLD = 0.05;

chrome.runtime.onInstalled.addListener(() => {
  console.log('Amazon Price Tracker installed');
  
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: CHECK_INTERVAL
  });
  
  chrome.storage.local.set({
    settings: {
      notificationsEnabled: true,
      checkInterval: CHECK_INTERVAL,
      priceDropThreshold: NOTIFICATION_THRESHOLD
    }
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    checkPrices();
  }
});

async function checkPrices() {
  const storage = await chrome.storage.local.get(['amz_price_history', 'settings']);
  const history = storage.amz_price_history || {};
  const settings = storage.settings || {};
  
  if (!settings.notificationsEnabled) return;
  
  const notifications = [];
  
  for (const [asin, data] of Object.entries(history)) {
    if (data.priceHistory && data.priceHistory.length >= 2) {
      const current = data.priceHistory[data.priceHistory.length - 1];
      const previous = data.priceHistory[data.priceHistory.length - 2];
      
      const priceDrop = previous.price - current.price;
      const dropPercent = priceDrop / previous.price;
      
      if (dropPercent >= settings.priceDropThreshold) {
        notifications.push({
          asin,
          title: data.title,
          previousPrice: previous.price,
          currentPrice: current.price,
          dropPercent: (dropPercent * 100).toFixed(1)
        });
      }
    }
  }
  
  notifications.forEach(notif => {
    chrome.notifications.create(`price-drop-${notif.asin}`, {
      type: 'basic',
      iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAABHJJREFUeJztm0tIVFEYx3/3zozjjI/MfGRqZpZZWVlZUVBQEEVRFEVRVBRFURQVRUFBQUFBQRAEQRAEQRAEQdCDHvSgBz3oQQ960IOe9KQnPelJj/9Z3GFm7p17z/nO98090/nBgDNz7vn+3/9859xz7jkXFAqFQqFQKBSKSqQK6AQ6gHagDWgBmoBGoB6oA2qBaqAKyBj/zwM5YBqYAiaACWAMGAVGgGFgCBgEBoBvwIL/lxKMRqAHWA2sBFYAy4GlQDMiuFdmgO/AIPAF+Ah8AN4D74BPQL9kGwJFGlgLrAPWAKuAlcByoB0RXpJJYAgYBD4DH4D3wFvgNfAKGJFsix9UAVuArcAmYCPQhQwvTjGLPCGvgJfAc+AZ8ATol2xHIFqB3cAuYDuwAbH7KDGHeIt4i3ibeJsES7gm4CBwCLgIvEB8M0rhRBdRR9RVjHEE2IfEFZGhGjgMnAauI3FAJV94ERNId3EGOIK8eUIjDRwCLgC3gD9Ez+YDxyTymrkNXEC8SSJiaoGTwE3k7RB1IWU42/iGnKfaMa0GzgJXER9WQrun
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPriceHistory') {
    chrome.storage.local.get(['amz_price_history'], (result) => {
      sendResponse(result.amz_price_history || {});
    });
    return true;
  }
  
  if (request.action === 'updateSettings') {
    chrome.storage.local.set({ settings: request.settings }, () => {
      sendResponse({ success: true });
      
      if (request.settings.checkInterval) {
        chrome.alarms.clear(ALARM_NAME, () => {
          chrome.alarms.create(ALARM_NAME, {
            periodInMinutes: request.settings.checkInterval
          });
        });
      }
    });
    return true;
  }
  
  if (request.action === 'clearHistory') {
    chrome.storage.local.remove(['amz_price_history'], () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'forceCheck') {
    checkPrices().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'getStats') {
    chrome.storage.local.get(['amz_price_history'], (result) => {
      const history = result.amz_price_history || {};
      const stats = {
        totalProducts: Object.keys(history).length,
        totalDataPoints: 0,
        averageDrops: 0,
        biggestDrop: { percent: 0, product: null }
      };
      
      let totalDrops = 0;
      let dropCount = 0;
      
      for (const [asin, data] of Object.entries(history)) {
        if (data.priceHistory) {
          stats.totalDataPoints += data.priceHistory.length;
          
          if (data.priceHistory.length >= 2) {
            const first = data.priceHistory[0].price;
            const last = data.priceHistory[data.priceHistory.length - 1].price;
            const dropPercent = ((first - last) / first) * 100;
            
            if (dropPercent > 0) {
              totalDrops += dropPercent;
              dropCount++;
              
              if (dropPercent > stats.biggestDrop.percent) {
                stats.biggestDrop = {
                  percent: dropPercent,
                  product: data.title,
                  asin
                };
              }
            }
          }
        }
      }
      
      if (dropCount > 0) {
        stats.averageDrops = totalDrops / dropCount;
      }
      
      sendResponse(stats);
    });
    return true;
  }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.amz_price_history) {
    console.log('Price history updated');
  }
});