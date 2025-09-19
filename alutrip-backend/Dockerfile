# Multi-stage build for optimized production image
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Install dependencies including dev dependencies for build
RUN npm ci

COPY . .

RUN npm run build

FROM node:22-alpine AS production

# Create app user for security
# Use ARG to make UID configurable, defaulting to 1001
ARG USER_UID=1001
ARG USER_GID=1001

# Create user with fallback strategy for existing UIDs/GIDs
RUN set -e; \
    # Handle group creation/detection
    if getent group ${USER_GID} >/dev/null 2>&1; then \
        GROUP_NAME=$(getent group ${USER_GID} | cut -d: -f1); \
        echo "Using existing group: $GROUP_NAME (${USER_GID})"; \
    else \
        addgroup -g ${USER_GID} -S nodejs; \
        GROUP_NAME="nodejs"; \
        echo "Created new group: $GROUP_NAME (${USER_GID})"; \
    fi; \
    # Handle user creation/detection
    if getent passwd ${USER_UID} >/dev/null 2>&1; then \
        EXISTING_USER=$(getent passwd ${USER_UID} | cut -d: -f1); \
        echo "UID ${USER_UID} already exists for user: $EXISTING_USER"; \
        # Add existing user to our group
        addgroup $EXISTING_USER $GROUP_NAME 2>/dev/null || true; \
        USER_NAME="$EXISTING_USER"; \
    else \
        adduser -S alutrip -u ${USER_UID} -G $GROUP_NAME; \
        USER_NAME="alutrip"; \
        echo "Created new user: $USER_NAME (${USER_UID})"; \
    fi; \
    echo "Final user: $USER_NAME, Group: $GROUP_NAME"

WORKDIR /app

COPY package*.json ./

# Install minimal dependencies for production
RUN apk add --no-cache \
    ca-certificates

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Create directories and set permissions
RUN mkdir -p logs pdfs

# Set ownership based on the user that was created/found
RUN set -e; \
    if getent passwd ${USER_UID} >/dev/null 2>&1; then \
        USER_NAME=$(getent passwd ${USER_UID} | cut -d: -f1); \
    else \
        USER_NAME="alutrip"; \
    fi; \
    if getent group ${USER_GID} >/dev/null 2>&1; then \
        GROUP_NAME=$(getent group ${USER_GID} | cut -d: -f1); \
    else \
        GROUP_NAME="nodejs"; \
    fi; \
    chown -R $USER_NAME:$GROUP_NAME /app && \
    chmod 755 logs pdfs && \
    echo "Set ownership to: $USER_NAME:$GROUP_NAME"

# Switch to the appropriate user
RUN if getent passwd ${USER_UID} >/dev/null 2>&1; then \
        echo "$(getent passwd ${USER_UID} | cut -d: -f1)" > /tmp/username; \
    else \
        echo "alutrip" > /tmp/username; \
    fi

USER ${USER_UID}

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["npm", "start"]