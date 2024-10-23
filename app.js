const express = require('express');
const path = require('path');
const connectRoute = require('./routes/connect');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'Meera')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/connect', connectRoute);

// Server start
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
