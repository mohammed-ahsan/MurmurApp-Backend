"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const murmurs_1 = __importDefault(require("./routes/murmurs"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
const prisma = new client_1.PrismaClient({
    datasources: {
        db: {
            url: process.env.POOLED_URL || process.env.DATABASE_URL,
        },
    },
});
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        error: 'Too many requests from this IP, please try again later.',
    },
});
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:19006',
    credentials: true,
}));
app.use((0, morgan_1.default)('combined'));
app.use(limiter);
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
prisma.$connect()
    .then(() => {
    console.log('Connected to PostgreSQL via Prisma');
})
    .catch((error) => {
    console.error('Prisma connection error:', error);
    process.exit(1);
});
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/murmurs', murmurs_1.default);
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
    });
});
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    if (error.code === 'P2002') {
        const target = error.meta?.target;
        const field = Array.isArray(target) ? target[0] : 'field';
        return res.status(409).json({
            success: false,
            error: `${field} already exists`,
        });
    }
    if (error.code === 'P2025') {
        return res.status(404).json({
            success: false,
            error: 'Record not found',
        });
    }
    if (error.code === 'P2003') {
        return res.status(400).json({
            success: false,
            error: 'Invalid reference',
        });
    }
    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: 'Invalid token',
        });
    }
    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: 'Token expired',
        });
    }
    return res.status(error.status || 500).json({
        success: false,
        error: error.message || 'Internal server error',
    });
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
});
process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});
exports.default = app;
//# sourceMappingURL=index.js.map