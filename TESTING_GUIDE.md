# AAU Nightlife Awards - Quick Testing Guide

## 🎯 System Status

✅ **Backend Server**: Running on http://localhost:5000
✅ **Frontend Server**: Running on http://localhost:5173
✅ **Database**: Connected to MongoDB Atlas
✅ **Test Data**: Seeded with 3 categories and 8 candidates

---

## 🌐 Access Points

### Public Features
1. **Main Awards Page**: http://localhost:5173/awards
   - View all voting categories
   - Browse candidates
   - Cast free votes with CAPTCHA
   - Purchase paid votes via Paystack
   - View live leaderboards
   - Check voting analytics

2. **Navigation**: Awards link added to main navbar (🏆 Awards)

### Admin Features
1. **Admin Awards Dashboard**: http://localhost:5173/admin/awards
   - Requires admin login
   - Create/Edit/Delete categories
   - Manage candidates
   - Schedule voting periods
   - Monitor real-time metrics

---

## 🗳️ Testing Free Voting

1. Go to http://localhost:5173/awards
2. Select a category (e.g., "Best Dressed")
3. Click **"🆓 Free Vote"** on any candidate
4. CAPTCHA will appear (test mode uses mock token)
5. Vote is recorded instantly
6. Progress bar updates in real-time
7. Check leaderboard to see your vote

**Note**: Currently set to allow one free vote per session. In production, this is one per IP per 24 hours.

---

## 💰 Testing Paid Voting

1. Go to http://localhost:5173/awards
2. Select a category
3. Click **"💰 Buy Votes"** on any candidate
4. Enter your email
5. Choose number of votes (1-100)
6. System initializes Paystack payment
7. In production, redirect to Paystack modal
8. Confirm payment
9. Vote multiplier is applied (e.g., 5 votes = 5x vote count)

**Test Mode**: Paystack credentials are in .env. For testing without real payments, mock the response.

---

## 🏆 Key Features to Test

### Voting Interface
- [x] Category selection changes displayed candidates
- [x] Countdown timer shows correct status (upcoming/active/ended)
- [x] Progress bars animate smoothly
- [x] Vote buttons respond to clicks
- [x] Success/error messages display

### Leaderboard (Click "Leaderboard" tab)
- [x] Candidates sorted by vote count descending
- [x] Medal emojis for top 3
- [x] Percentage calculations correct
- [x] Vote breakdown shows (free vs paid)
- [x] Updates in real-time

### Analytics (Click "Analytics" tab)
- [x] Displays 4 metric cards
- [x] Time range selector (7/14/30 days)
- [x] Bar chart shows daily trends
- [x] Peak hour highlighted
- [x] Free vs Paid breakdown accurate

### Admin Dashboard
- [x] View and create categories
- [x] Edit category details and dates
- [x] Delete categories (confirms first)
- [x] Add candidates per category
- [x] Delete candidates
- [x] Category quick selector
- [x] Form validation working

---

## 📊 Sample Test Scenarios

### Scenario 1: Active Voting
1. "Best Dressed" category is active (Dec 24 - Dec 31)
2. Vote for multiple candidates
3. Check leaderboard updates
4. View analytics

### Scenario 2: Upcoming Category
1. "Best Event Host" is upcoming (starts Dec 25)
2. Countdown timer shows "UPCOMING"
3. Voting buttons are disabled
4. Countdownrefreshes in real-time

### Scenario 3: Paid Voting
1. Click "Buy Votes" on a candidate
2. Enter valid email
3. Choose vote count (e.g., 5)
4. System calculates amount (5 × ₦1000)
5. Paystack flow initiates

---

## 🔍 API Testing (with curl/PowerShell)

```powershell
# Get all categories
Invoke-WebRequest -Uri "http://localhost:5000/api/awards/categories" -UseBasicParsing

# Get candidates for category
Invoke-WebRequest -Uri "http://localhost:5000/api/awards/candidates/category/[CATEGORY_ID]" -UseBasicParsing

# Get leaderboard
Invoke-WebRequest -Uri "http://localhost:5000/api/voting/leaderboard/[CATEGORY_ID]" -UseBasicParsing

# Get analytics
Invoke-WebRequest -Uri "http://localhost:5000/api/voting/analytics/[CATEGORY_ID]?days=7" -UseBasicParsing
```

