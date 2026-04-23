"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var faker_1 = require("@faker-js/faker");
var bcrypt = require("bcryptjs");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var targetUser, NUM_USERS, createdUsers, userCredentials, hashedPassword, i, firstName, lastName, email, name_1, role, location_1, bio, avatarUrl, skills, company, user, requestsSent, postsCreated, _i, createdUsers_1, user, e_1, numPosts, p, sentence;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('Connecting to database...');
                    return [4 /*yield*/, prisma.user.findFirst({
                            where: {
                                name: {
                                    contains: 'raunak',
                                }
                            }
                        })];
                case 1:
                    targetUser = _a.sent();
                    if (!targetUser) {
                        console.error('User "raunak kumar gupta" not found in the database. Please make sure the user exists first.');
                        return [2 /*return*/];
                    }
                    console.log("Found target user: ".concat(targetUser.name, " (ID: ").concat(targetUser.id, ")"));
                    NUM_USERS = 45;
                    console.log("Creating ".concat(NUM_USERS, " dummy users..."));
                    createdUsers = [];
                    userCredentials = 'LOGIN INFO FOR DUMMY USERS\n==========================\n\n';
                    // Clean up previous plain text users to avoid conflicts if they were just run
                    return [4 /*yield*/, prisma.connection.deleteMany({ where: { user: { role: { not: 'Member' } } } }).catch(function () { })];
                case 2:
                    // Clean up previous plain text users to avoid conflicts if they were just run
                    _a.sent();
                    return [4 /*yield*/, bcrypt.hash('password123', 10)];
                case 3:
                    hashedPassword = _a.sent();
                    i = 0;
                    _a.label = 4;
                case 4:
                    if (!(i < NUM_USERS)) return [3 /*break*/, 7];
                    firstName = faker_1.faker.person.firstName();
                    lastName = faker_1.faker.person.lastName();
                    email = faker_1.faker.internet.email({ firstName: firstName, lastName: lastName, provider: 'example.com' }).toLowerCase() + '-' + Date.now();
                    name_1 = "".concat(firstName, " ").concat(lastName);
                    role = faker_1.faker.person.jobTitle();
                    location_1 = "".concat(faker_1.faker.location.city(), ", ").concat(faker_1.faker.location.country());
                    bio = faker_1.faker.person.bio();
                    avatarUrl = "https://i.pravatar.cc/300?u=" + encodeURIComponent(email);
                    skills = [faker_1.faker.word.noun(), faker_1.faker.word.noun(), faker_1.faker.word.noun()].join(', ');
                    company = faker_1.faker.company.name();
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                email: email,
                                password: hashedPassword, // Store hashed password to allow logins!
                                name: name_1,
                                role: role,
                                location: location_1,
                                bio: bio,
                                avatarUrl: avatarUrl,
                                skills: skills,
                                company: company,
                            },
                        })];
                case 5:
                    user = _a.sent();
                    createdUsers.push(user);
                    userCredentials += "Name: ".concat(name_1, "\nEmail: ").concat(email, "\nPassword: password123\nRole: ").concat(role, "\n------------------------\n");
                    console.log("Created user ".concat(i + 1, "/").concat(NUM_USERS, ": ").concat(name_1, " (password stored correctly)"));
                    _a.label = 6;
                case 6:
                    i++;
                    return [3 /*break*/, 4];
                case 7:
                    // Save the text file
                    require('fs').writeFileSync('dummy_users_login.txt', userCredentials);
                    console.log('\n📝 Saved login info to: dummy_users_login.txt');
                    console.log("\nSending connection requests to ".concat(targetUser.name, " and generating posts..."));
                    requestsSent = 0;
                    postsCreated = 0;
                    _i = 0, createdUsers_1 = createdUsers;
                    _a.label = 8;
                case 8:
                    if (!(_i < createdUsers_1.length)) return [3 /*break*/, 17];
                    user = createdUsers_1[_i];
                    _a.label = 9;
                case 9:
                    _a.trys.push([9, 11, , 12]);
                    return [4 /*yield*/, prisma.connection.create({
                            data: {
                                userId: user.id,
                                connectedId: targetUser.id,
                                status: 'PENDING'
                            }
                        })];
                case 10:
                    _a.sent();
                    requestsSent++;
                    return [3 /*break*/, 12];
                case 11:
                    e_1 = _a.sent();
                    if (e_1.code === 'P2002') {
                        console.log("Connection request from ".concat(user.name, " already exists."));
                    }
                    return [3 /*break*/, 12];
                case 12:
                    numPosts = Math.floor(Math.random() * 3);
                    p = 0;
                    _a.label = 13;
                case 13:
                    if (!(p < numPosts)) return [3 /*break*/, 16];
                    sentence = faker_1.faker.lorem.sentences(2);
                    return [4 /*yield*/, prisma.post.create({
                            data: {
                                authorId: user.id,
                                content: "".concat(sentence, "\n\n#").concat(faker_1.faker.word.noun(), " #").concat(faker_1.faker.company.buzzNoun()),
                            }
                        })];
                case 14:
                    _a.sent();
                    postsCreated++;
                    _a.label = 15;
                case 15:
                    p++;
                    return [3 /*break*/, 13];
                case 16:
                    _i++;
                    return [3 /*break*/, 8];
                case 17:
                    console.log("\n\u2705 Successfully sent ".concat(requestsSent, " connection requests to ").concat(targetUser.name, "!"));
                    console.log("\u2705 Automatically generated ".concat(postsCreated, " dummy posts across the feed."));
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
