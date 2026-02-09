"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = exports.authService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("./db/client");
const SECRET_KEY = process.env.JWT_SECRET || 'super-secret-key-change-me';
exports.authService = {
    async register(username, password) {
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const stmt = client_1.db.prepare('INSERT INTO User (username, password) VALUES (?, ?)');
        const info = stmt.run(username, hashedPassword);
        return { id: Number(info.lastInsertRowid), username };
    },
    async login(username, password) {
        const stmt = client_1.db.prepare('SELECT * FROM User WHERE username = ?');
        const user = stmt.get(username);
        if (!user)
            return null;
        const valid = await bcryptjs_1.default.compare(password, user.password);
        if (!valid)
            return null;
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '7d' });
        return { token, user: { id: user.id, username: user.username } };
    }
};
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token && req.query.token) {
        token = req.query.token;
    }
    if (!token)
        return res.sendStatus(401);
    jsonwebtoken_1.default.verify(token, SECRET_KEY, (err, user) => {
        if (err)
            return res.sendStatus(403);
        req.user = user;
        next();
    });
};
exports.authenticateToken = authenticateToken;
