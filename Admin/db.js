const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'refoundly_app', 
    password: 'password123',
    database: 'refoundly_db'
});;

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Connected to MySQL');
    }
});

module.exports = db;
