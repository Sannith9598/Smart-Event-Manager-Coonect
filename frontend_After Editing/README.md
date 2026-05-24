# Smart Event Manager Connect

A full-stack event management platform that connects customers with verified event planners. Customers can browse, compare, and book event managers for weddings, birthdays, corporate events, and more — all in one place.

---

## What Makes This Project Different

- **AI-Powered Chatbot** — Integrated Google Gemini 2.5 Flash chatbot that helps users find event planners by location, budget, event type, and experience. Understands natural language queries like "birthday planner in Mysore under 5000".
- **Real-Time Notifications** — Socket.io powered instant notifications for booking updates, new messages, and verification status changes.
- **In-App Messaging** — Real-time chat between customers and managers tied to each booking, with typing indicators.
- **Manager Verification System** — Event managers must submit business proof, portfolio images, and past event details. Admins review and approve/reject with reasons.
- **Real-Time Comparison** — Compare up to 5 event planners side-by-side (rating, experience, pricing, services).
- **Search & Filter** — Search managers by name, location, or service type. Filter by event type, rating, and price.
- **Customizable Bookings** — Customers customize events with detailed service items (catering per guest, decoration, photography, music, transport) plus custom add-on packages.
- **Dynamic Pricing with GST** — Total price auto-calculates based on base price + selected add-ons + extra guest charges + detailed service items + 5% GST.
- **Event Availability Calendar** — Managers set available dates. Customers see which dates are already booked.
- **Multiple Event Images & Videos** — Events support gallery media with lightbox viewer.
- **Invoice Generation with Full Breakdown** — PDF invoices include base price, all service totals (grouped by category), custom add-ons, special request charges, subtotal, 5% GST, and grand total.
- **OTP-Based Email Verification** — Secure registration with 6-digit OTP sent via Gmail SMTP.
- **Forgot Password** — OTP-based password reset flow.
- **Email Notifications** — Automatic emails on new bookings, confirmations, rejections, and completions.
- **Profile Management** — Users update name, mobile, password. Managers update business profile with portfolio URL visible to customers.
- **Dark Mode** — Toggle between light and dark themes, persisted in localStorage.
- **Admin Audit Log** — All admin actions logged with timestamps and IP addresses.
- **CSV Export** — Admin can export customer and booking data as CSV.
- **Role-Based Access Control** — Three roles (Admin, Manager, Customer) enforced at database level with ENUM constraints.
- **Rate Limiting** — Brute force protection on login, OTP, and chatbot endpoints.
- **Account Lockout** — Database-backed lockout after 5 failed login attempts (15 min cooldown).
- **Server-Side Price Validation** — Backend recalculates total price independently to prevent price manipulation.
- **Auto Admin Seeding** — Admin user is automatically created on server startup if not present.
- **Graceful Shutdown** — Handles SIGTERM/SIGINT for clean production deployments.
- **Cron Jobs** — Daily booking reminders, expired OTP cleanup, and weekly Cloudinary orphan detection.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Bootstrap, Framer Motion, Axios, React Router v7, Socket.io Client |
| Backend | Express 4, Sequelize 6, MySQL, Socket.io |
| AI | Google Gemini 2.5 Flash (Free Tier) |
| Real-Time | Socket.io (WebSocket + Polling fallback) |
| Image/Video Storage | Cloudinary (Free Tier — 25 credits/month) |
| Email | Nodemailer (Gmail SMTP with App Password) |
| PDF | jsPDF + html2canvas (client-side) |
| Auth | JWT (Access + Refresh tokens) + bcryptjs |
| Scheduling | node-cron |
| Security | Helmet, express-rate-limit, CORS |
| Deployment | Render (render.yaml included) |

---

## Project Structure

