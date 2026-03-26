jest.mock('../../../src/firebase/config', () => ({
  auth: { currentUser: null },
  db: {},
  storage: {}
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  collection: jest.fn(),
  collectionGroup: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(() => ({ __serverTimestamp: true })),
  increment: jest.fn(),
  writeBatch: jest.fn(),
  arrayUnion: jest.fn(),
  arrayRemove: jest.fn(),
  deleteField: jest.fn(() => ({ __deleteField: true })),
  runTransaction: jest.fn()
}));

jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn()
}));

import { mergeRewardsStateForStorage } from '../../../src/firebase/firestore';

describe('mergeRewardsStateForStorage', () => {
  test('mantiene la racha actual del estado más reciente y preserva el máximo histórico', () => {
    const merged = mergeRewardsStateForStorage(
      {
        totalPoints: 80,
        availablePoints: 70,
        spentPoints: 10,
        streak: 8,
        currentStreak: 8,
        maxStreak: 8,
        lastInteraction: 1000,
        lastUpdate: 1000,
        history: [{ timestamp: 1000, event: 'QUESTION_BLOOM_4' }],
        achievements: ['week_streak'],
        dailyLog: {
          '2026-03-01': { interactions: 1, points: 80, bloomLevels: [4] }
        },
        recordedMilestones: { 'QUESTION_BLOOM_4_r1': 1000 },
        stats: { totalInteractions: 1 }
      },
      {
        totalPoints: 95,
        availablePoints: 83,
        spentPoints: 12,
        streak: 3,
        currentStreak: 3,
        maxStreak: 8,
        lastInteraction: 2000,
        lastUpdate: 2000,
        history: [
          { timestamp: 1000, event: 'QUESTION_BLOOM_4' },
          { timestamp: 2000, event: 'NOTE_CREATED' }
        ],
        achievements: ['week_streak', 'perfect'],
        dailyLog: {
          '2026-03-02': { interactions: 1, points: 15, bloomLevels: [] }
        },
        recordedMilestones: { 'NOTE_CREATED_daily_2026-03-02': 1 },
        stats: { totalInteractions: 2 }
      }
    );

    expect(merged.totalPoints).toBe(95);
    expect(merged.spentPoints).toBe(12);
    expect(merged.availablePoints).toBe(83);
    expect(merged.streak).toBe(3);
    expect(merged.currentStreak).toBe(3);
    expect(merged.maxStreak).toBe(8);
    expect(merged.lastInteraction).toBe(2000);
    expect(merged.history).toHaveLength(2);
    expect(merged.achievements).toEqual(expect.arrayContaining(['week_streak', 'perfect']));
    expect(Object.keys(merged.dailyLog)).toEqual(expect.arrayContaining(['2026-03-01', '2026-03-02']));
    expect(merged.recordedMilestones).toMatchObject({
      'QUESTION_BLOOM_4_r1': 1000,
      'NOTE_CREATED_daily_2026-03-02': 1
    });
  });

  test('un reset intencional nuevo vacía la racha y no revive máximos previos', () => {
    const merged = mergeRewardsStateForStorage(
      {
        totalPoints: 80,
        availablePoints: 70,
        spentPoints: 10,
        streak: 8,
        currentStreak: 8,
        maxStreak: 8,
        lastInteraction: 1000,
        lastUpdate: 1000,
        history: [{ timestamp: 1000, event: 'QUESTION_BLOOM_4' }],
        achievements: ['week_streak'],
        dailyLog: {
          '2026-03-01': { interactions: 1, points: 80, bloomLevels: [4] }
        },
        recordedMilestones: { 'QUESTION_BLOOM_4_r1': 1000 },
        stats: { totalInteractions: 1 },
        resetAt: 100
      },
      {
        totalPoints: 0,
        availablePoints: 0,
        spentPoints: 0,
        streak: 0,
        currentStreak: 0,
        maxStreak: 0,
        lastInteraction: 3000,
        lastUpdate: 3000,
        history: [],
        achievements: [],
        dailyLog: {},
        recordedMilestones: {},
        stats: {},
        resetAt: 200
      }
    );

    expect(merged.totalPoints).toBe(0);
    expect(merged.spentPoints).toBe(0);
    expect(merged.availablePoints).toBe(0);
    expect(merged.streak).toBe(0);
    expect(merged.currentStreak).toBe(0);
    expect(merged.maxStreak).toBe(0);
    expect(merged.history).toEqual([]);
    expect(merged.achievements).toEqual([]);
    expect(merged.resetAt).toBe(200);
    expect(merged.lastInteraction).toBe(3000);
  });
});
