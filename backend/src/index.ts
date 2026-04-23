import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { mockJobs } from './data/mockJobs';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

const prisma = new PrismaClient();
const PORT = parseInt(process.env.PORT as string) || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

app.use(cors());
app.use(express.json());

// Set up static files for uploads
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, res, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname))
});
const upload = multer({ storage });

// Auth Middleware
const authMiddleware = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (error) {
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
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, role: role || 'Member' }
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/roles', async (req, res) => {
  try {
    const users = await prisma.user.findMany({ select: { role: true } });
    const roles = [...new Set(users.map(u => u.role).filter(Boolean))];
    res.json(roles);
  } catch (error) {
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
    
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Incorrect password. Please try again or use Forgot Password.' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
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

    const transporter = nodemailer.createTransport({
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
  } catch (error) {
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

    if (!otpRecord) return res.status(400).json({ error: 'Invalid OTP' });
    if (new Date() > otpRecord.expiresAt) return res.status(400).json({ error: 'OTP expired' });

    // OTP valid. Return a temporary reset token
    const resetToken = jwt.sign({ email, reset: true }, JWT_SECRET, { expiresIn: '15m' });
    res.json({ message: 'OTP verified', resetToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    const payload: any = jwt.verify(resetToken, JWT_SECRET);

    if (!payload.reset || !payload.email) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email: payload.email },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

// ==========================================
// USER SETTINGS
// ==========================================
app.get('/api/user/settings', authMiddleware, async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, name: true, email: true, role: true, location: true, avatarUrl: true, bio: true, skills: true }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/user/settings', authMiddleware, async (req: any, res) => {
  try {
    const { name, role, location, bio, avatarUrl, skills } = req.body;
    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: { name, role, location, bio, avatarUrl, skills },
      select: { id: true, name: true, email: true, role: true, location: true, avatarUrl: true, bio: true, skills: true }
    });
    res.json({ message: 'Settings updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ==========================================
// FEED / POSTS ROUTES
// ==========================================

app.get('/api/users/:id', authMiddleware, async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true, email: true, role: true, location: true, avatarUrl: true, bio: true, skills: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Check if there is an existing connection between logged in user and this profile
    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          { userId: req.user.userId, connectedId: req.params.id },
          { userId: req.params.id, connectedId: req.user.userId }
        ]
      }
    });

    const connectionsCount = await prisma.connection.count({
      where: {
        OR: [
          { userId: req.params.id },
          { connectedId: req.params.id }
        ],
        status: 'ACCEPTED'
      }
    });

    res.json({ ...user, connectionStatus: connection ? connection.status : null, connectionsCount });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/users/:id/connections', authMiddleware, async (req: any, res) => {
  try {
    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { userId: req.params.id },
          { connectedId: req.params.id }
        ],
        status: 'ACCEPTED'
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, role: true } },
        connected: { select: { id: true, name: true, avatarUrl: true, role: true } }
      }
    });
    
    // Map to just return the array of connected users
    const connectedUsers = connections.map(conn => {
      return conn.userId === req.params.id ? conn.connected : conn.user;
    });

    res.json(connectedUsers);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/posts/:id/comments', authMiddleware, async (req: any, res) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { postId: req.params.id },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/posts', authMiddleware, async (req: any, res) => {
  try {
    const posts = await prisma.post.findMany({
      include: {
        author: { select: { id: true, name: true, role: true, avatarUrl: true } },
        likes: { where: { userId: req.user.userId }, select: { id: true } },
        reposts: { where: { userId: req.user.userId }, select: { id: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const mapOriginal = posts.map(p => ({
      ...p,
      hasLiked: p.likes.length > 0,
      hasReposted: p.reposts.length > 0,
      isRepostClone: false
    }));

    const repostsData = await prisma.repost.findMany({
      include: {
        post: {
          include: {
            author: { select: { id: true, name: true, role: true, avatarUrl: true } },
            likes: { where: { userId: req.user.userId }, select: { id: true } },
            reposts: { where: { userId: req.user.userId }, select: { id: true } }
          }
        },
        user: { select: { id: true, name: true, avatarUrl: true, role: true } }
      }
    });

    // Map each repost record into a feed-friendly clone object with explicit metadata
    const mapReposts = repostsData.map(r => ({
      ...r.post,
      // give repost clones a unique id so they can be keyed separately in the feed
      id: r.post.id + '-repost-' + r.id,
      originalPostId: r.post.id,
      repostId: r.id,
      repostedByName: r.user?.name || null,
      repostedById: r.user?.id || null,
      repostedByAvatar: r.user?.avatarUrl || null,
      repostedByRole: r.user?.role || null,
      // keep the original content separate; UI will display a small 'Reposted by' label
      content: r.post.content,
      // preserve original post createdAt for nested display while using repost.createdAt for feed ordering
      originalCreatedAt: r.post.createdAt,
      hasLiked: r.post.likes.length > 0,
      hasReposted: true,
      isRepostClone: true,
      createdAt: r.createdAt
    }));

    const combined = [...mapOriginal, ...mapReposts].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(combined);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload file endpoint
app.post('/api/upload', authMiddleware, upload.single('file'), (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const publicUrl = '/uploads/' + req.file.filename;
    res.json({ url: publicUrl });
  } catch (error) {
    res.status(500).json({ error: 'File upload failed' });
  }
});

app.post('/api/posts', authMiddleware, async (req: any, res) => {
  try {
    const { content, imageUrl } = req.body;
    const post = await prisma.post.create({
      data: {
        content,
        imageUrl,
        authorId: req.user.userId
      },
      include: { author: { select: { id: true, name: true, role: true, avatarUrl: true }} }
    });
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create post' });
  }
});

  // POST /api/posts/:id/like
  app.post('/api/posts/:id/like', authMiddleware, async (req: any, res) => {
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
      } else {
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
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to like post' });
    }
  });

  // POST /api/posts/:id/comment
  app.post('/api/posts/:id/comment', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const userId = req.user.userId;

      if (!content) return res.status(400).json({ error: 'Comment content is required' });

      const comment = await prisma.comment.create({
        data: { content, postId: id, userId }
      });

      const post = await prisma.post.update({
        where: { id },
        data: { commentsCount: { increment: 1 } }
      });

      res.json({ message: 'Comment added', comment, commentsCount: post.commentsCount });
    } catch (error) {
      res.status(500).json({ error: 'Failed to add comment' });
    }
  });

  // POST /api/posts/:id/repost
  app.post('/api/posts/:id/repost', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const existingRepost = await prisma.repost.findUnique({
        where: {
          postId_userId: { postId: id, userId }
        }
      });

      if (existingRepost) {
        await prisma.repost.delete({ where: { id: existingRepost.id } });
        const post = await prisma.post.update({
          where: { id },
          data: { repostsCount: { decrement: 1 } }
        });
        return res.json({ message: 'Repost removed', repostsCount: post.repostsCount, removed: true });
      }

      await prisma.repost.create({
        data: { postId: id, userId }
      });

      const post = await prisma.post.update({
        where: { id },
        data: { repostsCount: { increment: 1 } }
      });

      res.json({ message: 'Post reposted', repostsCount: post.repostsCount, added: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to repost' });
    }
  });

  app.put('/api/profiles/me', authMiddleware, async (req: any, res) => {
    try {
      const allowedFields = ['name', 'role', 'location', 'bio', 'avatarUrl', 'skills', 'company', 'education', 'experience', 'bannerUrl'];
      const dataToUpdate: any = {};
      Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
          dataToUpdate[key] = req.body[key];
        }
      });
      const updatedUser = await prisma.user.update({
        where: { id: req.user.userId },
        data: dataToUpdate,
        select: {
          id: true, name: true, role: true, avatarUrl: true, 
          location: true, bio: true, skills: true,
          company: true, education: true, experience: true, bannerUrl: true
        }
      });
      res.json({ data: updatedUser });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  app.get('/api/profiles', authMiddleware, async (req: any, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        avatarUrl: true,
        location: true,
        bio: true,
        skills: true
      }
    });
    // Add token so types don't complain if expecting one
    res.json({ data: users.map(u => ({ ...u, token: '' })) });
  } catch (error) {
    res.status(500).json({ error: 'Profiles fetch failed' });
  }
});

  app.get('/api/profiles/:id', authMiddleware, async (req: any, res, next) => {
    try {
      if (req.params.id === 'recommended') {
        return next();
      }
      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: {
          id: true, name: true, role: true, avatarUrl: true, 
          location: true, bio: true, skills: true,
          company: true, education: true, experience: true, bannerUrl: true
        }
      });
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ data: user });
    } catch (error) {
      res.status(500).json({ error: 'Profiles fetch failed' });
    }
  });