```
Project/
├── backend_after Editing/
│   ├── config/          # DB connection, Cloudinary config with magic byte validation
│   ├── middleware/      # JWT auth, request ID tracing
│   ├── models/          # Sequelize models (12 tables with ENUM constraints)
│   ├── routes/          # API routes (auth, event, booking, review, chatbot, admin, manager, verification, profile, message, notification, favorites)
│   ├── utils/           # Gemini AI helper, email templates, input sanitizer
│   ├── server.js        # Express + Socket.io + cron jobs entry point
│   ├── render.yaml      # Render deployment config
│   ├── .env.example     # Environment variable template
│   └── package.json
│
├── frontend_After Editing/
│   ├── public/          # Static assets, PWA service worker
│   ├── src/
│   │   ├── components/  # Navbar, Footer, ProtectedRoute, NotificationBell, ErrorBoundary
│   │   ├── constants/   # App-wide constants
│   │   ├── context/     # ThemeContext (dark mode), SocketContext (real-time)
│   │   ├── images/      # Static images
│   │   ├── pages/       # Admin, Customer, Event Manager dashboards, PublicProfile, Chat, Profile
│   │   ├── services/    # Axios API instance with token refresh interceptors
│   │   ├── utils/       # Invoice PDF generator (with GST)
│   │   ├── App.js       # Routes and app layout
│   │   └── Chatbot.js   # AI chatbot widget
│   └── package.json
```

---

## Database Schema

12 tables with proper foreign keys, indexes, and ENUM constraints:

| Table | Purpose |
|-------|---------|
| Users | All users (role: customer/manager/admin, status: active/blocked) |
| Events | Event packages created by managers |
| Bookings | Customer bookings with full pricing data |
| EventManagers | Manager business profiles (1:1 with Users) |
| Reviews | Customer reviews for managers (1 per customer-manager pair) |
| Verifications | Manager verification submissions |
| Messages | In-app chat messages per booking |
| Notifications | Real-time notification records |
| Favorites | Customer wishlisted events |
| AuditLogs | Admin action audit trail |
| Otps | OTP records for registration and password reset |
| LoginAttempts | Failed login tracking for account lockout |

---

## Prerequisites

