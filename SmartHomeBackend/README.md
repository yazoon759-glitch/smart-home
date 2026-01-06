# Smart Home Services Platform (Node.js + Express + MongoDB/Mongoose)

## SECTION 1 – SYSTEM OVERVIEW
- Users register/login, manage multiple saved locations, and book home services (cleaning, electrician, plumber, carpenter, etc.) with preferred schedule and optional photos.
- Service providers register, set a fixed work location with radius, and view/accept nearby pending service requests sorted by distance.
- Admin/Manager manage users, providers, service categories, service requests, roles/activation, and high-level stats.
- Wallets support user payments (wallet/cash), provider earnings, admin top-ups/adjustments, withdrawals, and cash-in approvals with auditable transactions.
- AI-like endpoint performs simple keyword matching on problem descriptions to suggest the most suitable service category.

## SECTION 2 – FEATURES & USE CASES
### 2.1 Actors
- User (Customer)
- Service Provider
- Admin
- Manager (limited admin permissions)
- System (background operations)
- Payment System (optional simulated integration)

### 2.2 High-level use cases per actor
- User: Register, Login, Manage Locations, View Categories, Filter Categories, Browse Providers by Category, Book Service, View My Requests, Pay with Wallet, Rate Provider, View Wallet.
- Service Provider: Register/Upgrade, Set Fixed Location, View Nearby Pending Requests, Accept/Reject Request, Request Withdrawal, Submit Cash-In, View Wallet, View Ratings.
- Admin: Manage Users, Manage Providers, Manage Categories, View/Filter Requests, Approve Provider Earnings, Top-up User Wallet, Adjust Provider Wallet, Approve/Reject Cash-In, Approve/Reject Withdrawals, View Stats.
- Manager: Subset of Admin actions (manage categories, view/filter requests, limited user/provider actions).
- System: Enforce roles, send status notifications, compute average ratings, maintain transaction logs.
- Payment System: (Optional) Process wallet funding/withdrawal integrations.

### 2.3 Detailed use cases (text)
- **Register User** — Actor: User. Goal: create account. Preconditions: email/phone unique. Main: submit data → validate → hash password → create USER. Alt: duplicate → 409. Post: user stored.
- **Login User** — Actor: User. Goal: obtain JWT. Preconditions: user exists & active. Main: submit credentials → verify → return JWT. Alt: invalid/inactive → 401/403. Post: JWT issued.
- **Add/Edit/Delete User Location** — Actor: User. Goal: manage saved locations. Preconditions: authenticated. Main: create/update/delete location; set default (unset others). Alt: not owner → 403. Post: location persisted.
- **Register Provider** — Actor: Service Provider. Goal: create/upgrade to provider. Preconditions: unique contacts. Main: submit; create/upgrade user role=PROVIDER; create provider profile. Alt: duplicate → 409. Post: provider profile created.
- **View Service Categories** - Actor: Any. Preconditions: none. Main: list active categories. Post: categories returned.
- **Filter Service Categories by price** - Actor: User. Preconditions: none. Main: min/max price - filter basePrice. Alt: invalid range - 400. Post: filtered list.
- **Browse providers by category** - Actor: User. Preconditions: category exists. Main: send categoryId to return providers linked to that category. Post: provider list visible for chosen service type.
- **Book a Service Request** — Actor: User. Preconditions: authenticated, location exists, category exists. Main: send category, location, description, requestedDateTime, paymentMethod, optional photo/price → create request PENDING/UNPAID. Alt: missing fields → 400. Post: request stored.
- **Provider views nearby PENDING requests** — Actor: Provider. Preconditions: provider has fixed location. Main: fetch pending sorted by distance (simulated geo). Alt: no location → 400. Post: list returned.
- **Provider Accepts/Rejects request** — Actor: Provider. Preconditions: request PENDING. Main: Accept → assign providerId, status=ACCEPTED; Reject → status=REJECTED. Alt: already claimed → 404/409. Post: status updated.
- **User Rates Provider** — Actor: User. Preconditions: request COMPLETED and owned. Main: submit score/comment → create Rating → update provider average. Alt: invalid state → 400/403. Post: rating stored.
- **Admin manages categories** — Actor: Admin/Manager. Preconditions: proper role. Main: create/update/delete categories. Alt: unauthorized → 403. Post: categories updated.
- **Admin manages users/providers** — Actor: Admin/Manager. Preconditions: proper role. Main: toggle isActive, view lists. Alt: unauthorized → 403. Post: state updated.
- **Admin top-ups a user wallet** — Actor: Admin. Preconditions: admin. Main: userId+amount → increment wallet → transaction ADMIN_TOP_UP APPROVED. Alt: user missing → 404. Post: wallet/transaction updated.
- **Admin handles provider cash-in request** — Actor: Admin. Preconditions: pending CASH_IN_REQUEST. Main: Approve → status=APPROVED/type=CASH_IN_APPROVED → credit user wallet; Reject → status=REJECTED. Post: wallet/transaction updated.
- **Admin handles provider withdrawal request** — Actor: Admin. Preconditions: pending WITHDRAWAL_REQUEST, sufficient provider funds. Main: Approve → deduct provider wallet, status=APPROVED/type=WITHDRAWAL_APPROVED; Reject → status=REJECTED. Alt: insufficient funds → 400. Post: wallet/transaction updated.
- **Provider requests withdrawal** — Actor: Provider. Preconditions: provider balance sufficient. Main: create WITHDRAWAL_REQUEST PENDING. Alt: insufficient funds → 400. Post: pending transaction created.
- **User pays with wallet** — Actor: User. Preconditions: request owner, paymentMethod=WALLET, sufficient balance. Main: deduct wallet → paymentStatus=PAID → transaction PAYMENT APPROVED. Alt: insufficient → 400. Post: payment recorded.
- **User pays with cash (provider requests wallet credit)** — Actor: Provider/Admin. Preconditions: request exists, paymentMethod=CASH. Main: provider submits CASH_IN_REQUEST → admin approves/rejects. Post: wallet/transaction updated.
- **AI recommends service category** — Actor: User/System. Preconditions: categories exist. Main: keyword match → suggest category. Alt: no match → General/null. Post: suggestion returned.

