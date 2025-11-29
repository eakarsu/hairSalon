# NailFlow AI - Nail Salon Management Platform

A production-ready SaaS application for nail salons featuring AI-powered multi-language messaging, appointment management, loyalty programs, and staff scheduling.

## Features

- **Multi-Language Support**: AI-generated messages in English, Vietnamese, Spanish, Chinese, and Korean
- **Appointment Management**: Calendar view with day/week modes, booking, and reminders
- **Loyalty Program**: Points-based system with Bronze, Silver, Gold, and Platinum tiers
- **Staff Management**: Technician scheduling, utilization tracking, and task assignments
- **Campaign Management**: Automated reminders, no-show recovery, and promotional messaging
- **AI-Powered Insights**: KPI analysis and business recommendations using OpenRouter/Claude

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Material UI (MUI v5)
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js (Email/Password + optional Google OAuth)
- **AI**: OpenRouter API (Claude/GPT models)

## Prerequisites

- Node.js 18+ and Yarn
- PostgreSQL 14+ (installed and running)
- OpenRouter API key

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nailflow?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-change-in-production"

# OpenRouter AI
OPENROUTER_API_KEY="your-openrouter-api-key"
OPENROUTER_MODEL="anthropic/claude-3.5-sonnet"

# Optional: Google OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

## Installation

1. **Install dependencies**:
   ```bash
   yarn install
   ```

2. **Set up the database**:
   ```bash
   # Create the database
   createdb nailflow

   # Run migrations
   npx prisma migrate dev

   # Seed the database with sample data
   npx prisma db seed
   ```

3. **Start the development server**:
   ```bash
   yarn dev
   ```

   Or use the start script:
   ```bash
   ./start.sh
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Demo Accounts

After seeding, use these accounts to log in:

| Role | Email | Password |
|------|-------|----------|
| Owner | linda@elegantnails.com | password123 |
| Manager | maria@elegantnails.com | password123 |
| Technician | kim@elegantnails.com | password123 |
| Front Desk | emily@elegantnails.com | password123 |

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/      # Authenticated pages
│   │   ├── dashboard/    # Main dashboard with KPIs
│   │   ├── calendar/     # Appointment calendar
│   │   ├── clients/      # Client management
│   │   ├── services/     # Service catalog
│   │   ├── loyalty/      # Loyalty program
│   │   ├── staff/        # Staff management
│   │   ├── campaigns/    # Marketing campaigns
│   │   ├── tasks/        # Task management
│   │   └── settings/     # System settings
│   ├── api/
│   │   ├── ai/           # AI endpoints
│   │   │   ├── multilang-reminder/
│   │   │   ├── loyalty-message/
│   │   │   ├── review-request/
│   │   │   ├── visit-notes/
│   │   │   └── kpi-insights/
│   │   ├── auth/         # NextAuth endpoints
│   │   └── dashboard/    # Dashboard stats
│   └── login/            # Login page
├── components/           # Reusable components
├── lib/
│   ├── auth.ts          # NextAuth configuration
│   ├── prisma.ts        # Prisma client
│   ├── openRouterClient.ts # AI client
│   └── theme.ts         # MUI theme
└── types/               # TypeScript definitions
```

## AI Features

### 1. Multi-Language Appointment Reminder
```http
POST /api/ai/multilang-reminder
{
  "clientName": "Jessica",
  "serviceName": "Gel Manicure",
  "dateTime": "January 15, 2024 at 2:00 PM",
  "salonName": "Elegant Nails",
  "language": "es"
}
```

### 2. Loyalty Message Generator
```http
POST /api/ai/loyalty-message
{
  "clientName": "Amy",
  "pointsBalance": 850,
  "tier": "GOLD",
  "offers": ["10% off next visit"],
  "language": "zh"
}
```

### 3. Review Request Generator
```http
POST /api/ai/review-request
{
  "serviceName": "Spa Pedicure",
  "visitDate": "January 10, 2024",
  "platform": "Google",
  "language": "vi"
}
```

### 4. Visit Notes Summarizer
```http
POST /api/ai/visit-notes
{
  "bulletNotes": "- almond shape\n- medium length\n- pink ombre\n- gold accent nail"
}
```

### 5. KPI Insights Generator
```http
POST /api/ai/kpi-insights
{
  "noShowRate": 0.08,
  "repeatVisitRate": 0.72,
  "loyaltyUsageRate": 0.45,
  "campaignOpenRate": 0.65,
  "averageTicket": 55.00,
  "totalAppointments": 120
}
```

## Database Models

- **Salon**: Business information and settings
- **User**: Staff accounts with roles (Owner, Manager, Technician, Front Desk)
- **Service**: Service catalog with pricing
- **Client**: Customer profiles with language preferences
- **Appointment**: Booking records with status tracking
- **Visit**: Service details and ratings
- **LoyaltyAccount**: Points and tier management
- **LoyaltyTransaction**: Points history
- **StaffSchedule**: Weekly schedules
- **Campaign**: Marketing campaigns
- **CampaignMessage**: Individual message records
- **Task**: Staff task assignments
- **AIAuditLog**: AI usage tracking

## Scripts

```bash
# Development
yarn dev           # Start dev server

# Database
yarn db:migrate    # Run migrations
yarn db:seed       # Seed database
yarn db:studio     # Open Prisma Studio

# Production
yarn build         # Build for production
yarn start         # Start production server
```

## User Roles & Permissions

| Feature | Owner | Manager | Technician | Front Desk |
|---------|-------|---------|------------|------------|
| Dashboard | Full | Full | Limited | Limited |
| Calendar | Full | Full | Own | View |
| Clients | Full | Full | View | Full |
| Services | Full | Full | View | View |
| Loyalty | Full | Full | View | Manage |
| Staff | Full | Full | View | View |
| Campaigns | Full | Full | View | View |
| Tasks | Full | Full | Own | Own |
| Settings | Full | Limited | - | - |

## License

MIT
