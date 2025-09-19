# AluTrip Frontend

Travel Planning Assistant Frontend built with React 19.1, TypeScript, Tailwind CSS, and Shadcn/ui.

## Tech Stack

- **Frontend**: React 19.1 with TypeScript
- **Styling**: Tailwind CSS + Shadcn/ui
- **Forms**: React Hook Form + Zod validation
- **Build Tool**: Vite
- **Icons**: Lucide React
- **API Client**: Axios

## 🚀 How to Run

### Frontend

#### Option 1: Docker (Recommended)

```bash
# Navigate to frontend directory
cd alutrip-frontend

# Start frontend with Docker
npm run dc:up

# Check logs
npm run dc:logs

# Stop services
npm run dc:down
```

#### Option 2: Local Development

```bash
# Navigate to frontend directory
cd alutrip-frontend

# Install dependencies
npm install

# Run in development mode
npm run dev
```

**Service available after starting container:**
- Frontend: `http://localhost:5173` (Docker) or `http://localhost:5173` (Local)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

## Environment Variables

The project uses environment-specific configuration files:

### Development Setup

Create a `.env` file in the project root:

```bash
# API Configuration
VITE_API_URL=http://localhost:3000
```

### Environment Files

- `.env` - Base configuration (development)
- `.env.development` - Development environment
- `.env.production` - Production environment
- `.env.example` - Template for other developers

### Available Variables

- `VITE_API_URL` - Backend API URL (default: `http://localhost:3000`)

The Vite build tool automatically loads the appropriate environment file based on the `NODE_ENV`.

### Environment Configuration

For different environments, update the corresponding files:

**Development** (`.env.development`):
```bash
VITE_API_URL=http://localhost:3000
```

**Production** (`.env.production`):
```bash
VITE_API_URL=https://api.alutrip.com
```

## Features

### AluTrip Responde (Travel Q&A)
- Submit travel questions (10-1000 characters)
- Choose between Groq or Gemini AI models
- Real-time response display with proper API integration
- Enhanced loading states with visual feedback
- Clear response formatting with model information
- "Nova Pergunta" button to start fresh
- Rate limiting feedback (5 requests per 24h per IP)
- Improved error handling with detailed feedback

### AluTrip Planeja (Itinerary Planning)
- Destination selection
- Date range picker (max 7 days)
- Budget specification ($100-$50,000)
- Interest selection (max 10)
- Asynchronous processing with status tracking
- PDF download when completed

### Navigation & UX
- **Tab Interface**: Clean tab navigation between features
- **Mobile Optimized**: Responsive tab labels that adapt to screen size
- **State Persistence**: Selected tab is saved to localStorage
- **Smooth Transitions**: Animated content switching with fade effects
- **Focus Management**: Clear visual indicators for active tab

## UI Theme

The application uses a custom dark theme with AluTrip brand colors:

- **Primary Background**: #01080E
- **Secondary Background**: #021017
- **Accent Text**: #49DEFD
- **Normal Text**: #D7F9FF
- **Button Background**: #43FDBE
- **Input Border**: #49DEFD

## Typography

- **Headings**: Chakra Petch
- **Body Text**: Inter

## API Integration

The frontend connects to the AluTrip API with the following endpoints:

- `POST /api/travel/ask` - Submit travel questions
- `POST /api/itinerary/create` - Create itinerary requests
- `GET /api/itinerary/:id/status` - Check processing status
- `GET /api/itinerary/:id/download` - Download PDF

## Contributing

1. Follow TypeScript strict mode
2. Use ESLint and Prettier for code formatting
3. Follow React Hook Form patterns for forms
4. Use Zod for validation schemas
5. Follow Shadcn/ui component patterns
