# Handshake Job Scraping Logic Update

## Summary
Updated the scraping selectors for both `joinhandshake.com` and `app.joinhandshake.com` to work with the current Handshake DOM structure (as of February 2026).

## Changes Made

### 1. Company Name Selectors
**Previous:** Used generic heading selectors and complex pseudo-selectors
**Updated:** Uses specific Handshake styled-component classes
```javascript
".sc-gcxUDs.hpUfZS span"        // Main company name container
".sc-hshgAP.iZkjnF strong"      // Alternative company display
"a[href*='/e/'] .sc-gcxUDs span"  // Company via employer link
"a[data-size='xlarge'] .sc-gcxUDs span"  // Via size attribute
```

### 2. Job Title Selectors
**Previous:** Limited to `.job-title` and generic `h1`
**Updated:** Includes Handshake styled-component classes
```javascript
"h1.sc-jTpEuC"              // Main job title class
"a[class*='bemzZW'] h1"     // Alternative title container
".sc-eNfnwC.eQuENY"         // Heading component style
"h1[class*='sc-']"          // Fallback to any h1 with sc- prefix
```

### 3. Location Selectors
**Previous:** Generic location/place selectors
**Updated:** Uses Handshake's location-specific classes
```javascript
".sc-ljmdQ.gBKIow span"      // Location container
".sc-dZHWtV.kMjjyj span"     // Alternative location style
".sc-isTYMV.gHJTns"          // Location info class
"span[class*='kzsNgN']"      // Fallback to location span pattern
```

### 4. Description Selectors
**Previous:** Generic description/content selectors
**Updated:** Uses Handshake styled-component classes
```javascript
".sc-hAjDme.fsJHax"          // Main description container
"p[class*='sc-kzlvbC']"      // Paragraph-based description
".sc-bCslmc.eAKqWU"          // Section container with description
```

## How the Scraper Works

1. **Company Detection Fallback**: If main selectors fail, `handshakeCompanyDetection()` function uses advanced strategies:
   - Looks for elements near employer logos
   - Searches "About the employer" sections
   - Extracts company names from common heading patterns

2. **Selector Priority**: The scraper tries selectors in order:
   - Most specific Handshake styled-component classes first
   - Then alternative Handshake classes
   - Then generic fallbacks
   - Finally, uses helper functions for complex detection

3. **Text Cleaning**: All extracted text is cleaned with the `clean()` function:
   - Removes extra whitespace
   - Handles special characters
   - Normalizes line breaks

## Testing

The file `test-handshake-selectors.html` can be used to verify selectors work on Handshake job pages by:
1. Navigating to a Handshake job listing
2. Opening the browser console
3. Running selector queries to confirm they find elements

## Files Modified
- `/Users/rakshanda/save-jobs-extension/scrape.js` - Updated both Handshake domain strategies

## Example Job Data Extracted
From the "Nerd Apply - Full-Stack Engineer" job listing:
- **Company**: Nerd Apply
- **Title**: Full-Stack Engineer
- **Location**: Onsite, based in New York, NY
- **Salary**: $90–130K/yr
- **Work Type**: Full-time job
- **URL**: joinhandshake.com/jobs/10695029

## Notes
- The scraper uses both styled-component class names (sc-*) and semantic class names for robustness
- Fallback selectors ensure the scraper works even if Handshake updates their styles
- The `handshakeCompanyDetection()` function provides advanced parsing for company names when CSS selectors fail
