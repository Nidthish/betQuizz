export interface Mascot {
  id: string;
  name: string;
  personality: string;
  description: string;
  imagePath: string;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
}

export const MASCOTS: Mascot[] = [
  {
    id: "all-in-penguin",
    name: "All-In Penguin",
    personality: "High Risk",
    description: "Has ₹1,000. Bets ₹1,000. No regrets. Maybe.",
    imagePath: "/avatars/all-in-penguin.png",
    accentColor: "#6C5CE7",
    badgeBg: "#E9E5FF",
    badgeText: "#6C5CE7",
  },
  {
    id: "calculator-owl",
    name: "Calculator Owl",
    personality: "Mastermind",
    description: "Calculates 17 possibilities before betting ₹50.",
    imagePath: "/avatars/calculator-owl.png",
    accentColor: "#2563EB",
    badgeBg: "#DBEAFE",
    badgeText: "#1D4ED8",
  },
  {
    id: "risky-raccoon",
    name: "Risky Raccoon",
    personality: "Risk Taker",
    description: "Confidence: 100%. Knowledge: 12%.",
    imagePath: "/avatars/risky-raccoon.png",
    accentColor: "#E11D48",
    badgeBg: "#FFE4E6",
    badgeText: "#BE123C",
  },
  {
    id: "lucky-duck",
    name: "Lucky Duck",
    personality: "Luck Specialist",
    description: "Doesn't know the answer. Somehow keeps winning.",
    imagePath: "/avatars/lucky-duck.png",
    accentColor: "#D97706",
    badgeBg: "#FEF3C7",
    badgeText: "#B45309",
  },
  {
    id: "budget-boss",
    name: "Budget Boss",
    personality: "Conservative",
    description: "Never risks more than ₹100. Financial discipline!",
    imagePath: "/avatars/budget-boss.png",
    accentColor: "#059669",
    badgeBg: "#D1FAE5",
    badgeText: "#047857",
  },
  {
    id: "panic-chicken",
    name: "Panic Chicken",
    personality: "Overthinker",
    description: "Changes its mind 14 times before the timer ends.",
    imagePath: "/avatars/panic-chicken.png",
    accentColor: "#DC2626",
    badgeBg: "#FEE2E2",
    badgeText: "#B91C1C",
  },
  {
    id: "jackpot-monkey",
    name: "Jackpot Monkey",
    personality: "Show-off",
    description: "Wins one round. Starts giving everyone financial advice.",
    imagePath: "/avatars/jackpot-monkey.png",
    accentColor: "#FF7417",
    badgeBg: "#FFF3E8",
    badgeText: "#FF7417",
  },
  {
    id: "sleepy-sloth",
    name: "Sleepy Sloth",
    personality: "Chill Player",
    description: "Still deciding what to bet. The question ended 10 seconds ago.",
    imagePath: "/avatars/sleepy-sloth.png",
    accentColor: "#7C3AED",
    badgeBg: "#EDE9FE",
    badgeText: "#6D28D9",
  },
];

export const DEFAULT_MASCOT_ID = "all-in-penguin";

export const MASCOTS_BY_ID: Record<string, Mascot> = Object.fromEntries(
  MASCOTS.map((m) => [m.id, m])
);

export function getMascot(id?: string | null): Mascot {
  if (!id) return MASCOTS_BY_ID[DEFAULT_MASCOT_ID];
  return MASCOTS_BY_ID[id] || MASCOTS_BY_ID[DEFAULT_MASCOT_ID];
}

export function isValidMascotId(id: string): boolean {
  return Boolean(MASCOTS_BY_ID[id]);
}
