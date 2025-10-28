# Sankey Diagram Feature Documentation

## Overview
Visual flow diagram showing how your job applications move through different statuses over time.

---

## ✨ Features

### **1. Interactive Sankey Diagram**
- Visualizes job application flow from one status to another
- Shows the volume of transitions between statuses
- Color-coded nodes for easy identification
- Gradient flow links showing transitions

### **2. Smart Filters**
- **Date Range**: Filter by "From Date" and "To Date"
- **Multi-Status Selection**: Choose which statuses to include
- **Real-time Updates**: Click "Apply Filters" to refresh diagram

### **3. Toggle View**
- **Show Sankey**: Switches from tracker table to Sankey diagram
- **Hide Sankey**: Returns to tracker table view
- Button changes dynamically based on current view

---

## 🎯 How to Use

### **Step 1: Open Sankey View**
1. Click the **"Show Sankey"** button in the top navigation bar (next to dark mode)
2. The tracker table disappears
3. Sankey diagram view opens

### **Step 2: Apply Filters (Optional)**
1. **From Date**: Select starting date for analysis
2. **To Date**: Select ending date for analysis
3. **Status Checkboxes**: Check/uncheck statuses to include
4. Click **"Apply Filters"** button

### **Step 3: Analyze the Flow**
- **Nodes**: Represent each status (Saved, Applied, Interview, etc.)
- **Links**: Show transitions between statuses
- **Thickness**: Indicates volume of jobs in that transition
- **Colors**: Gradient flows for better visualization

### **Step 4: Return to Tracker**
Click **"Hide Sankey"** button to return to normal tracker view

---

## 📊 What the Diagram Shows

### **Example Flow:**
```
Saved (20) ────────> Applied (15)
                         │
                         ├────> Interview (8)
                         │          │
                         │          ├──> Offer (2)
                         │          └──> Rejected (6)
                         │
                         └────> Rejected (7)
```

### **Interpretation:**
- **20 jobs** were initially saved
- **15 jobs** moved to Applied status
- **8 jobs** reached Interview stage
- **2 jobs** resulted in Offers
- **13 jobs** were Rejected (6 after interview, 7 after application)

---

## 🎨 Visual Elements

### **Node Colors:**
- **Purple/Indigo**: Initial statuses (Saved, Applied)
- **Pink/Red**: Interview stages
- **Orange**: Offers
- **Green**: Successful outcomes
- **Blue/Cyan**: Other transitions

### **Link Colors:**
- **Gradient**: Smooth color transition from source to destination
- **Opacity**: Semi-transparent for layered views
- **Thickness**: Proportional to volume

---

## 🔧 Technical Details

### **Status Transitions Tracked:**
- Saved → Applied
- Applied → Resume Screening
- Resume Screening → Interview
- Interview → Offer
- Interview → Rejected
- Applied → Rejected
- Any → Withdrawn
- Any → Ended

### **Data Source:**
- Uses `status_history` field from database
- Counts all transitions recorded in history
- Includes current status if different from last history entry

### **Filter Logic:**
```javascript
// Date Filter
if (dateFrom && job.applied_date < dateFrom) exclude
if (dateTo && job.applied_date > dateTo) exclude

// Status Filter
Shows job if it EVER had any of the selected statuses
(checks both current status and status_history)
```

---

## 📱 Responsive Design

### **Desktop:**
- Full-width diagram
- Filters in single row
- Height: 600px

### **Mobile/Tablet:**
- Filters stack vertically
- Diagram scales to screen width
- Touch-friendly controls

---

## 🎯 Use Cases

### **1. Conversion Funnel Analysis**
See how many jobs progress from Saved → Applied → Interview → Offer

### **2. Rejection Pattern**
Identify where most rejections happen (after application vs after interview)

### **3. Time Period Comparison**
Use date filters to compare Q1 vs Q2, or month-by-month

### **4. Status Focus**
Filter by specific statuses to analyze particular stages

### **5. Success Rate**
Visualize percentage of applications reaching interviews/offers

---

## 🔍 Example Scenarios

### **Scenario 1: Monthly Analysis**
```
From Date: 2025-10-01
To Date: 2025-10-31
Status: All checked
Result: Shows October job flow
```

### **Scenario 2: Interview Performance**
```
From Date: (empty)
To Date: (empty)
Status: Interview, Offer, Rejected checked
Result: Shows interview conversion rate
```

### **Scenario 3: Recent Applications**
```
From Date: 2025-10-15
To Date: 2025-10-27
Status: Saved, Applied checked
Result: Shows recent application activity
```

---

## 💡 Tips

### **Best Practices:**
1. **Start broad**: View all data first to see overall patterns
2. **Then narrow**: Use filters to drill down into specifics
3. **Compare periods**: Use date range to compare different time periods
4. **Track progress**: Check regularly to monitor improvement

### **Insights to Look For:**
- **Bottlenecks**: Where do most jobs stop progressing?
- **Success paths**: Which routes lead to offers?
- **Application volume**: How many jobs are you applying to?
- **Interview rate**: What % of applications reach interview?
- **Offer rate**: What % of interviews result in offers?

---

## 🐛 Troubleshooting

### **Diagram Not Showing:**
- Check if you have any jobs in database
- Ensure jobs have `status_history` populated
- Try clicking "Apply Filters" button

### **Empty Diagram:**
- Check date range filters (might be too narrow)
- Ensure at least one status checkbox is checked
- Verify jobs exist in the filtered date range

### **Wrong Data:**
- Click "Apply Filters" after changing filters
- Check that status_history is being recorded
- Reload dashboard to refresh data

---

## 🚀 Future Enhancements

Potential improvements:
- Export diagram as image (PNG/SVG)
- Time-series animation showing flow over time
- Custom date range presets (Last 7 days, Last month, etc.)
- Comparison view (e.g., This month vs Last month)
- Detailed statistics below diagram
- Click on node/link to see specific jobs
- Tooltip showing exact numbers on hover

---

## 📊 Technical Stack

- **Library**: Google Charts (Sankey package)
- **Data Structure**: Status history JSONB array
- **Rendering**: Client-side JavaScript
- **Styling**: Custom CSS with CSS variables
- **Responsive**: Flexbox with media queries

---

## 🎨 Customization

To customize colors, edit `dashboard.css`:

```css
/* Node colors */
colors: ['#6366f1', '#8b5cf6', '#ec4899', ...]

/* Link colors */
colors: ['#e0e7ff', '#f3e8ff', '#fce7f3', ...]
```

To adjust diagram size, edit `dashboard.js`:

```javascript
const options = {
    width: '100%',
    height: 600,  // Change this value
    ...
}
```

---

**Last Updated**: October 27, 2025  
**Version**: 1.0.0  
**Status**: ✅ Complete and ready to use

**Enjoy visualizing your job search journey!** 📈

