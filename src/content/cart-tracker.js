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
      cursor: pointer;
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
    
    // Create tooltip container
    const tooltip = document.createElement('div');
    tooltip.id = `${CHART_CONTAINER_ID}-tooltip-${asin}`;
    tooltip.style.cssText = `
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-bottom: 10px;
      padding: 8px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: none;
      z-index: 10000;
      pointer-events: none;
    `;
    
    const tooltipCanvas = document.createElement('canvas');
    tooltipCanvas.width = 240;
    tooltipCanvas.height = 80;
    tooltipCanvas.style.cssText = `
      display: block;
      width: 240px;
      height: 80px;
    `;
    tooltip.appendChild(tooltipCanvas);
    
    // Add arrow pointing down
    const arrow = document.createElement('div');
    arrow.style.cssText = `
      position: absolute;
      bottom: -6px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid white;
      filter: drop-shadow(0 2px 2px rgba(0,0,0,0.1));
    `;
    tooltip.appendChild(arrow);
    
    container.appendChild(tooltip);
    
    // Add hover events
    container.addEventListener('mouseenter', function() {
      tooltip.style.display = 'block';
      // Get the price history data stored on the container
      const priceHistory = container.priceHistoryData;
      if (priceHistory) {
        renderPriceChart(tooltipCanvas, priceHistory, true); // true for detailed view
      }
    });
    
    container.addEventListener('mouseleave', function() {
      tooltip.style.display = 'none';
    });
    
    // Insert container right after the price element
    if (priceElement && priceElement.parentNode) {
      priceElement.parentNode.insertBefore(container, priceElement.nextSibling);
    }
    
    return canvas;
  }
  
  function renderPriceChart(canvas, priceHistory, isDetailed = false) {
    if (!priceHistory || priceHistory.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = isDetailed ? 4 : 2;
    
    ctx.clearRect(0, 0, width, height);
    
    const prices = priceHistory.map(p => p.price);
    const minPrice = Math.min(...prices) * 0.98;
    const maxPrice = Math.max(...prices) * 1.02;
    const priceRange = maxPrice - minPrice || 1;
    
    // Draw sparkline
    ctx.strokeStyle = '#FF9900';
    ctx.lineWidth = isDetailed ? 2 : 1.5;
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
    
    // Draw dots - bigger for detailed view
    const dotSize = isDetailed ? 3 : 2;
    ctx.fillStyle = '#FF9900';
    
    if (isDetailed) {
      // In detailed view, draw all points
      priceHistory.forEach((point, index) => {
        const x = padding + (index / Math.max(1, priceHistory.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((point.price - minPrice) / priceRange) * (height - 2 * padding);
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      // In normal view, just first and last
      ctx.beginPath();
      ctx.arc(firstX, firstY, dotSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(lastX, lastY, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Show price change percentage from lowest price
    const currentPrice = priceHistory[priceHistory.length - 1].price;
    let changeText, changeColor;
    
    if (priceHistory.length === 1) {
      // New product, no history
      changeText = 'NEW';
      changeColor = '#666';
    } else {
      // Find the lowest price in history
      const lowestPrice = Math.min(...prices);
      
      if (Math.abs(currentPrice - lowestPrice) < 0.001) {
        // Current price is the lowest
        changeText = 'LOWEST';
        changeColor = '#090';
      } else {
        // Calculate percentage above lowest price
        const changePercent = ((currentPrice - lowestPrice) / lowestPrice * 100);
        
        if (changePercent < 0.05) {
          // Very close to lowest
          changeText = '≈LOW';
          changeColor = '#090';
        } else {
          const formattedPercent = changePercent.toFixed(1);
          changeText = `+${formattedPercent}%`;
          changeColor = '#d14';
        }
      }
    }
    
    ctx.fillStyle = changeColor;
    ctx.font = isDetailed ? 'bold 11px Arial' : 'bold 9px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(changeText, width - 2, isDetailed ? 12 : 8);
    
    // In detailed view, show price range
    if (isDetailed && priceHistory.length > 1) {
      ctx.fillStyle = '#666';
      ctx.font = '10px Arial';
      ctx.textAlign = 'left';
      
      // Show min and max prices
      const minPriceVal = Math.min(...prices);
      const maxPriceVal = Math.max(...prices);
      const currency = priceHistory[0].currency || '€';
      
      ctx.fillText(`min ${minPriceVal.toFixed(2)}${currency} max ${maxPriceVal.toFixed(2)}${currency}`, 4, height - 4);
    }
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
      const container = document.querySelector(`#${CHART_CONTAINER_ID}-${asin}`);
      
      // Store the price history data on the container for tooltip access
      if (container) {
        container.priceHistoryData = history[asin].priceHistory;
      }
      
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