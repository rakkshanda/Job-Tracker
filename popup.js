const $ = (id) => document.getElementById(id);
const DRAFT_KEY = 'saveJobsDraft';
const isStandalone = location.hash.includes('standalone') || location.search.includes('standalone=1');

function saveDraft() {
  const draft = {
    company: $('company').value,
    title: $('title').value,
    location: $('location').value,
    jobId: $('jobId').value,
    status: $('status').value,
    source: $('source').value,
    url: $('url').value,
    description: $('description').value,
    ts: Date.now()
  };
  try { chrome.storage?.local?.set?.({ [DRAFT_KEY]: draft }); } catch {}
}

async function restoreDraft() {
  try {
    const data = await new Promise((resolve) => {
      try {
        chrome.storage?.local?.get?.(DRAFT_KEY, (res) => resolve(res?.[DRAFT_KEY]));
      } catch { resolve(null); }
    });
    if (data) {
      $('company').value = data.company || $('company').value;
      $('title').value = data.title || $('title').value;
      $('location').value = data.location || $('location').value;
      $('jobId').value = data.jobId || $('jobId').value;
      $('status').value = data.status || $('status').value;
      $('source').value = data.source || $('source').value;
      $('url').value = data.url || $('url').value;
      $('description').value = data.description || $('description').value;
    }
  } catch {}
}

function cleanWhitespace(s = "") {
  // strip markdown bullets, headings, repeated newlines → single space
  return s
    .replace(/\r/g, "")
    .replace(/[*•●▪︎■◆]+/g, " ")        // bullets → space
    .replace(/^\s*[-–—]\s+/gm, " ")     // dash bullets → space
    .replace(/\n{2,}/g, " ")            // multi blank lines → space
    .replace(/\s*\n+\s*/g, " ")         // single newline → space
    .replace(/\s{2,}/g, " ")            // collapse spaces
    .trim();
}

function sanitizeCommas(s = "", allowCommas = false) {
  if (allowCommas) return s; // Don't remove commas from description
  return s.replace(/,/g, "").trim(); // Remove all commas from other fields
}


async function getTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function runInPage(tabId, func, args = []) {
  const [{ result }] = await chrome.scripting.executeScript({ target: { tabId }, func, args });
  return result;
}

async function scrapeFromPage(tabId) {
  console.log('Starting scrapeFromPage for tab:', tabId);
  
  await chrome.scripting.executeScript({ target: { tabId }, files: ['scrape.js'] });
  const scrapedData = runInPage(tabId, () => window.__scrapeJob?.() || {});
  
  console.log('Raw scraped data:', scrapedData);
  
  // Get page content for ChatGPT enhancement
  const pageContent = await runInPage(tabId, () => {
    // Get the main content area, focusing on job-related sections
    const jobContent = document.querySelector('.jobs-unified-top-card, .job-details-jobs-unified-top-card, main, .jobs-description-content') || document.body;
    return jobContent.innerText || document.body.innerText || '';
  });
  
  console.log('Page content length:', pageContent.length);
  
  // Enhance with ChatGPT if needed
  const enhancedData = await enhanceJobDataWithChatGPT(pageContent, scrapedData);
  console.log('Enhanced data:', enhancedData);
  
  return enhancedData;
}

async function getMetaGuess(tabId) {
  return runInPage(tabId, () => {
    const g = (sel, attr) => (document.querySelector(sel)?.getAttribute(attr) || '').trim();
    return {
      ogSite: g('meta[property="og:site_name"]','content'),
      twitterSite: g('meta[name="twitter:site"]','content').replace(/^@/, ''),
      ogTitle: g('meta[property="og:title"]','content'),
      title: document.title || ''
    };
  });
}