app.get('/api/profiles/recommended', authMiddleware, async (req: any, res) => {
    try {
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user.userId }
      });
      if (!currentUser) return res.status(404).json({ error: 'User not found' });

    // Recommendation logic: find users matching the same role or matching skills.
    let recommendedUsers: any[] = [];
    
    // Fallback simply fetch all others if no specifics to match
    const excludedConns = await prisma.connection.findMany({ 
      where: { OR: [{ userId: req.user.userId }, { connectedId: req.user.userId }] } 
    });
    const excludedIds = [...excludedConns.map(c => c.userId), ...excludedConns.map(c => c.connectedId), req.user.userId];
    const others = await prisma.user.findMany({
      where: { id: { notIn: excludedIds } },
        select: { id: true, name: true, role: true, avatarUrl: true, location: true, skills: true, company: true, bio: true, education: true, experience: true }
      });
if (currentUser.skills || currentUser.role || currentUser.company) {
         // NLP Keyword-based Profile Matching Algorithm
         const getKeywords = (obj: any) => {
            const text = `${obj.role || ''} ${obj.skills || ''} ${obj.company || ''} ${obj.location || ''} ${obj.bio || ''} ${obj.education || ''} ${obj.experience || ''}`;
            const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
            return new Set(words);
         };

         const myKeywords = getKeywords(currentUser);

         const scoredProfiles = others.map(profile => {
            let score = 0;
            const theirKeywords = getKeywords(profile);
            
            // NLP Intersection scoring
            theirKeywords.forEach(kw => {
               if (myKeywords.has(kw)) score += 3;
            });

            // High priority weight points if direct categorical matches
            if (profile.role && currentUser.role && profile.role.toLowerCase() === currentUser.role.toLowerCase()) score += 20;
            if (profile.company && currentUser.company && profile.company.toLowerCase() === currentUser.company.toLowerCase()) score += 15;
            
            // Skill subset matching
            if (profile.skills && currentUser.skills) {
               const theirSkills = profile.skills.toLowerCase().split(',');
               const maxSkills = currentUser.skills.toLowerCase().split(',');
               const intersection = maxSkills.filter(v => theirSkills.includes(v.trim()));
               score += (intersection.length * 5); // 5 points for every matching skill exact word
            }
            
          return { ...profile, recommendationScore: score };
       });

       recommendedUsers = scoredProfiles
          .filter(p => p.recommendationScore > 0)
          .sort((a, b) => b.recommendationScore - a.recommendationScore);
    } 

    if (recommendedUsers.length < 10) {
      // If we don't have enough algorithm recommendations, pad with random users
      const existingIds = new Set(recommendedUsers.map(u => u.id));
      const remainingOthers = others.filter(u => !existingIds.has(u.id)).sort(() => 0.5 - Math.random());
      
      recommendedUsers = [...recommendedUsers, ...remainingOthers];
    }

    res.json({ data: recommendedUsers.slice(0, 10), count: recommendedUsers.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

app.post('/api/connect', authMiddleware, async (req: any, res) => {
  try {
    const { connectedId } = req.body;
    const connection = await prisma.connection.create({
      data: {
        userId: req.user.userId,
        connectedId
      }
    });
    res.json(connection);
  } catch (error) {
    res.status(500).json({ error: 'Connection failed or already exists' });
  }
});

app.delete('/api/connect/:userId', authMiddleware, async (req: any, res) => {
  try {
    const { userId } = req.params;
    
    // Find the connection between these two users
    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          { userId: req.user.userId, connectedId: userId },
          { userId: userId, connectedId: req.user.userId }
        ]
      }
    });

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    await prisma.connection.delete({ where: { id: connection.id } });
    res.json({ message: 'Disconnected' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

app.get('/api/connections/pending', authMiddleware, async (req: any, res) => {
  try {
    const pending = await prisma.connection.findMany({
      where: {
        connectedId: req.user.userId,
        status: 'PENDING'
      },
      include: {
        user: { select: { id: true, name: true, role: true, avatarUrl: true, location: true, company: true, bio: true, skills: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(pending);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

app.put('/api/connections/:id', authMiddleware, async (req: any, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    
    const conn = await prisma.connection.findUnique({ where: { id } });
    if (!conn || conn.connectedId !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (status === 'REJECTED') {
      await prisma.connection.delete({ where: { id } });
      return res.json({ message: 'Rejected' });
    }

    const updated = await prisma.connection.update({
      where: { id },
      data: { status }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Keep existing jobs logic for now
app.get('/api/jobs', (req, res) => {
  res.json(mockJobs);
});

// ==========================================
// MESSAGES & CHAT
// ==========================================
app.get('/api/messages/threads', authMiddleware, async (req: any, res) => {
  try {
    // Get all users who the current user has connected with (status ACCEPTED or PENDING, or just all connections)
    // For simplicity, anyone we have a connection with or anyone we've sent messages to
    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { userId: req.user.userId },
          { connectedId: req.user.userId }
        ]
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, role: true } },
        connected: { select: { id: true, name: true, avatarUrl: true, role: true } }
      }
    });
    
    // Map to a format suitable for the frontend threads list
    const threadsRaw = await Promise.all(connections.map(async conn => {
      const isInitiator = conn.userId === req.user.userId;
      const participant = isInitiator ? conn.connected : conn.user;

      // Find the most recent message between these two users
      const lastMessageRec = await prisma.message.findFirst({
        where: {
          OR: [
            { senderId: req.user.userId, receiverId: participant.id },
            { senderId: participant.id, receiverId: req.user.userId }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
      
      // Only show threads that actually have messages in the inbox
      if (!lastMessageRec) return null;

      return {
        id: `thread-${participant.id}`,
        // Using "Connection" role for UI context
        participant: { ...participant, role: participant.role || 'Connection' },
        lastMessage: lastMessageRec.content,
        timestamp: lastMessageRec.createdAt,
        unread: false, // Could expand this to fetch actual message read states
      };
    }));

    // Filter out nulls and sort by most recent timestamp descending
    const threads = threadsRaw.filter(Boolean);
    threads.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json(threads);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch threads' });
  }
});

app.get('/api/messages/:userId', authMiddleware, async (req: any, res) => {
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

app.post('/api/messages/:userId', authMiddleware, async (req: any, res) => {
  try {
    const { userId } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Message content is required' });

    const message = await prisma.message.create({
      data: {
        senderId: req.user.userId,
        receiverId: userId,
        content
      }
    });
    
    // Attempt sending via socket if connected, but also return REST response
    io.to(userId).emit('receive_message', message);
    
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
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
    } catch (err) {
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
