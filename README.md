# Social Platform Backend

Production-ready REST API for a social media platform (MVP).

## Tech Stack

- **Runtime:** Node.js 18+
- **Language:** TypeScript
- **Database:** PostgreSQL 16
- **ORM:** Prisma
- **Framework:** Express
- **Dev Tools:** Docker Compose, nodemon, ts-node

---

## Prerequisites

- Node.js 18+ and yarn
- Docker & Docker Compose
- PostgreSQL client tools (optional, for debugging)

---

## Getting Started

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd social-platform-backend
yarn install
```

### 2. Set up environment variables

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start database

```bash
docker compose up -d
```

### 4. Run migrations

```bash
npx prisma migrate dev
```

### 5. Start dev server

```bash
yarn dev
```

Server runs at `http://localhost:4000`

---

## Available Scripts

| Command                    | Purpose                                  |
| -------------------------- | ---------------------------------------- |
| `yarn dev`                 | Start development server with hot reload |
| `yarn build`               | Compile TypeScript to JavaScript         |
| `yarn start`               | Run production build                     |
| `yarn type-check`          | Type check without building              |
| `yarn prisma:generate`     | Generate Prisma Client                   |
| `yarn prisma:migrate`      | Run database migrations                  |
| `yarn docker:build`        | Build production Docker image            |
| `yarn docker:compose:up`   | Start services with Docker Compose       |
| `yarn docker:compose:down` | Stop Docker Compose services             |

---

## Project Structure

```
src/
├── controllers/    # HTTP request handlers
├── services/       # Business logic
├── repositories/   # Database access (Prisma)
├── routes/         # API route definitions
├── middlewares/    # Auth, validation, error handling
├── utils/          # Helpers
├── types/          # TypeScript types
└── server.ts       # Entry point

prisma/
└── schema.prisma   # Database schema

tests/              # Unit and integration tests
```

---

## API Endpoints (Week 1)

| Endpoint           | Method | Description         | Status         |
| ------------------ | ------ | ------------------- | -------------- |
| `/health`          | GET    | Health check        | ✅ Done        |
| `/registerAccount` | POST   | Create user account | 🚧 In progress |
| `/updateProfile`   | PUT    | Update user profile | ⏳ Planned     |

---

## Database Schema

See `prisma/schema.prisma` for full schema definition.

**Entities:**

- `UserAccount` — Authentication and core user data
- `UserProfile` — User bio, location, avatar (one-to-one with UserAccount)

---

## Development Workflow

1. Make changes in `src/`
2. Server auto-restarts (nodemon + ts-node)
3. Test with curl/Postman
4. Write tests (Week 3)
5. Commit with descriptive messages

---

## Environment Variables

See `.env.example` for required variables.

| Variable       | Purpose                      | Example                                        |
| -------------- | ---------------------------- | ---------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/dbname` |
| `PORT`         | Server port                  | `4000`                                         |
| `NODE_ENV`     | Environment                  | `development`                                  |
| `JWT_SECRET`   | Token signing key (Week 2)   | `your-secret-key`                              |

---

## Docker

### Development

Start database and backend with Docker Compose:

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f backend

# Stop services
docker compose down
```

### Production Build

Build and run the production Docker image:

```bash
# Build image
yarn docker:build

# Run with environment file
yarn docker:run

# Or use docker-compose for production
docker compose -f docker-compose.prod.yml up -d
```

### Running Migrations in Docker

```bash
# After containers are running
docker compose exec backend yarn prisma migrate deploy

# Or use the migration script
./scripts/migrate.sh
```

### Docker Commands

| Command                    | Purpose                         |
| -------------------------- | ------------------------------- |
| `yarn docker:build`        | Build production Docker image   |
| `yarn docker:run`          | Run container locally           |
| `yarn docker:compose:up`   | Start all services with compose |
| `yarn docker:compose:down` | Stop all services               |

---

## Deployment (Week 5)

- **Platform:** AWS (EC2 or ECS)
- **Database:** AWS RDS PostgreSQL
- **CI/CD:** GitHub Actions
- **Containerization:** Docker

---

## Roadmap

- [x] Week 1: Backend foundations (database, API structure)
- [ ] Week 2: Authentication and frontend integration
- [ ] Week 3: Testing and CI pipeline
- [ ] Week 5: Production deployment

---

## Contributing

This is a learning project following clean architecture principles.

**Code style:**

- Use TypeScript strict mode
- Validate inputs at boundaries
- Handle errors explicitly
- Keep functions small and focused

---

## License

MIT (or your choice)
