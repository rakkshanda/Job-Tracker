# Testing Status History Feature

## ✅ What Should Work

The status history tracking is designed to capture **ALL** status changes, including:

- ✅ Saved
- ✅ Applied
- ✅ Resume Screening
- ✅ Interview
- ✅ Offer
- ✅ Rejected
- ✅ Withdrawn
- ✅ Ended

---

## 🧪 How to Test

### Test 1: Change Status Multiple Times
1. Open your dashboard
2. Find any job
3. Change status from "Saved" → "Applied" ✅
4. Change status from "Applied" → "Interview" ✅
5. Change status from "Interview" → "Offer" ✅
6. Check: Date should update each time

### Test 2: View Full History
1. After making several status changes
2. Click the **edit icon** (pencil) on that job
3. Scroll down to **"Status Change History"**
4. You should see ALL changes listed

### Test 3: Check in Browser Console
1. Open browser console (F12)
2. Change a job status
3. Look for these logs:
   ```
   === UPDATING JOB STATUS ===
   Job ID: [some-uuid]
   New status: [your-selected-status]
   ✅ Status updated successfully in Supabase with history
   ```

---

## 🐛 Troubleshooting

### Issue: "It only works for Applied"

**Possible Causes:**

#### 1. **Browser Cache Issue**
**Solution:**
- Hard reload the dashboard: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Or clear browser cache and reload

#### 2. **Extension Not Reloaded**
**Solution:**
1. Go to `chrome://extensions/`
2. Find "Job Tracker" extension
3. Click the **refresh icon** 🔄
4. Reload your dashboard tab

#### 3. **Old Jobs Without History Array**
**Solution:**
If a job was created before the update, its `status_history` might be `null`:
```sql
-- Run this in Supabase to fix old jobs:
UPDATE jobs 
SET status_history = '[]'::jsonb 
WHERE status_history IS NULL;
```

#### 4. **Database Column Not Added**
**Solution:**
Verify the column exists:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'jobs' AND column_name = 'status_history';
```

Should return:
```
column_name      | data_type
-----------------+-----------
status_history   | jsonb
```

---

## 🔍 Debug Steps

### Step 1: Check Browser Console
1. Open dashboard
2. Press **F12** to open console
3. Change a job status to "Interview"
4. Look for these logs:
   - `=== UPDATING JOB STATUS ===`
   - `Job ID: ...`
   - `New status: interview`
   - `✅ Status updated successfully`

### Step 2: Check Database
1. Go to Supabase → Table Editor
2. Open the `jobs` table
3. Find the job you just updated
4. Check the `status_history` column
5. Should show JSON like:
   ```json
   [
     {"status": "saved", "timestamp": "2025-10-27T14:00:00.000Z", "date": "Oct 27, 2025, 2:00 PM"},
     {"status": "interview", "timestamp": "2025-10-27T15:30:00.000Z", "date": "Oct 27, 2025, 3:30 PM"}
   ]
   ```

### Step 3: Check Network Tab
1. Open browser console → **Network** tab
2. Change a job status
3. Look for a POST/PATCH request to Supabase
4. Check the **Request Payload** - should include `status_history`

---

## 💡 Expected Behavior

### Scenario: Changing from "Applied" to "Interview"

**What should happen:**
1. You select "Interview" from dropdown
2. Date below dropdown updates: "Changed: Oct 27, 3:30 PM" (in green)
3. Console logs: "✅ Status updated successfully in Supabase with history"
4. Green color fades after 2 seconds
5. If you click edit, you see both "Applied" and "Interview" in history

### Scenario: Changing to ANY Status

**All these should work:**
- Saved → Applied ✅
- Applied → Interview ✅
- Interview → Offer ✅
- Offer → Rejected ✅
- Applied → Withdrawn ✅
- Interview → Ended ✅
- Saved → Resume Screening ✅

---

## 🎯 Quick Fix Script

If some jobs aren't tracking properly, run this in Supabase:

```sql
-- 1. Initialize status_history for all jobs that don't have it
UPDATE jobs 
SET status_history = jsonb_build_array(
  jsonb_build_object(
    'status', status,
    'timestamp', created_at,
    'date', to_char(created_at, 'Mon DD, YYYY, HH12:MI AM')
  )
)
WHERE status_history IS NULL OR status_history = '[]'::jsonb;

-- 2. Verify it worked
SELECT id, title, status, status_history 
FROM jobs 
LIMIT 5;
```

This will:
- Add the current status as the first history entry
- Use the job's creation date as the timestamp
- Format the date properly

---

## ✅ Verification Checklist

- [ ] SQL column added to database
- [ ] Extension reloaded in Chrome
- [ ] Dashboard hard-refreshed
- [ ] Browser console shows no errors
- [ ] Date appears below dropdown after status change
- [ ] Edit modal shows status history section
- [ ] All status options work (not just "Applied")

---

## 📞 Still Not Working?

If you've tried everything above and it still only works for "Applied", please:

1. **Open browser console** (F12)
2. **Change status** to "Interview" or "Offer"
3. **Screenshot the console output**
4. **Check for any red error messages**

The console will tell us exactly what's going wrong!

