# Docker PDF Permissions Fix

## Problem Description

When running the AluTrip backend in Docker containers, PDF generation fails with permission errors:

```
EACCES: permission denied, open '/app/pdfs/itinerary_destination_id_timestamp.pdf'
```

This occurs because:
1. Docker containers run with user `alutrip` (UID 1001)
2. Host directory `pdfs` belongs to host user (UID 1000)
3. Container user cannot write to host-mounted directory

## Solution Applied

### 1. Dockerfile Improvements

- Made user UID/GID configurable via build args
- Ensured proper directory permissions in container
- Set default UID/GID to 1001 but allow override

### 2. Docker Compose Updates

- Added build args to use host user UID/GID (1000:1000)
- Both production and development services updated

### 3. Permission Fix Script

Created `scripts/fix-pdf-permissions.sh` to:
- Ensure pdfs directory exists
- Set correct permissions (755)
- Set ownership to current user

## Usage Instructions

### Quick Fix (Recommended)

```bash
# Fix permissions
./scripts/fix-pdf-permissions.sh

# Rebuild containers with new permissions
docker-compose down
docker-compose build --no-cache alutrip-backend
docker-compose up alutrip-backend
```

### Manual Steps

```bash
# 1. Fix directory permissions
chmod 755 pdfs
chown $(id -u):$(id -g) pdfs

# 2. Rebuild with current user UID/GID
docker-compose build --build-arg USER_UID=$(id -u) --build-arg USER_GID=$(id -g) alutrip-backend

# 3. Start services
docker-compose up alutrip-backend
```

## Alternative Solutions

### Option 1: Use Docker Named Volume

If host directory mounting continues to cause issues, use a named volume:

```yaml
volumes:
  - pdf_storage:/app/pdfs  # Instead of ../pdfs:/app/pdfs
```

### Option 2: Different User Strategy

Run container as root and set file permissions in entrypoint:

```dockerfile
USER root
COPY entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
```

## Testing

Test PDF generation with:

```bash
# Create itinerary
curl -X POST http://localhost:3000/api/itinerary/create \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "São Paulo",
    "start_date": "2024-01-15",
    "end_date": "2024-01-18",
    "budget": 2000,
    "interests": ["cultura", "gastronomia"]
  }'
```

Expected result: PDF should be generated successfully without permission errors.

## Files Modified

- `Dockerfile`: Added configurable UID/GID
- `docker/docker-compose.yml`: Added build args for both services
- `scripts/fix-pdf-permissions.sh`: New permission fix script
- `docs/docker-permissions-fix.md`: This documentation

## Compatibility

This solution works for:
- Linux hosts (tested)
- macOS hosts (should work)
- Windows with WSL2 (should work)
- Windows with Docker Desktop (may need different approach)
