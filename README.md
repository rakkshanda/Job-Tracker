# 🎯 Job Tracker Chrome Extension

A powerful Chrome extension to save, track, and manage your job applications with automatic scraping and Supabase integration.

## ✨ Features

### 🔍 **Automatic Job Scraping**
- **One-click save** from any job posting page
- Automatically extracts:
  - Job title
  - Company name
  - Location
  - Job description
  - Job ID (LinkedIn, Indeed, Handshake, etc.)
  - Source (auto-detected)
- Works on major job platforms:
  - LinkedIn
  - Indeed
  - Handshake
  - Microsoft Careers
  - And most job boards with structured data

### 📊 **Smart Dashboard**
- **Real-time stats:**
  - Total applications
  - Applications this week
  - Current streak
  - Interview count
- **Advanced filtering:**
  - Search by title, company, or location
  - Filter by status (Saved, Applied, Interview, Offer, etc.)
  - Filter by company
  - Filter by location
  - Date range filters
- **Status management:**
  - Saved
  - Applied
  - Resume Screening
  - Interview
  - Offer
  - Rejected
  - Withdrawn
  - Ended
- **Pagination:** 50 entries per page
- **Sortable columns:** Always shows most recent first
- **Bulk actions:** Delete multiple entries

### 🎨 **Beautiful UI**
- Modern, clean design
- Floating button that follows you on job pages
- Skeleton loading animations
- Responsive layout
- Smooth transitions

### 💾 **Data Management**
- **Supabase backend:** Secure cloud storage
- **Local backup:** Chrome storage for offline access
- **CSV Export:** Export all your data
- **Editable fields:** Update any field inline
- **Notes:** Add personal notes to each application

### 🔧 **Developer-Friendly**
- Clean, modular code
- Well-documented
- Easy to customize
- No build process required

---

## 🚀 Installation

### **Prerequisites**
- Google Chrome browser
- Supabase account (free tier works!)

### **Step 1: Set up Supabase**

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **SQL Editor** and run this schema:

```sql
CREATE TABLE jobs (
  id BIGSERIAL PRIMARY KEY,
  job_id TEXT,
  title TEXT NOT NULL,
  company TEXT,
  location TEXT,
  url TEXT,
  status TEXT DEFAULT 'saved' CHECK (status IN ('saved', 'applied', 'resume_screening', 'interview', 'offer', 'rejected', 'withdrawn', 'ended')),
  applied_date DATE,
  source TEXT DEFAULT 'URL',
  description TEXT,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_applied_date ON jobs(applied_date);
CREATE INDEX idx_jobs_company ON jobs(company);
```

4. Get your **API URL** and **anon key** from **Settings → API**

### **Step 2: Install the Extension**

1. Clone or download this repository:
```bash
git clone https://github.com/yourusername/save-jobs-extension.git
```

2. Open Chrome and go to `chrome://extensions/`

3. Enable **Developer mode** (toggle in top-right)

4. Click **Load unpacked**

5. Select the `save-jobs-extension` folder

### **Step 3: Configure Supabase**

1. Click the extension icon in Chrome
2. Click **Options** or right-click → **Options**
3. Enter your:
   - Supabase URL
   - Supabase API Key (anon key)
4. Click **Save**

### **Step 4: (Optional) Configure OpenAI API**

If you want to use AI-enhanced job scraping:

1. Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Open `popup.js` and set `CHATGPT_API_KEY` to your key
3. **⚠️ SECURITY NOTE:** Never commit your API keys to GitHub!

✅ **You're all set!**

---

## 📖 Usage

### **Saving a Job**

1. Navigate to any job posting (LinkedIn, Indeed, etc.)
2. Click the **floating circular button** that appears on the page
3. Review the auto-filled information
4. Select status (Saved/Applied)
5. Click **Save Job**
6. Job is saved to Supabase and synced!

### **Managing Jobs**

1. Click the extension icon
2. Click **Open Dashboard** or right-click extension icon → **Open Dashboard**
3. View all your applications
4. Use filters to find specific jobs
5. Update status by clicking the dropdown in each row
6. Add notes by clicking the edit icon
7. Delete jobs with the delete icon

### **Filtering Jobs**

