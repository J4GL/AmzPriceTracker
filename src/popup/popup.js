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