function companyFromHost(host) {
  const map = {
    // Government & Education
    'auburnwa.gov': 'City of Auburn',
    'governmentjobs.com': 'City of Auburn',
    'attract.neogov.com': 'City of Auburn',
    'neogov.com': 'City of Auburn',
    'usajobs.gov': 'U.S. Government',
    'jobs.ca.gov': 'State of California',
    'nyc.gov': 'City of New York',
    
    // Tech Companies
    'joinbytedance.com': 'ByteDance',
    'tiktok.com': 'TikTok',
    'careers.google.com': 'Google',
    'amazonjobs.com': 'Amazon',
    'meta.com': 'Meta',
    'microsoft.com': 'Microsoft',
    'apple.com': 'Apple',
    'netflix.com': 'Netflix',
    'spotify.com': 'Spotify',
    'uber.com': 'Uber',
    'airbnb.com': 'Airbnb',
    'salesforce.com': 'Salesforce',
    'oracle.com': 'Oracle',
    'ibm.com': 'IBM',
    'intel.com': 'Intel',
    'nvidia.com': 'NVIDIA',
    'amd.com': 'AMD',
    'cisco.com': 'Cisco',
    'vmware.com': 'VMware',
    'adobe.com': 'Adobe',
    'autodesk.com': 'Autodesk',
    'servicenow.com': 'ServiceNow',
    'workday.com': 'Workday',
    'snowflake.com': 'Snowflake',
    'databricks.com': 'Databricks',
    'palantir.com': 'Palantir',
    'stripe.com': 'Stripe',
    'squareup.com': 'Square',
    'paypal.com': 'PayPal',
    'visa.com': 'Visa',
    'mastercard.com': 'Mastercard',
    'americanexpress.com': 'American Express',
    
    // Job Boards (empty - let scraping handle it)
    'greenhouse.io': '',
    'lever.co': '',
    'myworkdayjobs.com': '',
    'ashbyhq.com': '',
    'smartrecruiters.com': '',
    'joinhandshake.com': '',
    'app.joinhandshake.com': '',
    'wellfound.com': '',
    'angel.co': '',
    'indeed.com': '',
    'glassdoor.com': '',
    'ziprecruiter.com': '',
    'monster.com': '',
    'dice.com': '',
    'careerbuilder.com': '',
    'simplyhired.com': '',
    'flexjobs.com': '',
    'stackoverflow.com': '',
    'github.com': '',
    'remote.co': '',
    'weworkremotely.com': '',
    'remotive.io': '',
    'jobspresso.co': '',
    'pangian.com': '',
    'skip-the-line.com': '',
    'authenticjobs.com': '',
    'dribbble.com': '',
    'behance.net': '',
    'upwork.com': '',
    'freelancer.com': '',
    'fiverr.com': '',
    'toptal.com': '',
    'guru.com': '',
    'peopleperhour.com': '',
    '99designs.com': '',
    'designcrowd.com': '',
    'crowdspring.com': '',
    'moonlight.com': '',
    'gun.io': '',
    'codementor.io': '',
    'mentorcruise.com': '',
    'codementor.io': '',
    'hackerrank.com': '',
    'leetcode.com': '',
    'codewars.com': '',
    'topcoder.com': '',
    'codechef.com': '',
    'hackerearth.com': '',
    'interviewbit.com': '',
    'geeksforgeeks.org': '',
    'freecodecamp.org': '',
    'udemy.com': '',
    'coursera.org': '',
    'edx.org': '',
    'khanacademy.org': '',
    'pluralsight.com': '',
    'linkedin.com': '',
    'twitter.com': '',
    'facebook.com': '',
    'instagram.com': '',
    'youtube.com': '',
    'tiktok.com': '',
    'snapchat.com': '',
    'pinterest.com': '',
    'reddit.com': '',
    'discord.com': '',
    'slack.com': '',
    'zoom.us': '',
    'teams.microsoft.com': '',
    'webex.com': '',
    'gotomeeting.com': '',
    'skype.com': '',
    'whatsapp.com': '',
    'telegram.org': '',
    'signal.org': '',
    'viber.com': '',
    'line.me': '',
    'wechat.com': '',
    'kik.com': '',
    'snapchat.com': '',
    'pinterest.com': '',
    'reddit.com': '',
    'discord.com': '',
    'slack.com': '',
    'zoom.us': '',
    'teams.microsoft.com': '',
    'webex.com': '',
    'gotomeeting.com': '',
    'skype.com': '',
    'whatsapp.com': '',
    'telegram.org': '',
    'signal.org': '',
    'viber.com': '',
    'line.me': '',
    'wechat.com': '',
    'kik.com': ''
  };
  return map[host.replace(/^www\./, '')] ?? '';
}

function guessLocationFromText(text) {
  const t = (text || '').replace(/\s+/g, ' ');
  const patterns = [
    /\b(Remote(?:\s*-\s*[A-Za-z]+)?)\b/i,
    /\bHybrid\b/i,
    /\bOn[- ]site\b/i,
    // common cities (add more if you like)
    /\b(?:Auburn|Seattle|San Francisco|New York|Boston|Austin|Los Angeles|Chicago|London|Dublin|Bangalore|Hyderabad|Toronto|Vancouver|Montreal|Denver|Portland)(?:,\s*[A-Z]{2})?\b/i,
    /\b[A-Za-z ]+,\s*[A-Z]{2}\b/
  ];
  for (const p of patterns) {
    const m = t.match(p);
    if (m) return m[0];
  }
  return '';
}

