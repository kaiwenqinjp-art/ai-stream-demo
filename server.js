const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Disable compression for SSE
app.use((req, res, next) => {
    res.set('X-Accel-Buffering', 'no');
    next();
});

// CORS Configuration - Secure whitelist
const allowedOrigins = [
    'https://kaiwenqinjp-art.github.io',
    'https://ai-stream-demo.onrender.com',  // Allow Render's own domain
    'http://localhost:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://127.0.0.1:3000'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, Postman, curl)
        if (!origin) {
            return callback(null, true);
        }
        
        // Check if origin is allowed
        const isAllowed = allowedOrigins.some(allowed => 
            origin === allowed || origin.startsWith(allowed)
        );
        
        if (isAllowed) {
            console.log('✅ Allowed origin:', origin);
            callback(null, true);
        } else {
            console.log('🚫 Blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());

// Body parser middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'AI Stream Server is running',
        timestamp: new Date().toISOString()
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'AI Stream Demo API',
        endpoints: {
            health: '/health',
            stream: '/api/stream (POST)'
        }
    });
});

// Mock AI responses
const mockResponses = {
    'hello': 'Hello! 👋 I\'m an AI assistant. How can I help you today?',
    'hi': 'Hi there! 👋 Welcome! What would you like to know?',
    'python': 'Python 🐍 is a versatile programming language known for its simplicity and readability. It\'s widely used in web development, data science, AI, and automation.',
    'javascript': 'JavaScript 🚀 is the primary programming language for web browsers. It enables interactive web pages and is an essential part of web applications.',
    'stream': 'Streaming 📡 is a technique where data is transmitted in chunks rather than all at once. This provides better user experience with progressive loading.',
    'ai': 'Artificial Intelligence 🤖 refers to the simulation of human intelligence in machines. Modern AI systems can perform tasks like natural language processing, image recognition, and more.',
    'render': 'Render is a modern cloud platform that makes it easy to deploy web applications. It offers automatic deployments from Git, free SSL certificates, and built-in CDN.',
    'default': 'This is a simulated AI response to your prompt. In a real implementation, this would connect to services like OpenAI, Anthropic Claude, or other AI APIs.'
};

// AI Stream endpoint
app.post('/api/stream', (req, res) => {
    console.log('✅ Stream request received');
    
    const { prompt } = req.body;

    if (!prompt) {
        console.log('❌ Error: No prompt provided');
        return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('📝 Prompt:', prompt);

    // CRITICAL: Set headers before any writes
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*'
    });

    // Get response based on prompt keywords
    const lowerPrompt = prompt.toLowerCase();
    let responseText = mockResponses.default;
    
    for (const [key, value] of Object.entries(mockResponses)) {
        if (key !== 'default' && lowerPrompt.includes(key)) {
            responseText = value;
            console.log('🎯 Matched keyword:', key);
            break;
        }
    }

    const fullResponse = `📝 You asked: "${prompt}"\n\n${responseText}\n\n⏰ Generated at: ${new Date().toLocaleTimeString()}`;

    console.log('🚀 Starting stream... (', fullResponse.length, 'chars)');

    // Send initial comment to establish connection
    res.write(': connected\n\n');
    
    // Force flush the initial response
    if (res.flush) res.flush();
    
    // Stream the response character by character
    let index = 0;
    let stopped = false;
    
    const streamInterval = setInterval(() => {
        if (stopped) {
            return;
        }
        
        try {
            if (index < fullResponse.length) {
                const char = fullResponse[index];
                const line = `data: ${JSON.stringify({ chunk: char, done: false })}\n\n`;
                
                // Write and immediately flush
                res.write(line);
                
                // Force flush after every write
                if (res.flush) res.flush();
                
                if (!canContinue) {
                    console.log('⚠️ Buffer full, pausing...');
                    res.once('drain', () => {
                        console.log('✅ Buffer drained, continuing...');
                    });
                }
                
                // Log progress every 50 chars
                if (index % 50 === 0 && index > 0) {
                    console.log(`📊 Progress: ${index}/${fullResponse.length} chars sent`);
                }
                
                index++;
            } else {
                // Send completion message
                res.write(`data: ${JSON.stringify({ 
                    done: true, 
                    totalChars: fullResponse.length,
                    message: 'Stream complete'
                })}\n\n`);
                
                clearInterval(streamInterval);
                res.end();
                console.log('✅ Stream completed successfully');
                stopped = true;
            }
        } catch (err) {
            console.error('❌ Error during streaming:', err);
            clearInterval(streamInterval);
            stopped = true;
            try {
                res.end();
            } catch (e) {
                // Ignore if already ended
            }
        }
    }, 30); // 30ms per character

    // Handle client disconnect
    req.on('close', () => {
        if (!stopped) {
            console.log('🔌 Client disconnected from stream');
            clearInterval(streamInterval);
            stopped = true;
        }
    });

    req.on('error', (err) => {
        console.error('❌ Request error:', err);
        clearInterval(streamInterval);
        stopped = true;
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: err.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found', path: req.url });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀========================================🚀');
    console.log(`   AI Stream Server running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Time: ${new Date().toISOString()}`);
    console.log('🚀========================================🚀');
});

// Set longer timeout for streams
server.keepAliveTimeout = 120000; // 120 seconds
server.headersTimeout = 120000; // 120 seconds

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});
