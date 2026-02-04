# Handshake Popup Debugging Guide

## Issue
Popup not populating with scraped data when clicking the floating button on Handshake job listings.

## Root Causes Fixed

### 1. Message Passing to iframe (FIXED)
**Problem**: PostMessage was using wrong target origin
```javascript
// ❌ BEFORE (broken)
iframe.contentWindow.postMessage({ type: 'SCRAPED_DATA', data: scrapedData }, chrome.runtime.getURL(''));

// ✅ AFTER (fixed)
iframe.contentWindow.postMessage({ type: 'SCRAPED_DATA', data: scrapedData }, '*');
```

### 2. CSS Selectors for Handshake (IMPROVED)
**Problem**: Styled-component classes (`.sc-*`) are not stable
**Solution**: Use more robust selectors:

**Company selector now tries**:
- `img[alt$=' logo'] + div span` - Image alt attribute + sibling span
- `img[alt*='logo'] + * span` - Logo image + any sibling span
- `.sc-gcxUDs span` - Company container (fallback)
- `a[href*='/e/'] span` - Employer link
- Falls back to `handshakeCompanyDetection()` function

**Title selector now tries**:
- `a.sc-jizTit h1` - Job link h1
- `h1[class*='sc-']` - Any h1 with sc- prefix
- `h1` - Generic h1
- `[data-testid='job-title']` - Data attribute

**Location selector now tries**:
- `div[class*='gBKIow'] span` - Location container
- `span[class*='kzsNgN']` - Location span
- `div[class*='kMjjyj'] span` - Alternative location
- `.job-location` - Generic
- `[data-testid*='location']` - Data attribute

**Description selector now tries**:
- `div[class*='sc-hAjDme']` - Description container
- `div.sc-bCslmc` - Section container
- `article` - Semantic HTML
- `[data-testid='job-description']` - Data attribute
- `.job-description` - Generic

## Debug Steps

### 1. Check Browser Console for Scraping Logs
Open DevTools (F12) on Handshake job page, go to Console:
```
[scrape.js] TLD detected: joinhandshake.com
[scrape.js] ✓ Matched strategy for: joinhandshake.com
[scrape.js] Scraped data from joinhandshake.com: { company: "...", title: "...", ... }
[scrape.js] Final scraped data: { company: "...", title: "...", ... }
```

### 2. Check if Popup Receives Data
Look for messages in console:
```
📤 Notifying popup that scraping started...
✅ Scraped data: { company: "...", title: "...", ... }
📤 Sending scraped data to popup iframe...
✅ Data sent to popup
```

### 3. Verify Selectors Manually
In DevTools console on Handshake page:
```javascript
// Test company selector
document.querySelector('img[alt$=" logo"] + div span')?.textContent
// Should return company name

// Test title selector
document.querySelector('a.sc-jizTit h1')?.textContent
// Should return job title

// Test location selector
document.querySelector('div[class*="gBKIow"] span')?.textContent
// Should return location

// Test description selector
document.querySelector('div[class*="sc-hAjDme"]')?.textContent
// Should return job description
```

### 4. Check Network Traffic
In DevTools Network tab, look for postMessage calls (they won't show directly, but you can see iframe loads):
- Verify `popup.html?standalone=1` loads
- Check for any CSP violations in Console

## Expected Data Flow

1. **User clicks floating button**
   - `togglePopup()` runs
   - Button shows loading animation
   - iframe loads `popup.html?standalone=1`

2. **iframe loads (onload)**
   - Parent sends `SCRAPING_STARTED` message
   - Parent runs `scrapeCurrentPage()`
   - Scraper tries JSON-LD → Site-specific (Handshake) → Generic

3. **Data scraped**
   - Parent sends `SCRAPED_DATA` message with scraped object
   - Popup's `handleParentMessage()` receives it
   - Popup populates form fields

4. **User sees populated form**
   - Company, Title, Location, Description filled
   - User can edit if needed
   - Click Save to store in Supabase

## Common Issues

### Issue: "Couldn't auto-fill. Try Redo."
- Scraping took too long (>7s timeout)
- Selectors not finding elements
- **Fix**: Check console logs, verify selectors match page HTML

### Issue: Partial data (only title filled, no company)
- Some selectors working, others not
- **Fix**: Check specific field logs in console, adjust selector

### Issue: Popup shows but doesn't populate
- Message not reaching iframe
- iframe not listening for messages
- **Fix**: Check Network tab, verify iframe loaded correctly

## Files Modified

- `/Users/rakshanda/save-jobs-extension/floating-button.js`
  - Fixed postMessage targetOrigin from `chrome.runtime.getURL('')` to `'*'`
  
- `/Users/rakshanda/save-jobs-extension/scrape.js`
  - Improved Handshake selectors for both joinhandshake.com and app.joinhandshake.com
  - Added comprehensive logging
  - Changed from object literals to function returns for better control

## Testing Handshake Jobs

Visit: https://joinhandshake.com/jobs/10695029
- Company: Nerd Apply
- Title: Full-Stack Engineer
- Location: Onsite, based in New York, NY
- Salary: $90–130K/yr

Should auto-populate all fields in the popup when you click the floating button.
