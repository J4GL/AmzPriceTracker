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
      iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABHNCSVQICAgIfAhkiAAAAq5JREFUeJztmz1oFEEYht/Z3Yt3XuKfRBQVFRUVFRUVFRUVFRUVFRUVFRUVFRUVLSysLCwsLCwsLCwsLCwsLCwsLERQEATBPxD8QVHUqHjqee7thc1lN7uzOzPf7N4F94UPLndz38z7zOzM7OwChmEYhmEYhmEYhlGMKmAT0AVsANYBa4DVwEpgBbAMWAIsAhYC84E5QBb4DQwDQ8AAcA+4C9wGbgI3gOtAj+R7CYIF2APsAnYC24ENyOD9Mgx0A1eBS8BF4DxwU7INgTAX2A/sA7YBm4GlyODTQj9wFTgHnALOAJcl2xGIZcBh4CBwAOhEhl+lDAPngBPAMeAssECyHZ6pB44Cx4F3QIhyHzHGaWQbRLl3AR3IsUzk1AFHgJdI40vdyV6PBCAB9wEdSOKSiMzAe6T5pR6okMcQ0oGFvtqBE0AfpR6YmMcw0pG1fheCBcBppLGlHgzfRydS6VnCrwXjQuLzJTKhSz0IUR5lbiDOBf45jcQu7zq0jfQitJTXAx+QiR2pT4NP4gPS0XW+2sE0tMGlnJTOqCN2yFjCdI5yP3oRGnW7TUGaLpJ8eNH4HTISrz0RGKmTQvgkzwcdLr8rSPOT+PR7Fb7IMxCBUdJ0VQK/SklOGmeRJlYa1ySJr9l/EUMXsrnOBJ+Qzm1OYrDBRjUdZJHNBnVvJU0rJJz61UqWIXcrQUIWuwwKScgCE0QSSD+LxQkJGXQ4C90oD40EHQnJqyN5RcRI3uBcAEsQP5MfBW4h93alPneVlEJCCgrJFy9pRAZnJm9S0sREzCQxcUhT2aSkJi5xqYmX5DQlLnXxS14K45C+NCYS3TmKSV8qE5nORKZXsjO+gozJzpQ0JTutqfzz7JSkO70pT3GaU57qPAJMoTrnUWDy1PeRYILUyS8wDMMwjDT4B8jASLBNNpduAAAAAElFTkSuQmCC',
      title: 'Price Drop Alert!',
      message: `${notif.title} dropped ${notif.dropPercent}% from €${notif.previousPrice.toFixed(2)} to €${notif.currentPrice.toFixed(2)}`,
      priority: 2
    });
  });

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