# Simple API Start Guide

## Current Issue
The admin app shows "Failed to fetch" because the API isn't running. There are network issues preventing dependency installation.

## Quick Solution: Start API with ts-node (No Build Required)

Since you have network issues, here's a way to start the API without installing all dependencies:

### Step 1: Install only essential packages locally

```bash
cd /home/newton/projects/uzahX/services/api

# Install only what's needed to run
npm install --no-save @nestjs/core @nestjs/common @nestjs/platform-express reflect-metadata rxjs ts-node typescript
```

### Step 2: Create a minimal start script

Create `start-simple.js`:
```javascript
require('ts-node/register');
require('./src/main.ts');
```

### Step 3: Run with minimal setup

```bash
cd services/api
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/social_commerce"
export PORT=3001
export JWT_SECRET="dev-secret-key-min-32-chars-long"
export JWT_REFRESH_SECRET="dev-refresh-secret-key-min-32-chars"
node start-simple.js
```

## Alternative: Mock API for Testing UI

If you just want to test the admin UI without the full API, you can create a simple mock server:

```bash
# Create mock-api.js
cat > mock-api.js << 'EOF'
const http = require('http');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', database: 'connected' }));
  } else if (req.url === '/auth/login' && req.method === 'POST') {
    res.writeHead(200);
    res.end(JSON.stringify({ 
      accessToken: 'mock-token', 
      refreshToken: 'mock-refresh' 
    }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(3001, () => {
  console.log('Mock API running on http://localhost:3001');
});
EOF

node mock-api.js
```

This will let you test the login UI flow!

## Best Solution: Fix Network and Use pnpm

Once network is working:

```bash
cd /home/newton/projects/uzahX
pnpm install
cd services/api
pnpm dev
```
