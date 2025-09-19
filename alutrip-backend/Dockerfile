# Multi-stage build for optimized production image
FROM node:22-alpine as builder

WORKDIR /app

COPY package*.json ./

# Install build dependencies needed for native modules (including Puppeteer)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install dependencies including dev dependencies for build
RUN npm ci

COPY . .

RUN npm run build

FROM node:22-alpine as production

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S alutrip -u 1001 -G nodejs

WORKDIR /app

COPY package*.json ./

# Install dependencies needed for Puppeteer and native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

# Remove build dependencies to reduce image size
RUN apk del python3 make g++

COPY --from=builder /app/dist ./dist

RUN mkdir -p logs pdfs && \
    chown -R alutrip:nodejs /app

USER alutrip

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["npm", "start"]

