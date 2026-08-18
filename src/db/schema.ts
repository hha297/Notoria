import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
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

export const subscriptionPlanEnum = pgEnum("subscription_plan", ["free", "pro"]);

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

export const listeningStatusEnum = pgEnum("listening_status", [
  "UPLOADING",
  "TRANSCRIBING",
  "GENERATING",
  "COMPLETED",
  "FAILED",
]);

export const listeningExerciseTypeEnum = pgEnum("listening_exercise_type", [
  "FILL_BLANK",
  "MULTIPLE_CHOICE",
  "DICTATION",
  "WORD_ORDERING",
]);

export const folderSectionEnum = pgEnum("folder_section", [
  "writing",
  "listening",
  "theory",
]);

export const speakingStatusEnum = pgEnum("speaking_status", [
  "upcoming",
  "active",
  "processing",
  "completed",
  "cancelled",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash"),
    image: text("image"),
    role: userRoleEnum("role").notNull().default("USER"),
    subscriptionPlan: subscriptionPlanEnum("subscription_plan")
      .notNull()
      .default("free"),
    subscriptionStatus: text("subscription_status"),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    stripeCurrentPeriodEnd: timestamp("stripe_current_period_end", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("users_stripe_customer_id_unique")
      .on(table.stripeCustomerId)
      .where(sql`${table.stripeCustomerId} is not null`),
    uniqueIndex("users_stripe_subscription_id_unique")
      .on(table.stripeSubscriptionId)
      .where(sql`${table.stripeSubscriptionId} is not null`),
  ],
);

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

export const workspaceFolders = pgTable(
  "workspace_folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    section: folderSectionEnum("section").notNull(),
    parentId: uuid("parent_id").references(
      (): AnyPgColumn => workspaceFolders.id,
      { onDelete: "cascade" },
    ),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("workspace_folders_workspace_section_parent_idx").on(
      table.workspaceId,
      table.section,
      table.parentId,
    ),
  ],
);

export const vocabularyWords = pgTable(
  "vocabulary_words",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    word: text("word").notNull(),
    partOfSpeech: text("part_of_speech"),
    synonyms: text("synonyms"),
    notes: text("notes"),
    status: vocabularyStatusEnum("status").notNull().default("NEW"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("vocabulary_words_workspace_normalized_word_unique").on(
      table.workspaceId,
      sql`lower(trim(${table.word}))`,
    ),
  ],
);

export const wordMeanings = pgTable("word_meanings", {
  id: uuid("id").primaryKey().defaultRandom(),
  wordId: uuid("word_id")
    .notNull()
    .references(() => vocabularyWords.id, { onDelete: "cascade" }),
  meaning: text("meaning").notNull(),
  /** Used by exercises; secondary meanings stay on the word for reference. */
  isPrimary: boolean("is_primary").notNull().default(true),
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
  meaning: text("meaning"),
  notes: text("notes"),
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

export const vocabularySynonyms = pgTable(
  "vocabulary_synonyms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    wordId: uuid("word_id")
      .notNull()
      .references(() => vocabularyWords.id, { onDelete: "cascade" }),
    synonymId: uuid("synonym_id")
      .notNull()
      .references(() => vocabularyWords.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("vocabulary_synonyms_pair_unique").on(
      table.wordId,
      table.synonymId,
    ),
    index("vocabulary_synonyms_synonym_id_idx").on(table.synonymId),
    index("vocabulary_synonyms_workspace_id_idx").on(table.workspaceId),
    check(
      "vocabulary_synonyms_ordered",
      sql`${table.wordId} < ${table.synonymId}`,
    ),
  ],
);

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

export const exercises = pgTable(
  "exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    folderId: uuid("folder_id").references(() => workspaceFolders.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull(),
    description: text("description"),
    type: exerciseTypeEnum("type").notNull().default("QUESTIONS"),
    content: jsonb("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("exercises_folder_id_idx").on(table.folderId)],
);

export const listeningLessons = pgTable(
  "listening_lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    originalFilename: text("original_filename"),
    cloudinaryUrl: text("cloudinary_url").notNull(),
    cloudinaryPublicId: text("cloudinary_public_id").notNull(),
    mediaType: text("media_type").notNull(),
    format: text("format"),
    duration: integer("duration"),
    transcript: text("transcript"),
    transcriptionData: jsonb("transcription_data"),
    language: text("language"),
    cefrLevel: text("cefr_level"),
    topic: text("topic"),
    formality: text("formality"),
    folderId: uuid("folder_id").references(() => workspaceFolders.id, {
      onDelete: "cascade",
    }),
    exerciseType: listeningExerciseTypeEnum("exercise_type"),
    status: listeningStatusEnum("status").notNull().default("UPLOADING"),
    errorCode: text("error_code"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("listening_lessons_workspace_normalized_filename_unique")
      .on(
        table.workspaceId,
        sql`lower(trim(${table.originalFilename}))`,
      )
      .where(sql`${table.originalFilename} is not null`),
    index("listening_lessons_folder_id_idx").on(table.folderId),
  ],
);

export const listeningExercises = pgTable("listening_exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  lessonId: uuid("lesson_id")
    .notNull()
    .references(() => listeningLessons.id, { onDelete: "cascade" }),
  type: listeningExerciseTypeEnum("type").notNull(),
  question: text("question").notNull(),
  data: jsonb("data").notNull(),
  correctAnswer: jsonb("correct_answer").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const grammarNotes = pgTable(
  "grammar_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    folderId: uuid("folder_id").references(() => workspaceFolders.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull(),
    content: jsonb("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("grammar_notes_folder_id_idx").on(table.folderId)],
);

export const speakingSessions = pgTable(
  "speaking_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    language: text("language").notNull(),
    topic: text("topic"),
    cefrLevel: text("cefr_level"),
    notes: text("notes"),
    status: speakingStatusEnum("status").notNull().default("upcoming"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    transcriptUrl: text("transcript_url"),
    transcript: text("transcript"),
    recordingUrl: text("recording_url"),
    summary: text("summary"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("speaking_sessions_workspace_id_idx").on(table.workspaceId),
    index("speaking_sessions_user_id_idx").on(table.userId),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  workspaces: many(workspaces),
  vocabularyWords: many(vocabularyWords),
  exercises: many(exercises),
  listeningLessons: many(listeningLessons),
  speakingSessions: many(speakingSessions),
  grammarNotes: many(grammarNotes),
  folders: many(workspaceFolders),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  user: one(users, {
    fields: [workspaces.userId],
    references: [users.id],
  }),
  vocabularyWords: many(vocabularyWords),
  exercises: many(exercises),
  listeningLessons: many(listeningLessons),
  speakingSessions: many(speakingSessions),
  grammarNotes: many(grammarNotes),
  tags: many(workspaceTags),
  folders: many(workspaceFolders),
}));

export const workspaceTagsRelations = relations(workspaceTags, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceTags.workspaceId],
    references: [workspaces.id],
  }),
}));

