#!/usr/bin/env node

/**
 * Quick Reference: Handshake Selector Mapping
 * Updated: February 2026
 * 
 * Maps Handshake HTML elements to CSS selectors used in scrape.js
 */

const HANDSHAKE_SELECTORS = {
  company: {
    primary: ".sc-gcxUDs.hpUfZS span",
    alternatives: [
      ".sc-hshgAP.iZkjnF strong",
      ".sc-bZZWma.dahiGD + div span",
      "a[href*='/e/'] .sc-gcxUDs span",
      "a[data-size='xlarge'] .sc-gcxUDs span"
    ],
    fallback_function: "handshakeCompanyDetection()",
    html_example: `
      <a href="/e/1094546" class="sc-gOzKbT bemzZW">
        <div class="sc-hKxzkn iHDrTq">
          <div class="sc-gcxUDs hpUfZS">
            <span class="sc-fgrRzZ eZjQGI">Nerd Apply</span>
          </div>
        </div>
      </a>
    `
  },

  title: {
    primary: "h1.sc-jTpEuC",
    alternatives: [
      "a[class*='bemzZW'] h1",
      ".sc-eNfnwC.eQuENY",
      "h1[class*='sc-']",
      "h1"
    ],
    html_example: `
      <a class="sc-jizTit fzQIFp">
        <h1 class="sc-jTpEuC bfAxLl">Full-Stack Engineer</h1>
      </a>
    `
  },

  location: {
    primary: ".sc-ljmdQ.gBKIow span",
    alternatives: [
      ".sc-dZHWtV.kMjjyj span",
      ".sc-isTYMV.gHJTns",
      "span[class*='kzsNgN']"
    ],
    html_example: `
      <div class="sc-ljmdQ gBKIow">
        <div class="sc-dZHWtV kMjjyj">
          <span class="sc-kzsNgN jBuKlG">Onsite, based in New York, NY</span>
        </div>
      </div>
    `
  },

  salary: {
    selector: ".sc-oKZaW.gcHDVs .sc-iniiBN.juryxK",
    html_example: `
      <div class="sc-dmdkOH fRdCAZ">
        <div class="sc-oKZaW gcHDVs">
          <div class="sc-iniiBN juryxK">$90–130K/yr</div>
        </div>
      </div>
    `
  },

  description: {
    primary: ".sc-hAjDme.fsJHax",
    alternatives: [
      "p[class*='sc-kzlvbC']",
      ".sc-bCslmc.eAKqWU"
    ],
    html_example: `
      <div class="sc-bCslmc eAKqWU">
        <div class="sc-hAjDme fsJHax">
          <p>Description text here...</p>
        </div>
      </div>
    `
  }
};

/**
 * Helper function to test selectors on current page
 */
function testHandshakeSelectors() {
  console.log("🔍 Testing Handshake Selectors\n");
  
  const tests = {
    "Company": ".sc-gcxUDs.hpUfZS span",
    "Title": "h1.sc-jTpEuC",
    "Location": ".sc-ljmdQ.gBKIow span",
    "Salary": ".sc-oKZaW.gcHDVs .sc-iniiBN.juryxK",
  };

  for (const [name, selector] of Object.entries(tests)) {
    const element = document.querySelector(selector);
    const status = element ? "✓" : "✗";
    const value = element ? element.textContent.trim().substring(0, 50) : "Not found";
    console.log(`${status} ${name}: ${value}`);
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HANDSHAKE_SELECTORS, testHandshakeSelectors };
}
