const express = require('express');
const path = require('path');
const app = express();
const profileRouter = require('./routes/profile');

// Middleware for parsing form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from "public" folder
app.use(express.static(path.join(__dirname, 'Meera')));

// Use the profile router for handling WhatsApp profile updates
app.use('/api/profile', profileRouter);

// Home route for the form submission page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Meera/index.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
