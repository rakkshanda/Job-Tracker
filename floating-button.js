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

      // Always rely on the shared scrape.js logic for consistency
      await ensureSharedScraper();
      if (typeof window.__scrapeJob === 'function') {
        try {
          const r = window.__scrapeJob();
          if (r && (r.title || r.company || r.location || r.description)) {
            console.log('🔁 Shared scraper result:', r);
            return {
              url: pageUrl,
              title: r.title || '',
              company: r.company || '',
              location: r.location || '',
              description: r.description || '',
              jobId: r.job_id || r.jobId || ''
            };
          }
        } catch (err) {
          console.warn('⚠️ Shared scraper execution failed:', err);
        }
      }

      console.warn('⚠️ Shared scraper unavailable or returned empty data. Falling back to empty result.');
      return {
        url: pageUrl,
        title: '',
        company: '',
        location: '',
        description: '',
        jobId: ''
      };
    } catch (e) {
      console.error('❌ scrapeCurrentPage failed:', e);
      return {
        url: window.location.href,
        title: '',
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