// Hardcoded GAS URL (yours)
function getWebAppUrl() {
  // Your deployed Google Apps Script Web App URL
  return 'https://script.google.com/macros/s/AKfycbzYdQ1COnYE_LhnAOTE8hPNh7hVwDYsHRXUwn9JFzlys9ocL3EH7V3JP5p_D9mNU_GkUA/exec';
}

// ChatGPT API configuration
// IMPORTANT: Add your OpenAI API key in the extension options page
// Or set it here for development (never commit real keys!)
const CHATGPT_API_KEY = ''; // Leave empty - configure in options
const CHATGPT_API_URL = 'https://api.openai.com/v1/chat/completions';

// Enhanced job data extraction using ChatGPT
async function enhanceJobDataWithChatGPT(pageContent, scrapedData) {
  try {
    // Only use ChatGPT if we have incomplete data or if scraping failed
    const hasIncompleteData = !scrapedData.title || !scrapedData.company || !scrapedData.location || !scrapedData.description || scrapedData.description.length < 100;
    
    if (!hasIncompleteData) {
      return scrapedData;
    }

    const prompt = `Extract job information from this LinkedIn job posting content. Return ONLY a JSON object with these exact fields: company, title, location, description. If any field cannot be determined, use empty string.

IMPORTANT: Pay special attention to LOCATION extraction. Look for:
- City, State/Province combinations (e.g., "San Francisco, CA", "New York, NY")
- Remote work indicators ("Remote", "Hybrid", "Work from home", "WFH")
- Country names ("United States", "Canada", "UK", "Europe", "India")
- Office locations and addresses
- Work arrangement types (Remote, Hybrid, On-site, Onsite)

Content to analyze:
${pageContent.substring(0, 8000)}

Current scraped data (may be incomplete):
Company: ${scrapedData.company || 'Not found'}
Title: ${scrapedData.title || 'Not found'}
Location: ${scrapedData.location || 'Not found'}
Description: ${scrapedData.description ? scrapedData.description.substring(0, 200) + '...' : 'Not found'}

Focus especially on finding the LOCATION field. Look for location information in:
- Job headers and subtitles
- Company information sections
- Job description text
- Any location-related metadata

Please provide a clean JSON response with the most accurate job information you can extract, with special attention to location details.`;

    const response = await fetch(CHATGPT_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CHATGPT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a job data extraction expert. Extract job information from LinkedIn job postings and return clean, accurate data in JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      console.warn('ChatGPT API request failed:', response.status);
      return scrapedData;
    }

    const data = await response.json();
    const chatGPTResponse = data.choices?.[0]?.message?.content;

    if (!chatGPTResponse) {
      return scrapedData;
    }

    try {
      // Try to parse the JSON response
      const enhancedData = JSON.parse(chatGPTResponse);
      
      // Merge with existing data, preferring ChatGPT results for missing fields
      return {
        company: enhancedData.company || scrapedData.company || '',
        title: enhancedData.title || scrapedData.title || '',
        location: enhancedData.location || scrapedData.location || '',
        url: scrapedData.url || '',
        description: enhancedData.description || scrapedData.description || '',
        _aiEnhanced: true // Flag to indicate AI was used
      };
    } catch (parseError) {
      console.warn('Failed to parse ChatGPT response:', parseError);
      return scrapedData;
    }
  } catch (error) {
    console.warn('ChatGPT enhancement failed:', error);
    return scrapedData;
  }
}

// Supabase configuration
const SUPABASE_URL = 'https://dmzonyrwdqzugsshcxgb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtem9ueXJ3ZHF6dWdzc2hjeGdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNzgzNTgsImV4cCI6MjA3Njc1NDM1OH0.0MYp26X7h1JR_r4KO-p_f3aX-dsiaO6Z9ZS8rjU9e7g';