### 2.4 Textual use case diagram mapping
- User → {Register, Login, Manage Locations, View/Filter Categories, Book Service, View My Requests, Pay with Wallet, Rate Provider, View Wallet}
- Service Provider → {Register/Upgrade, Set Fixed Location, View Nearby Pending, Accept Request, Reject Request, Submit Cash-In, Request Withdrawal, View Wallet, View Ratings}
- Admin → {Manage Users, Manage Providers, Manage Categories, View/Filter Requests, Approve Provider Earnings, Top-up User, Adjust Provider, Approve/Reject Cash-In, Approve/Reject Withdrawal, View Stats}
- Manager → {Manage Categories, View/Filter Requests, Limited Manage Users/Providers}
- System → {AuthN/AuthZ, Notifications, Rating Aggregation, Transaction Logging}
- Payment System → {Process Funding/Withdrawal (optional)}

## SECTION 3 – ERD / DATA MODEL DESIGN
- **User**: firstName, lastName, email (unique), phone (unique), passwordHash, role [USER|PROVIDER|ADMIN|MANAGER], walletBalance, isActive, createdAt/updatedAt. Relations: many UserLocations; one ServiceProvider; many WalletTransactions; many ServiceRequests; many Ratings.
- **UserLocation**: userId (FK User), locationName, latitude, longitude, street, buildingFloor, additionalNotes, isDefault, createdAt/updatedAt. Relation: many-to-one User; used by ServiceRequest.
- **ServiceCategory**: name, description, basePrice, isActive, createdAt/updatedAt. Relation: one-to-many ServiceRequests.
- **ServiceProvider**: userId (FK User), serviceCategoryId (FK ServiceCategory), fixedLatitude, fixedLongitude, addressLine, serviceRadiusKm, experienceYears, bio, walletBalance, averageRating, totalCompletedJobs, location (GeoJSON), createdAt/updatedAt. Relation: one-to-one User; one-to-many ServiceRequests; many Ratings; many WalletTransactions.
- **ServiceRequest**: userId (FK User), providerId (FK ServiceProvider, optional), serviceCategoryId (FK ServiceCategory), userLocationId (FK UserLocation), problemDescription, requestedDateTime, photoUrl, status [PENDING|ACCEPTED|REJECTED|IN_PROGRESS|COMPLETED|CANCELED], price, paymentMethod [WALLET|CASH], paymentStatus [UNPAID|PAID], createdAt/updatedAt. Relation: many-to-one User/ServiceProvider/ServiceCategory/UserLocation; one-to-one Rating; optional WalletTransactions link.
- **Rating**: userId (FK User), providerId (FK ServiceProvider), serviceRequestId (FK ServiceRequest, unique), score (1–5), comment, createdAt. Relation: many-to-one User/Provider; one-to-one ServiceRequest.
- **WalletTransaction**: userId (opt FK User), providerId (opt FK ServiceProvider), type [ADMIN_TOP_UP|PAYMENT|CASH_IN_REQUEST|CASH_IN_APPROVED|PROVIDER_EARNING|WITHDRAWAL_REQUEST|WITHDRAWAL_APPROVED|ADMIN_ADJUSTMENT], amount, status [PENDING|APPROVED|REJECTED], relatedServiceRequestId (opt FK), createdAt. Relation: many-to-one User/Provider; optional ServiceRequest.
- ERD summary: One User has many UserLocations; One ServiceCategory has many ServiceRequests; One ServiceProvider has many ServiceRequests; One ServiceRequest has zero or one Rating; One User or ServiceProvider has many WalletTransactions.

