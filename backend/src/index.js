"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const mockJobs_1 = require("./data/mockJobs");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: { origin: '*' }
});
const prisma = new client_1.PrismaClient();
const PORT = parseInt(process.env.PORT) || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Auth Middleware
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};
// ==========================================
// AUTH ROUTES
// ==========================================
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name, role } = req.body;
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing)
            return res.status(400).json({ error: 'User already exists' });
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma.user.create({
            data: { email, password: hashedPassword, name, role: role || 'Member' }
        });
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: 'This account does not exist. Please check your email or Sign Up.' });
        }
        if (!(await bcryptjs_1.default.compare(password, user.password))) {
            return res.status(401).json({ error: 'Incorrect password. Please try again or use Forgot Password.' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
// ==========================================
// PASSWORD RECOVERY / OTP ROUTES
// ==========================================
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Return 200 anyway for security (don't reveal registered emails)
            return res.json({ message: 'If an account exists, an OTP was sent' });
        }
        // Generate a 6-digit OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins validity
        await prisma.oTP.create({
            data: { email, code, expiresAt }
        });
        const transporter = nodemailer_1.default.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        await transporter.sendMail({
            from: `"ConnectIn Support" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Your ConnectIn Password Reset OTP',
            text: `Your One-Time Password (OTP) for password reset is: ${code}. It is valid for 15 minutes.`
        });
        console.log(`[EMAIL SENT] OTP successfully dispatched to ${email}`);
        res.json({ message: 'OTP sent successfully' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});
app.post('/api/auth/verify-otp', async (req, res) => {
    try {
        const { email, code } = req.body;
        const otpRecord = await prisma.oTP.findFirst({
            where: { email, code },
            orderBy: { createdAt: 'desc' }
        });
        if (!otpRecord)
            return res.status(400).json({ error: 'Invalid OTP' });
        if (new Date() > otpRecord.expiresAt)
            return res.status(400).json({ error: 'OTP expired' });
        // OTP valid. Return a temporary reset token
        const resetToken = jsonwebtoken_1.default.sign({ email, reset: true }, JWT_SECRET, { expiresIn: '15m' });
        res.json({ message: 'OTP verified', resetToken });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Verification failed' });
    }
});
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;
        const payload = jsonwebtoken_1.default.verify(resetToken, JWT_SECRET);
        if (!payload.reset || !payload.email) {
            return res.status(400).json({ error: 'Invalid token' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await prisma.user.update({
            where: { email: payload.email },
            data: { password: hashedPassword }
        });
        res.json({ message: 'Password reset successfully' });
    }
    catch (error) {
        console.error(error);
        res.status(400).json({ error: 'Invalid or expired token' });
    }
});
// ==========================================
// USER SETTINGS
// ==========================================
app.get('/api/user/settings', authMiddleware, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: { id: true, name: true, email: true, role: true, location: true, avatarUrl: true, bio: true, skills: true }
        });
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});
app.put('/api/user/settings', authMiddleware, async (req, res) => {
    try {
        const { name, role, location, bio, avatarUrl, skills } = req.body;
        const updatedUser = await prisma.user.update({
            where: { id: req.user.userId },
            data: { name, role, location, bio, avatarUrl, skills },
            select: { id: true, name: true, email: true, role: true, location: true, avatarUrl: true, bio: true, skills: true }
        });
        res.json({ message: 'Settings updated successfully', user: updatedUser });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});
// ==========================================
// FEED / POSTS ROUTES
// ==========================================
app.get('/api/posts', authMiddleware, async (req, res) => {
    const posts = await prisma.post.findMany({
        include: {
            author: { select: { id: true, name: true, role: true, avatarUrl: true } },
            likes: { where: { userId: req.user.userId }, select: { id: true } },
            reposts: { where: { userId: req.user.userId }, select: { id: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
    // Map to simple booleans for the frontend
    const mapped = posts.map(p => ({
        ...p,
        hasLiked: p.likes.length > 0,
        hasReposted: p.reposts.length > 0
    }));
    res.json(mapped);
});
app.post('/api/posts', authMiddleware, async (req, res) => {
    try {
        const { content, imageUrl } = req.body;
        const post = await prisma.post.create({
            data: {
                content,
                imageUrl,
                authorId: req.user.userId
            },
            include: { author: { select: { id: true, name: true, role: true, avatarUrl: true } } }
        });
        res.json(post);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create post' });
    }
});
// POST /api/posts/:id/like
app.post('/api/posts/:id/like', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        // Check if already liked
        const existingLike = await prisma.like.findUnique({
            where: {
                postId_userId: { postId: id, userId }
            }
        });
        if (existingLike) {
            // Unlike
            await prisma.like.delete({ where: { id: existingLike.id } });
            const post = await prisma.post.update({
                where: { id },
                data: { likesCount: { decrement: 1 } }
            });
            return res.json({ message: 'Post unliked', likesCount: post.likesCount });
        }
        else {
            // Like
            await prisma.like.create({
                data: { postId: id, userId }
            });
            const post = await prisma.post.update({
                where: { id },
                data: { likesCount: { increment: 1 } }
            });
            return res.json({ message: 'Post liked', likesCount: post.likesCount });
        }
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to like post' });
    }
});
// POST /api/posts/:id/comment
app.post('/api/posts/:id/comment', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user.userId;
        if (!content)
            return res.status(400).json({ error: 'Comment content is required' });
        const comment = await prisma.comment.create({
            data: { content, postId: id, userId }
        });
        const post = await prisma.post.update({
            where: { id },
            data: { commentsCount: { increment: 1 } }
        });
        res.json({ message: 'Comment added', comment, commentsCount: post.commentsCount });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to add comment' });
    }
});
// POST /api/posts/:id/repost
app.post('/api/posts/:id/repost', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const existingRepost = await prisma.repost.findUnique({
            where: {
                postId_userId: { postId: id, userId }
            }
        });
        if (existingRepost) {
            return res.status(400).json({ error: 'Already reposted' });
        }
        await prisma.repost.create({
            data: { postId: id, userId }
        });
        const post = await prisma.post.update({
            where: { id },
            data: { repostsCount: { increment: 1 } }
        });
        res.json({ message: 'Post reposted', repostsCount: post.repostsCount });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to repost' });
    }
});
app.get('/api/profiles/recommended', authMiddleware, async (req, res) => {
    try {
        const currentUser = await prisma.user.findUnique({
            where: { id: req.user.userId }
        });
        if (!currentUser)
            return res.status(404).json({ error: 'User not found' });
        // Recommendation logic: find users matching the same role or matching skills.
        let recommendedUsers = [];
        // Fallback simply fetch all others if no specifics to match
        const others = await prisma.user.findMany({
            where: { id: { not: req.user.userId } },
            select: { id: true, name: true, role: true, avatarUrl: true, location: true, skills: true }
        });
        if (currentUser.skills || currentUser.role) {
            // Score-based sorting (super basic simulated Recommendation Engine)
            const userSkills = currentUser.skills ? currentUser.skills.toLowerCase().split(',') : [];
            const scoredProfiles = others.map(profile => {
                let score = 0;
                if (profile.role && currentUser.role && profile.role.toLowerCase() === currentUser.role.toLowerCase())
                    score += 10;
                if (profile.skills) {
                    const theirSkills = profile.skills.toLowerCase().split(',');
                    const intersection = userSkills.filter(v => theirSkills.includes(v.trim()));
                    score += (intersection.length * 5); // 5 points for every matching skill
                }
                return { ...profile, recommendationScore: score };
            });
            recommendedUsers = scoredProfiles
                .filter(p => p.recommendationScore > 0)
                .sort((a, b) => b.recommendationScore - a.recommendationScore);
        }
        if (recommendedUsers.length === 0) {
            // If none match, return all users shuffled or limited
            recommendedUsers = others.sort(() => 0.5 - Math.random());
        }
        res.json({ data: recommendedUsers.slice(0, 10), count: recommendedUsers.length });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
});
app.post('/api/connect', authMiddleware, async (req, res) => {
    try {
        const { connectedId } = req.body;
        const connection = await prisma.connection.create({
            data: {
                userId: req.user.userId,
                connectedId
            }
        });
        res.json(connection);
    }
    catch (error) {
        res.status(500).json({ error: 'Connection failed or already exists' });
    }
});
// Keep existing jobs logic for now
app.get('/api/jobs', (req, res) => {
    res.json(mockJobs_1.mockJobs);
});
// ==========================================
// MESSAGES & CHAT
// ==========================================
app.get('/api/messages/:userId', authMiddleware, async (req, res) => {
    const { userId } = req.params;
    const messages = await prisma.message.findMany({
        where: {
            OR: [
                { senderId: req.user.userId, receiverId: userId },
                { senderId: userId, receiverId: req.user.userId }
            ]
        },
        orderBy: { createdAt: 'asc' }
    });
    res.json(messages);
});
// Socket.io for Real-time messaging
io.on('connection', (socket) => {
    console.log('A user connected via socket.io');
    socket.on('join_chat', (userId) => {
        socket.join(userId);
    });
    socket.on('send_message', async (data) => {
        const { senderId, receiverId, content } = data;
        try {
            // Save directly to db!
            const message = await prisma.message.create({
                data: { senderId, receiverId, content }
            });
            // Emit strictly to the receiver's room
            io.to(receiverId).emit('receive_message', message);
            // Also bounce back to sender for confirmation
            io.to(senderId).emit('receive_message', message);
        }
        catch (err) {
            console.error("Message error:", err);
        }
    });
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});
// ==========================================
// START SERVER
// ==========================================
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server globally exposed running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map