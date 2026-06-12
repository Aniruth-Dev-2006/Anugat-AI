# Anugat AI - Smart Timetable Management

Anugat AI is an advanced, AI-powered timetable management and analytics platform designed for educational institutions. It automates the tedious process of extracting, normalizing, and managing complex master class timetables from raw PDFs using Google's Gemini AI and background processing queues.

## 🚀 Key Features

- **AI-Powered Parsing**: Upload raw Timetable PDFs and let Gemini AI automatically extract and structure departments, branches, semesters, rooms, courses, and faculties.
- **Smart Analytics Dashboard**: Real-time insights into room utilization, empty room availability ratios, and under-running classes.
- **Data Isolation**: Perfect separation between different semesters and branches, ensuring no overlapping conflicts even when uploaded in parallel.
- **Robust Admin Panel**: Complete CRUD control over the global data pool (Departments, Rooms, Courses, Faculty, Timetables) with strict cascade deletion safeguards.
- **Asynchronous Background Processing**: Uses BullMQ and Redis to process multiple heavy PDFs concurrently without blocking the server.

## 🛠️ Tech Stack

### Frontend (Client)
- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **Routing**: React Router DOM
- **Styling**: Vanilla CSS + Glassmorphism UI
- **Icons**: Lucide React

### Backend (Server)
- **Runtime**: Node.js + Express
- **Language**: TypeScript
- **Database ORM**: Prisma
- **Database**: PostgreSQL
- **Queue System**: BullMQ + Redis (ioredis)
- **AI Processing**: Google Gemini API
- **Security**: JWT Authentication, Helmet, Express Rate Limit, CORS

---

## ⚙️ Local Development Setup

### 1. Prerequisites
Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18+)
- [PostgreSQL](https://www.postgresql.org/) (Local or Cloud like Supabase/Neon)
- [Redis](https://redis.io/) (Local or Cloud like Upstash)

### 2. Clone the Repository
```bash
git clone https://github.com/Aniruth-Dev-2006/Anugat-AI.git
cd Anugat-AI
```

### 3. Backend Setup
Navigate to the server directory and install dependencies:
```bash
cd server
npm install
```

Create a `.env` file in the `server` directory and configure the following environment variables:
```env
# Database Configuration (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/anugat_ai?schema=public"

# Redis Configuration (For BullMQ)
REDIS_URL="redis://localhost:6379"

# AI Configuration
GEMINI_API_KEY="your_google_gemini_api_key"

# Security
JWT_SECRET="your_super_secret_jwt_key"
FRONTEND_URL="http://localhost:5173"
PORT=3001
```

Initialize the database schema:
```bash
npm run db:generate
npm run db:push
```

Start the backend development server:
```bash
npm run dev
```

### 4. Frontend Setup
Open a new terminal window, navigate to the client directory, and install dependencies:
```bash
cd client
npm install
```

Start the frontend development server:
```bash
npm run dev
```

### 5. Access the Application
- The frontend will be available at: `http://localhost:5173`
- The backend API will be running at: `http://localhost:3001`

---

## 🔒 Security Notes
- The default rate limit is configured to `5000` requests per 15 minutes for development purposes. For production deployments, adjust this value in `server/src/index.ts`.
- Ensure your `JWT_SECRET` and `GEMINI_API_KEY` are kept strictly confidential and are not pushed to version control.

## 📄 License
This project is proprietary and intended for institutional timetable management.
