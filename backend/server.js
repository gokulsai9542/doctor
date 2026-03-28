require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const connectDB = require('./config/db');

const app = express();
connectDB();

// Allow requests from Vercel frontend + localhost dev
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,        // set this in Render env vars
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // allow requests with no origin (curl, Postman, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origin not allowed — ' + origin));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => res.json({ status: 'MedAnnotate API running' }));

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/images',        require('./routes/images'));
app.use('/api/annotations',   require('./routes/annotations'));
app.use('/api/payments',      require('./routes/payments'));
app.use('/api/ml',            require('./routes/ml'));
app.use('/api/rejected',      require('./routes/rejected'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/ai',            require('./routes/ai'));
app.use('/api/blockchain',    require('./routes/blockchain'));

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
    process.exit(1);
  } else {
    throw err;
  }
});
