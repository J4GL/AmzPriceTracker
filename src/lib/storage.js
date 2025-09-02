class PriceStorageManager {
  constructor() {
    this.PRICE_HISTORY_KEY = 'amz_price_history';
    this.SETTINGS_KEY = 'settings';
  }
  
  async getPriceHistory(asin = null) {
    const result = await chrome.storage.local.get(this.PRICE_HISTORY_KEY);
    const history = result[this.PRICE_HISTORY_KEY] || {};
    
    if (asin) {
      return history[asin] || null;
    }
    return history;
  }
  
  async savePriceHistory(history) {
    await chrome.storage.local.set({ [this.PRICE_HISTORY_KEY]: history });
  }
  
  async addPricePoint(asin, title, price, currency = 'EUR') {
    const history = await this.getPriceHistory();
    
    if (!history[asin]) {
      history[asin] = {
        title,
        priceHistory: []
      };
    }
    
    const pricePoint = {
      price,
      currency,
      timestamp: Date.now()
    };
    
    history[asin].priceHistory.push(pricePoint);
    
    if (history[asin].priceHistory.length > 365) {
      history[asin].priceHistory.shift();
    }
    
    await this.savePriceHistory(history);
    return history[asin];
  }
  
  async getSettings() {
    const result = await chrome.storage.local.get(this.SETTINGS_KEY);
    return result[this.SETTINGS_KEY] || {
      notificationsEnabled: true,
      checkInterval: 60,
      priceDropThreshold: 0.05
    };
  }
  
  async saveSettings(settings) {
    await chrome.storage.local.set({ [this.SETTINGS_KEY]: settings });
  }
  
  async clearHistory() {
    await chrome.storage.local.remove(this.PRICE_HISTORY_KEY);
  }
  
  async exportData() {
    const history = await this.getPriceHistory();
    const settings = await this.getSettings();
    
    return {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      history,
      settings
    };
  }
  
  async importData(data) {
    if (data.history) {
      await this.savePriceHistory(data.history);
    }
    if (data.settings) {
      await this.saveSettings(data.settings);
    }
  }
}

const storage = new PriceStorageManager();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = storage;
}