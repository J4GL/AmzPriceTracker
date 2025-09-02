(function() {
  const STORAGE_KEY = 'amz_price_history';
  const CHART_CONTAINER_ID = 'price-tracker-chart';
  
  function extractProductInfo() {
    const products = [];
    const cartItems = document.querySelectorAll('[data-asin]');
    
    cartItems.forEach(item => {
      const asin = item.getAttribute('data-asin');
      if (!asin) return;
      
      const titleElement = item.querySelector('.sc-product-title, .a-truncate-cut, [data-feature-id="sc-product-title"]');
      const priceElement = item.querySelector('.sc-product-price, .a-price-whole, .sc-badge-price-to-pay .a-price');
      
      if (titleElement && priceElement) {
        const title = titleElement.textContent.trim();
        const priceText = priceElement.textContent.trim();
        const price = parseFloat(priceText.replace(/[^\d,.-]/g, '').replace(',', '.'));
        
        if (!isNaN(price)) {
          products.push({
            asin,
            title,
            price,
            currency: 'EUR',
            timestamp: Date.now(),
            url: window.location.href
          });
        }
      }
    });
    
    return products;
  }
  
  async function loadPriceHistory() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        resolve(result[STORAGE_KEY] || {});
      });
    });
  }
  
  async function savePriceHistory(history) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: history }, resolve);
    });
  }
  
  async function updatePriceHistory(products) {
    const history = await loadPriceHistory();
    
    products.forEach(product => {
      if (!history[product.asin]) {
        history[product.asin] = {
          title: product.title,
          priceHistory: []
        };
      }
      
      const productHistory = history[product.asin].priceHistory;
      const lastEntry = productHistory[productHistory.length - 1];
      
      if (!lastEntry || lastEntry.price !== product.price) {
        productHistory.push({
          price: product.price,
          timestamp: product.timestamp,
          currency: product.currency
        });
        
        if (productHistory.length > 100) {
          productHistory.shift();
        }
      }
    });
    
    await savePriceHistory(history);
    return history;
  }
  
  function createChartContainer(parentElement, asin) {
    const existing = parentElement.querySelector(`#${CHART_CONTAINER_ID}-${asin}`);
    if (existing) {
      return existing.querySelector('canvas');
    }
    
    const container = document.createElement('div');
    container.id = `${CHART_CONTAINER_ID}-${asin}`;
    container.style.cssText = `
      width: 100%;
      max-width: 500px;
      height: 200px;
      margin: 10px 0;
      padding: 10px;
      background: #f7f7f7;
      border: 1px solid #ddd;
      border-radius: 4px;
    `;
    
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 180;
    container.appendChild(canvas);
    
    const title = document.createElement('div');
    title.style.cssText = `
      font-weight: bold;
      margin-bottom: 5px;
      color: #333;
    `;
    title.textContent = 'Price History';
    container.insertBefore(title, canvas);
    
    parentElement.appendChild(container);
    return canvas;
  }
  
  function renderPriceChart(canvas, priceHistory) {
    if (!priceHistory || priceHistory.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    
    ctx.clearRect(0, 0, width, height);
    
    const prices = priceHistory.map(p => p.price);
    const minPrice = Math.min(...prices) * 0.95;
    const maxPrice = Math.max(...prices) * 1.05;
    const priceRange = maxPrice - minPrice;
    
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    ctx.strokeStyle = '#FF9900';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    priceHistory.forEach((point, index) => {
      const x = padding + (index / (priceHistory.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((point.price - minPrice) / priceRange) * (height - 2 * padding);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      ctx.fillStyle = '#FF9900';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      
      if (index === 0 || index === priceHistory.length - 1) {
        ctx.fillStyle = '#333';
        ctx.font = '10px Arial';
        ctx.fillText(`€${point.price.toFixed(2)}`, x - 20, y - 10);
        
        const date = new Date(point.timestamp);
        const dateStr = `${date.getDate()}/${date.getMonth() + 1}`;
        ctx.fillText(dateStr, x - 15, height - padding + 15);
      }
    });
    
    ctx.strokeStyle = '#FF9900';
    ctx.stroke();
    
    const currentPrice = priceHistory[priceHistory.length - 1].price;
    const firstPrice = priceHistory[0].price;
    const changePercent = ((currentPrice - firstPrice) / firstPrice * 100).toFixed(1);
    const changeText = changePercent >= 0 ? `+${changePercent}%` : `${changePercent}%`;
    const changeColor = changePercent >= 0 ? '#d14' : '#090';
    
    ctx.fillStyle = changeColor;
    ctx.font = 'bold 12px Arial';
    ctx.fillText(changeText, width - padding - 40, padding - 10);
  }
  
  async function injectCharts() {
    const products = extractProductInfo();
    if (products.length === 0) return;
    
    const history = await updatePriceHistory(products);
    
    const cartItems = document.querySelectorAll('[data-asin]');
    cartItems.forEach(item => {
      const asin = item.getAttribute('data-asin');
      if (!asin || !history[asin]) return;
      
      const canvas = createChartContainer(item, asin);
      renderPriceChart(canvas, history[asin].priceHistory);
    });
    
    console.log(`Price Tracker: Updated ${products.length} products`);
    showToast(`Tracking ${products.length} products`);
  }
  
  function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #FF9900;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    toast.textContent = message;
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
  
  function observeCartChanges() {
    const observer = new MutationObserver((mutations) => {
      const hasRelevantChanges = mutations.some(mutation => {
        return mutation.type === 'childList' && 
               (mutation.target.querySelector('[data-asin]') || 
                mutation.target.closest('[data-asin]'));
      });
      
      if (hasRelevantChanges) {
        setTimeout(injectCharts, 1000);
      }
    });
    
    const cartContainer = document.querySelector('#sc-active-cart, .sc-list-body, [data-name="Active Items"]');
    if (cartContainer) {
      observer.observe(cartContainer, {
        childList: true,
        subtree: true
      });
    }
  }
  
  function init() {
    console.log('Amazon Price Tracker: Initializing...');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(injectCharts, 1000);
        observeCartChanges();
      });
    } else {
      setTimeout(injectCharts, 1000);
      observeCartChanges();
    }
    
    window.addEventListener('load', () => {
      setTimeout(injectCharts, 2000);
    });
  }
  
  init();
})();