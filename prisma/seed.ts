// @ts-nocheck
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const SAMPLE_QUESTIONS = [
  {
    questionText: "What is the capital of France?",
    options: ["Paris", "Berlin", "Rome", "Madrid"],
    correctAnswer: "Paris",
    timeLimit: 30,
    category: "Geography",
    explanation: "Paris is the capital and most populous city of France.",
  },
  {
    questionText: "Which is the largest planet in our solar system?",
    options: ["Earth", "Jupiter", "Saturn", "Neptune"],
    correctAnswer: "Jupiter",
    timeLimit: 30,
    category: "Astronomy",
    explanation: "Jupiter is more than twice as massive as all other planets combined.",
  },
  {
    questionText: "Who developed the Java programming language?",
    options: ["James Gosling", "Dennis Ritchie", "Bjarne Stroustrup", "Guido van Rossum"],
    correctAnswer: "James Gosling",
    timeLimit: 30,
    category: "Technology",
    explanation: "James Gosling created Java while working at Sun Microsystems in 1995.",
  },
  {
    questionText: "Which organ pumps blood throughout the human body?",
    options: ["Brain", "Heart", "Liver", "Lungs"],
    correctAnswer: "Heart",
    timeLimit: 30,
    category: "Biology",
    explanation: "The heart functions as a muscular organ pumping blood through the circulatory system.",
  },
  {
    questionText: "Which is the largest ocean on Earth?",
    options: ["Atlantic Ocean", "Indian Ocean", "Pacific Ocean", "Arctic Ocean"],
    correctAnswer: "Pacific Ocean",
    timeLimit: 30,
    category: "Geography",
    explanation: "The Pacific Ocean covers over 30% of the Earth's total surface area.",
  },
  {
    questionText: "What does CPU stand for?",
    options: [
      "Central Processing Unit",
      "Computer Power Unit",
      "Central Program Utility",
      "Control Processing User",
    ],
    correctAnswer: "Central Processing Unit",
    timeLimit: 30,
    category: "Computer Science",
    explanation: "The CPU is the primary component of a computer that executes instructions.",
  },
  {
    questionText: "What is the square root of 144?",
    options: ["10", "11", "12", "14"],
    correctAnswer: "12",
    timeLimit: 30,
    category: "Mathematics",
    explanation: "12 × 12 = 144.",
  },
  {
    questionText: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Mercury", "Saturn"],
    correctAnswer: "Mars",
    timeLimit: 30,
    category: "Astronomy",
    explanation: "Mars appears reddish because of pervasive iron oxide on its surface.",
  },
  {
    questionText: "What does HTTP stand for?",
    options: [
      "HyperText Transfer Protocol",
      "High Transfer Text Program",
      "Hyperlink Transmission Process",
      "Host Transfer Protocol",
    ],
    correctAnswer: "HyperText Transfer Protocol",
    timeLimit: 30,
    category: "Networking",
    explanation: "HTTP is the foundational protocol used by the World Wide Web for transmitting hypermedia.",
  },
  {
    questionText: "Which programming language is predominantly used for styling web pages?",
    options: ["HTML", "CSS", "Python", "SQL"],
    correctAnswer: "CSS",
    timeLimit: 30,
    category: "Web Development",
    explanation: "CSS (Cascading Style Sheets) styles the layout and appearance of HTML elements.",
  },
];

export async function main() {
  console.log("==================================================");
  console.log("   WIPING DATABASE & REFRESHING ALL DATA FROM SCRATCH");
  console.log("==================================================");

  // 1. Delete all dependent child records first to respect foreign key constraints
  console.log("Step 1/3: Purging all previous game records, bets, submissions, and events...");
  await prisma.bet.deleteMany();
  await prisma.refill.deleteMany();
  await prisma.questionSubmission.deleteMany();
  await prisma.gameResult.deleteMany();
  await prisma.gameEvent.deleteMany();
  await prisma.idempotencyKey.deleteMany();
  await prisma.rateLimitRecord.deleteMany();
  await prisma.gamePlayer.deleteMany();
  await prisma.gameQuestion.deleteMany();
  await prisma.game.deleteMany();
  await prisma.question.deleteMany();
  await prisma.user.deleteMany();
  console.log("✓ All previous database records successfully cleared!");

  // 2. Create fresh Admin Account
  console.log("Step 2/3: Creating fresh Administrator account...");
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || "AdminPassword123!";
  const passwordHash = await hash(adminPassword, 10);

  const admin = await prisma.user.create({
    data: {
      name: "Quiz Master Admin",
      email: "admin@quizbetting.com",
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log(`✓ Admin created: ${admin.email} (Password: ${adminPassword})`);

  // 3. Create fresh 10 Questions
  console.log("Step 3/3: Inserting 10 curated questions & configuring demo game rooms...");
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
  console.log(`✓ Created ${createdQuestions.length} trivia questions.`);

  // 4. Create primary Game room ABC123 in clean LOBBY status
  const gameA = await prisma.game.create({
    data: {
      code: "ABC123",
      title: "Tech & Trivia High Rollers",
      status: "LOBBY",
      startingBalance: 10000,
      refillAmount: 10000,
      refillFee: 1000,
      createdById: admin.id,
    },
  });

  // Attach all 10 questions in order 1..10
  for (let i = 0; i < createdQuestions.length; i++) {
    await prisma.gameQuestion.create({
      data: {
        gameId: gameA.id,
        questionId: createdQuestions[i].id,
        order: i + 1,
      },
    });
  }
  console.log(`✓ Configured room ABC123 with ${createdQuestions.length} questions in LOBBY state.`);

  // 5. Create secondary Game room XYZ789 in clean LOBBY status
  const gameB = await prisma.game.create({
    data: {
      code: "XYZ789",
      title: "World Championship Quiz",
      status: "LOBBY",
      startingBalance: 10000,
      refillAmount: 10000,
      refillFee: 1000,
      createdById: admin.id,
    },
  });

  for (let i = 0; i < 5; i++) {
    await prisma.gameQuestion.create({
      data: {
        gameId: gameB.id,
        questionId: createdQuestions[i].id,
        order: i + 1,
      },
    });
  }
  console.log(`✓ Configured room XYZ789 with 5 questions in LOBBY state.`);

  console.log("==================================================");
  console.log("   DATABASE FRESH REFRESH COMPLETE!");
  console.log("   Room Codes Ready: ABC123, XYZ789");
  console.log("   Admin Email: admin@quizbetting.com");
  console.log("   Admin Password: " + adminPassword);
  console.log("==================================================");
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
