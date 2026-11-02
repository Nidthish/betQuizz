import { describe, it, expect } from "vitest";
import { createQuestionSchema } from "@/lib/validation/schemas";

describe("Question Schema & Bulk Validation", () => {
  const userPayload = {
    questions: [
      {
        questionText: "What is the capital of France?",
        options: ["Paris", "Berlin", "Rome", "Madrid"],
        correctAnswer: "Paris",
        countdownSeconds: 30,
        explanation: "Paris is the capital and largest city of France.",
      },
      {
        questionText: "Which is the largest planet in our solar system?",
        options: ["Earth", "Jupiter", "Saturn", "Neptune"],
        correctAnswer: "Jupiter",
        countdownSeconds: 30,
        explanation: "Jupiter is the largest planet in our solar system.",
      },
      {
        questionText: "Who developed the Java programming language?",
        options: ["James Gosling", "Dennis Ritchie", "Bjarne Stroustrup", "Guido van Rossum"],
        correctAnswer: "James Gosling",
        countdownSeconds: 30,
        explanation: "James Gosling led the development of Java at Sun Microsystems.",
      },
      {
        questionText: "Which organ pumps blood throughout the human body?",
        options: ["Brain", "Heart", "Liver", "Lungs"],
        correctAnswer: "Heart",
        countdownSeconds: 30,
        explanation: "The heart pumps blood through the circulatory system.",
      },
      {
        questionText: "Which is the largest ocean on Earth?",
        options: ["Atlantic Ocean", "Indian Ocean", "Pacific Ocean", "Arctic Ocean"],
        correctAnswer: "Pacific Ocean",
        countdownSeconds: 30,
        explanation: "The Pacific Ocean is the largest and deepest ocean on Earth.",
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
        countdownSeconds: 30,
        explanation: "The CPU executes instructions and performs essential processing operations.",
      },
      {
        questionText: "What is the square root of 144?",
        options: ["10", "11", "12", "14"],
        correctAnswer: "12",
        countdownSeconds: 30,
        explanation: "12 multiplied by 12 equals 144.",
      },
      {
        questionText: "Which planet is known as the Red Planet?",
        options: ["Venus", "Mars", "Mercury", "Saturn"],
        correctAnswer: "Mars",
        countdownSeconds: 30,
        explanation: "Mars appears reddish because its surface contains iron oxide.",
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
        countdownSeconds: 30,
        explanation: "HTTP is the application-layer protocol used for transferring web content.",
      },
      {
        questionText: "Which programming language is predominantly used for styling web pages?",
        options: ["HTML", "CSS", "Python", "SQL"],
        correctAnswer: "CSS",
        countdownSeconds: 30,
        explanation: "CSS (Cascading Style Sheets) controls presentation and layout of web pages.",
      },
    ],
  };

  it("successfully parses the exact user 10-question payload", () => {
    const parsed = createQuestionSchema.safeParse(userPayload);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data).toHaveLength(10);
    expect(parsed.data[0].questionText).toBe("What is the capital of France?");
    expect(parsed.data[0].correctAnswer).toBe("Paris");
    expect(parsed.data[0].timeLimit).toBe(30);
    expect(parsed.data[9].questionText).toContain("predominantly used for styling");
    expect(parsed.data[9].correctAnswer).toBe("CSS");
  });

  it("accepts a raw array of questions directly", () => {
    const parsed = createQuestionSchema.safeParse(userPayload.questions);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).toHaveLength(10);
  });

  it("accepts a single question object and returns an array of length 1", () => {
    const single = {
      questionText: "What is 2 + 2?",
      options: ["3", "4", "5", "6"],
      correctAnswer: "4",
      timeLimit: 15,
    };
    const parsed = createQuestionSchema.safeParse(single);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).toHaveLength(1);
    expect(parsed.data[0].correctAnswer).toBe("4");
    expect(parsed.data[0].timeLimit).toBe(15);
  });

  it("handles case-insensitive match for correctAnswer", () => {
    const single = {
      questionText: "What is the capital of France?",
      options: ["Paris", "Berlin", "Rome", "Madrid"],
      correctAnswer: "paris", // lowercase
      countdownSeconds: 20,
    };
    const parsed = createQuestionSchema.safeParse(single);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data[0].correctAnswer).toBe("Paris"); // normalized to matched option case
    expect(parsed.data[0].timeLimit).toBe(20);
  });

  it("handles letter indices A, B, C, D in correctAnswer", () => {
    const single = {
      questionText: "Which is the red planet?",
      options: ["Venus", "Mars", "Mercury", "Saturn"],
      correctAnswer: "B",
    };
    const parsed = createQuestionSchema.safeParse(single);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data[0].correctAnswer).toBe("Mars");
  });
});
