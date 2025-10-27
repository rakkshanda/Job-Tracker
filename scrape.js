// Robust job scraper for many boards + JSON-LD fallback
(function () {
    const TLD = location.hostname.replace(/^www\./, "");
  
    const txt = (el) => (el ? (el.textContent || "").trim() : "");
    const attr = (sel, name) => {
      const el = document.querySelector(sel);
      return el ? (el.getAttribute(name) || "").trim() : "";
    };
    const first = (...sels) => {
      for (const s of sels) {
        try {
          const el = document.querySelector(s);
          if (el) return el;
        } catch (e) {
          // Invalid selector (e.g., :contains) – skip
          continue;
        }
      }
      return null;
    };
    const allSafe = (sel) => {
      try { return document.querySelectorAll(sel); } catch { return []; }
    };
    const clean = (s = "") =>
      s.replace(/\s+/g, " ").replace(/\u00A0/g, " ").trim();
  
    // Try to parse JSON-LD JobPosting
    function fromJsonLd() {
      const nodes = Array.from(
        document.querySelectorAll('script[type="application/ld+json"]')
      );
      for (const n of nodes) {
        try {
          const data = JSON.parse(n.textContent);
          const items = Array.isArray(data) ? data : [data];
          for (const d of items) {
            if (!d || (d["@type"] !== "JobPosting" && !(d.type === "JobPosting")))
              continue;
            const company =
              d.hiringOrganization?.name ||
              d.hiringOrganization?.["@id"] ||
              d.employerOverview ||
              "";
            const title = d.title || d.positionTitle || "";
            const loc =
              d.jobLocation?.address?.addressLocality &&
              d.jobLocation?.address?.addressRegion
                ? `${d.jobLocation.address.addressLocality}, ${d.jobLocation.address.addressRegion}`
                : d.jobLocation?.address?.addressRegion ||
                  d.jobLocation?.address?.addressLocality ||
                  d.jobLocation?.address?.addressCountry ||
                  d.jobLocation?.address?.addressLocalityCountry ||
                  d.jobLocation ||
                  "";
            const url = d.url || location.href;
            const description = (d.description || "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            if (title || company || description) {
              return {
                company: clean(company),
                title: clean(title),
                location: clean(loc),
                url: clean(url),
                description: clean(description),
              };
            }
          }
        } catch {}
      }
      return null;
    }
  
    // Special function for Handshake company detection
    function handshakeCompanyDetection() {
      // First, try to find the "About the employer" section specifically
      const aboutEmployerHeadings = Array.from(allSafe('h4, h3, h2, h1'))
        .filter(heading => heading.textContent && heading.textContent.toLowerCase().includes('about the employer'));
      
      for (const heading of aboutEmployerHeadings) {
        // Look for the company name in the same container or nearby
        const container = heading.closest('div, section, article');
        if (container) {
          // Look for elements with class "heading" or p tags with heading class
          const companyElements = container.querySelectorAll('p.heading, .heading, p[class*="heading"]');
          for (const el of companyElements) {
            const text = clean(el.textContent || "");
            if (text && text.length > 1 && text.length < 100 && 
                !text.toLowerCase().includes('about') &&
                !text.toLowerCase().includes('employer') &&
                !text.toLowerCase().includes('follow')) {
              return text;
            }
          }
          
          // Also try to find any text that looks like a company name in this section
          const allText = container.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
          for (const el of allText) {
            const text = clean(el.textContent || "");
            if (text && text.length > 1 && text.length < 100 && 
                !text.toLowerCase().includes('about') &&
                !text.toLowerCase().includes('employer') &&
                !text.toLowerCase().includes('follow') &&
                !text.toLowerCase().includes('job') &&
                !text.toLowerCase().includes('engineer') &&
                !text.toLowerCase().includes('developer') &&
                !text.toLowerCase().includes('posted') &&
                !text.toLowerCase().includes('employees') &&
                !text.toLowerCase().includes('internship') &&
                !text.toLowerCase().includes('spotlight')) {
              return text;
            }
          }
        }
      }
      
      // Fallback: try to find company name by looking for text that appears near company logos
      const logoElements = allSafe('img[src*="logo"], img[alt*="logo"], .logo, .company-logo, .employer-logo, [class*="logo"]');
      
      for (const logo of logoElements) {
        // Look for text in the same container or nearby
        const container = logo.closest('div, section, header, article');
        if (container) {
          // Look for heading tags or strong text in the same container
          const headings = container.querySelectorAll('h1, h2, h3, h4, strong, .company-name, .employer-name');
          for (const heading of headings) {
            const text = clean(heading.textContent || "");
            if (text && text.length > 1 && text.length < 50 && 
                !text.toLowerCase().includes('job') && 
                !text.toLowerCase().includes('engineer') &&
                !text.toLowerCase().includes('developer') &&
                !text.toLowerCase().includes('posted')) {
              return text;
            }
          }
        }
      }
      
      // Final fallback: look for any text that appears to be a company name
      const allText = Array.from(allSafe('h1, h2, h3, strong, .company-name, .employer-name'))
        .map(el => clean(el.textContent || ""))
        .filter(text => text && text.length > 1 && text.length < 50)
        .filter(text => {
          const lower = text.toLowerCase();
          return !lower.includes('job') && 
                 !lower.includes('engineer') && 
                 !lower.includes('developer') &&
                 !lower.includes('posted') &&
                 !lower.includes('apply') &&
                 !lower.includes('remote') &&
                 !lower.includes('hybrid') &&
                 !lower.includes('onsite') &&
                 !lower.includes('salary') &&
                 !lower.includes('benefits');
        });
      
      return allText[0] || "";
    }

    // Site-specific strategies
    const strategies = {
      // NEOGOV / GovernmentJobs
"governmentjobs.com": () => ({
  company: "City of Auburn", // if you’re on Auburn’s tenant; tweak to map per city if needed
  title: clean(txt(first("h1, .job-title, [data-testid='job-title']"))),
  location: clean(
    txt(first(".location, .job-location, [data-testid='location'], .header-meta, .job-info"))
  ) || "Auburn, WA",
  description: clean(
    txt(first("#job-description, .job-description, .description, main, article, .content"))
  )
}),
"attract.neogov.com": () => ({
  company: "City of Auburn",
  title: clean(txt(first("h1, .job-title"))),
  location: clean(txt(first(".location, .job-location, .subtitle, .meta"))) || "Auburn, WA",
  description: clean(
    txt(first("#job-description, .job-description, .description, main, article, .content"))
  )
}),

      // LinkedIn Jobs
      "linkedin.com": () => {
        // Updated LinkedIn scraping for current layout (2024)
        const company = clean(txt(first(
          // Current LinkedIn selectors (2024) - based on actual page structure
          ".job-details-jobs-unified-top-card__company-name",
          ".job-details-jobs-unified-top-card__company-name a",
          ".jobs-unified-top-card__company-name",
          ".jobs-unified-top-card__company-name a",
          
          // Job search results page selectors
          ".job-card-container__company-name",
          ".job-card-container__company-name a",
          ".job-card-list__company-name",
          ".job-card-list__company-name a",
          
          // Alternative selectors for different LinkedIn layouts
          ".jobs-details__main-content .jobs-details__company-name",
          ".jobs-details__main-content .jobs-details__company-name a",
          ".jobs-details__main-content h3",
          ".jobs-details__main-content .jobs-details__company-info h3",
          
          // Generic patterns
          "[data-testid='company-name']",
          ".company-name",
          ".employer-name",
          ".organization-name",
          
          // Fallback selectors
          ".topcard__org-name-link",
          ".job-details-jobs-unified-top-card__company-name",
          "h3[class*='company']",
          "a[class*='company']"
        )));

        const title = clean(txt(first(
          // Current LinkedIn job title selectors (2024)
          ".job-details-jobs-unified-top-card__job-title",
          ".job-details-jobs-unified-top-card__job-title a",
          ".jobs-unified-top-card__job-title",
          ".jobs-unified-top-card__job-title a",
          
          // Job search results page selectors
          ".job-card-container__title",
          ".job-card-container__title a",
          ".job-card-list__title",
          ".job-card-list__title a",
          
          // Alternative selectors for different LinkedIn layouts
          ".jobs-details__main-content h1",
          ".jobs-details__main-content .jobs-details__job-title",
          ".jobs-details__main-content .jobs-details__job-title a",
          
          // Generic patterns
          "[data-testid='job-title']",
          "h1",
          ".job-title",
          ".position-title",
          
          // Fallback selectors
          ".topcard__title",
          "h1[class*='title']",
          "a[class*='title']"
        )));

        const location = clean(txt(first(
          // Current LinkedIn location selectors (2024)
          ".job-details-jobs-unified-top-card__bullet",
          ".jobs-unified-top-card__bullet",
          ".job-details-jobs-unified-top-card__subtitle",
          ".jobs-unified-top-card__subtitle",
          
          // Job search results page selectors
          ".job-card-container__metadata-item",
          ".job-card-container__metadata-item--bullet",
          ".job-card-list__metadata-item",
          ".job-card-list__metadata-item--bullet",
          
          // Alternative selectors for different LinkedIn layouts
          ".jobs-details__main-content .jobs-details__location",
          ".jobs-details__main-content .jobs-details__metadata",
          ".jobs-details__main-content .jobs-details__metadata-item",
          
          // More specific LinkedIn location patterns
          ".jobs-unified-top-card__bullet--black",
          ".job-details-jobs-unified-top-card__bullet--black",
          ".jobs-unified-top-card__subtitle-item",
          ".job-details-jobs-unified-top-card__subtitle-item",
          ".jobs-unified-top-card__subtitle-item--bullet",
          ".job-details-jobs-unified-top-card__subtitle-item--bullet",
          
          // LinkedIn job header location patterns
          ".jobs-unified-top-card__job-title + .jobs-unified-top-card__subtitle",
          ".job-details-jobs-unified-top-card__job-title + .job-details-jobs-unified-top-card__subtitle",
          ".jobs-unified-top-card__company-name + .jobs-unified-top-card__subtitle",
          ".job-details-jobs-unified-top-card__company-name + .job-details-jobs-unified-top-card__subtitle",
          
          // LinkedIn specific location containers
          ".jobs-unified-top-card__subtitle .jobs-unified-top-card__bullet",
          ".job-details-jobs-unified-top-card__subtitle .job-details-jobs-unified-top-card__bullet",
          ".jobs-unified-top-card__subtitle .jobs-unified-top-card__subtitle-item",
          ".job-details-jobs-unified-top-card__subtitle .job-details-jobs-unified-top-card__subtitle-item",
          
          // Legacy selectors
          ".top-card-layout__second-subline .topcard__flavor--bullet",
          ".top-card-layout__second-subline .topcard__flavor",
          ".top-card-layout__second-subline .topcard__flavor--bullet",
          
          // Generic location patterns
          "[data-testid='inlineHeader-companyLocation']",
          "[data-testid='job-location']",
          "[data-testid='location']",
          ".location",
          ".job-location",
          ".work-location",
          ".job-loc",
          ".loc"
        ))) || (() => {
          // Advanced fallback: look for location patterns in the entire job card
          const jobCard = document.querySelector('.jobs-unified-top-card, .job-details-jobs-unified-top-card');
          if (jobCard) {
            // Look for text that matches location patterns
            const allText = Array.from(jobCard.querySelectorAll('*'))
              .map(el => clean(el.textContent || ''))
              .filter(text => text && text.length > 2 && text.length < 100)
              .filter(text => {
                const lower = text.toLowerCase();
                return /remote|hybrid|on[- ]site|work[- ]from[- ]home|wfh|full[- ]time|part[- ]time|contract|freelance|internship|[A-Za-z]+,\s*[A-Z]{2}\b|United States|USA|Canada|UK|Europe|India|Seattle|San Francisco|New York|Boston|Austin|London|Dublin|Los Angeles|Chicago|Denver|Portland|Vancouver|Toronto|Sydney|Melbourne|Berlin|Paris|Amsterdam|Singapore|Tokyo|Mountain View|Palo Alto|Menlo Park|Redmond|Bellevue|Kirkland/i.test(text);
              });
            
            if (allText.length > 0) {
              return allText[0];
            }
          }
          
          // Final fallback: look in the entire page for location patterns
          const locationPatterns = [
            /(?:Location|Work Location|Office Location|Job Location)[:\s]*([^\n\r]+)/i,
            /(?:Based in|Located in|Office in)[:\s]*([^\n\r]+)/i,
            /(?:Remote|Hybrid|On-site|Onsite|Work from home|WFH)/i,
            /([A-Za-z\s]+,\s*[A-Z]{2,3}(?:\s*,\s*[A-Za-z\s]+)?)/,
            /(?:United States|USA|Canada|UK|United Kingdom|Europe|India|Australia|Germany|France|Netherlands|Singapore|Japan)/i
          ];
          
          const pageText = document.body.innerText || '';
          for (const pattern of locationPatterns) {
            const match = pageText.match(pattern);
            if (match) {
              return clean(match[1] || match[0]);
            }
          }
          
          return '';
        })();

        const description = clean(txt(first(
          // Current LinkedIn description selectors
          ".jobs-description-content__text",
          ".jobs-description-content",
          ".jobs-description",
          ".job-details-jobs-unified-top-card__job-description",
          ".jobs-unified-top-card__job-description",
          
          // More specific LinkedIn selectors
          ".jobs-box__html-content",
          ".jobs-description-content__text",
          ".jobs-description-content__text p",
          ".jobs-description-content__text div",
          
          // Legacy selectors
          ".jobs-description-content__text",
          ".jobs-description-content",
          
          // Generic description patterns
          "[data-testid='job-description']",
          ".description",
          ".job-description",
          ".content",
          "main",
          "article"
        ))) || (() => {
          // Fallback: try to get description from multiple elements
          const descElements = document.querySelectorAll('.jobs-description-content__text p, .jobs-description-content__text div, .jobs-description-content p, .jobs-description-content div');
          if (descElements.length > 0) {
            return Array.from(descElements).map(el => clean(el.textContent || '')).join(' ').trim();
          }
          return '';
        })();

        return {
          company: company || "",
          title: title || "",
          location: location || "",
          url: location.href,
          description: description || ""
        };
      },
  
      // Indeed
      "indeed.com": () => ({
        company: clean(txt(first(
          ".jobsearch-CompanyInfoWithoutHeaderImage a", 
          ".jobsearch-InlineCompanyRating div:nth-child(1)",
          "[data-testid='companyName']",
          ".jobsearch-CompanyInfoWithoutHeaderImage",
          ".companyName",
          ".jobsearch-CompanyInfo"
        ))),
        title: clean(txt(first(
          "h1.jobsearch-JobInfoHeader-title",
          "[data-testid='job-title']",
          ".jobsearch-JobInfoHeader-title",
          "h1"
        ))),
        location: clean(txt(first(
          ".jobsearch-JobInfoHeader-subtitle > div:last-child", 
          "[data-testid='inlineHeader-companyLocation']",
          ".jobsearch-JobInfoHeader-subtitle",
          ".jobsearch-JobInfoHeader-subtitle-item",
          "[data-testid='job-location']"
        ))),
        description: clean(txt(first(
          "#jobDescriptionText",
          ".jobsearch-jobDescriptionText",
          "[data-testid='job-description']",
          ".jobsearch-JobComponent-description"
        ))),
      }),
  
      // Greenhouse
      "greenhouse.io": () => ({
        company:
          clean(txt(first(".company-name"))) ||
          clean(attr('meta[property="og:site_name"]', "content")),
        title: clean(txt(first("h1.app-title, h1"))),
        location: clean(txt(first(".location, .app-title + .info"))),
        description: clean(
          txt(first("#content, .opening, .job, .content, .section-wrapper"))
        ),
      }),
  
      // Lever
      "lever.co": () => ({
        company:
          clean(attr('meta[property="og:site_name"]', "content")) ||
          clean(txt(first(".posting-headline .company, .company-name"))),
        title: clean(txt(first("h2.title, h1.posting-title, h1"))),
        location: clean(
          txt(
            first(
              ".posting-categories .category, .posting-categories .sort-by-time, .posting-categories > div"
            )
          )
        ),
        description: clean(txt(first(".section.page, .posting-description, .description"))),
      }),
  
      // Workday (varies)
      "myworkdayjobs.com": () => ({
        company:
          clean(attr('meta[property="og:site_name"]', "content")) ||
          clean(txt(first("[data-automation-id='companyLogo'] + div"))) ||
          "",
        title: clean(
          txt(first("h1[role='heading'], [data-automation-id='jobPostingHeaderTitle'], h1"))
        ),
        location: clean(
          txt(
            first(
              "[data-automation-id='jobPostingLocations'], [data-automation-id='locations']"
            )
          )
        ),
        description: clean(
          txt(
            first(
              "[data-automation-id='jobPostingDescription'], #jobPostingDescription"
            )
          )
        ),
      }),
  
      // Ashby
      "ashbyhq.com": () => ({
        company:
          clean(attr('meta[property="og:site_name"]', "content")) ||
          clean(txt(first("a[href*='company']"))) ||
          "",
        title: clean(txt(first("h1, [data-testid='JobTitle']"))),
        location: clean(txt(first("[data-testid='JobLocation'], .location"))),
        description: clean(txt(first("[data-testid='JobDescription'], .description"))),
      }),
  
      // SmartRecruiters
      "smartrecruiters.com": () => ({
        company: clean(txt(first(".job-details__company, .company-name"))) || clean(attr('meta[property="og:site_name"]', 'content')),
        title: clean(txt(first("h1, .job-title"))),
        location: clean(txt(first(".job-location, .job-details__location"))),
        description: clean(txt(first(".job-sections, #st-jobDescription"))),
      }),
  
      // Taleo
      "taleo.net": () => ({
        company: clean(attr('meta[property="og:site_name"]', 'content')),
        title: clean(txt(first("h1, .title"))),
        location: clean(txt(first("#requisitionDescriptionInterface\\.location, .location"))),
        description: clean(txt(first("#requisitionDescriptionInterface\\.ID1618, .description"))),
      }),
  
      // Google Careers
      "careers.google.com": () => ({
        company: "Google",
        title: clean(txt(first("h1, [data-testid='job-title']"))),
        location: clean(txt(first("[data-testid='locations'], .gc-job-detail__header-location"))),
        description: clean(txt(first("[data-testid='job-description'], .gc-job-detail__content"))),
      }),
  
      // ByteDance (joinbytedance.com)
      "joinbytedance.com": () => ({
        company: "ByteDance",
        title: clean(txt(first("h1, [data-testid='position-title']"))),
        location:
          clean(txt(first("[data-testid='location'], .detail--location"))) ||
          clean(txt(first("div:has(> span:contains('Location')) + div"))) ||
          "",
        description: clean(
          txt(
            first(
              "[data-testid='job-description'], .description, .detail--description, #root"
            )
          )
        ),
      }),

      // AngelList/Wellfound
      "wellfound.com": () => ({
        company: clean(txt(first(".startup-link, .company-name, [data-test='startup-name']"))),
        title: clean(txt(first("h1, .job-title, [data-test='job-title']"))),
        location: clean(txt(first(".location, .job-location, [data-test='location']"))),
        description: clean(txt(first(".job-description, .description, .job-content"))),
      }),

      // Stack Overflow Jobs
      "stackoverflow.com": () => ({
        company: clean(txt(first(".company-name, .job-company-name"))),
        title: clean(txt(first("h1, .job-title"))),
        location: clean(txt(first(".job-location, .location, .job-meta .location"))),
        description: clean(txt(first(".job-description, .description"))),
      }),

      // ZipRecruiter
      "ziprecruiter.com": () => ({
        company: clean(txt(first(
          ".company_name",
          ".company-name",
          "[data-testid='company-name']",
          ".job_header .company_name",
          ".job_details .company_name"
        ))),
        title: clean(txt(first(
          "h1.job_title",
          "[data-testid='job-title']",
          ".job_title",
          "h1"
        ))),
        location: clean(txt(first(
          ".job_location",
          ".job-location",
          ".location",
          "[data-testid='job-location']",
          ".job_header .location"
        ))),
        description: clean(txt(first(
          ".job_description",
          ".job-description",
          "[data-testid='job-description']",
          ".job_details .description"
        ))),
      }),

      // Glassdoor
      "glassdoor.com": () => ({
        company: clean(txt(first(
          ".employerName",
          ".company-name",
          "[data-test='employer-name']",
          ".jobHeader .employerName",
          ".jobTitleContainer .employerName",
          ".jobTitleContainer .company-name"
        ))),
        title: clean(txt(first(
          "h1.jobTitle",
          "[data-test='job-title']",
          ".jobTitle",
          "h1"
        ))),
        location: clean(txt(first(
          ".location",
          ".job-location",
          ".loc",
          "[data-test='job-location']",
          ".jobHeader .location"
        ))),
        description: clean(txt(first(
          ".jobDescriptionContent",
          ".job-description",
          "[data-test='job-description']",
          ".jobDescription"
        ))),
      }),

      // Monster
      "monster.com": () => ({
        company: clean(txt(first(
          ".company-name",
          ".company_name",
          "[data-testid='company-name']",
          ".job-header .company-name",
          ".job-details .company-name"
        ))),
        title: clean(txt(first(
          "h1.job-title",
          "[data-testid='job-title']",
          ".job-title",
          "h1"
        ))),
        location: clean(txt(first(
          ".job-location",
          ".location",
          "[data-testid='job-location']",
          ".job-header .location"
        ))),
        description: clean(txt(first(
          ".job-description",
          ".description",
          "[data-testid='job-description']",
          ".job-details .description"
        ))),
      }),

      // Dice
      "dice.com": () => ({
        company: clean(txt(first(
          ".company-name",
          ".company_name",
          "[data-testid='company-name']",
          ".job-header .company-name"
        ))),
        title: clean(txt(first(
          "h1.job-title",
          "[data-testid='job-title']",
          ".job-title",
          "h1"
        ))),
        location: clean(txt(first(
          ".job-location",
          ".location",
          "[data-testid='job-location']",
          ".job-header .location"
        ))),
        description: clean(txt(first(
          ".job-description",
          ".description",
          "[data-testid='job-description']",
          ".job-details .description"
        ))),
      }),

      // CareerBuilder
      "careerbuilder.com": () => ({
        company: clean(txt(first(
          ".company-name",
          ".company_name",
          "[data-testid='company-name']",
          ".job-header .company-name"
        ))),
        title: clean(txt(first(
          "h1.job-title",
          "[data-testid='job-title']",
          ".job-title",
          "h1"
        ))),
        location: clean(txt(first(
          ".job-location",
          ".location",
          "[data-testid='job-location']",
          ".job-header .location"
        ))),
        description: clean(txt(first(
          ".job-description",
          ".description",
          "[data-testid='job-description']",
          ".job-details .description"
        ))),
      }),

      // SimplyHired
      "simplyhired.com": () => ({
        company: clean(txt(first(
          ".company-name",
          ".company_name",
          "[data-testid='company-name']",
          ".job-header .company-name"
        ))),
        title: clean(txt(first(
          "h1.job-title",
          "[data-testid='job-title']",
          ".job-title",
          "h1"
        ))),
        location: clean(txt(first(
          ".job-location",
          ".location",
          "[data-testid='job-location']",
          ".job-header .location"
        ))),
        description: clean(txt(first(
          ".job-description",
          ".description",
          "[data-testid='job-description']",
          ".job-details .description"
        ))),
      }),

      // FlexJobs
      "flexjobs.com": () => ({
        company: clean(txt(first(
          ".company-name",
          ".company_name",
          "[data-testid='company-name']",
          ".job-header .company-name"
        ))),
        title: clean(txt(first(
          "h1.job-title",
          "[data-testid='job-title']",
          ".job-title",
          "h1"
        ))),
        location: clean(txt(first(
          ".job-location",
          ".location",
          "[data-testid='job-location']",
          ".job-header .location"
        ))),
        description: clean(txt(first(
          ".job-description",
          ".description",
          "[data-testid='job-description']",
          ".job-details .description"
        ))),
      }),

      // Remote Job Sites
      "remote.co": () => ({
        company: clean(txt(first(".company-name", ".company_name", "[data-testid='company-name']"))),
        title: clean(txt(first("h1.job-title", "[data-testid='job-title']", ".job-title", "h1"))),
        location: clean(txt(first(".job-location", ".location", "[data-testid='job-location']"))),
        description: clean(txt(first(".job-description", ".description", "[data-testid='job-description']"))),
      }),

      "weworkremotely.com": () => ({
        company: clean(txt(first(".company-name", ".company_name", "[data-testid='company-name']"))),
        title: clean(txt(first("h1.job-title", "[data-testid='job-title']", ".job-title", "h1"))),
        location: clean(txt(first(".job-location", ".location", "[data-testid='job-location']"))),
        description: clean(txt(first(".job-description", ".description", "[data-testid='job-description']"))),
      }),

      "remotive.io": () => ({
        company: clean(txt(first(".company-name", ".company_name", "[data-testid='company-name']"))),
        title: clean(txt(first("h1.job-title", "[data-testid='job-title']", ".job-title", "h1"))),
        location: clean(txt(first(".job-location", ".location", "[data-testid='job-location']"))),
        description: clean(txt(first(".job-description", ".description", "[data-testid='job-description']"))),
      }),

      // Design Job Sites
      "dribbble.com": () => ({
        company: clean(txt(first(".company-name", ".company_name", "[data-testid='company-name']"))),
        title: clean(txt(first("h1.job-title", "[data-testid='job-title']", ".job-title", "h1"))),
        location: clean(txt(first(".job-location", ".location", "[data-testid='job-location']"))),
        description: clean(txt(first(".job-description", ".description", "[data-testid='job-description']"))),
      }),

      "behance.net": () => ({
        company: clean(txt(first(".company-name", ".company_name", "[data-testid='company-name']"))),
        title: clean(txt(first("h1.job-title", "[data-testid='job-title']", ".job-title", "h1"))),
        location: clean(txt(first(".job-location", ".location", "[data-testid='job-location']"))),
        description: clean(txt(first(".job-description", ".description", "[data-testid='job-description']"))),
      }),

      // Freelance Platforms
      "upwork.com": () => ({
        company: clean(txt(first(".company-name", ".company_name", "[data-testid='company-name']"))),
        title: clean(txt(first("h1.job-title", "[data-testid='job-title']", ".job-title", "h1"))),
        location: clean(txt(first(".job-location", ".location", "[data-testid='job-location']"))),
        description: clean(txt(first(".job-description", ".description", "[data-testid='job-description']"))),
      }),

      "freelancer.com": () => ({
        company: clean(txt(first(".company-name", ".company_name", "[data-testid='company-name']"))),
        title: clean(txt(first("h1.job-title", "[data-testid='job-title']", ".job-title", "h1"))),
        location: clean(txt(first(".job-location", ".location", "[data-testid='job-location']"))),
        description: clean(txt(first(".job-description", ".description", "[data-testid='job-description']"))),
      }),

      "fiverr.com": () => ({
        company: clean(txt(first(".company-name", ".company_name", "[data-testid='company-name']"))),
        title: clean(txt(first("h1.job-title", "[data-testid='job-title']", ".job-title", "h1"))),
        location: clean(txt(first(".job-location", ".location", "[data-testid='job-location']"))),
        description: clean(txt(first(".job-description", ".description", "[data-testid='job-description']"))),
      }),

      // AngelList (legacy)
      "angel.co": () => ({
        company: clean(txt(first(".startup-link, .company-name"))),
        title: clean(txt(first("h1, .job-title"))),
        location: clean(txt(first(".location, .job-location"))),
        description: clean(txt(first(".job-description, .description"))),
      }),

      // Handshake
      "joinhandshake.com": () => ({
        company: clean(txt(first(
          // Handshake-specific: Look for "About the employer" section
          "h4:contains('About the employer') + div p.heading",
          "h4:contains('About the employer') ~ div p.heading", 
          ".heading",
          "p.heading",
          
          // Look in "About the employer" section specifically
          "div:has(h4:contains('About the employer')) p.heading",
          "div:has(h4:contains('About the employer')) .heading",
          
          // Alternative selectors for the same pattern
          "h4:contains('About the employer') + * p.heading",
          "h4:contains('About the employer') + * .heading",
          
          // Main company name selectors (most specific first)
          "h1 + div h1", // Company name often appears as h1 after job title h1
          ".company-header h1",
          ".company-header h2", 
          ".job-header h1",
          ".job-header h2",
          ".employer-header h1",
          ".employer-header h2",
          
          // Common Handshake patterns
          ".company-name",
          ".employer-name",
          ".company-title",
          ".employer-title",
          
          // Data attributes
          "[data-testid='company-name']",
          "[data-testid='employer-name']",
          "[data-cy='company-name']",
          
          // Header and info sections
          ".job-header .company",
          ".job-detail-header .company",
          ".employer-info .name",
          ".company-info .name",
          "h2.company-name",
          ".company-header .name",
          
          // Look for text next to company logo
          ".company-logo + *",
          ".employer-logo + *",
          ".logo + *",
          
          // Generic patterns that might work
          ".header .company",
          ".page-header .company",
          ".job-details .company",
          ".job-info .company"
        ))) || handshakeCompanyDetection(),
        title: clean(txt(first(
          "h1.job-title",
          ".job-title",
          "[data-testid='job-title']",
          "h1",
          ".job-header h1"
        ))),
        location: clean(txt(first(
          ".job-location",
          ".location",
          "[data-testid='location']",
          ".job-detail-header .location",
          ".job-header .location"
        ))),
        description: clean(txt(first(
          ".job-description",
          ".description",
          "[data-testid='job-description']",
          ".job-details",
          ".job-content"
        ))),
      }),

      // Handshake (alternative domain)
      "app.joinhandshake.com": () => ({
        company: clean(txt(first(
          // Handshake-specific: Look for "About the employer" section
          "h4:contains('About the employer') + div p.heading",
          "h4:contains('About the employer') ~ div p.heading", 
          ".heading",
          "p.heading",
          
          // Look in "About the employer" section specifically
          "div:has(h4:contains('About the employer')) p.heading",
          "div:has(h4:contains('About the employer')) .heading",
          
          // Alternative selectors for the same pattern
          "h4:contains('About the employer') + * p.heading",
          "h4:contains('About the employer') + * .heading",
          
          // Main company name selectors (most specific first)
          "h1 + div h1", // Company name often appears as h1 after job title h1
          ".company-header h1",
          ".company-header h2", 
          ".job-header h1",
          ".job-header h2",
          ".employer-header h1",
          ".employer-header h2",
          
          // Common Handshake patterns
          ".company-name",
          ".employer-name",
          ".company-title",
          ".employer-title",
          
          // Data attributes
          "[data-testid='company-name']",
          "[data-testid='employer-name']",
          "[data-cy='company-name']",
          
          // Header and info sections
          ".job-header .company",
          ".job-detail-header .company",
          ".employer-info .name",
          ".company-info .name",
          "h2.company-name",
          ".company-header .name",
          
          // Look for text next to company logo
          ".company-logo + *",
          ".employer-logo + *",
          ".logo + *",
          
          // Generic patterns that might work
          ".header .company",
          ".page-header .company",
          ".job-details .company",
          ".job-info .company"
        ))) || handshakeCompanyDetection(),
        title: clean(txt(first(
          "h1.job-title",
          ".job-title",
          "[data-testid='job-title']",
          "h1",
          ".job-header h1"
        ))),
        location: clean(txt(first(
          ".job-location",
          ".location",
          "[data-testid='location']",
          ".job-detail-header .location",
          ".job-header .location"
        ))),
        description: clean(txt(first(
          ".job-description",
          ".description",
          "[data-testid='job-description']",
          ".job-details",
          ".job-content"
        ))),
      }),
    };
  
    function siteSpecific() {
      for (const key in strategies) {
        if (TLD.endsWith(key)) return strategies[key]();
      }
      return null;
    }
  
    function generic() {
      const company = (() => {
        // Try multiple company selectors in order of specificity
        const companySelectors = [
          // Data attributes
          "[data-company]",
          "[data-testid='company-name']",
          "[data-testid='companyName']",
          "[data-testid='employer-name']",
          "[data-cy='company-name']",
          
          // Common class patterns
          ".company-name",
          ".company_name", 
          ".employer-name",
          ".employer_name",
          ".job-company",
          ".job-company-name",
          ".company-title",
          ".company-header",
          ".employer-info",
          ".employer-header",
          
          // Header/org patterns
          ".topcard__org-name-link",
          ".org-name",
          ".organization-name",
          ".hiring-organization",
          
          // Generic company classes
          ".company",
          ".employer",
          ".organization",
          ".org",
          
          // Header patterns
          "h2.company",
          "h3.company", 
          ".header .company",
          ".job-header .company",
          ".page-header .company",
          
          // Link patterns (companies often wrapped in links)
          "a.company",
          "a[href*='company']",
          "a[href*='employer']",
          
          // Specific job board patterns
          ".job-details .company",
          ".job-info .company",
          ".job-meta .company",
          ".posting-header .company"
        ];
        
        // Try each selector
        for (const selector of companySelectors) {
          const el = document.querySelector(selector);
          if (el) {
            const text = clean(el.textContent || "");
            if (text && text.length > 1 && text.length < 100) {
              return text;
            }
          }
        }
        
        // Fallback to meta tags
        return clean(attr('meta[name="company"]', "content")) ||
               clean(attr('meta[property="og:site_name"]', "content")) ||
               clean(attr('meta[name="organization"]', "content")) ||
               clean(attr('meta[name="author"]', "content"));
      })();
  
      const title = clean(txt(first("h1, [data-testid='job-title']")));
      const locationGuess = (() => {
        // First try common location selectors
        const commonSelectors = [
          "[data-testid*='location']",
          "[data-testid*='Location']",
          ".location",
          ".job-location",
          ".work-location",
          ".job-loc",
          ".loc",
          "[class*='location']",
          "[class*='Location']",
          ".subtitle",
          ".meta",
          ".job-meta",
          ".job-info",
          ".job-details",
          ".header-meta",
          ".job-header-meta"
        ];
        
        for (const selector of commonSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            const text = clean(el.textContent || "");
            if (text && text.length < 100) return text;
          }
        }
        
        // Then try pattern matching in all text
        const cand = Array.from(
          document.querySelectorAll("li, span, div, p, dd, td, th")
        )
          .map((el) => clean(el.textContent || ""))
          .filter((t) => t && t.length > 3 && t.length < 100)
          .filter((t) =>
            /remote|hybrid|on[- ]site|work[- ]from[- ]home|wfh|full[- ]time|part[- ]time|contract|freelance|internship|[A-Za-z]+,\s*[A-Z]{2}\b|United States|USA|Canada|UK|Europe|India|Seattle|San Francisco|New York|Boston|Austin|London|Dublin|Los Angeles|Chicago|Denver|Portland|Vancouver|Toronto|Sydney|Melbourne|Berlin|Paris|Amsterdam|Singapore|Tokyo/i.test(
              t
            )
          );
        return cand[0] || "";
      })();
  
      // description: pick the largest meaningful text block
      let description = "";
      const blocks = [
        "#job-description",
        "[data-testid='job-description']",
        ".description, .job-description",
        "article",
        "main",
        ".content, .posting-description, .section.page",
      ];
      for (const b of blocks) {
        const el = document.querySelector(b);
        if (el && clean(el.innerText).length > 120) {
          description = clean(el.innerText);
          break;
        }
      }
      if (!description) {
        description = clean(document.body.innerText || "");
        if (description.length > 50000) description = description.slice(0, 50000);
      }
  
      return {
        company: company || "",
        title: title || "",
        location: locationGuess || "",
        url: location.href,
        description,
      };
    }
  
    function selectionAsDescription(base) {
      const sel = (window.getSelection && String(window.getSelection())) || "";
      if (sel && sel.length > 40) {
        base.description = clean(sel);
      }
      return base;
    }
  
    function truncateDescription(s, max = 50000) {
      if (!s) return "";
      const t = s.replace(/\s+/g, " ").trim();
      return t.length > max ? t.slice(0, max - 1) + "…" : t;
    }
  
    function scrape() {
      // 1) JSON-LD
      let data = fromJsonLd();
      // 2) Site specific
      if (!data) data = siteSpecific();
      // 3) Generic
      if (!data) data = generic();
  
      data = data || {};
      data.url = data.url || location.href;
  
      // If user has text selected, treat as description override
      data = selectionAsDescription(data);
  
      // Final cleanup
      data.company = clean(data.company || "");
      data.title = clean(data.title || "");
      data.location = clean(data.location || "");
      data.url = clean(data.url || "");
      data.description = truncateDescription(data.description || "");
  
      return data;
    }
  
    // expose for popup.js
    window.__scrapeJob = scrape;
  })();
  