async function saveRow(payload) {
  console.log('=== SAVING JOB TO SUPABASE ===');
  console.log('Payload:', payload);
  
  // final normalization before sending
  payload.company = sanitizeCommas(payload.company);
  payload.title = sanitizeCommas(payload.title);
  payload.location = sanitizeCommas(payload.location);
  payload.jobId = sanitizeCommas(payload.jobId);
  payload.url = sanitizeCommas(payload.url);
  payload.description = cleanWhitespace(payload.description);
  
  console.log('Normalized payload:', payload);
  
  // Get today's date in YYYY-MM-DD format
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayDate = `${year}-${month}-${day}`;
  
  // Prepare Supabase payload
  // Initialize status history with the first status
  const initialStatusHistory = [{
    status: payload.status || 'saved',
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }];

  const supabasePayload = {
    title: payload.title || '',
    company: payload.company || '',
    location: payload.location || '',
    job_id: payload.jobId || '',
    status: payload.status || 'saved',
    applied_date: todayDate,
    url: payload.url || '',
    description: payload.description || '',
    notes: '',
    comments: '',
    source: payload.source || 'URL',
    status_history: initialStatusHistory
  };
  
  console.log('Supabase payload:', supabasePayload);
  
  try {
    console.log('📊 Saving to Supabase...');
    
    // Use fetch to insert into Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/jobs`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(supabasePayload)
    });
    
    console.log('Supabase response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Successfully saved to Supabase:', result);
      
      // STEP 2: Also save to Chrome storage as backup
      try {
        const storageResult = await chrome.storage.local.get(['savedJobs']);
        const savedJobs = storageResult.savedJobs || [];
        
        const jobWithId = {
          ...result[0],
          savedAt: new Date().toISOString()
        };
        
        savedJobs.push(jobWithId);
        await chrome.storage.local.set({ savedJobs });
        console.log('✅ Also saved to Chrome storage');
      } catch (storageError) {
        console.warn('Could not save to Chrome storage:', storageError);
      }
      
      // STEP 3: Notify dashboard to refresh
      notifyDashboardRefresh();
      
      return { 
        success: true, 
        message: 'Job saved to Supabase!',
        supabaseSaved: true
      };
    } else {
      const errorText = await response.text();
      console.error('❌ Supabase save failed:', response.status, errorText);
      return {
        success: false,
        message: 'Failed to save to Supabase: ' + errorText,
        supabaseSaved: false
      };
    }
  } catch (error) {
    console.error('❌ Error saving to Supabase:', error);
    return {
      success: false,
      message: 'Error: ' + error.message,
      supabaseSaved: false
    };
  }
}

async function notifyDashboardRefresh() {
  // No longer needed - just save to Supabase
  // Dashboard will show data when user manually refreshes
  console.log('Job saved to Supabase');
}

function markMissing() {
  ['company','title','location','url'].forEach(id => {
    const el = $(id);
    el.classList.toggle('missing', !el.value.trim());
  });
}

