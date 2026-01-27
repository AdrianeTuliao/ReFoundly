// server.js
const express = require('express');
const path = require('path');
const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public')));

// Example route for dashboard
app.get('/dashboard', (req, res) => {
    const stats = {
        "Total Items": 120,
        "Lost Items": 45,
        "Found Items": 75
    };

    const activities = [
        { id: 1, itemName: "Wallet", category: "Accessories", status: "Pending", date: "2026-01-26" },
        { id: 2, itemName: "Umbrella", category: "Accessories", status: "Approved", date: "2026-01-25" }
    ];

    res.render('dashboard', { stats, activities });
});

// Approve / Deny routes
app.post('/approve/:id', (req, res) => {
    const id = req.params.id;
    // Update database logic here
    console.log(`Approved item ${id}`);
    res.redirect('/dashboard');
});

app.post('/deny/:id', (req, res) => {
    const id = req.params.id;
    // Update database logic here
    console.log(`Denied item ${id}`);
    res.redirect('/dashboard');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