- **Search:** Type in the search box to filter by title, company, or location
- **Status filter:** Show only jobs with specific statuses
- **Company filter:** Filter by company name
- **Location filter:** Filter by location
- **Date range:** Show jobs from specific time periods
- **Clear filters:** Click the ❌ button to reset all filters

### **Exporting Data**

1. Open the dashboard
2. Click **Export CSV**
3. Your data downloads as a CSV file
4. Open in Excel, Google Sheets, etc.

---

## 🎯 Keyboard Shortcuts

- **Ctrl+Shift+J** (Windows/Linux) or **Cmd+Shift+J** (Mac): Open dashboard

---

## 📁 Project Structure

```
save-jobs-extension/
├── manifest.json           # Extension configuration
├── background.js           # Background service worker
├── popup.html              # Extension popup UI
├── popup.js                # Popup logic
├── dashboard.html          # Main dashboard UI
├── dashboard.js            # Dashboard logic
├── dashboard.css           # Dashboard styles
├── floating-button.js      # Injected floating button + scraper
├── scrape.js               # Legacy scraping logic
├── options.html            # Settings page
├── options.js              # Settings logic
├── icon16.png              # Extension icon
└── README.md               # This file
```

---

## 🛠️ Customization

### **Change Status Options**

Edit `dashboard.js` and `popup.js`:
```javascript
statusOptions: ['saved', 'applied', 'interview', 'offer', 'rejected']
```

### **Change Source Options**

Edit `dashboard.js` and `popup.html`:
```javascript
sourceOptions: ['LinkedIn', 'Indeed', 'Handshake', 'URL']
```

### **Modify Scraping Logic**

Edit `floating-button.js` → `scrapeCurrentPage()` function to add support for more job sites.

### **Styling**

Edit `dashboard.css` to customize colors, fonts, spacing, etc.

---

## 🔒 Privacy & Security

- ✅ **All data stored in YOUR Supabase account**
- ✅ **No third-party tracking**
- ✅ **No ads**
- ✅ **Open source - audit the code yourself**
- ✅ **Local Chrome storage backup**
- ✅ **Your API keys stored locally only**

---

## 🐛 Troubleshooting

### **Jobs not saving?**
1. Check your Supabase credentials in Options
2. Open browser console (F12) and check for errors
3. Verify your Supabase table schema matches the one above

### **Scraping not working?**
1. Some job sites use anti-bot protection
2. Try refreshing the page
3. Check browser console for errors
4. The extension works best on LinkedIn, Indeed, and Handshake

### **Dashboard not loading?**
1. Check your internet connection
2. Verify Supabase credentials
3. Check browser console for errors
4. Try clicking "Refresh Data"

### **Extension not appearing?**
1. Make sure you loaded the unpacked extension
2. Check that the extension is enabled in `chrome://extensions/`
3. Try refreshing the job page

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

---

## 📝 License

MIT License - feel free to use this for personal or commercial projects!

---

## 💼 More Projects

Check out my other projects:

1. **[Delivery Chatbot](https://github.com/yourusername/delivery-chatbot)** - AI-powered delivery assistant chatbot
2. **[Emerald](https://github.com/yourusername/emerald)** - [Project description]
3. **[Folklore](https://github.com/yourusername/folklore)** - [Project description]
4. **[Career Cupid](https://github.com/yourusername/career-cupid)** - Career matchmaking platform
5. **[Revre XR](https://github.com/yourusername/revre-xr)** - Extended reality experience
6. **[Hugging Face Project](https://github.com/yourusername/huggingface-project)** - ML/AI project using Hugging Face
7. **[ClaimRunner](https://github.com/yourusername/claimrunner)** - Claims management system
8. **Job Tracker Extension** (this project) - Chrome extension for tracking job applications

---

## 🙏 Acknowledgments

- Built with vanilla JavaScript (no frameworks!)
- Supabase for the amazing backend
- Font Awesome for icons
- All the job seekers out there - good luck! 🍀

---

## 📧 Support

If you find this useful, please ⭐ star the repo!

For issues or questions, open an issue on GitHub.

---

**Made with ❤️ for job seekers**

Happy job hunting! 🎉

