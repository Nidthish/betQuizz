import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const SAMPLE_QUESTIONS = [
  {
    questionText: "What is the capital city of France?",
    options: ["Berlin", "Paris", "Rome", "Madrid"],
    correctAnswer: "Paris",
    explanation: "Paris has been the capital of France since 987 AD under King Hugh Capet.",
    timeLimit: 30,
    category: "Geography",
  },
  {
    questionText: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correctAnswer: "Mars",
    explanation: "Mars appears reddish because of widespread iron oxide (rust) on its surface.",
    timeLimit: 30,
    category: "Astronomy",
  },
  {
    questionText: "In JavaScript, what does 'typeof null' evaluate to?",
    options: ["null", "undefined", "object", "boolean"],
    correctAnswer: "object",
    explanation: "This is a historical bug in JavaScript from its first implementation in 1995.",
    timeLimit: 25,
    category: "Programming",
  },
  {
    questionText: "Which data structure uses the Last-In, First-Out (LIFO) principle?",
    options: ["Queue", "Stack", "Binary Tree", "Linked List"],
    correctAnswer: "Stack",
    explanation: "A stack pushes and pops elements from the top, adhering strictly to LIFO.",
    timeLimit: 25,
    category: "Computer Science",
  },
  {
    questionText: "What is the speed of light in vacuum (approximate km/s)?",
    options: ["150,000 km/s", "300,000 km/s", "500,000 km/s", "1,000,000 km/s"],
    correctAnswer: "300,000 km/s",
    explanation: "The exact speed of light is 299,792 km/s, commonly rounded to 300,000 km/s.",
    timeLimit: 30,
    category: "Physics",
  },
];

export async function main() {
  console.log("Seeding Quiz Betting Game platform database...");

  // 1. Create or update Default Admin
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || "AdminPassword123!";
  const passwordHash = await hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@quizbetting.com" },
    create: {
      name: "Quiz Master Admin",
      email: "admin@quizbetting.com",
      passwordHash,
      role: "ADMIN",
    },
    update: {
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log(`Admin account ensured: ${admin.email}`);

  // 2. Create questions in DB
  const createdQuestions = [];
  for (const q of SAMPLE_QUESTIONS) {
    const question = await prisma.question.create({
      data: {
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        timeLimit: q.timeLimit,
        category: q.category,
      },
    });
    createdQuestions.push(question);
  }

  // 3. Create Sample Game A (ABC123)
  const gameA = await prisma.game.upsert({
    where: { code: "ABC123" },
    create: {
      code: "ABC123",
      title: "Tech & Trivia High Rollers",
      status: "LOBBY",
      startingBalance: 10000,
      refillAmount: 10000,
      refillFee: 1000,
      createdById: admin.id,
    },
    update: {
      status: "LOBBY",
    },
  });

  // Link questions to Game A
  for (let i = 0; i < createdQuestions.length; i++) {
    await prisma.gameQuestion.upsert({
      where: {
        gameId_order: {
          gameId: gameA.id,
          order: i + 1,
        },
      },
      create: {
        gameId: gameA.id,
        questionId: createdQuestions[i].id,
        order: i + 1,
      },
      update: {},
    });
  }

  // 4. Create Sample Game B (XYZ789)
  const gameB = await prisma.game.upsert({
    where: { code: "XYZ789" },
    create: {
      code: "XYZ789",
      title: "World Championship Quiz",
      status: "LOBBY",
      startingBalance: 10000,
      refillAmount: 10000,
      refillFee: 1000,
      createdById: admin.id,
    },
    update: {
      status: "LOBBY",
    },
  });

  for (let i = 0; i < 3; i++) {
    await prisma.gameQuestion.upsert({
      where: {
        gameId_order: {
          gameId: gameB.id,
          order: i + 1,
        },
      },
      create: {
        gameId: gameB.id,
        questionId: createdQuestions[i].id,
        order: i + 1,
      },
      update: {},
    });
  }

  // 5. Create Sample Game C (QWE456)
  await prisma.game.upsert({
    where: { code: "QWE456" },
    create: {
      code: "QWE456",
      title: "Science & Space Betting Arena",
      status: "LOBBY",
      startingBalance: 10000,
      refillAmount: 10000,
      refillFee: 1000,
      createdById: admin.id,
    },
    update: {
      status: "LOBBY",
    },
  });

  console.log("Database seeded successfully with demo games ABC123, XYZ789, QWE456!");
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