function clearFields() {
  // Clear all form fields
  $('company').value = '';
  $('title').value = '';
  $('location').value = '';
  $('jobId').value = '';
  $('status').value = 'saved'; // Reset to default
  $('url').value = '';
  $('description').value = '';
  
  // Clear the draft from storage
  try { chrome.storage?.local?.remove?.(DRAFT_KEY); } catch {}
  
  // Update character count
  $('descCount').textContent = '0 chars';
  
  // Remove validation styling
  ['company','title','location','jobId','url'].forEach(id => {
    $(id).classList.remove('missing');
  });
  
  // Clear status
  $('status').textContent = '';
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Popup DOMContentLoaded - Initializing...');
  console.log('📍 Save button exists?', !!$('save'));
  console.log('📍 Clear button exists?', !!$('clearTop'));
  console.log('📍 Redo button exists?', !!$('redoTop'));
  console.log('📍 Close button exists?', !!$('close'));
  
  // Will be populated by postMessage from floating button
  let scrapedData = null;
  
  // Add skeleton loading to all inputs
  function showSkeletonLoading() {
    console.log('💀 Showing skeleton loading animation');
    const fields = ['company', 'title', 'location', 'url', 'description', 'source'];
    fields.forEach(id => {
      const field = $(id);
      if (field) {
        field.classList.add('skeleton-loading');
        field.disabled = true;
      }
    });
  }
  
  // Remove skeleton loading from all inputs
  function hideSkeletonLoading() {
    console.log('✅ Hiding skeleton loading animation');
    const fields = ['company', 'title', 'location', 'url', 'description', 'source'];
    fields.forEach(id => {
      const field = $(id);
      if (field) {
        field.classList.remove('skeleton-loading');
        field.disabled = false;
      }
    });
  }
  
  // Auto-detect source from URL
  function detectSource(url) {
    if (!url) return 'URL';
    const urlLower = url.toLowerCase();
    if (urlLower.includes('linkedin.com')) return 'LinkedIn';
    if (urlLower.includes('handshake')) return 'Handshake';
    if (urlLower.includes('indeed.com')) return 'Indeed';
    return 'URL';
  }
  
  // Listen for scraped data from floating button
  window.addEventListener('message', (event) => {
    console.log('📨 Received message:', event.data);
    
    // Start loading animation
    if (event.data && event.data.type === 'SCRAPING_STARTED') {
      console.log('🔄 Scraping started...');
      showSkeletonLoading();
      return;
    }
    
    if (event.data && event.data.type === 'SCRAPED_DATA') {
      console.log('📦 Received scraped data from floating button:', event.data.data);
      scrapedData = event.data.data;
      
      // Remove skeleton loading
      hideSkeletonLoading();
      
      // Populate form with scraped data
      if (scrapedData && scrapedData.title) {
        console.log('✅ Populating form with scraped data');
        $('company').value = sanitizeCommas(scrapedData.company || '');
        $('title').value = sanitizeCommas(scrapedData.title || '');
        $('location').value = sanitizeCommas(scrapedData.location || '');
        $('jobId').value = sanitizeCommas(scrapedData.jobId || '');
        $('description').value = scrapedData.description || '';
        $('url').value = scrapedData.url || '';
        
        // Auto-detect and set source
        const detectedSource = detectSource(scrapedData.url);
        $('source').value = detectedSource;
        console.log('🔍 Auto-detected source:', detectedSource);
        console.log('🆔 Job ID:', scrapedData.jobId || 'Not found');
        
        // Show success indicator
        const aiStatus = $('ai-status');
        if (aiStatus) {
          aiStatus.textContent = '✅ Data loaded';
          aiStatus.style.display = 'block';
          setTimeout(() => {
            aiStatus.style.display = 'none';
          }, 2000);
        }
      }
    }
  });

  const tab = await getTab();
  if (!scrapedData) {
    const currentUrl = tab.url || '';
    $('url').value = currentUrl;
    // Auto-detect source from current URL
    $('source').value = detectSource(currentUrl);
  }

  // If opened as sticky editor, avoid auto-closing expectations
  if (isStandalone) {
    document.title = 'Save Job — Sticky Editor';
  }

  // Initialize draggable functionality
  const dragHandle = $('dragHandle');
  if (dragHandle) {
    // Mouse events
    dragHandle.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
    
    // Touch events for mobile
    dragHandle.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      startDrag(touch);
    });
    document.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      drag(touch);
    });
    document.addEventListener('touchend', stopDrag);
    
    // Restore previous position
    restorePosition();
  }

  // Form starts empty - will be populated by postMessage from floating button
  console.log('ℹ️ Popup ready. Waiting for scraped data from floating button...');
  $('company').value    = '';
  $('title').value      = '';
  $('location').value   = '';
  $('description').value= '';

  // secondary guesses
  const meta = await getMetaGuess(tab.id);
  if (!$('company').value) {
    $('company').value = sanitizeCommas(
      meta.ogSite ||
      meta.twitterSite ||
      companyFromHost(new URL(tab.url).hostname) ||
      // Try to parse "City of X" / org name from title
      (meta.title.match(/\b(?:City|County|State|University|College) of [A-Za-z ]+/i)?.[0] || '')
    );
  }
  if (!$('location').value) {
    $('location').value = sanitizeCommas(
      guessLocationFromText($('description').value || meta.ogTitle || meta.title) ||
      // if it's an Auburn gov page, default to Auburn, WA
      (/auburnwa\.gov|neogov|governmentjobs\.com/i.test(tab.url) ? 'Auburn, WA' : '')
    );
  }

  // Restore any in-progress draft (survives popup close)
  await restoreDraft();

  // live counter
  const updateCount = () => $('descCount').textContent = `${$('description').value.length} chars`;
  updateCount();
  $('description').addEventListener('input', () => {
    // live-clean on paste: remove hard line breaks visually
    const cur = $('description').value;
    const cleaned = cur.replace(/\r/g, '').replace(/\s*\n+\s*/g, ' ');
    if (cur !== cleaned) $('description').value = cleaned;
    updateCount();
  });

  // persist on any field change and sanitize commas in real-time
  ['company','title','location','jobId','url'].forEach(id => {
    $(id).addEventListener('input', (e) => {
      // Remove commas in real-time for non-description fields
      const originalValue = e.target.value;
      const sanitizedValue = sanitizeCommas(originalValue);
      if (originalValue !== sanitizedValue) {
        e.target.value = sanitizedValue;
      }
      saveDraft();
    });
    $(id).addEventListener('change', saveDraft);
  });
  
  // Description field - no comma sanitization
  $('description').addEventListener('input', saveDraft);
  $('description').addEventListener('change', saveDraft);

  markMissing();

  // guess buttons (optional - only if they exist in HTML)
  const guessCompanyBtn = $('guessCompany');
  if (guessCompanyBtn) {
    guessCompanyBtn.onclick = () => {
    $('company').value ||= sanitizeCommas(
      companyFromHost(new URL(tab.url).hostname) ||
      meta.ogSite || meta.twitterSite ||
      (meta.title.match(/\b(?:City|County|State|University|College) of [A-Za-z ]+/i)?.[0] || '')
    );
    markMissing();
    };
  }
  
  const guessLocationBtn = $('guessLocation');
  if (guessLocationBtn) {
    guessLocationBtn.onclick = () => {
    $('location').value ||= sanitizeCommas(
      guessLocationFromText($('description').value || meta.ogTitle || meta.title) ||
      (/auburnwa\.gov|neogov|governmentjobs\.com/i.test(tab.url) ? 'Auburn, WA' : '')
    );
    markMissing();
    };
  }

  // AI-powered location extraction
  const guessLocationAIBtn = $('guessLocationAI');
  if (guessLocationAIBtn) {
    guessLocationAIBtn.onclick = async () => {
    const button = $('guessLocationAI');
    const originalText = button.textContent;
    
    try {
      button.textContent = '🤖 Finding location...';
      button.classList.add('ai-loading');
      button.style.pointerEvents = 'none';
      
      // Show AI status loading
      $('ai-status').textContent = '🤖 AI is analyzing location...';
      $('ai-status').classList.add('ai-status-loading');
      
      // Add processing animation to location field
      $('location').classList.add('ai-processing');
      
      // Get page content for location extraction
      const pageContent = await runInPage(tab.id, () => {
        const jobContent = document.querySelector('.jobs-unified-top-card, .job-details-jobs-unified-top-card, main, .jobs-description-content') || document.body;
        return jobContent.innerText || document.body.innerText || '';
      });
      
      // Create a focused prompt just for location extraction
      const locationPrompt = `Extract ONLY the job location from this LinkedIn job posting content. Return ONLY a JSON object with this exact field: location. If location cannot be determined, use empty string.

IMPORTANT: Look specifically for:
- City, State/Province combinations (e.g., "San Francisco, CA", "New York, NY")
- Remote work indicators ("Remote", "Hybrid", "Work from home", "WFH")
- Country names ("United States", "Canada", "UK", "Europe", "India")
- Office locations and addresses
- Work arrangement types (Remote, Hybrid, On-site, Onsite)

Content to analyze:
${pageContent.substring(0, 6000)}

Focus ONLY on finding location information. Look in job headers, subtitles, company info, and job description.`;

      const response = await fetch(CHATGPT_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CHATGPT_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a location extraction expert. Extract job location information from LinkedIn job postings and return clean, accurate location data in JSON format.'
            },
            {
              role: 'user',
              content: locationPrompt
            }
          ],
          max_tokens: 200,
          temperature: 0.1
        })
      });

      if (response.ok) {
        const data = await response.json();
        const chatGPTResponse = data.choices?.[0]?.message?.content;
        
        if (chatGPTResponse) {
          try {
            const enhancedData = JSON.parse(chatGPTResponse);
            if (enhancedData.location) {
              $('location').value = sanitizeCommas(enhancedData.location);
              markMissing();
              
              // Show success status
              $('ai-status').textContent = '✅ Location found with AI';
              $('ai-status').classList.remove('ai-status-loading');
              setTimeout(() => {
                $('ai-status').textContent = '🤖 Enhanced with AI';
                $('ai-status').classList.remove('ai-status-loading');
              }, 2000);
            } else {
              $('ai-status').textContent = '❌ No location found';
              $('ai-status').classList.remove('ai-status-loading');
            }
          } catch (parseError) {
            console.warn('Failed to parse location response:', parseError);
            $('ai-status').textContent = '❌ Failed to parse AI response';
            $('ai-status').classList.remove('ai-status-loading');
          }
        } else {
          $('ai-status').textContent = '❌ No AI response received';
          $('ai-status').classList.remove('ai-status-loading');
        }
      } else {
        $('ai-status').textContent = '❌ AI request failed';
        $('ai-status').classList.remove('ai-status-loading');
      }
      
    } catch (error) {
      console.error('AI location extraction failed:', error);
      $('status').textContent = 'AI location extraction failed. Please try again.';
      $('ai-status').textContent = '❌ AI error occurred';
      $('ai-status').classList.remove('ai-status-loading');
    } finally {
      button.textContent = originalText;
      button.classList.remove('ai-loading');
      button.style.pointerEvents = 'auto';
      $('location').classList.remove('ai-processing');
    }
    };
  }

  // Manual AI enhancement button
  const enhanceWithAIBtn = $('enhanceWithAI');
  if (enhanceWithAIBtn) {
    enhanceWithAIBtn.onclick = async () => {
    const button = $('enhanceWithAI');
    const originalText = button.textContent;
    
    try {
      button.textContent = '🤖 Enhancing all fields...';
      button.classList.add('ai-loading');
      button.style.pointerEvents = 'none';
      
      // Show AI status loading
      $('ai-status').textContent = '🤖 AI is analyzing job data...';
      $('ai-status').classList.add('ai-status-loading');
      
      // Add processing animation to all form fields
      $('company').classList.add('ai-processing');
      $('title').classList.add('ai-processing');
      $('location').classList.add('ai-processing');
      $('description').classList.add('ai-processing');
      
      // Get current form data
      const currentData = {
        company: $('company').value.trim(),
        title: $('title').value.trim(),
        location: $('location').value.trim(),
        jobId: $('jobId').value.trim(),
        status: $('status').value,
        url: $('url').value.trim(),
        description: $('description').value.trim()
      };
      
      // Get fresh page content
      const pageContent = await runInPage(tab.id, () => {
        const jobContent = document.querySelector('.jobs-unified-top-card, .job-details-jobs-unified-top-card, main, .jobs-description-content') || document.body;
        return jobContent.innerText || document.body.innerText || '';
      });
      
      // Enhance with ChatGPT
      const enhancedData = await enhanceJobDataWithChatGPT(pageContent, currentData);
      
      // Update form fields with enhanced data
      let fieldsUpdated = 0;
      if (enhancedData.company) { $('company').value = sanitizeCommas(enhancedData.company); fieldsUpdated++; }
      if (enhancedData.title) { $('title').value = sanitizeCommas(enhancedData.title); fieldsUpdated++; }
      if (enhancedData.location) { $('location').value = sanitizeCommas(enhancedData.location); fieldsUpdated++; }
      if (enhancedData.description) { $('description').value = enhancedData.description; fieldsUpdated++; }
      
      // Show success status
      if (fieldsUpdated > 0) {
        $('ai-status').textContent = `✅ Enhanced ${fieldsUpdated} field${fieldsUpdated > 1 ? 's' : ''} with AI`;
        $('ai-status').classList.remove('ai-status-loading');
        setTimeout(() => {
          $('ai-status').textContent = '🤖 Enhanced with AI';
          $('ai-status').classList.remove('ai-status-loading');
        }, 3000);
      } else {
        $('ai-status').textContent = '❌ No improvements found';
        $('ai-status').classList.remove('ai-status-loading');
      }
      
      // Update character count
      $('descCount').textContent = `${$('description').value.length} chars`;
      
      markMissing();
      
    } catch (error) {
      console.error('AI enhancement failed:', error);
      $('status').textContent = 'AI enhancement failed. Please try again.';
      $('ai-status').textContent = '❌ AI enhancement failed';
      $('ai-status').classList.remove('ai-status-loading');
    } finally {
      button.textContent = originalText;
      button.classList.remove('ai-loading');
      button.style.pointerEvents = 'auto';
      // Remove processing animations from all form fields
      $('company').classList.remove('ai-processing');
      $('title').classList.remove('ai-processing');
      $('location').classList.remove('ai-processing');
      $('description').classList.remove('ai-processing');
    }
    };
  }

  // sticky editor link
  const sticky = $('openStandalone');
  if (sticky) {
    sticky.onclick = async () => {
      try {
        // persist current form first
        saveDraft();
        const url = chrome.runtime.getURL('popup.html#standalone');
        // open in a new tab (works without extra permissions)
        await chrome.tabs.create({ url });
      } catch {
        // as a fallback, try a popup window (may require permissions)
        const url = chrome.runtime.getURL('popup.html#standalone');
        try { chrome.windows.create({ url, type: 'popup', width: 440, height: 700 }); } catch {}
      }
    };
  }

  // Save
  const saveBtn = $('save');
  if (!saveBtn) {
    console.error('❌ Save button not found!');
    return;
  }
  console.log('✅ Save button found, attaching event listener');
  saveBtn.addEventListener('click', async () => {
    console.log('💾 Save button clicked!');
    const btn = $('save');
    const progress = $('progress');
    const setStatus = (type, msg) => {
      $('status').textContent = msg || '';
      btn.classList.remove('saving','success','error');
      if (type) btn.classList.add(type);
    };
  
    // assemble payload (you already normalize desc in saveRow)
    const payload = {
      company: $('company').value.trim(),
      title: $('title').value.trim(),
      location: $('location').value.trim(),
      jobId: $('jobId').value.trim(),
      status: $('status').value,
      source: $('source').value,
      url: $('url').value.trim(),
      description: $('description').value.trim()
    };
  
    // basic required fields check
    const missingTitle = !payload.title;
    const missingUrl = !payload.url;
    const hint = $('validationHint');
    if (missingTitle || missingUrl) {
      if (hint) hint.style.display = '';
      $('title').classList.toggle('missing', missingTitle);
      $('url').classList.toggle('missing', missingUrl);
      setStatus('error', 'Need at least a job title + link.');
      btn.classList.add('error');
      return;
    } else {
      if (hint) hint.style.display = 'none';
    }
  
    try {
      // SAVING STATE
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>Saving…';
      setStatus('saving', 'Saving to Supabase…');
      progress.style.width = '35%';
  
      // fire request
      await saveRow(payload);
      try { chrome.storage?.local?.remove?.(DRAFT_KEY); } catch {}
      // fake a tiny progress finish so it feels smooth
      progress.style.width = '100%';
  
      // Notify parent window (floating button) that job was saved
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'JOB_SAVED' }, '*');
        console.log('📤 Sent JOB_SAVED message to parent window');
      }
  
      // SUCCESS STATE
      setTimeout(() => {
        btn.innerHTML = 'Saved ✓';
        setStatus('success', 'Saved to Supabase & Dashboard!');
        // Automatically clear fields after successful save
        clearFields();
      }, 150);

      // settle & reset progress bar for next time
      setTimeout(() => {
        btn.disabled = false;
        btn.classList.remove('saving','error');
        btn.classList.add('success');
        progress.style.width = '0%';
        // keep "Saved ✓" for a moment then restore label
        setTimeout(() => { btn.classList.remove('success'); btn.textContent = 'Save Job'; }, 1200);
      }, 600);
  
    } catch (e) {
      // ERROR STATE
      btn.disabled = false;
      btn.textContent = 'Save Job';
      progress.style.width = '0%';
      setStatus('error', 'Could not save. Check your network connection.');
    }
  });
  

  // clear fields button (top)
  const clearBtn = $('clearTop');
  if (clearBtn) {
    console.log('✅ Clear button found, attaching event listener');
    clearBtn.addEventListener('click', () => {
      console.log('🧹 Clear button clicked!');
      clearFields();
    });
  } else {
    console.error('❌ Clear button not found!');
  }

  // redo button (clear and refetch)
  const redoBtn = $('redoTop');
  if (redoBtn) {
    console.log('✅ Redo button found, attaching event listener');
    redoBtn.addEventListener('click', async () => {
      console.log('🔄 Redo button clicked!');
      try {
      // Clear fields first
      clearFields();
      
      // Show loading state
      $('status').textContent = 'Refetching job data...';
      
      // Get current tab and refetch data
      const tab = await getTab();
      const scrapedData = await scrapeFromPage(tab.id);
      
      if (scrapedData) {
        // Fill form with scraped data
        $('company').value = sanitizeCommas(scrapedData.company || '');
        $('title').value = sanitizeCommas(scrapedData.title || '');
        $('location').value = sanitizeCommas(scrapedData.location || '');
        $('url').value = sanitizeCommas(scrapedData.url || tab.url || '');
        $('description').value = cleanWhitespace(scrapedData.description || '');
        
        // Update character count
        updateCount();
        
        $('status').textContent = 'Job data refetched successfully!';
        setTimeout(() => $('status').textContent = '', 2000);
      } else {
        $('status').textContent = 'No job data found on this page';
        setTimeout(() => $('status').textContent = '', 2000);
      }
    } catch (error) {
      console.error('Error refetching job data:', error);
      $('status').textContent = 'Error refetching data';
      setTimeout(() => $('status').textContent = '', 2000);
    }
    });
  } else {
    console.error('❌ Redo button not found!');
  }

  // close button
  const closeBtn = $('close');
  if (closeBtn) {
    console.log('✅ Close button found, attaching event listener');
    closeBtn.addEventListener('click', () => {
      console.log('❌ Close button clicked!');
      // If in standalone mode (floating popup), send message to close
      if (isStandalone || location.search.includes('standalone=1')) {
        window.parent.postMessage({ type: 'CLOSE_POPUP' }, '*');
      } else {
        // Regular popup - just close the window
        window.close();
      }
    });
  }

  // shortcuts
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); $('save').click(); }
    if (e.key === 'Escape' && !isStandalone) { e.preventDefault(); window.close(); }
  });
});
