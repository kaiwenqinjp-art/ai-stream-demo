const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration - Allow all origins
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like Postman, curl, same-origin)
        if (!origin) return callback(null, true);
        
        // For debugging - log all origins
        console.log('Request from origin:', origin);
        
        // Allow all origins (you can restrict this later)
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Body parser middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Origin:', req.headers.origin);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'AI Stream Server is running',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development'
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
    try {
        console.log('✅ Stream request received');
        console.log('Request headers:', JSON.stringify(req.headers, null, 2));
        
        const { prompt } = req.body;

        if (!prompt) {
            console.log('❌ Error: No prompt provided');
            return res.status(400).json({ error: 'Prompt is required' });
        }

        console.log('📝 Prompt:', prompt);

        // Set headers for Server-Sent Events
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        
        // Important: Send the headers immediately
        res.flushHeaders();
        console.log('📤 Headers sent');

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

        // Send initial heartbeat to ensure connection is established
        res.write(': heartbeat\n\n');
        console.log('💓 Heartbeat sent');

        // Stream the response character by character
        let index = 0;
        let clientDisconnected = false;
        
        const streamInterval = setInterval(() => {
            try {
                if (clientDisconnected) {
                    clearInterval(streamInterval);
                    return;
                }
                
                if (index < fullResponse.length) {
                    const char = fullResponse[index];
                    const success = res.write(`data: ${JSON.stringify({ chunk: char, done: false })}\n\n`);
                    
                    if (!success) {
                        console.log('⚠️ Write buffer full, waiting for drain...');
                    }
                    
                    if (index % 20 === 0) {
                        console.log(`📊 Progress: ${index}/${fullResponse.length}`);
                    }
                    
                    index++;
                } else {
                    res.write(`data: ${JSON.stringify({ 
                        done: true, 
                        totalChars: fullResponse.length,
                        message: 'Stream complete'
                    })}\n\n`);
                    clearInterval(streamInterval);
                    res.end();
                    console.log('✅ Stream completed successfully');
                }
            } catch (err) {
                console.error('❌ Error during streaming:', err);
                clearInterval(streamInterval);
                if (!res.headersSent) {
                    res.status(500).end();
                }
            }
        }, 30);

        // Handle client disconnect
        req.on('close', () => {
            clientDisconnected = true;
            clearInterval(streamInterval);
            console.log('🔌 Client disconnected from stream');
        });

        req.on('error', (err) => {
            clientDisconnected = true;
            console.error('❌ Request error:', err);
            clearInterval(streamInterval);
        });
        
        // Prevent request timeout
        req.setTimeout(0);

    } catch (error) {
        console.error('❌ Error in /api/stream:', error);
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Internal server error',
                message: error.message
            });
        }
    }
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
    console.log(`   CORS: Enabled for all origins`);
    console.log('🚀========================================🚀');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});
