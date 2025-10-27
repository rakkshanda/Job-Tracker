// Debug script to inspect LinkedIn page elements
function debugLinkedInPage() {
  console.log('=== LinkedIn Page Debug ===');
  
  // Check for common LinkedIn job page elements
  const elements = {
    'job-title': [
      '.job-details-jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__job-title',
      '.job-card-container__title',
      '.job-card-list__title',
      'h1'
    ],
    'company-name': [
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name',
      '.job-card-container__company-name',
      '.job-card-list__company-name',
      'h3'
    ],
    'location': [
      '.job-details-jobs-unified-top-card__bullet',
      '.jobs-unified-top-card__bullet',
      '.job-card-container__metadata-item',
      '.job-card-list__metadata-item'
    ]
  };
  
  const found = {};
  
  for (const [type, selectors] of Object.entries(elements)) {
    found[type] = {};
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        found[type][selector] = {
          text: element.textContent?.trim(),
          html: element.outerHTML.substring(0, 200) + '...'
        };
      }
    }
  }
  
  console.log('Found elements:', found);
  
  // Also check the page URL and title
  console.log('Page URL:', window.location.href);
  console.log('Page title:', document.title);
  
  // Check if we're on a job details page or search results
  const isJobDetails = window.location.href.includes('/jobs/view/') || 
                      document.querySelector('.job-details-jobs-unified-top-card') ||
                      document.querySelector('.jobs-unified-top-card');
  
  console.log('Is job details page:', isJobDetails);
  
  return found;
}

// Run the debug function
debugLinkedInPage();