---

## 📱 Responsive Design Testing

1. **Desktop** (1920px+)
   - 3-4 column layouts
   - Full table views
   - Side-by-side panels

2. **Tablet** (768px - 1024px)
   - 2-column layouts
   - Adjusted spacing
   - Touch-friendly buttons

3. **Mobile** (320px - 767px)
   - Single column
   - Stacked elements
   - Optimized for small screens

---

## 🎨 Visual Elements to Verify

- [x] Gradient backgrounds (indigo → purple)
- [x] Glass-morphism panels
- [x] Smooth animations
- [x] Hover effects on buttons
- [x] Emoji icons displaying correctly
- [x] Status badges with colors
- [x] Progress bars filling smoothly
- [x] Countdown timer ticking
- [x] Medal animations bouncing
- [x] Pulse effects on "Leading"

---

## ⚙️ Configuration Files

### .env (Backend Configuration)
- PORT=5000
- MONGO_URI=mongodb+srv://...
- JWT_SECRET=your-secret-key
- PAYSTACK_SECRET_KEY=sk_live_...
- PAYSTACK_PUBLIC_KEY=pk_live_...
- FRONTEND_URL=http://localhost:5173

### Database
- Collections: categories, candidates, votes, votinganalytics
- Indexes: ipAddress+sessionId on votes
- Connection: MongoDB Atlas

---

## 🐛 Troubleshooting

### Issues & Solutions

**"Categories not loading"**
- Check backend is running: `npm run server:dev`
- Verify MongoDB connection in server terminal
- Check browser console for API errors

**"Voting button not responding"**
- Ensure category status is "active"
- Check countdown timer shows "🎉 Voting is Live!"
- Verify session ID is set
- Check browser console for errors

**"Admin dashboard not accessible"**
- Must be logged in as admin
- Check localStorage has adminToken
- Verify admin middleware is working

**"Paystack integration failing"**
- Verify PAYSTACK keys in .env
- Use test keys for development
- Check transaction reference format

---

## 📝 Database Cleanup

To reset and reseed:
```bash
# Clear all award data and reseed
npm run seed:awards
```

---

## ✅ Checklist Before Production

- [ ] Replace test Paystack keys with production keys
- [ ] Set up real hCaptcha site key
- [ ] Update MongoDB URI to production
- [ ] Change JWT_SECRET to random secure key
- [ ] Test all payment flows
- [ ] Verify email notifications
- [ ] Set up error logging
- [ ] Configure CORS for production domain
- [ ] Enable rate limiting
- [ ] Add request validation
- [ ] Test on mobile devices
- [ ] Verify analytics accuracy
- [ ] Test with large vote counts
- [ ] Set up monitoring/alerting

---

## 📊 Performance Notes

- Leaderboard sorts by voteCount in DB query
- Analytics aggregated from Vote records
- Real-time updates via fetch (no WebSocket)
- Images lazy-loaded for candidates
- Pagination ready for large datasets

---

## 🎓 Code Examples

### Free Vote (Frontend)
```javascript
const handleVote = async (candidateId) => {
  const response = await fetch(`/api/voting/vote/free`, {
    method: 'POST',
    headers: { 'x-session-id': sessionId },
    body: JSON.stringify({
      candidateId,
      categoryId: selectedCategory._id,
      captchaToken,
    }),
  });
};
```

### Leaderboard (Backend)
```javascript
GET /api/voting/leaderboard/:categoryId
Returns: category + candidates sorted by voteCount
```

---

## 🚀 Next Steps

1. Test all voting scenarios
2. Verify admin operations
3. Check mobile responsiveness
4. Test payment flow (mock or test Paystack)
5. Review analytics accuracy
6. Test countdown timers at boundaries
7. Verify vote deduplication
8. Check email notifications

---

**System is fully functional and ready for comprehensive testing!**

Happy voting! 🎉
