const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.message.findMany().then(r => console.log(JSON.stringify(r))).finally(()=>prisma.\());
