# Handshake Scraper - Text-Based Parsing Implementation

## Summary
Replaced CSS selector-based scraping with robust text-based parsing for Handshake job listings. This approach is more reliable because it doesn't depend on styled-component class names which can change frequently.

## Implementation Details

### New Scraping Strategy
Instead of hunting for specific CSS classes (`.sc-gcxUDs`, `.sc-jTpEuC`, etc.), the scraper now:

1. **Extracts body text** and normalizes whitespace
2. **Finds sections** by looking for heading text like "At a glance", "The Role", "About the employer"
3. **Uses regex patterns** to extract specific information from those sections
4. **Falls back gracefully** when patterns don't match

### Key Functions

#### `findCompany()`
- Finds all employer links (`a[href*="/e/"]`)
- Extracts text from each link
- Filters out category labels (education, software, finance, etc.)
- Returns the first valid company name

#### `findJobTitle()`
- Tries multiple selectors:
  1. `a[href*="/jobs/"] h1` - Job link with h1
  2. `h1` - Any h1 tag
  3. `a[href*="/jobs/"]` - Job link text
- Returns first match

#### `findLocation()`
- Parses "At a glance" section first
- Looks for "based in CITY, ST" pattern
- Falls back to checking for Remote/Hybrid/Onsite keywords
- Tries "About the employer" section if needed
- Searches "The Role" section as last resort

#### `findJobDescription()`
- Extracts text between "The Role" heading and next major section
- Returns complete job description text

### Regex Patterns Used

```javascript
// Location patterns
/based in\s+([A-Za-z .'-]+,\s*[A-Z]{2})/i    // "based in New York, NY"
/\bRemote\b/i, /\bHybrid\b/i, /\bOnsite\b/i  // Work type keywords
/([A-Za-z .'-]+,\s*[A-Z]{2})/                // City, State pattern
/Location\s+([...]+?)(?=\s{1,}What You'll Do|...)/i  // "Location" label followed by city

// Section delimiters
"At a glance"
"The Role"
"What they're looking for"
"About the employer"
"Similar Jobs"
"Alumni in similar roles"
```

## Files Modified

### `/Users/rakshanda/save-jobs-extension/scrape.js`

**Changes:**
- Updated `"joinhandshake.com"` strategy (line 538)
- Updated `"app.joinhandshake.com"` strategy (line 640)
- Both now use identical text-based parsing logic
- Removed dependency on brittle CSS selectors
- Added `url: location.href` to return objects

## Benefits

1. **More Reliable**: Not affected by styled-component class name changes
2. **Faster**: No complex CSS selector fallbacks needed
3. **Maintainable**: Logic is clear and easy to debug
4. **Resilient**: Multiple fallback patterns ensure data extraction
5. **Consistent**: Both joinhandshake.com and app.joinhandshake.com use same logic

## Testing

To test on a Handshake job page:

```javascript
// Open DevTools Console and run:
(() => {
  const bodyText = () => (document.body?.innerText || "").replace(/\s+/g, " ").trim();
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
  const text = bodyText();
  
  // Test finding company
  const links = Array.from(document.querySelectorAll('a[href*="/e/"]'));
  links.forEach(a => console.log('Employer link:', norm(a.textContent)));
  
  // Test finding location
  const glance = text.substring(text.indexOf("At a glance"), text.indexOf("The Role"));
  console.log('At a glance section:', glance);
})();
```

## Example Output

For the Nerd Apply Full-Stack Engineer position:

```javascript
{
  company: "Nerd Apply",
  title: "Full-Stack Engineer",
  location: "Onsite, based in New York, NY",
  description: "The Role Nerd Apply is building the data layer for education. Today, counselors make high-stakes decisions with limited, fragmented information...",
  url: "https://joinhandshake.com/jobs/10695029"
}
```

## Migration Notes

- Old CSS selector fallbacks are completely removed
- No impact on other job board scrapers (LinkedIn, Indeed, etc.)
- Message passing fixes from previous commit still in effect (postMessage targetOrigin = '*')
- All existing tests should pass unchanged
