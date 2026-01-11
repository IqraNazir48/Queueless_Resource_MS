// server.js 
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require("path");
const cookieParser = require("cookie-parser");

dotenv.config();

const app = express();

// CORS configuration
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve Frontend Static Files
app.use(express.static(path.join(__dirname, "../frontend/public")));

// Set EJS as View Engine
app.set("views", path.join(__dirname, "../frontend/views"));
app.set("view engine", "ejs");


app.use((req, res, next) => {
    res.locals.success = '';
    res.locals.error = '';
    res.locals.user = null;
    next();
});

// Test route
app.get('/api', (req, res) => {
    res.json({ message: 'QueueLess API Running...' });
});

const PORT = process.env.PORT ;
const connectDB = require('./config/db');

connectDB()
    .then(() => {
        console.log('Database connected successfully');
        
        // Import routes AFTER DB connection
        const authRoutes = require('./routes/authRoutes');
        const resourceRoutes = require('./routes/resourceRoutes');
        const bookingRoutes = require('./routes/bookingRoutes');
        const settingsRoutes = require('./routes/settingsRoutes');
        const userRoutes = require('./routes/userRoutes');
        const notificationRoutes = require('./routes/notificationRoutes');
        const frontendRoutes = require('./routes/frontendRoutes');


        // API ROUTES
        app.use("/api/auth", authRoutes);
        
        app.use("/api/resources", resourceRoutes);
        
        app.use("/api/bookings", bookingRoutes);
        
        app.use("/api/settings", settingsRoutes);
        
        app.use("/api/users", userRoutes);
        
        app.use("/api/notifications", notificationRoutes);

        // FRONTEND ROUTES
        app.use("/", frontendRoutes);

        // Error handling middleware
        app.use((err, req, res, next) => {
            console.error(' Error:', err);
            
            if (req.path.startsWith('/api/')) {
                return res.status(500).json({ 
                    message: 'Internal server error', 
                    error: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
                });
            }
            
            res.status(500).render('error', { 
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err : {}
            });
        });

        // 404 handler
        app.use((req, res) => {
            console.log('404 Not Found:', req.method, req.path);
            
            if (req.path.startsWith('/api/')) {
                return res.status(404).json({ 
                    message: 'API endpoint not found',
                    path: req.path,
                    method: req.method
                });
            }
            res.status(404).render('error', { 
                message: 'Page not found',
                error: {}
            });
        });

        app.listen(PORT, () => {
        });
    })
    .catch(err => {
        console.error("❌ DB Connection Failed:", err);
        process.exit(1);
    });