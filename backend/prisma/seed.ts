import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding 10 users with posts...');
  for (let i = 0; i < 10; i++) {
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        password: '$2b$10$EpVsh6RhhA58M/kP4U1s7uzZ0O3ZcOK5wWc.2b4n7p5Q9N8x1Z.1e', // bcrypt hash for password123
        name: faker.person.fullName(),
        role: faker.person.jobTitle(),
        location: faker.location.city() + ', ' + faker.location.country(),
        avatarUrl: faker.image.avatar(),
        bio: faker.person.bio(),
        skills: [faker.person.jobType(), 'React', 'Node.js', 'Sales'].join(','),
      }
    });

    for (let p = 0; p < 2; p++) {
      await prisma.post.create({
        data: {
          content: faker.lorem.sentences(2),
          authorId: user.id,
          likesCount: Math.floor(Math.random() * 20),
        }
      });
    }
  }
  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    /* @ts-ignore */ process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
