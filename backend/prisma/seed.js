"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const faker_1 = require("@faker-js/faker");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding 10 users with posts...');
    for (let i = 0; i < 10; i++) {
        const user = await prisma.user.create({
            data: {
                email: faker_1.faker.internet.email(),
                password: '$2b$10$EpVsh6RhhA58M/kP4U1s7uzZ0O3ZcOK5wWc.2b4n7p5Q9N8x1Z.1e', // bcrypt hash for password123
                name: faker_1.faker.person.fullName(),
                role: faker_1.faker.person.jobTitle(),
                location: faker_1.faker.location.city() + ', ' + faker_1.faker.location.country(),
                avatarUrl: faker_1.faker.image.avatar(),
                bio: faker_1.faker.person.bio(),
                skills: [faker_1.faker.person.jobType(), 'React', 'Node.js', 'Sales'].join(','),
            }
        });
        for (let p = 0; p < 2; p++) {
            await prisma.post.create({
                data: {
                    content: faker_1.faker.lorem.sentences(2),
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
//# sourceMappingURL=seed.js.map