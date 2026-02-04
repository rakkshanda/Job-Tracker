// Floating button content script - injected into web pages
(function() {
  'use strict';

  // Check if button already exists
  if (document.getElementById('job-tracker-floating-btn')) {
    return;
  }


  // Create floating button
  const floatingBtn = document.createElement('div');
  floatingBtn.id = 'job-tracker-floating-btn';
  floatingBtn.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z" fill="white"/>
      <path d="M7 7H17V9H7V7Z" fill="white"/>
      <path d="M7 11H17V13H7V11Z" fill="white"/>
      <path d="M7 15H14V17H7V15Z" fill="white"/>
    </svg>
  `;

  // Styles for floating button
  const styles = `
    #job-tracker-floating-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      z-index: 999998;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      animation: fadeInUp 0.4s ease-out;
    }

    #job-tracker-floating-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2), 0 3px 6px rgba(0, 0, 0, 0.15);
    }

    #job-tracker-floating-btn:active {
      transform: scale(0.95);
    }

    #job-tracker-floating-btn.active {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }

    #job-tracker-floating-btn.loading {
      pointer-events: none;
      animation: pulse 1.5s ease-in-out infinite;
    }

    #job-tracker-floating-btn.loading::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: 50%;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      animation: spin 0.8s linear infinite;
    }

    #job-tracker-floating-btn.saving {
      animation: shrinkPulse 0.6s ease-in-out;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      50% {
        transform: scale(1.05);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
      }
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @keyframes shrinkPulse {
      0% {
        transform: scale(1);
      }
      50% {
        transform: scale(0.7);
      }
      100% {
        transform: scale(1);
      }
    }

    /* Popup container */
    #job-tracker-popup-container {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 450px;
      height: 420px;
      max-height: 90vh;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 10px 30px rgba(0, 0, 0, 0.15);
      z-index: 999999;
      overflow: hidden;
      animation: slideInUp 0.3s ease-out;
      display: none;
    }

    #job-tracker-popup-container.visible {
      display: flex;
      flex-direction: column;
    }

    #job-tracker-popup-container.dragging {
      cursor: grabbing;
      opacity: 0.95;
    }

    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* Drag handle */
    #job-tracker-drag-handle {
      width: 100%;
      height: 40px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      cursor: grab;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      flex-shrink: 0;
    }

    #job-tracker-drag-handle:active {
      cursor: grabbing;
    }

    #job-tracker-drag-handle::before {
      content: '';
      width: 40px;
      height: 4px;
      background: rgba(255, 255, 255, 0.5);
      border-radius: 2px;
    }

    #job-tracker-popup-iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
      flex: 1;
    }

    /* Draggable styles */
    #job-tracker-floating-btn.dragging {
      cursor: grabbing;
      opacity: 0.8;
    }
  `;

  let sharedScraperLoaded = false;
  let sharedScraperLoading = null;

  async function ensureSharedScraper() {
    if (sharedScraperLoaded && typeof window.__scrapeJob === 'function') return;
    if (sharedScraperLoading) {
      await sharedScraperLoading;
      return;
    }
    sharedScraperLoading = (async () => {
      try {
        const res = await fetch(chrome.runtime.getURL('scrape.js'));
        const code = await res.text();
        // Execute the shared scraper in this context so __scrapeJob matches Redo flow
        (0, eval)(code);
        sharedScraperLoaded = true;
        console.log('✅ Shared scraper (scrape.js) loaded in floating button context');
      } catch (e) {
        console.warn('⚠️ Failed to load shared scraper:', e);
      } finally {
        sharedScraperLoading = null;
      }
    })();
    await sharedScraperLoading;
  }

  // Add styles to page
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // Create popup container
  const popupContainer = document.createElement('div');
  popupContainer.id = 'job-tracker-popup-container';

  // Create drag handle (top)
  const dragHandle = document.createElement('div');
  dragHandle.id = 'job-tracker-drag-handle';
  dragHandle.title = 'Drag to move popup';

  // Create iframe for popup content
  const iframe = document.createElement('iframe');
  iframe.id = 'job-tracker-popup-iframe';
  iframe.src = chrome.runtime.getURL('popup.html?standalone=1');
  
  popupContainer.appendChild(dragHandle);
  popupContainer.appendChild(iframe);

  // Add elements to page
  document.body.appendChild(floatingBtn);
  document.body.appendChild(popupContainer);

  // Track popup state
  let isPopupOpen = false;
  let scrapedData = null;

  // Listen for messages from popup (e.g., save clicked)
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'JOB_SAVED') {
      console.log('💾 Job saved! Triggering button animation...');
      floatingBtn.classList.add('saving');
      setTimeout(() => {
        floatingBtn.classList.remove('saving');
      }, 600); // Match animation duration
    }
  });

  // Toggle popup function
  async function togglePopup() {
    isPopupOpen = !isPopupOpen;
    if (isPopupOpen) {
      // Show loading animation
      floatingBtn.classList.add('loading');
      
      // Load iframe first
      iframe.src = chrome.runtime.getURL('popup.html?standalone=1&scraped=true&ts=' + Date.now());
      console.log('🎉 Popup loading with iframe src:', iframe.src);
      
      popupContainer.classList.add('visible');
      floatingBtn.classList.add('active');
      
      // Wait for iframe to load, then notify scraping started
      iframe.onload = async () => {
        console.log('📤 Notifying popup that scraping started...');
        try {
          iframe.contentWindow.postMessage({ type: 'SCRAPING_STARTED' }, '*');
        } catch (e) {
          console.error('Failed to send SCRAPING_STARTED:', e);
        }
        
        // Scrape data from current page with brief retries until complete
        console.log('🔍 Scraping job data from page with retries...');
        console.log('Current URL:', window.location.href);

        const isComplete = (d) => {
          if (!d) return false;
          const titleOk = !!(d.title && d.title.trim());
          const companyOk = !!(d.company && d.company.trim());
          const locationOk = !!(d.location && d.location.trim());
          const descOk = !!(d.description && d.description.trim());
          return titleOk && companyOk && locationOk && descOk;
        };

        const maxTries = 10; // ~2s total with 200ms delay
        const delay = (ms) => new Promise(r => setTimeout(r, ms));
        let attempt = 0;
        let last = null;
        while (attempt < maxTries) {
          attempt++;
          try {
            last = await scrapeCurrentPage();
            console.log(`🔎 Attempt ${attempt}/${maxTries} complete=`, isComplete(last));
            if (isComplete(last)) break;
          } catch (e) {
            console.warn('Scrape attempt failed:', e);
          }
          await delay(200);
        }
        scrapedData = last || {};
        
        console.log('✅ Scraped data:', scrapedData);
        console.log('Data keys:', Object.keys(scrapedData));
        console.log('Title:', scrapedData.title);
        console.log('Company:', scrapedData.company);
        
        // Remove loading animation
        floatingBtn.classList.remove('loading');
        
        // Send scraped data to popup
        console.log('📤 Sending scraped data to popup iframe...');
        try {
          iframe.contentWindow.postMessage({ type: 'SCRAPED_DATA', data: scrapedData }, '*');
        } catch (e) {
          console.error('Failed to send data to popup:', e);
        }
        console.log('✅ Data sent to popup');
      };
    } else {
      popupContainer.classList.remove('visible');
      floatingBtn.classList.remove('active');
      console.log('❌ Popup closed');
    }
  }

  // Scrape job data from current page
  async function scrapeCurrentPage() {
    try {
      const pageUrl = window.location.href;
      const pageTitle = document.title;
      
      // Helper functions
      const txt = (el) => (el ? (el.textContent || "").trim() : "");
      const clean = (s = "") => s.replace(/\s+/g, " ").replace(/\u00A0/g, " ").trim();
      const first = (...sels) => {
        for (const s of sels) {
          try {
            const el = document.querySelector(s);
            if (el) return el;
          } catch (e) {
            continue;
          }
        }
        return null;
      };
      
      // Initialize job data
      const jobData = {
        url: pageUrl,
        title: '',
        company: '',
        location: '',
        description: '',
        jobId: ''
      };

      // Prefer shared scraper (same as Redo) for consistency
      await ensureSharedScraper();
      if (typeof window.__scrapeJob === 'function') {
        try {
          const sharedResult = window.__scrapeJob();
          if (sharedResult && (sharedResult.title || sharedResult.company || sharedResult.location || sharedResult.description)) {
            console.log('🔁 Shared scraper result:', sharedResult);
            return {
              ...jobData,
              ...sharedResult,
              jobId: sharedResult.job_id || sharedResult.jobId || jobData.jobId,
              description: sharedResult.description || jobData.description,
              company: sharedResult.company || jobData.company,
              title: sharedResult.title || jobData.title,
              location: sharedResult.location || jobData.location
            };
          }
        } catch (e) {
          console.warn('⚠️ Shared scraper execution failed:', e);
        }
      }

      // Try JSON-LD first (works for many job boards)
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of jsonLdScripts) {
        try {
          const data = JSON.parse(script.textContent);
          const items = Array.isArray(data) ? data : [data];
          for (const d of items) {
            if (d && (d["@type"] === "JobPosting" || d.type === "JobPosting")) {
              jobData.title = clean(d.title || d.positionTitle || "");
              jobData.company = clean(d.hiringOrganization?.name || d.hiringOrganization?.["@id"] || "");
              
              // Extract location from various formats
              if (d.jobLocation) {
                const loc = d.jobLocation;
                if (typeof loc === 'string') {
                  jobData.location = clean(loc);
                } else if (loc.address) {
                  const addr = loc.address;
                  const parts = [
                    addr.addressLocality,
                    addr.addressRegion,
                    addr.addressCountry
                  ].filter(Boolean);
                  jobData.location = clean(parts.join(", "));
                } else if (loc.name) {
                  jobData.location = clean(loc.name);
                }
              }
              
              jobData.description = clean((d.description || "").replace(/<[^>]+>/g, " ").substring(0, 1000));
              
              // Try to extract job ID from JSON-LD
              jobData.jobId = clean(d.identifier?.value || d.identifier || d.jobId || d.id || "");
              
              if (jobData.title || jobData.company) {
                console.log('✅ Found data via JSON-LD:', jobData);
                return jobData;
              }
            }
          }
        } catch (e) {
          console.log('⚠️ Error parsing JSON-LD:', e);
        }
      }

      const scrapeTikTokFromPage = () => {
        const container = document.querySelector('.jobDetail.positionDetail__1AqfZ, .jobDetail__1UFk5, .jobDetail');
        if (!container) return null;
        const titleEl = container.querySelector('[data-test="jobTitle"], h1, h2');
        const jobTitle = clean(txt(titleEl));
        let locationText = '';
        const locEl = container.querySelector('.job-info .content__3ZUKJ.clamp-content, .job-info [class*="content"], [data-test="job-location"]');
        if (locEl) locationText = clean(txt(locEl));
        let jobIdText = '';
        container.querySelectorAll('.job-info span, .job-info div').forEach(span => {
          const t = (span.textContent || '').trim();
          const match = t.match(/Job ID:\s*(\S+)/i);
          if (match && !jobIdText) jobIdText = match[1];
        });
        if (!jobIdText) {
          try {
            const u = new URL(pageUrl);
            const parts = u.pathname.split('/').filter(Boolean);
            if (parts.length >= 3) jobIdText = parts[2];
          } catch {}
        }
        const descParts = [];
        container.querySelectorAll('.block-title, .block-content, .description-block, .section-content').forEach(el => {
          const text = clean(txt(el));
          if (text) descParts.push(text);
        });
        const jobDescription = descParts.join('\n\n') || clean(txt(container));
        return {
          company: 'TikTok',
          title: jobTitle,
          location: locationText,
          jobId: jobIdText,
          description: jobDescription.slice(0, 3000)
        };
      };

      const isTikTokHost = (() => {
        try { return new URL(pageUrl).hostname.includes('lifeattiktok.com'); }
        catch { return pageUrl.includes('lifeattiktok.com'); }
      })();

      if (isTikTokHost) {
        const tikTokData = scrapeTikTokFromPage();
        if (tikTokData) {
          Object.assign(jobData, tikTokData);
          // Early return since we have site-specific data
          return jobData;
        }
      }
      // LinkedIn
      if (pageUrl.includes('linkedin.com/jobs')) {
        jobData.title = txt(first('.job-details-jobs-unified-top-card__job-title', '.jobs-unified-top-card__job-title', 'h1.t-24', 'h1'));
        jobData.company = txt(first('.job-details-jobs-unified-top-card__company-name', '.jobs-unified-top-card__company-name', 'a.app-aware-link'));
        
        // LinkedIn location - try multiple selectors
        jobData.location = txt(first(
          '.job-details-jobs-unified-top-card__bullet',
          '.jobs-unified-top-card__bullet',
          'span.jobs-unified-top-card__workplace-type',
          'span.job-details-jobs-unified-top-card__workplace-type',
          '.job-details-jobs-unified-top-card__primary-description span',
          '.jobs-unified-top-card__primary-description span',
          'span[class*="workplace"]',
          'span[class*="location"]'
        ));
        
        // If still no location, try to find it in the company info section
        if (!jobData.location) {
          const companyInfoSection = document.querySelector('.job-details-jobs-unified-top-card__primary-description, .jobs-unified-top-card__primary-description');
          if (companyInfoSection) {
            const spans = companyInfoSection.querySelectorAll('span');
            for (const span of spans) {
              const text = txt(span);
              // Location usually contains city/state or "Remote"
              if (text && (text.includes(',') || text.toLowerCase().includes('remote') || /[A-Z][a-z]+,\s*[A-Z]{2}/.test(text))) {
                jobData.location = text;
                break;
              }
            }
          }
        }
        
        jobData.description = txt(first('.jobs-description-content__text', '.jobs-box__html-content', '#job-details'))?.substring(0, 1000) || '';
      }
      // Microsoft Careers
      else if (pageUrl.includes('careers.microsoft.com') || pageUrl.includes('jobs.careers.microsoft.com')) {
        jobData.title = txt(first('h1[data-automation-id="jobTitle"]', 'h1', '[class*="title"]'));
        jobData.company = 'Microsoft';
        jobData.location = txt(first(
          '[data-automation-id="jobLocation"]',
          '[class*="location"]',
          '.job-info span',
          'div[class*="Location"]'
        ));
        jobData.description = txt(first(
          '[data-automation-id="jobDescription"]',
          '[class*="description"]',
          '.job-description',
          'main'
        ))?.substring(0, 1000) || '';
      }
      // Indeed
      else if (pageUrl.includes('indeed.com')) {
        jobData.title = txt(first('h1[class*="jobTitle"]', 'h1.jobsearch-JobInfoHeader-title', 'h1'));
        jobData.company = txt(first('[data-company-name="true"]', '[class*="companyName"]', 'div[data-testid="inlineHeader-companyName"]'));
        jobData.location = txt(first('[data-testid="job-location"]', '[class*="companyLocation"]'));
        jobData.description = txt(first('#jobDescriptionText', '[id*="jobDesc"]', '.jobsearch-jobDescriptionText'))?.substring(0, 1000) || '';
      }
      // Handshake
      else if (pageUrl.includes('joinhandshake.com') || pageUrl.includes('handshake.com')) {
        jobData.title = txt(first('h1[class*="jobTitle"]', 'h1', '[class*="title"]'));
        // Handshake company detection
        const aboutEmployerHeadings = Array.from(document.querySelectorAll('h1, h2, h3, h4'))
          .filter(h => h.textContent?.toLowerCase().includes('about the employer'));
        for (const heading of aboutEmployerHeadings) {
          const container = heading.closest('div, section');
          if (container) {
            const companyEl = container.querySelector('p.heading, .heading');
            if (companyEl) {
              jobData.company = clean(companyEl.textContent);
              break;
            }
          }
        }
        if (!jobData.company) {
          jobData.company = txt(first('[class*="company"]', '[class*="employer"]'));
        }
        jobData.location = txt(first('[class*="location"]', '[class*="Location"]'));
        jobData.description = txt(first('[class*="description"]', 'main', 'article'))?.substring(0, 1000) || '';
      }
      // Greenhouse
      else if (pageUrl.includes('greenhouse.io') || pageUrl.includes('boards.greenhouse.io')) {
        jobData.title = txt(first('.app-title', 'h1'));
        jobData.company = txt(first('.company-name', '[class*="company"]'));
        jobData.location = txt(first('.location', '[class*="location"]'));
        jobData.description = txt(first('#content', '.body', '.content'))?.substring(0, 1000) || '';
      }
      // Lever
      else if (pageUrl.includes('lever.co')) {
        jobData.title = txt(first('.posting-headline h2', 'h2', 'h1'));
        jobData.company = txt(first('.main-header-text-item-company', '[class*="company"]'));
        jobData.location = txt(first('.posting-categories .location', '.location'));
        jobData.description = txt(first('.section-wrapper .content', '.content', 'main'))?.substring(0, 1000) || '';
      }
      // Workday
      else if (pageUrl.includes('myworkdayjobs.com') || pageUrl.includes('workday.com')) {
        jobData.title = txt(first('h2[data-automation-id="jobPostingHeader"]', 'h1', 'h2'));
        jobData.company = txt(first('[data-automation-id="company"]', '[class*="company"]')) || pageUrl.split('.myworkdayjobs.com')[0].split('//')[1];
        jobData.location = txt(first('[data-automation-id="locations"]', '[class*="location"]'));
        jobData.description = txt(first('[data-automation-id="jobPostingDescription"]', '[class*="description"]'))?.substring(0, 1000) || '';
      }
      // Generic fallback
      else {
        jobData.title = txt(first('h1', '[class*="title"][class*="job"]', '[class*="job"][class*="title"]', '[role="heading"]')) || pageTitle;
        jobData.company = txt(first('[class*="company"]', '[class*="employer"]', '[class*="organization"]'));
        jobData.location = txt(first('[class*="location"]', '[class*="address"]'));
        jobData.description = txt(first('[class*="description"]', '[class*="detail"]', 'main', 'article'))?.substring(0, 1000) || '';
      }

      // Clean all fields
      Object.keys(jobData).forEach(key => {
        if (typeof jobData[key] === 'string') {
          jobData[key] = clean(jobData[key]);
        }
      });

      // Extract job ID from URL if not found yet
      if (!jobData.jobId) {
        try {
          const url = new URL(pageUrl);
          
          // LinkedIn: Extract from currentJobId or view parameters
          if (pageUrl.includes('linkedin.com')) {
            const currentJobId = url.searchParams.get('currentJobId');
            if (currentJobId) {
              jobData.jobId = currentJobId;
            } else {
              // Try to extract from path like /jobs/view/123456789/
              const match = pageUrl.match(/\/jobs\/view\/(\d+)/);
              if (match) jobData.jobId = match[1];
            }
          }
          
          // Indeed: Extract from jk parameter
          else if (pageUrl.includes('indeed.com')) {
            const jk = url.searchParams.get('jk');
            if (jk) jobData.jobId = jk;
          }
          
          // Handshake: Extract from job ID in path
          else if (pageUrl.includes('handshake')) {
            const match = pageUrl.match(/\/jobs\/(\d+)/);
            if (match) jobData.jobId = match[1];
          }
          
          // Generic: Try to extract any numeric ID from URL
          else {
            const match = pageUrl.match(/(?:job|position|posting)[\/\-_]?(?:id)?[\/\-_=]?(\d{5,})/i);
            if (match) jobData.jobId = match[1];
          }
        } catch (e) {
          console.log('⚠️ Could not extract job ID from URL:', e);
        }
      }
      
      console.log('📊 Scraped data:', jobData);
      return jobData;
    } catch (error) {
      console.error('❌ Error scraping page:', error);
      return {
        url: window.location.href,
        title: document.title,
        company: '',
        location: '',
        description: '',
        jobId: ''
      };
    }
  }

  // Click handler
  floatingBtn.addEventListener('click', (e) => {
    if (!isDraggingBtn) {
      togglePopup();
    }
  });

  // Listen for messages from the popup (like close button clicks)
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'CLOSE_POPUP') {
      if (isPopupOpen) {
        togglePopup();
      }
    }
  });

  // Click outside to close (optional - comment out if you want ONLY button to close)
  document.addEventListener('click', (e) => {
    if (isPopupOpen && 
        !popupContainer.contains(e.target) && 
        !floatingBtn.contains(e.target)) {
      // Optionally close when clicking outside
      // Uncomment the next line if you want this behavior:
      // togglePopup();
    }
  });

  // Make button draggable
  let isDraggingBtn = false;
  let btnCurrentX;
  let btnCurrentY;
  let btnInitialX;
  let btnInitialY;
  let btnXOffset = 0;
  let btnYOffset = 0;

  floatingBtn.addEventListener('mousedown', btnDragStart);
  floatingBtn.addEventListener('touchstart', btnDragStart);

  function btnDragStart(e) {
    if (e.type === 'touchstart') {
      btnInitialX = e.touches[0].clientX - btnXOffset;
      btnInitialY = e.touches[0].clientY - btnYOffset;
    } else {
      btnInitialX = e.clientX - btnXOffset;
      btnInitialY = e.clientY - btnYOffset;
    }

    if (e.target === floatingBtn || floatingBtn.contains(e.target)) {
      isDraggingBtn = true;
      floatingBtn.classList.add('dragging');
    }
  }

  document.addEventListener('mousemove', btnDrag);
  document.addEventListener('touchmove', btnDrag);
  document.addEventListener('mouseup', btnDragEnd);
  document.addEventListener('touchend', btnDragEnd);

  function btnDrag(e) {
    if (isDraggingBtn) {
      e.preventDefault();

      if (e.type === 'touchmove') {
        btnCurrentX = e.touches[0].clientX - btnInitialX;
        btnCurrentY = e.touches[0].clientY - btnInitialY;
      } else {
        btnCurrentX = e.clientX - btnInitialX;
        btnCurrentY = e.clientY - btnInitialY;
      }

      btnXOffset = btnCurrentX;
      btnYOffset = btnCurrentY;

      setTranslate(btnCurrentX, btnCurrentY, floatingBtn);
    }
  }

  function btnDragEnd(e) {
    if (isDraggingBtn) {
      btnInitialX = btnCurrentX;
      btnInitialY = btnCurrentY;
      isDraggingBtn = false;
      floatingBtn.classList.remove('dragging');
    }
  }

  // Make popup draggable
  let isDraggingPopup = false;
  let popupCurrentX;
  let popupCurrentY;
  let popupInitialX;
  let popupInitialY;
  let popupXOffset = 0;
  let popupYOffset = 0;

  dragHandle.addEventListener('mousedown', popupDragStart);
  dragHandle.addEventListener('touchstart', popupDragStart);

  function popupDragStart(e) {
    if (e.type === 'touchstart') {
      popupInitialX = e.touches[0].clientX - popupXOffset;
      popupInitialY = e.touches[0].clientY - popupYOffset;
    } else {
      popupInitialX = e.clientX - popupXOffset;
      popupInitialY = e.clientY - popupYOffset;
    }

    isDraggingPopup = true;
    popupContainer.classList.add('dragging');
  }

  document.addEventListener('mousemove', popupDrag);
  document.addEventListener('touchmove', popupDrag);
  document.addEventListener('mouseup', popupDragEnd);
  document.addEventListener('touchend', popupDragEnd);

  function popupDrag(e) {
    if (isDraggingPopup) {
      e.preventDefault();

      if (e.type === 'touchmove') {
        popupCurrentX = e.touches[0].clientX - popupInitialX;
        popupCurrentY = e.touches[0].clientY - popupInitialY;
      } else {
        popupCurrentX = e.clientX - popupInitialX;
        popupCurrentY = e.clientY - popupInitialY;
      }

      popupXOffset = popupCurrentX;
      popupYOffset = popupCurrentY;

      setTranslate(popupCurrentX, popupCurrentY, popupContainer);
    }
  }

  function popupDragEnd(e) {
    if (isDraggingPopup) {
      popupInitialX = popupCurrentX;
      popupInitialY = popupCurrentY;
      isDraggingPopup = false;
      popupContainer.classList.remove('dragging');
    }
  }

  function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
  }

  console.log('✅ Job Tracker floating button loaded');
})();