## SECTION 4 – BACKEND IMPLEMENTATION (NODE + EXPRESS + MONGOOSE)
- Folder structure already created under `/src` with config/models/controllers/routes/middlewares/services/utils and `server.js`.
- Tech: Express, Mongoose, JWT (jsonwebtoken), bcryptjs, dotenv, morgan.
- Environment: `MONGO_URI`, `JWT_SECRET`, optional `PORT`.

Key files:
- `server.js` sets up Express, connects DB, mounts routes: `/auth`, `/api/locations`, `/api/categories`, `/api/admin/categories`, `/api/providers`, `/api/requests`, `/api/ratings`, `/api/wallet`, `/api/admin/wallet`, `/api/ai`, with centralized `errorHandler`.
- Models: User, UserLocation, ServiceCategory, ServiceProvider (with 2dsphere index), ServiceRequest, Rating, WalletTransaction (with enums).
- Middlewares: `auth` (JWT validation, attaches `req.user`), `roles` (role-based guard), `errorHandler`.
- Controllers & Services:
  - Auth: register/login with bcrypt hashing and JWT issuance.
  - Locations: CRUD + set default for authenticated users.
  - Categories: public list with min/max price filter; admin CRUD under `/api/admin/categories`.
  - Providers: register/upgrade, get/update profile, set fixed location; provider request operations (nearby, accept/reject, cash-in).
  - Requests: create (user), list my requests, status updates (IN_PROGRESS/COMPLETED/CANCELED), provider accept/reject/cash-in with distance sort simulation.
  - Ratings: create when COMPLETED & owned; list per provider; updates provider average rating.
  - Wallets: service layer handles admin top-ups/adjustments, wallet payments, cash-in approvals, provider earnings, withdrawal request/approval; controllers expose routes for users/providers/admin.
  - AI: keyword-based recommendation endpoint `/api/ai/recommend-service`.
- Error handling: centralized middleware returns JSON `{ message }`.

## SECTION 5 – EXAMPLE REQUEST BODIES (JSON)
- User registration
```json
{ "firstName": "Alice", "lastName": "Lee", "email": "alice@example.com", "phone": "+1234567890", "password": "Secret123" }
```
- User login
```json
{ "email": "alice@example.com", "password": "Secret123" }
```
- Add user location
```json
{ "locationName": "Home", "latitude": 37.7749, "longitude": -122.4194, "street": "123 Main", "buildingFloor": "Apt 5", "additionalNotes": "Gate code 1234", "isDefault": true }
```
- Create service category (admin)
```json
{ "name": "Electrician", "description": "Electrical fixes", "basePrice": 50, "isActive": true }
```
- Register provider
```json
{
  "user": { "firstName": "Bob", "lastName": "Spark", "email": "bob@pro.com", "phone": "+1987654321", "password": "Power123" },
  "serviceCategoryId": "<categoryId>",
  "fixedLatitude": 37.78,
  "fixedLongitude": -122.42,
  "addressLine": "456 Market",
  "serviceRadiusKm": 15,
  "experienceYears": 5,
  "bio": "Certified electrician"
}
```
- List providers by category (sorted nearest-first when you pass latitude/longitude)
```http
GET /api/providers?serviceCategoryId=<categoryId>&latitude=<userLat>&longitude=<userLng>&name=<searchTerm>
```
- Create service request
```json
{
  "serviceCategoryId": "<categoryId>",
  "userLocationId": "<locationId>",
  "problemDescription": "Power outlet sparks when used",
  "requestedDateTime": "2024-07-01T10:00:00Z",
  "photoUrl": "https://example.com/photo.jpg",
  "paymentMethod": "WALLET",
  "price": 80
}
```
- Accept service request (provider)
```json
{}
```
- Create rating
```json
{ "serviceRequestId": "<requestId>", "score": 5, "comment": "Great job!" }
```
- Admin top-up user wallet
```json
{ "userId": "<userId>", "amount": 100 }
```
- User pays with wallet
```json
{}
```
- Provider submits cash-in request
```json
{ "amount": 80 }
```
- Admin approves cash-in
```json
{}
```
- Provider requests withdrawal
```json
{ "amount": 50 }
```
- Admin approves withdrawal
```json
{}
```
- Call AI recommendation endpoint
```json
{ "problemDescription": "Water is leaking from the kitchen sink pipe" }
```

## Admin dashboard (React)
- Location: `admin-dashboard/` (Vite + React + TS). Uses JWT auth with `Authorization: Bearer <token>` and requires an `ADMIN` or `MANAGER` role.
- Local dev: `cd admin-dashboard && npm install && npm run dev` (defaults to `http://localhost:5173`). Build with `npm run build`.
- Config: create `admin-dashboard/.env` if needed with `VITE_API_BASE_URL=http://localhost:3000` to point at the Express API.
- Login: use your admin credentials (seed: `admin@example.com` / `AdminPass123`). The dashboard surfaces overview stats, categories CRUD, provider directory, request list, and wallet actions (top-ups/approvals) wired to the existing endpoints.



