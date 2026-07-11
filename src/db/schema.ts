import { relations } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["USER", "ADMIN"]);

export const vocabularyStatusEnum = pgEnum("vocabulary_status", [
  "NEW",
  "LEARNING",
  "REVIEW",
  "MASTERED",
]);

export const vocabularyDifficultyEnum = pgEnum("vocabulary_difficulty", [
  "EASY",
  "MEDIUM",
  "HARD",
]);

export const exerciseTypeEnum = pgEnum("exercise_type", [
  "QUESTIONS",
  "FILL_BLANK",
  "TRANSLATION",
  "WRITING",
  "READING",
  "GRAMMAR_DRILL",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").notNull().default("USER"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const vocabularyWords = pgTable("vocabulary_words", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  language: text("language").notNull().default("fi"),
  word: text("word").notNull(),
  pronunciation: text("pronunciation"),
  ipa: text("ipa"),
  partOfSpeech: text("part_of_speech"),
  gender: text("gender"),
  plural: text("plural"),
  notes: text("notes"),
  mnemonic: text("mnemonic"),
  difficulty: vocabularyDifficultyEnum("difficulty").default("MEDIUM"),
  status: vocabularyStatusEnum("status").notNull().default("NEW"),
  nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const wordMeanings = pgTable("word_meanings", {
  id: uuid("id").primaryKey().defaultRandom(),
  wordId: uuid("word_id")
    .notNull()
    .references(() => vocabularyWords.id, { onDelete: "cascade" }),
  meaning: text("meaning").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const wordExamples = pgTable("word_examples", {
  id: uuid("id").primaryKey().defaultRandom(),
  wordId: uuid("word_id")
    .notNull()
    .references(() => vocabularyWords.id, { onDelete: "cascade" }),
  content: jsonb("content").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const exercises = pgTable("exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: exerciseTypeEnum("type").notNull().default("QUESTIONS"),
  content: jsonb("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const grammarNotes = pgTable("grammar_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: jsonb("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  vocabularyWords: many(vocabularyWords),
  exercises: many(exercises),
  grammarNotes: many(grammarNotes),
}));

export const vocabularyWordsRelations = relations(
  vocabularyWords,
  ({ one, many }) => ({
    user: one(users, {
      fields: [vocabularyWords.userId],
      references: [users.id],
    }),
    meanings: many(wordMeanings),
    examples: many(wordExamples),
  }),
);

export const wordMeaningsRelations = relations(wordMeanings, ({ one }) => ({
  word: one(vocabularyWords, {
    fields: [wordMeanings.wordId],
    references: [vocabularyWords.id],
  }),
}));

export const wordExamplesRelations = relations(wordExamples, ({ one }) => ({
  word: one(vocabularyWords, {
    fields: [wordExamples.wordId],
    references: [vocabularyWords.id],
  }),
}));

export const exercisesRelations = relations(exercises, ({ one }) => ({
  user: one(users, {
    fields: [exercises.userId],
    references: [users.id],
  }),
}));

export const grammarNotesRelations = relations(grammarNotes, ({ one }) => ({
  user: one(users, {
    fields: [grammarNotes.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type VocabularyWord = typeof vocabularyWords.$inferSelect;
export type WordMeaning = typeof wordMeanings.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
