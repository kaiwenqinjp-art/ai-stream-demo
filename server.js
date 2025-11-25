const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());

// Endpoint for the AI stream simulation
app.post('/simulate', (req, res) => {
    const { data } = req.body;
    // Simulate AI processing with received data
    console.log(`Received data: ${data}`);
    const response = `Processed data: ${data}`;
    res.status(200).json({ message: response });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
