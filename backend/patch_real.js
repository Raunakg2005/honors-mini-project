const fs = require('fs');
let code = fs.readFileSync('./src/index.ts', 'utf8');

const regex = /app\.post\('\/api\/connect', \[\s\S\]*?\/\/ Keep existing jobs logic for now/;
const insert = \pp.post('/api/connect', authMiddleware, async (req: any, res) => {
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

  app.get('/api/connections/pending', authMiddleware, async (req: any, res) => {
    try {
      const pending = await prisma.connection.findMany({
        where: {
          connectedId: req.user.userId,
          status: 'PENDING'
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true,
              avatarUrl: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(pending);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch pending connections' });
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
        return res.json({ message: 'Connection rejected' });
      }

      const updated = await prisma.connection.update({
        where: { id },
        data: { status }
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update connection' });
    }
  });

  // Keep existing jobs logic for now\;

code = code.replace(/app\.post\('\/api\/connect'[\\s\\S]*?\/\/ Keep existing jobs logic for now/, insert);
fs.writeFileSync('./src/index.ts', code);
