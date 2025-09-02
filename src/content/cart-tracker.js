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
  
  function createChartContainer(priceElement, asin) {
    const existing = document.querySelector(`#${CHART_CONTAINER_ID}-${asin}`);
    if (existing) {
      return existing.querySelector('canvas');
    }
    
    const container = document.createElement('div');
    container.id = `${CHART_CONTAINER_ID}-${asin}`;
    container.style.cssText = `
      display: inline-block;
      width: 120px;
      height: 40px;
      margin-left: 10px;
      padding: 4px;
      background: #f7f7f7;
      border: 1px solid #ddd;
      border-radius: 3px;
      vertical-align: middle;
      position: relative;
    `;
    
    const canvas = document.createElement('canvas');
    canvas.width = 112;
    canvas.height = 32;
    canvas.style.cssText = `
      display: block;
      width: 100%;
      height: 100%;
    `;
    container.appendChild(canvas);
    
    // Insert container right after the price element
    if (priceElement && priceElement.parentNode) {
      priceElement.parentNode.insertBefore(container, priceElement.nextSibling);
    }
    
    return canvas;
  }
  
  function renderPriceChart(canvas, priceHistory) {
    if (!priceHistory || priceHistory.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 2;
    
    ctx.clearRect(0, 0, width, height);
    
    const prices = priceHistory.map(p => p.price);
    const minPrice = Math.min(...prices) * 0.98;
    const maxPrice = Math.max(...prices) * 1.02;
    const priceRange = maxPrice - minPrice || 1;
    
    // Draw sparkline
    ctx.strokeStyle = '#FF9900';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    
    priceHistory.forEach((point, index) => {
      const x = padding + (index / Math.max(1, priceHistory.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((point.price - minPrice) / priceRange) * (height - 2 * padding);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // Draw small dots for first and last points
    const firstX = padding;
    const firstY = height - padding - ((priceHistory[0].price - minPrice) / priceRange) * (height - 2 * padding);
    const lastX = width - padding;
    const lastY = height - padding - ((priceHistory[priceHistory.length - 1].price - minPrice) / priceRange) * (height - 2 * padding);
    
    ctx.fillStyle = '#FF9900';
    ctx.beginPath();
    ctx.arc(firstX, firstY, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lastX, lastY, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Show price change percentage
    const currentPrice = priceHistory[priceHistory.length - 1].price;
    const firstPrice = priceHistory[0].price;
    const changePercent = ((currentPrice - firstPrice) / firstPrice * 100).toFixed(1);
    const changeText = changePercent >= 0 ? `+${changePercent}%` : `${changePercent}%`;
    const changeColor = changePercent >= 0 ? '#d14' : '#090';
    
    ctx.fillStyle = changeColor;
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(changeText, width - 2, 8);
  }
  
  async function injectCharts() {
    const products = extractProductInfo();
    if (products.length === 0) return;
    
    const history = await updatePriceHistory(products);
    
    const cartItems = document.querySelectorAll('[data-asin]');
    cartItems.forEach(item => {
      const asin = item.getAttribute('data-asin');
      if (!asin || !history[asin]) return;
      
      // Find the price element within this item
      const priceElement = item.querySelector('.sc-product-price, .a-price-whole, .sc-badge-price-to-pay .a-price, .a-price');
      if (!priceElement) return;
      
      const canvas = createChartContainer(priceElement, asin);
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
    let debounceTimer;
    
    const observer = new MutationObserver((mutations) => {
      // Check if any new product items were added
      const hasNewProducts = mutations.some(mutation => {
        if (mutation.type !== 'childList') return false;
        
        // Check added nodes for product items
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) { // Element node
            // Check if the node itself or its children have data-asin
            if (node.hasAttribute && node.hasAttribute('data-asin')) return true;
            if (node.querySelector && node.querySelector('[data-asin]')) return true;
            // Also check for price elements that might indicate new content
            if (node.querySelector && node.querySelector('.sc-product-price, .a-price')) return true;
          }
        }
        return false;
      });
      
      if (hasNewProducts) {
        // Debounce to avoid multiple calls
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          console.log('Price Tracker: New products detected, updating charts...');
          injectCharts();
        }, 500);
      }
    });
    
    // Observe the entire body for better coverage
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Also add intersection observer for lazy-loaded content
    const intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const asin = entry.target.getAttribute('data-asin');
          const existingChart = document.querySelector(`#${CHART_CONTAINER_ID}-${asin}`);
          if (asin && !existingChart) {
            console.log(`Price Tracker: Product ${asin} now visible, adding chart...`);
            injectCharts();
          }
        }
      });
    });
    
    // Observe all product items for visibility
    const observeProductItems = () => {
      document.querySelectorAll('[data-asin]').forEach(item => {
        intersectionObserver.observe(item);
      });
    };
    
    observeProductItems();
    // Re-observe after any chart injection
    const originalInjectCharts = injectCharts;
    window.injectCharts = async function() {
      await originalInjectCharts();
      observeProductItems();
    };
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
    
    // Add scroll listener to catch any missed dynamic content
    let scrollTimer;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        // Check for items without charts
        const itemsWithoutCharts = Array.from(document.querySelectorAll('[data-asin]')).filter(item => {
          const asin = item.getAttribute('data-asin');
          return asin && !document.querySelector(`#${CHART_CONTAINER_ID}-${asin}`);
        });
        
        if (itemsWithoutCharts.length > 0) {
          console.log(`Price Tracker: Found ${itemsWithoutCharts.length} items without charts`);
          injectCharts();
        }
      }, 1000);
    });
  }
  
  init();
})();