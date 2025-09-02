document.addEventListener('DOMContentLoaded', async () => {
  await loadStats();
  await loadSettings();
  attachEventListeners();
});

async function loadStats() {
  chrome.runtime.sendMessage({ action: 'getStats' }, (stats) => {
    if (stats) {
      document.getElementById('totalProducts').textContent = stats.totalProducts;
      document.getElementById('avgDrop').textContent = stats.averageDrops.toFixed(1) + '%';
      
      const biggestDropEl = document.getElementById('biggestDrop');
      if (stats.biggestDrop.product) {
        biggestDropEl.innerHTML = `
          <div class="product-name">${stats.biggestDrop.product}</div>
          <div class="price-info">
            <span>ASIN: ${stats.biggestDrop.asin}</span>
            <span class="drop-percent">-${stats.biggestDrop.percent.toFixed(1)}%</span>
          </div>
        `;
      }
    }
  });
}

async function loadSettings() {
  chrome.storage.local.get(['settings'], (result) => {
    const settings = result.settings || {
      notificationsEnabled: true,
      checkInterval: 60,
      priceDropThreshold: 5
    };
    
    document.getElementById('notifications').checked = settings.notificationsEnabled;
    document.getElementById('checkInterval').value = settings.checkInterval;
    document.getElementById('threshold').value = (settings.priceDropThreshold * 100);
  });
}

function attachEventListeners() {
  document.getElementById('notifications').addEventListener('change', saveSettings);
  document.getElementById('checkInterval').addEventListener('change', saveSettings);
  document.getElementById('threshold').addEventListener('change', saveSettings);
  
  document.getElementById('checkNow').addEventListener('click', checkPricesNow);
  document.getElementById('exportData').addEventListener('click', exportData);
  document.getElementById('clearHistory').addEventListener('click', clearHistory);
  document.getElementById('randomizePrices').addEventListener('click', randomizePrices);
}

function saveSettings() {
  const settings = {
    notificationsEnabled: document.getElementById('notifications').checked,
    checkInterval: parseInt(document.getElementById('checkInterval').value),
    priceDropThreshold: parseInt(document.getElementById('threshold').value) / 100
  };
  
  chrome.runtime.sendMessage({ 
    action: 'updateSettings', 
    settings 
  }, (response) => {
    if (response.success) {
      showStatus('Settings saved', 'success');
    }
  });
}

function checkPricesNow() {
  showStatus('Checking prices...', '');
  chrome.runtime.sendMessage({ action: 'forceCheck' }, (response) => {
    if (response.success) {
      showStatus('Price check complete', 'success');
      setTimeout(loadStats, 1000);
    }
  });
}

async function exportData() {
  chrome.storage.local.get(['amz_price_history', 'settings'], (result) => {
    const data = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      history: result.amz_price_history || {},
      settings: result.settings || {}
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `amazon-price-tracker-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showStatus('Data exported', 'success');
  });
}

function clearHistory() {
  if (confirm('Are you sure you want to clear all price history? This cannot be undone.')) {
    chrome.runtime.sendMessage({ action: 'clearHistory' }, (response) => {
      if (response.success) {
        showStatus('History cleared', 'success');
        setTimeout(() => {
          loadStats();
        }, 500);
      }
    });
  }
}

function randomizePrices() {
  chrome.storage.local.get(['amz_price_history'], (result) => {
    const history = result.amz_price_history || {};
    let updatedCount = 0;
    
    for (const [asin, data] of Object.entries(history)) {
      if (data.priceHistory && data.priceHistory.length > 0) {
        // Get the last price
        const lastPrice = data.priceHistory[data.priceHistory.length - 1].price;
        
        // Generate random change between -10% to +10%, but ensure it's at least 1%
        let changePercent = (Math.random() * 20 - 10) / 100; // -0.10 to +0.10
        
        // Ensure minimum 1% change to make it visible
        if (Math.abs(changePercent) < 0.01) {
          changePercent = Math.random() > 0.5 ? 0.01 : -0.01;
        }
        
        const newPrice = Math.round(lastPrice * (1 + changePercent) * 100) / 100; // Round to 2 decimals
        
        // Add new price point
        data.priceHistory.push({
          price: newPrice,
          currency: data.priceHistory[data.priceHistory.length - 1].currency || 'EUR',
          timestamp: Date.now()
        });
        
        // Keep only last 100 entries
        if (data.priceHistory.length > 100) {
          data.priceHistory.shift();
        }
        
        updatedCount++;
      }
    }
    
    // Save the updated history
    chrome.storage.local.set({ amz_price_history: history }, () => {
      showStatus(`Randomized ${updatedCount} product prices`, 'success');
      setTimeout(() => {
        loadStats();
        // Trigger price check to test notifications
        chrome.runtime.sendMessage({ action: 'forceCheck' });
      }, 500);
    });
  });
}

function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = 'status ' + type;
  
  if (message) {
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.className = 'status';
    }, 3000);
  }
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.amz_price_history) {
    loadStats();
  }
});