// Background script for fetching Google Sheets data
// This runs in the extension context and can bypass CORS

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchGoogleSheetsData') {
    fetchGoogleSheetsData()
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
});

async function fetchGoogleSheetsData() {
  try {
    const webAppUrl = 'https://script.google.com/macros/s/AKfycbzwN1y4zUaXqc8REobORUrt7wizOfAlJwTHZBG6Y5DZCEiKPUXx_NjuVvHqALm-SLI/exec';
    
    const response = await fetch(webAppUrl, {
      method: 'GET',
      mode: 'cors'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching from Google Sheets:', error);
    throw error;
  }
}