- **Node.js** v18+ — [Download](https://nodejs.org/)
- **MySQL** installed and running
- **Gmail Account** with App Password enabled (for OTP emails)
- **Cloudinary Account** (free tier) — [Sign up](https://cloudinary.com/)
- **Google Gemini API Key** — [Get one](https://aistudio.google.com/apikey)

---

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "Project After Editing"
```

### 2. Setup the Database

```sql
CREATE DATABASE event;
```

Tables are auto-created when the backend starts (Sequelize sync in development mode).

### 3. Setup the Backend

```bash
cd "backend_after Editing"
npm install
```

Copy `.env.example` to `.env` and fill in your credentials:

```env
PORT=5000
FRONTEND_URL=http://localhost:3000
DB_NAME=event
DB_USER=root
DB_PASS=your_mysql_password
DB_HOST=localhost
JWT_SECRET=your_secret_key_here

CLOUD_NAME=your_cloudinary_cloud_name
API_KEY=your_cloudinary_api_key
API_SECRET=your_cloudinary_api_secret

EMAIL=your_email@gmail.com
APP_PASSWORD=your_gmail_app_password

GEMINI_API_KEY=your_gemini_api_key
```

**Gmail App Password setup:**
1. Enable 2-Step Verification on your Google Account
2. Go to Google Account → Security → App Passwords
3. Generate a new app password for "Mail"
4. Use that 16-character password as `APP_PASSWORD`

### 4. Setup the Frontend

```bash
cd "frontend_After Editing"
npm install
```

Create `.env` in the frontend folder:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 5. Admin User

The admin user is **automatically created** on first server startup:

- **Email:** sannithsanni2005@gmail.com
- **Password:** Sannith@123
- **Role:** admin

No manual database insertion needed.

### 6. Run the Project

**Terminal 1 — Backend:**
```bash
cd "backend_after Editing"
npm run dev
```
Runs on `http://localhost:5000`

**Terminal 2 — Frontend:**
```bash
cd "frontend_After Editing"
npm start
```
Runs on `http://localhost:3000`

---

## Deployment (Render)

The backend includes a `render.yaml` for one-click Render deployment:

1. Push code to GitHub
2. Connect repo to Render
3. Set environment variables in Render dashboard (DATABASE_URL, FRONTEND_URL, Cloudinary keys, etc.)
4. Deploy — admin user auto-seeds on first start

For the frontend, deploy as a static site with build command `npm run build` and publish directory `build`.

---

## User Roles & Workflow

### Customer
1. Register with OTP verification → Login
2. Browse verified event managers and trending events
3. Search/filter managers by name, location, type, rating, price
4. Compare planners side-by-side (up to 5)
5. View manager profile with packages, portfolio, past events, and portfolio URL
6. Book an event with detailed service items, custom add-ons, and special requests
7. Chat with manager about booking details
8. Receive real-time notifications on booking updates
9. Track bookings in dashboard with full price breakdown
10. Download PDF invoices with GST for confirmed/completed events
11. Leave reviews for managers (only after completed booking)
12. Manage wishlist (favorites)
13. Update profile and change password

### Event Manager
1. Register as manager → Login
2. Submit verification (business name, portfolio, past events with media)
3. Once verified: add/edit events with pricing, detailed service menus, and multiple images/videos
4. Set event availability dates
5. Manage incoming bookings (confirm with 10% deposit / reject / complete)
6. Set special request pricing for bookings
7. Chat with customers
8. View analytics: revenue, monthly trends, popular events, booking stats
9. Generate invoices for completed bookings
10. Respond to customer reviews
11. Update business profile with portfolio URL

### Admin
1. Login with admin credentials (auto-seeded)
2. Review pending manager verifications (approve/reject with reason)
3. View all customers and managers with stats
4. Monitor platform statistics
5. Block/unblock users
6. View audit logs of all admin actions
7. Export customer and booking data as CSV

---

## API Endpoints (v1)

All endpoints are available at both `/api/v1/` (versioned) and `/api/` (backward compatible).

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/send-otp` | Send OTP for registration |
| POST | `/api/v1/auth/verify-otp-and-register` | Verify OTP and create account |
| POST | `/api/v1/auth/login` | Login (returns access + refresh tokens) |
| POST | `/api/v1/auth/refresh-token` | Refresh access token |
| GET | `/api/v1/auth/me` | Get current user profile |
| POST | `/api/v1/auth/forgot-password` | Send password reset OTP |
| POST | `/api/v1/auth/reset-password` | Reset password with OTP |
| GET | `/api/v1/profile` | Get user profile with details |
| PUT | `/api/v1/profile/update` | Update name and mobile |
| PUT | `/api/v1/profile/change-password` | Change password |
| PUT | `/api/v1/profile/manager-profile` | Update manager business profile |
| GET | `/api/v1/event/all-events` | Get all available events (paginated) |
| GET | `/api/v1/event/all-events/:id` | Get single event details |
| GET | `/api/v1/event/trending` | Get trending events (most booked) |
| GET | `/api/v1/event/manager/:userId` | Get events by manager userId |
| POST | `/api/v1/event/add-event` | Add event (verified managers only) |
| PUT | `/api/v1/event/edit-event/:id` | Edit event |
| PUT | `/api/v1/event/availability/:id` | Update event available dates |
| GET | `/api/v1/event/booked-dates/:id` | Get booked dates for an event |
| GET | `/api/v1/event/analytics` | Manager analytics/stats |
| POST | `/api/v1/booking/create` | Create booking (server-side price validation) |
| GET | `/api/v1/booking/my-bookings` | Get customer's bookings |
| GET | `/api/v1/booking/manager/bookings` | Get manager's bookings |
| GET | `/api/v1/booking/details/:id` | Get booking details (for invoice) |
| PUT | `/api/v1/booking/manager/booking/:id` | Update booking status |
| PUT | `/api/v1/booking/manager/complete/:id` | Mark booking completed |
| PUT | `/api/v1/booking/manager/special-request-price/:id` | Set special request price |
| PUT | `/api/v1/booking/cancel/:id` | Customer cancel booking |
| GET | `/api/v1/messages/booking/:bookingId` | Get messages for a booking |
| POST | `/api/v1/messages/send` | Send a message |
| GET | `/api/v1/messages/unread-count` | Get unread message count |
| GET | `/api/v1/notifications` | Get all notifications |
| GET | `/api/v1/notifications/unread-count` | Get unread count |
| PUT | `/api/v1/notifications/:id/read` | Mark notification as read |
| PUT | `/api/v1/notifications/mark-all-read` | Mark all as read |
| POST | `/api/v1/review` | Submit a review |
| GET | `/api/v1/review/:managerId` | Get reviews for a manager |
| PUT | `/api/v1/review/:reviewId/respond` | Manager responds to review |
| POST | `/api/v1/favorites/:eventId` | Add to wishlist |
| DELETE | `/api/v1/favorites/:eventId` | Remove from wishlist |
| GET | `/api/v1/favorites` | Get user's wishlist |
| GET | `/api/v1/favorites/check/:eventId` | Check if event is favorited |
| POST | `/api/v1/chatbot/chat` | AI chatbot query |
| GET | `/api/v1/manager/public-profile/:id` | Public manager profile |
| GET | `/api/v1/manager/public-profile/:id/events` | Manager's past events |
| POST | `/api/v1/verification/submit-verification` | Submit verification |
| GET | `/api/v1/admin/verifications` | Get all verifications |
| PUT | `/api/v1/admin/verifications/:id/approve` | Approve verification |
| PUT | `/api/v1/admin/verifications/:id/reject` | Reject verification |
| GET | `/api/v1/admin/audit-logs` | View audit logs |
| GET | `/api/v1/admin/export/customers` | Export customers CSV |
| GET | `/api/v1/admin/export/bookings` | Export bookings CSV |
| GET | `/api/v1/health` | Health check |

---

## Key Features Breakdown

### AI Chatbot
- Natural language event planner search
- Filters by location, price, event type, rating, experience
- Falls back to recommendations when no exact match found
- Rate limited (15 messages/minute)
- Powered by Google Gemini 2.5 Flash (free tier: 500 requests/day)

### Pricing & Invoice System
- Server-side price calculation prevents manipulation
- Detailed service items: catering (per guest), decoration, photography, music, transport
- Custom add-on packages defined by managers
- Special request pricing by managers
- 5% GST applied on subtotal
- PDF invoice includes: base price, extra guests, all services (totaled by category), custom add-ons, special requests, subtotal, GST, grand total
- 10% deposit suggested on booking confirmation

### Real-Time Features (Socket.io)
- Instant notifications on booking create/confirm/reject/complete
- Verification approval/rejection notifications
- In-app messaging with typing indicators
- Authenticated socket connections (JWT verified)
- Users auto-join personal notification rooms

### Security
- JWT access tokens (1h) + refresh tokens (7d) with separate secrets
- Password hashing with bcryptjs (10 salt rounds)
- Account lockout after 5 failed attempts (15 min, database-backed)
- Rate limiting: login (10/15min), OTP (5/10min), chatbot (15/min), booking (5/min)
- CORS restricted to frontend origin
- Helmet for secure HTTP headers
- Role ENUM constraint at database level (customer/manager/admin)
- File upload validation with magic byte checking
- Input sanitization on user-generated content
- Request body size limits (10MB)
- Duplicate booking prevention with serializable transactions

### Cron Jobs
- **Daily 9 AM IST** — Booking reminders for events happening tomorrow
- **Daily 2 AM IST** — Cleanup expired OTPs, old notifications (90d), login attempts, audit logs (1yr)
- **Weekly Sunday 3 AM IST** — Cloudinary orphan detection and cleanup

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `SequelizeConnectionRefusedError` | Make sure MySQL is running and `.env` credentials are correct |
| OTP email not sending | Check Gmail App Password is correct, 2FA is enabled |
| Cloudinary upload fails | Verify CLOUD_NAME, API_KEY, API_SECRET in `.env` |
| Frontend can't reach backend | Ensure backend is running on port 5000, check CORS/FRONTEND_URL |
| `Cannot find module` errors | Run `npm install` in both frontend and backend folders |
| Rate limit hit during testing | Wait 15 minutes or restart the backend server |
| Socket.io not connecting | Ensure FRONTEND_URL in `.env` matches your frontend URL |
| Revenue showing wrong values | Ensure MySQL DECIMAL values are parsed with `parseFloat()` |
| Guest count changing on scroll | Number inputs prevent scroll-wheel changes |
| Packages not showing on profile | Ensure manager has events created and profile returns userId |

---

## Free Tier Limits

| Service | Free Limit | Typical Usage |
|---------|-----------|---------------|
| Cloudinary | 25 credits/month (~25GB storage or bandwidth) | ~5,000-10,000 event images |
| Gemini API | 500 requests/day, 10 RPM | ~50 users × 5 chatbot queries/day |
| Gmail SMTP | 500 emails/day | OTPs + booking notifications |

---

## Contact

- **Admin Email:** sannithsanni2005@gmail.com
- **Phone:** +91 7892119598

---

## License

ISC
