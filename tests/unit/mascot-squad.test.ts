import { describe, it, expect } from "vitest";
import { MASCOTS, getMascot, isValidMascotId, DEFAULT_MASCOT_ID } from "@/lib/constants/mascots";
import { joinGameSchema } from "@/lib/validation/schemas";

describe("Wager Squad Mascot Registry & Integration", () => {
  const EXPECTED_MASCOT_IDS = [
    "all-in-penguin",
    "calculator-owl",
    "risky-raccoon",
    "lucky-duck",
    "budget-boss",
    "panic-chicken",
    "jackpot-monkey",
    "sleepy-sloth",
  ];

  it("contains exactly the eight original Wager Squad mascots", () => {
    expect(MASCOTS).toHaveLength(8);
    const ids = MASCOTS.map((m) => m.id);
    expect(ids).toEqual(EXPECTED_MASCOT_IDS);
  });

  it("has valid metadata, personalities and image paths for each mascot", () => {
    for (const m of MASCOTS) {
      expect(m.name).toBeTruthy();
      expect(m.personality).toBeTruthy();
      expect(m.description).toBeTruthy();
      expect(m.imagePath).toBe(`/avatars/${m.id}.png`);
      expect(m.accentColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(m.badgeBg).toBeTruthy();
      expect(isValidMascotId(m.id)).toBe(true);
    }
  });

  it("resolves default mascot gracefully when invalid or null mascot ID is provided", () => {
    expect(getMascot(null).id).toBe(DEFAULT_MASCOT_ID);
    expect(getMascot(undefined).id).toBe(DEFAULT_MASCOT_ID);
    expect(getMascot("unknown-mascot").id).toBe(DEFAULT_MASCOT_ID);
    expect(getMascot("calculator-owl").id).toBe("calculator-owl");
  });

  it("validates joinGameSchema with and without avatarId", () => {
    const validWithAvatar = joinGameSchema.safeParse({
      code: "GAME12",
      displayName: "SpeedyPlayer",
      avatarId: "lucky-duck",
    });
    expect(validWithAvatar.success).toBe(true);

    const validWithoutAvatar = joinGameSchema.safeParse({
      code: "GAME12",
      displayName: "SpeedyPlayer",
    });
    expect(validWithoutAvatar.success).toBe(true);
  });

  it("supports unlimited duplicate character selections across 60+ players", () => {
    // 60 players joining, e.g. 15 All-In Penguins, 10 Lucky Ducks, etc.
    const players = Array.from({ length: 60 }, (_, i) => ({
      playerId: `p_${i}`,
      displayName: `Student ${i + 1}`,
      avatarId: EXPECTED_MASCOT_IDS[i % EXPECTED_MASCOT_IDS.length],
    }));

    expect(players).toHaveLength(60);

    // Verify duplicate selections are supported without error
    const penguins = players.filter((p) => p.avatarId === "all-in-penguin");
    expect(penguins.length).toBeGreaterThan(1);

    for (const p of players) {
      expect(isValidMascotId(p.avatarId)).toBe(true);
      const mascot = getMascot(p.avatarId);
      expect(mascot.id).toBe(p.avatarId);
    }
  });
});
