const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration for Render deployment
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        // Allowed origins
        const allowedOrigins = [
            'https://kaiwenqinjp-art.github.io',
            'http://localhost:3000',
            'http://localhost:5500',
            'http://127.0.0.1:5500',
            process.env.FRONTEND_URL
        ].filter(Boolean); // Remove undefined values
        
        // Check if origin is allowed
        const isAllowed = allowedOrigins.some(allowedOrigin => 
            origin === allowedOrigin || origin.startsWith(allowedOrigin)
        );
        
        if (isAllowed) {
            callback(null, true);
        } else {
            console.log(`Blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Health check endpoint (useful for Render)
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'AI Stream Server is running',
        timestamp: new Date().toISOString()
    });
});

// Mock AI responses with more variety
const mockResponses = {
    'hello': 'Hello! 👋 I\'m an AI assistant. How can I help you today?',
    'hi': 'Hi there! 👋 Welcome! What would you like to know?',
    'python': 'Python 🐍 is a versatile programming language known for its simplicity and readability. It\'s widely used in web development, data science, AI, and automation. Created by Guido van Rossum in 1991, Python emphasizes code readability with its notable use of whitespace.',
    'javascript': 'JavaScript 🚀 is the primary programming language for web browsers. It enables interactive web pages and is an essential part of web applications. Along with HTML and CSS, JavaScript is one of the core technologies of the World Wide Web.',
    'stream': 'Streaming 📡 is a technique where data is transmitted in chunks rather than all at once. This provides better user experience with progressive loading. Server-Sent Events (SSE) and WebSockets are popular streaming protocols.',
    'ai': 'Artificial Intelligence 🤖 refers to the simulation of human intelligence in machines. Modern AI systems can perform tasks like natural language processing, image recognition, decision-making, and more.',
    'render': 'Render is a modern cloud platform that makes it easy to deploy web applications. It offers automatic deployments from Git, free SSL certificates, and built-in CDN. Great for deploying Node.js apps!',
    'default': 'This is a simulated AI response to your prompt. In a real implementation, this would connect to services like OpenAI, Anthropic Claude, or other AI APIs. The streaming effect you see is created by sending data character-by-character using Server-Sent Events.'
};

// AI Stream endpoint
app.post('/api/stream', (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders(); // <-- REQUIRED

    // Optional: immediate initial event
    res.write(`data: ${JSON.stringify({ init: true })}\n\n`);

    const fullResponse = `Your result:\n${prompt}`;
    let index = 0;

    const interval = setInterval(() => {
        if (index < fullResponse.length) {
            res.write(`data: ${JSON.stringify({ chunk: fullResponse[index] })}\n\n`);
            index++;
        } else {
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            clearInterval(interval);
            res.end();
        }
    }, 30);

    req.on('close', () => {
        clearInterval(interval);
    });
});

// Catch-all route for SPA (if serving static files)
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    if (require('fs').existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Not found');
    }
});

// Start server
app.listen(PORT, () => {
    console.log('🚀========================================🚀');
    console.log(`   AI Stream Server running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
    console.log(`   Stream API: http://localhost:${PORT}/api/stream`);
    console.log('🚀========================================🚀');
});
