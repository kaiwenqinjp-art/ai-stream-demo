const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Mock AI responses
const mockResponses = {
    'hello': 'Hello! 👋 I\'m an AI assistant. How can I help you today?',
    'python': 'Python 🐍 is a versatile programming language known for its simplicity and readability. It\'s widely used in web development, data science, AI, and automation.',
    'javascript': 'JavaScript 🚀 is the primary programming language for web browsers. It enables interactive web pages and is an essential part of web applications.',
    'stream': 'Streaming 📡 is a technique where data is transmitted in chunks rather than all at once. This provides better user experience with progressive loading.',
    'default': 'This is a simulated AI response to your prompt. In a real implementation, this would connect to services like OpenAI or Anthropic.'
};

// AI Stream endpoint
app.post('/api/stream', (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    // Set headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Get response based on prompt
    const lowerPrompt = prompt.toLowerCase();
    let responseText = mockResponses.default;
    
    for (const [key, value] of Object.entries(mockResponses)) {
        if (key !== 'default' && lowerPrompt.includes(key)) {
            responseText = value;
            break;
        }
    }

    // Stream the response character by character
    let index = 0;
    const streamInterval = setInterval(() => {
        if (index < responseText.length) {
            const char = responseText[index];
            res.write(`data: ${JSON.stringify({ chunk: char, done: false })}\n\n`);
            index++;
        } else {
            res.write(`data: ${JSON.stringify({ done: true, totalChars: responseText.length })}\n\n`);
            clearInterval(streamInterval);
            res.end();
        }
    }, 30);

    req.on('close', () => {
        clearInterval(streamInterval);
    });
});

app.listen(PORT, () => {
    console.log(`🚀 AI Stream Server running at http://localhost:${PORT}`);
    console.log(`📝 Visit: http://localhost:${PORT}/ai-stream-handler-demo.html`);
});
