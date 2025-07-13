import express from 'express';
import dotenv from 'dotenv';

// Load environment
dotenv.config();

const app = express();
const port = 3001; // Farklı port kullanıyoruz

// Test endpoint
app.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Simple test server working!',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Health check OK',
    geminiKey: process.env.GEMINI_API_KEY ? 'SET' : 'NOT_SET'
  });
});

app.listen(port, '127.0.0.1', () => {
  console.log(`✅ Simple test server running on http://127.0.0.1:${port}`);
  console.log(`🧪 Test URL: http://127.0.0.1:${port}/test`);
  console.log(`❤️  Health URL: http://127.0.0.1:${port}/health`);
});