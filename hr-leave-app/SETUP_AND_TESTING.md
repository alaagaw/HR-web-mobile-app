# HR App — Setup & Testing Guide

## Database Setup

### Prerequisites
- A Supabase project created at [supabase.com](https://supabase.com)
- Your Supabase URL and anon key configured in the app

### Step 1: Create the Schema

1. Go to your **Supabase Dashboard** → **SQL Editor** → **New Query**
2. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
3. Click **Run**

This creates all tables, indexes, RLS policies, and functions.

### Step 2: Seed Test Data

1. In the **SQL Editor**, open a **New Query**
2. Copy and paste the contents of `supabase/migrations/002_seed_data.sql`
3. Click **Run**

This creates 6 test accounts (all use password `password123`):

| Email | Role | Name |
|---|---|---|
| `admin@aqeel.com` | HR Director | Aqeel Al-Rashid |
| `hr@aqeel.com` | HR Staff | Fatima Hassan |
| `manager@aqeel.com` | Manager | Khalid Ibrahim |
| `supervisor@aqeel.com` | Supervisor | Omar Yusuf |
| `employee1@aqeel.com` | Employee | Ahmed Malik |
| `employee2@aqeel.com` | Employee | Sara Noor |

### Step 3: Run Additional Migrations

1. Run `supabase/migrations/003_employee_documents.sql`
2. Run `supabase/migrations/004_renewal_tasks.sql`
3. Run `supabase/migrations/005_registration_system.sql`

### Step 4: Seed Polytech Users

1. In the **SQL Editor**, open a **New Query**
2. Copy and paste the contents of `supabase/migrations/006_polytech_seed_users.sql`
3. Click **Run**

This creates 7 Polytech accounts (all use password `password123`):

| Email | Role | Department | Name |
|---|---|---|---|
| `aqeel@polytech.com.sa` | HR Director | Management | Aqeel A Gaw |
| `amani@polytech.com.sa` | HR | Human Resources | Amani Thiyab |
| `maram@polytech.com.sa` | HR | Human Resources | Maram Al Muammar |
| `projectadmin@polytech.com.sa` | HR | Human Resources | Venod |
| `pylee@polytech.com.sa` | HR | Human Resources | Pylee K Iype |
| `nouf@polytech.com.sa` | HR | Human Resources | Nouf Al Mutairi |
| `shahad@polytech.com.sa` | Employee | Finance | Shahad Nasser AlShehri |

### Step 5: Verify

After running all scripts, go back to the app and sign in with any account using password `password123`.

---

## Testing the Approval Flow

### Test 1: PTO Request (Full Chain)

The PTO approval chain is: **Employee → Supervisor → Manager → HR → Approved**

1. **Sign in as** `employee1@aqeel.com` (Ahmed Malik)
   - Go to **Requests** tab → tap **New Request**
   - Select **PTO**, pick dates, submit
   - The request should show status **Pending Supervisor** with "Waiting for Omar Yusuf"

2. **Sign out, sign in as** `supervisor@aqeel.com` (Omar Yusuf)
   - Go to **Tasks** tab → the request should appear under **Action Required**
   - Tap the request → **Approve**
   - Status moves to **Pending Manager** (Khalid Ibrahim)

3. **Sign out, sign in as** `manager@aqeel.com` (Khalid Ibrahim)
   - Go to **Tasks** tab → approve the request
   - Status moves to **Pending HR** (Fatima Hassan)

4. **Sign out, sign in as** `hr@aqeel.com` (Fatima Hassan)
   - Go to **Tasks** tab → approve the request
   - Status becomes **Approved**, employee's leave balance gets deducted

5. **Sign back in as** `employee1@aqeel.com`
   - The request should show **Approved** status
   - Dashboard balance should reflect the deduction

### Test 2: Emergency Leave (Tiered Approval)

Emergency leave has tiered approval based on how many emergencies you've used in the last 30 days:

| Emergency # | Approval Chain |
|---|---|
| 1st | Auto-approved (no human approval needed) |
| 2nd | Manager approves → Approved |
| 3rd | Manager approves → HR Director approves → Approved |
| 4th+ | Blocked — cannot submit |

**To test:**

1. **Sign in as** `employee1@aqeel.com`
   - Submit an **Emergency** leave request
   - It should be **auto-approved** immediately (1st emergency)

2. **Submit another Emergency** leave request
   - It should go to **Pending Manager** (2nd emergency)
   - Sign in as `manager@aqeel.com` → approve
   - Status becomes **Approved** (no HR step for 2nd emergency)

3. **Submit a 3rd Emergency** leave request
   - It should go to **Pending Manager** (3rd emergency)
   - Sign in as `manager@aqeel.com` → approve → moves to **Pending HR Director**
   - Sign in as `admin@aqeel.com` (Aqeel) → approve → **Approved**

4. **Try submitting a 4th Emergency**
   - The app should **block submission** with a message about reaching the monthly limit

### Test 3: Excess Balance (Over-Balance Request)

1. **Sign in as** `employee1@aqeel.com`
2. Submit a PTO request for **more hours than your available balance**
   - The form should show an **excess warning** with the excess hours
3. Walk it through the approval chain (Supervisor → Manager → HR)
4. After final approval, the request should be flagged for **HR excess determination**
5. **Sign in as** `hr@aqeel.com`
   - The request should show an excess determination panel
   - Options: Confirm Unpaid / Convert / Partial Reject

### Test 4: Rejection Flow

1. Submit a PTO request as `employee1@aqeel.com`
2. Sign in as `supervisor@aqeel.com` → **Reject** the request (comment required)
3. Sign back in as `employee1@aqeel.com`
   - Request should show **Rejected** status
   - Balance should be **unchanged** (no deduction on rejection)

### Test 5: Cancellation Flow

1. Submit a PTO request as `employee1@aqeel.com`
2. Before it's fully approved, go to the request detail → **Cancel**
3. Status should become **Cancelled**
4. If balance was deducted, it should be **credited back**

### Test 6: Approval Chain Visibility

1. **Sign in as** `supervisor@aqeel.com`
   - Go to **Tasks** tab → **All Requests** tab
   - You should see all requests from your direct reports, even if they're pending with someone else
   - Cards show "Waiting for [name]" and remaining approval steps

2. **Sign in as** `manager@aqeel.com`
   - **All Requests** shows requests from your department
   - Use the **search bar** to filter by name, case number, or type
   - Use **status filter chips** (Pending / Approved / Rejected)

3. **Sign in as** `hr@aqeel.com` or `admin@aqeel.com`
   - **All Requests** shows all requests across the organization

### Test 7: Dark Mode

1. Sign in with any account
2. Go to **Profile** tab → find the **Theme** section
3. Switch between **Light**, **Dark**, and **System**
4. Verify all screens render correctly in dark mode:
   - Dashboard, Requests, Tasks, Profile
   - Request detail screen
   - New request form
   - Back arrow should be visible (light color on dark background)

---

## Org Chart Reference

### Test Users (@aqeel.com)
```
Aqeel Al-Rashid (HR Director)
├── Fatima Hassan (HR Staff)
│
Khalid Ibrahim (Manager)
├── Omar Yusuf (Supervisor)
│   ├── Ahmed Malik (Employee)
│   └── Sara Noor (Employee)
```

- Ahmed & Sara report to Omar (Supervisor) and Khalid (Manager)
- PTO flow: Omar → Khalid → Fatima (or any HR)
- Emergency #3 flow: Khalid → Aqeel (HR Director)

### Polytech Users (@polytech.com.sa)
```
Aqeel A Gaw (HR Director)
├── Amani Thiyab (HR)
├── Maram Al Muammar (HR)
├── Venod (HR)
├── Pylee K Iype (HR)
├── Nouf Al Mutairi (HR)
└── Shahad Nasser AlShehri (Employee, Finance)
```

- All Polytech staff report to Aqeel A Gaw

---

## What's Next After Testing

After verifying the core flows above, the remaining items are:

- [ ] Test with real data (actual employees, real balances)
- [ ] Profile screen polish (edit profile fields)
- [ ] Team calendar view
- [ ] HR admin screens (employee directory, balance management)
- [ ] Email notifications (Supabase Edge Functions)
- [ ] Push notifications for mobile
- [ ] Production deployment
