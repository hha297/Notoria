import { relations } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
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

export const flashcardRatingEnum = pgEnum("flashcard_rating", [
  "AGAIN",
  "HARD",
  "GOOD",
  "EASY",
]);

export const flashcardStudyDirectionEnum = pgEnum("flashcard_study_direction", [
  "WORD_TO_MEANING",
  "MEANING_TO_WORD",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  image: text("image"),
  role: userRoleEnum("role").notNull().default("USER"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    language: text("language").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("workspaces_user_language_unique").on(
      table.userId,
      table.language,
    ),
  ],
);

export const workspaceTags = pgTable(
  "workspace_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("workspace_tags_workspace_name_unique").on(
      table.workspaceId,
      table.name,
    ),
  ],
);

export const vocabularyWords = pgTable("vocabulary_words", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  word: text("word").notNull(),
  partOfSpeech: text("part_of_speech"),
  notes: text("notes"),
  status: vocabularyStatusEnum("status").notNull().default("NEW"),
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
  sentence: text("sentence").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const vocabularyWordTags = pgTable("vocabulary_word_tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  wordId: uuid("word_id")
    .notNull()
    .references(() => vocabularyWords.id, { onDelete: "cascade" }),
  tag: text("tag").notNull(),
});

export const flashcardReviews = pgTable("flashcard_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  wordId: uuid("word_id")
    .notNull()
    .references(() => vocabularyWords.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  rating: flashcardRatingEnum("rating").notNull(),
  direction: flashcardStudyDirectionEnum("direction").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const flashcardProgress = pgTable(
  "flashcard_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    wordId: uuid("word_id")
      .notNull()
      .references(() => vocabularyWords.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    lastRating: flashcardRatingEnum("last_rating"),
    easeFactor: integer("ease_factor").notNull().default(250),
    intervalDays: integer("interval_days").notNull().default(0),
    repetitions: integer("repetitions").notNull().default(0),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("flashcard_progress_user_word_unique").on(
      table.userId,
      table.wordId,
    ),
  ],
);

export const exercises = pgTable("exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
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
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
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
  workspaces: many(workspaces),
  vocabularyWords: many(vocabularyWords),
  exercises: many(exercises),
  grammarNotes: many(grammarNotes),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  user: one(users, {
    fields: [workspaces.userId],
    references: [users.id],
  }),
  vocabularyWords: many(vocabularyWords),
  exercises: many(exercises),
  grammarNotes: many(grammarNotes),
  tags: many(workspaceTags),
}));

export const workspaceTagsRelations = relations(workspaceTags, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceTags.workspaceId],
    references: [workspaces.id],
  }),
}));

export const vocabularyWordsRelations = relations(
  vocabularyWords,
  ({ one, many }) => ({
    user: one(users, {
      fields: [vocabularyWords.userId],
      references: [users.id],
    }),
    workspace: one(workspaces, {
      fields: [vocabularyWords.workspaceId],
      references: [workspaces.id],
    }),
    meanings: many(wordMeanings),
    examples: many(wordExamples),
    tags: many(vocabularyWordTags),
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

export const vocabularyWordTagsRelations = relations(
  vocabularyWordTags,
  ({ one }) => ({
    word: one(vocabularyWords, {
      fields: [vocabularyWordTags.wordId],
      references: [vocabularyWords.id],
    }),
  }),
);

export const flashcardReviewsRelations = relations(flashcardReviews, ({ one }) => ({
  user: one(users, {
    fields: [flashcardReviews.userId],
    references: [users.id],
  }),
  word: one(vocabularyWords, {
    fields: [flashcardReviews.wordId],
    references: [vocabularyWords.id],
  }),
  workspace: one(workspaces, {
    fields: [flashcardReviews.workspaceId],
    references: [workspaces.id],
  }),
}));

export const flashcardProgressRelations = relations(
  flashcardProgress,
  ({ one }) => ({
    user: one(users, {
      fields: [flashcardProgress.userId],
      references: [users.id],
    }),
    word: one(vocabularyWords, {
      fields: [flashcardProgress.wordId],
      references: [vocabularyWords.id],
    }),
    workspace: one(workspaces, {
      fields: [flashcardProgress.workspaceId],
      references: [workspaces.id],
    }),
  }),
);

export const exercisesRelations = relations(exercises, ({ one }) => ({
  user: one(users, {
    fields: [exercises.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [exercises.workspaceId],
    references: [workspaces.id],
  }),
}));

export const grammarNotesRelations = relations(grammarNotes, ({ one }) => ({
  user: one(users, {
    fields: [grammarNotes.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [grammarNotes.workspaceId],
    references: [workspaces.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type WorkspaceTag = typeof workspaceTags.$inferSelect;
export type VocabularyWord = typeof vocabularyWords.$inferSelect;
export type WordMeaning = typeof wordMeanings.$inferSelect;
export type WordExample = typeof wordExamples.$inferSelect;
export type FlashcardReview = typeof flashcardReviews.$inferSelect;
export type FlashcardProgress = typeof flashcardProgress.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
