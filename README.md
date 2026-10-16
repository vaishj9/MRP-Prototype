# Riverside Fitness - Prototype (zero budget)

Two apps - a Member App (customers) and a Staff Portal (office) - on one shared Google Sheet.

Website (GitHub Pages) + Google Sheet database + Google Apps Script connector. All free.

## Setup (about 15 minutes)

### 1. Create the database (Google Sheet)
1. Go to sheets.google.com, click **Blank spreadsheet**.
2. **File > Import > Upload** `Riverside_Database.xlsx` > **Replace spreadsheet**.
3. You should see 7 tabs: Members, Locations, Staff, Classes, Bookings, CheckIns, Payroll.

### 2. Add the connector (Apps Script)
1. In the sheet: **Extensions > Apps Script**.
2. Delete everything in the editor and paste the contents of `Code.gs`.
   **Change the staff passcode** on the line `const STAFF_KEY = 'riverside2026';` to your own word. Click Save.
3. **Deploy > New deployment > Select type: Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click Deploy, approve the permissions, and copy the **Web app URL** (ends in `/exec`).

### 3. Put the website on GitHub Pages
1. Create a free GitHub repository (for example `riverside-prototype`).
2. Upload `index.html`, `member.html`, `staff.html`, `seed.js` and `config.js`.
3. Open `config.js` and paste your Web app URL between the quotes. Commit.
4. Repository **Settings > Pages > Deploy from a branch > main / root > Save**.
5. After a minute your site is at `https://YOUR-NAME.github.io/riverside-prototype/`.

### 4. Test the live link
- Open the site: the badge in the top right should say **Live: Google Sheet**.
- Sign up a member > a new row appears in the Members tab > the dashboard count goes up within seconds.
- Edit any cell in the Google Sheet (for example change a member's monthly_checkins) > the dashboard updates within 8 seconds.

If the badge says **Demo mode**, the URL in `config.js` is empty or wrong.
You can also test without GitHub: open `index.html` on your computer and use the **Connect Google Sheet** button.

## How each part maps to your architecture
| Your architecture | In the prototype |
|---|---|
| Sign-Up Form | Sign Up tab > adds a row to Members |
| Member Booking App | Book a Class tab (any location) > Bookings |
| Front Desk App | Front Desk tab > CheckIns, monthly count, cancel membership |
| Churn-Risk Alert Engine | Rule (under 4 check-ins/month) on the dashboard list |
| Payroll Module | Payroll tab > Payroll (pay calculated automatically) |
| Management Dashboard | Dashboard tab |
| Shared Database | The Google Sheet |
| App Platform | GitHub Pages + Google Apps Script |

## Two apps
- `member.html` - customers: join, log in with Member ID, book classes at any gym, cancel bookings, see their own visits.
- `staff.html` - office: dashboard, front desk check-in, payroll, dataset. Asks for the staff passcode (STAFF_KEY) the first time.
- `index.html` - landing page with a button to each app.

Customers can only read classes, locations and their own records, and can only join, book, and cancel their own bookings.
Everything else (all members, check-ins, payroll) needs the staff passcode.
Prototype limit: customers log in with a Member ID only. A real version would use proper login (Microsoft Entra ID in your SBB).
