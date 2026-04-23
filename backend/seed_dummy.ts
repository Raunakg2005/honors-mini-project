import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to database...');
  
  // Find Raunak
  const targetUser = await prisma.user.findFirst({
    where: {
      name: {
        contains: 'raunak',
      }
    }
  });

  if (!targetUser) {
    console.error('User "raunak kumar gupta" not found in the database. Please make sure the user exists first.');
    return;
  }
  console.log(`Found target user: ${targetUser.name} (ID: ${targetUser.id})`);

  const NUM_USERS = 45;
  console.log(`Creating ${NUM_USERS} dummy users...`);

  let createdUsers = [];
  let userCredentials = 'LOGIN INFO FOR DUMMY USERS\n==========================\n\n';
  
  // Clean up previous plain text users to avoid conflicts if they were just run
  await prisma.connection.deleteMany({ where: { user: { role: { not: 'Member' } } } }).catch(() => {});
  
  const hashedPassword = await bcrypt.hash('password123', 10);

  for (let i = 0; i < NUM_USERS; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName, provider: 'example.com' }).toLowerCase() + '-' + Date.now();
    const name = `${firstName} ${lastName}`;
    const role = faker.person.jobTitle();
    const location = `${faker.location.city()}, ${faker.location.country()}`;
    const bio = faker.person.bio();
    // Generate avatar via ui-avatars to avoid faker broken image URLs occasionally
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
    const skills = [faker.word.noun(), faker.word.noun(), faker.word.noun()].join(', ');
    const company = faker.company.name();

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword, // Store hashed password to allow logins!
        name,
        role,
        location,
        bio,
        avatarUrl,
        skills,
        company,
      },
    });

    createdUsers.push(user);
    userCredentials += `Name: ${name}\nEmail: ${email}\nPassword: password123\nRole: ${role}\n------------------------\n`;
    console.log(`Created user ${i + 1}/${NUM_USERS}: ${name} (password stored correctly)`);
  }

  // Save the text file
  require('fs').writeFileSync('dummy_users_login.txt', userCredentials);
  console.log('\n📝 Saved login info to: dummy_users_login.txt');

  console.log(`\nSending connection requests to ${targetUser.name} and generating posts...`);
  let requestsSent = 0;
  let postsCreated = 0;

  for (const user of createdUsers) {
    // Send Connection Request
    try {
      await prisma.connection.create({
        data: {
          userId: user.id,
          connectedId: targetUser.id,
          status: 'PENDING'
        }
      });
      requestsSent++;
    } catch (e: any) {
      if (e.code === 'P2002') {
        console.log(`Connection request from ${user.name} already exists.`);
      }
    }

    // Add 1-2 realistic posts per user
    const numPosts = Math.floor(Math.random() * 3); // 0 to 2 posts
    for (let p = 0; p < numPosts; p++) {
      const sentence = faker.company.catchPhrase() + ". " + faker.hacker.phrase();
      await prisma.post.create({
        data: {
          authorId: user.id,
          content: `${sentence}\n\n#${faker.word.noun()} #${faker.company.buzzNoun()}`,
        }
      });
      postsCreated++;
    }
  }

  console.log(`\n✅ Successfully sent ${requestsSent} connection requests to ${targetUser.name}!`);
  console.log(`✅ Automatically generated ${postsCreated} dummy posts across the feed.`);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