export const workspaceFoldersRelations = relations(
  workspaceFolders,
  ({ one, many }) => ({
    user: one(users, {
      fields: [workspaceFolders.userId],
      references: [users.id],
    }),
    workspace: one(workspaces, {
      fields: [workspaceFolders.workspaceId],
      references: [workspaces.id],
    }),
    parent: one(workspaceFolders, {
      fields: [workspaceFolders.parentId],
      references: [workspaceFolders.id],
      relationName: "folder_tree",
    }),
    children: many(workspaceFolders, { relationName: "folder_tree" }),
    writingDocuments: many(exercises),
    listeningLessons: many(listeningLessons),
    grammarNotes: many(grammarNotes),
  }),
);

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
    synonymLinks: many(vocabularySynonyms, { relationName: "synonym_word" }),
    synonymOfLinks: many(vocabularySynonyms, { relationName: "synonym_peer" }),
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

export const vocabularySynonymsRelations = relations(
  vocabularySynonyms,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [vocabularySynonyms.workspaceId],
      references: [workspaces.id],
    }),
    word: one(vocabularyWords, {
      fields: [vocabularySynonyms.wordId],
      references: [vocabularyWords.id],
      relationName: "synonym_word",
    }),
    synonym: one(vocabularyWords, {
      fields: [vocabularySynonyms.synonymId],
      references: [vocabularyWords.id],
      relationName: "synonym_peer",
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
  folder: one(workspaceFolders, {
    fields: [exercises.folderId],
    references: [workspaceFolders.id],
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
  folder: one(workspaceFolders, {
    fields: [grammarNotes.folderId],
    references: [workspaceFolders.id],
  }),
}));

export const listeningLessonsRelations = relations(
  listeningLessons,
  ({ one, many }) => ({
    user: one(users, {
      fields: [listeningLessons.userId],
      references: [users.id],
    }),
    workspace: one(workspaces, {
      fields: [listeningLessons.workspaceId],
      references: [workspaces.id],
    }),
    folder: one(workspaceFolders, {
      fields: [listeningLessons.folderId],
      references: [workspaceFolders.id],
    }),
    exercises: many(listeningExercises),
  }),
);

export const listeningExercisesRelations = relations(
  listeningExercises,
  ({ one }) => ({
    lesson: one(listeningLessons, {
      fields: [listeningExercises.lessonId],
      references: [listeningLessons.id],
    }),
  }),
);

export const speakingSessionsRelations = relations(
  speakingSessions,
  ({ one }) => ({
    user: one(users, {
      fields: [speakingSessions.userId],
      references: [users.id],
    }),
    workspace: one(workspaces, {
      fields: [speakingSessions.workspaceId],
      references: [workspaces.id],
    }),
  }),
);

export type User = typeof users.$inferSelect;
export type SubscriptionPlan = (typeof subscriptionPlanEnum.enumValues)[number];
export type Workspace = typeof workspaces.$inferSelect;
export type WorkspaceTag = typeof workspaceTags.$inferSelect;
export type WorkspaceFolder = typeof workspaceFolders.$inferSelect;
export type FolderSection = (typeof folderSectionEnum.enumValues)[number];
export type VocabularyWord = typeof vocabularyWords.$inferSelect;
export type VocabularySynonym = typeof vocabularySynonyms.$inferSelect;
export type WordMeaning = typeof wordMeanings.$inferSelect;
export type WordExample = typeof wordExamples.$inferSelect;
export type FlashcardReview = typeof flashcardReviews.$inferSelect;
export type FlashcardProgress = typeof flashcardProgress.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type GrammarNote = typeof grammarNotes.$inferSelect;
export type ListeningLesson = typeof listeningLessons.$inferSelect;
export type ListeningExercise = typeof listeningExercises.$inferSelect;
export type SpeakingSession = typeof speakingSessions.$inferSelect;
export type SpeakingStatus = (typeof speakingStatusEnum.enumValues)[number];
