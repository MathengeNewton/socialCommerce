// Simple mock API server for testing admin UI
const http = require('http');

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Health check
  if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected' 
    }));
    return;
  }
  
  // Login endpoint
  if (req.url === '/auth/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (data.email === 'admin@demo.com' && data.password === 'admin123') {
          res.writeHead(200);
          res.end(JSON.stringify({ 
            accessToken: 'mock-access-token-' + Date.now(), 
            refreshToken: 'mock-refresh-token-' + Date.now()
          }));
        } else {
          res.writeHead(401);
          res.end(JSON.stringify({ message: 'Invalid credentials' }));
        }
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ message: 'Invalid request' }));
      }
    });
    return;
  }
  
  // Me endpoint (requires auth)
  if (req.url === '/auth/me' && req.method === 'GET') {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      res.writeHead(200);
      res.end(JSON.stringify({
        id: '1',
        email: 'admin@demo.com',
        name: 'Admin User',
        tenantId: 'tenant-1'
      }));
    } else {
      res.writeHead(401);
      res.end(JSON.stringify({ message: 'Unauthorized' }));
    }
    return;
  }
  
  // Default 404
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found', path: req.url }));
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Mock API server running on http://localhost:${PORT}`);
  console.log(`✅ Health: http://localhost:${PORT}/health`);
  console.log(`✅ Login: POST http://localhost:${PORT}/auth/login`);
  console.log(`✅ Me: GET http://localhost:${PORT}/auth/me`);
});
