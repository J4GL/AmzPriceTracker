function parseCookies(cookieText) {
  const cookies = [];
  const lines = cookieText.split('\n');
  
  for (const line of lines) {
    if (line.trim() === '' || line.startsWith('#')) {
      continue;
    }
    
    const parts = line.split('\t');
    if (parts.length >= 7) {
      cookies.push({
        domain: parts[0],
        httpOnly: parts[1] === 'TRUE',
        path: parts[2],
        secure: parts[3] === 'TRUE',
        expirationDate: parseFloat(parts[4]),
        name: parts[5],
        value: parts[6],
        sameSite: 'lax'
      });
    }
  }
  
  return cookies;
}

async function loadCookiesFromFile() {
  try {
    const response = await fetch(chrome.runtime.getURL('cookies.txt'));
    const text = await response.text();
    return parseCookies(text);
  } catch (error) {
    console.error('Failed to load cookies:', error);
    return [];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseCookies, loadCookiesFromFile };
}