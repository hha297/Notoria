import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["USER", "ADMIN"]);

export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "free",
  "pro",
  "premium",
]);

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

export const exerciseImportSourceEnum = pgEnum("exercise_import_source", [
  "image",
  "file",
  "url",
]);

export const exerciseImportStatusEnum = pgEnum("exercise_import_status", [
  "UPLOADING",
  "EXTRACTING",
  "ANALYZING",
  "GENERATING",
  "COMPLETED",
  "FAILED",
]);

export const importedExerciseTypeEnum = pgEnum("imported_exercise_type", [
  "fill_blank",
  "transformation",
  "multiple_choice",
]);

export const studyInboxStatusEnum = pgEnum("study_inbox_status", [
  "unprocessed",
  "processed",
]);

export const bookmarkPurposeEnum = pgEnum("bookmark_purpose", ["review_later"]);

export const learningEntityTypeEnum = pgEnum("learning_entity_type", [
  "vocabulary",
  "theory",
  "writing",
  "exercise",
  "listening",
  "speaking",
  "inbox",
]);

export const activityVerbEnum = pgEnum("activity_verb", [
  "created",
  "updated",
  "completed",
  "processed",
  "review_later_added",
  "review_later_removed",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: timestamp("email_verified", {
      withTimezone: true,
      mode: "date",
    }),
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
    stripeCancelAtPeriodEnd: boolean("stripe_cancel_at_period_end")
      .notNull()
      .default(false),
    /**
     * Paid plan scheduled to take effect at period end (e.g. Premium → Pro).
     * Effective entitlements stay on subscriptionPlan until then.
     */
    scheduledSubscriptionPlan: subscriptionPlanEnum("scheduled_subscription_plan"),
    stripeScheduleId: text("stripe_schedule_id"),
    /**
     * Lifetime first-month intro offer. Set once after Stripe confirms the
     * discounted first paid invoice. Never cleared on cancel/expiry.
     */
    introOfferUsedAt: timestamp("intro_offer_used_at", {
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

/**
 * Auth.js OAuth account links (Google, etc.).
 * Column JS names match Auth.js adapter expectations.
 */
export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({
      columns: [table.provider, table.providerAccountId],
    }),
    index("accounts_user_id_idx").on(table.userId),
  ],
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("password_reset_tokens_token_hash_unique").on(table.tokenHash),
    index("password_reset_tokens_user_id_idx").on(table.userId),
    index("password_reset_tokens_expires_at_idx").on(table.expiresAt),
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
    index("workspace_folders_name_fts_idx").using(
      "gin",
      sql`to_tsvector('simple', ${table.name})`,
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
    uniqueIndex("vocabulary_words_workspace_normalized_word_pos_unique").on(
      table.workspaceId,
      sql`lower(trim(${table.word}))`,
      sql`coalesce(${table.partOfSpeech}, '')`,
    ),
    index("vocabulary_words_user_workspace_updated_idx").on(
      table.userId,
      table.workspaceId,
      table.updatedAt,
    ),
    index("vocabulary_words_fts_idx").using(
      "gin",
      sql`to_tsvector('simple', coalesce(${table.word}, '') || ' ' || coalesce(${table.partOfSpeech}, '') || ' ' || coalesce(${table.synonyms}, '') || ' ' || coalesce(${table.notes}, ''))`,
    ),
  ],
);

export const wordMeanings = pgTable(
  "word_meanings",
  {
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
  },
  (table) => [
    index("word_meanings_word_id_idx").on(table.wordId),
    index("word_meanings_fts_idx").using(
      "gin",
      sql`to_tsvector('simple', ${table.meaning})`,
    ),
  ],
);

export const wordExamples = pgTable(
  "word_examples",
  {
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
  },
  (table) => [
    index("word_examples_word_id_idx").on(table.wordId),
    index("word_examples_fts_idx").using(
      "gin",
      sql`to_tsvector('simple', coalesce(${table.sentence}, '') || ' ' || coalesce(${table.meaning}, '') || ' ' || coalesce(${table.notes}, ''))`,
    ),
  ],
);

export const vocabularyWordTags = pgTable(
  "vocabulary_word_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    wordId: uuid("word_id")
      .notNull()
      .references(() => vocabularyWords.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (table) => [
    index("vocabulary_word_tags_word_id_idx").on(table.wordId),
    index("vocabulary_word_tags_tag_idx").on(table.tag),
    index("vocabulary_word_tags_fts_idx").using(
      "gin",
      sql`to_tsvector('simple', ${table.tag})`,
    ),
  ],
);

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

export const flashcardReviews = pgTable(
  "flashcard_reviews",
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
    rating: flashcardRatingEnum("rating").notNull(),
    direction: flashcardStudyDirectionEnum("direction").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("flashcard_reviews_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
  ],
);

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
    index("flashcard_progress_workspace_user_idx").on(
      table.workspaceId,
      table.userId,
    ),
    index("flashcard_progress_user_next_review_idx").on(
      table.userId,
      table.nextReviewAt,
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
  (table) => [
    index("exercises_folder_id_idx").on(table.folderId),
    index("exercises_user_workspace_type_updated_idx").on(
      table.userId,
      table.workspaceId,
      table.type,
      table.updatedAt,
    ),
    index("exercises_fts_idx").using(
      "gin",
      sql`setweight(to_tsvector('simple', coalesce(${table.title}, '') || ' ' || coalesce(${table.description}, '')), 'A') || setweight(jsonb_to_tsvector('simple', ${table.content}, '["string"]'::jsonb), 'C')`,
    ),
  ],
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
    index("listening_lessons_user_workspace_updated_idx").on(
      table.userId,
      table.workspaceId,
      table.updatedAt,
    ),
    index("listening_lessons_fts_idx").using(
      "gin",
      sql`to_tsvector('simple', coalesce(${table.title}, '') || ' ' || coalesce(${table.topic}, '') || ' ' || coalesce(${table.transcript}, ''))`,
    ),
  ],
);

export const listeningExercises = pgTable(
  "listening_exercises",
  {
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
  },
  (table) => [
    index("listening_exercises_lesson_id_type_idx").on(
      table.lessonId,
      table.type,
    ),
  ],
);

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
  (table) => [
    index("grammar_notes_folder_id_idx").on(table.folderId),
    index("grammar_notes_user_workspace_updated_idx").on(
      table.userId,
      table.workspaceId,
      table.updatedAt,
    ),
    index("grammar_notes_fts_idx").using(
      "gin",
      sql`setweight(to_tsvector('simple', coalesce(${table.title}, '')), 'A') || setweight(jsonb_to_tsvector('simple', ${table.content}, '["string"]'::jsonb), 'C')`,
    ),
  ],
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
    index("speaking_sessions_user_workspace_updated_idx").on(
      table.userId,
      table.workspaceId,
      table.updatedAt,
    ),
    index("speaking_sessions_fts_idx").using(
      "gin",
      sql`to_tsvector('simple', coalesce(${table.title}, '') || ' ' || coalesce(${table.topic}, '') || ' ' || coalesce(${table.notes}, '') || ' ' || coalesce(${table.transcript}, '') || ' ' || coalesce(${table.summary}, ''))`,
    ),
  ],
);

export const exerciseImports = pgTable(
  "exercise_imports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    sourceType: exerciseImportSourceEnum("source_type").notNull(),
    title: text("title").notNull(),
    originalFilename: text("original_filename"),
    sourceUrl: text("source_url"),
    fileUrl: text("file_url"),
    filePublicId: text("file_public_id"),
    mimeType: text("mime_type"),
    extractedText: text("extracted_text"),
    analysis: jsonb("analysis"),
    status: exerciseImportStatusEnum("status").notNull().default("UPLOADING"),
    errorCode: text("error_code"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("exercise_imports_workspace_id_idx").on(table.workspaceId),
    index("exercise_imports_user_id_idx").on(table.userId),
    index("exercise_imports_fts_idx").using(
      "gin",
      sql`to_tsvector('simple', coalesce(${table.title}, '') || ' ' || coalesce(${table.extractedText}, ''))`,
    ),
  ],
);

export const importedExercises = pgTable(
  "imported_exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    importId: uuid("import_id")
      .notNull()
      .references(() => exerciseImports.id, { onDelete: "cascade" }),
    type: importedExerciseTypeEnum("type").notNull(),
    /** Full exercise payload compatible with TheoryExercise shapes. */
    data: jsonb("data").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("imported_exercises_import_id_idx").on(table.importId)],
);

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  workspaces: many(workspaces),
  vocabularyWords: many(vocabularyWords),
  exercises: many(exercises),
  listeningLessons: many(listeningLessons),
  speakingSessions: many(speakingSessions),
  grammarNotes: many(grammarNotes),
  folders: many(workspaceFolders),
  exerciseImports: many(exerciseImports),
  passwordResetTokens: many(passwordResetTokens),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const passwordResetTokensRelations = relations(
  passwordResetTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [passwordResetTokens.userId],
      references: [users.id],
    }),
  }),
);

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
  exerciseImports: many(exerciseImports),
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

export const exerciseImportsRelations = relations(
  exerciseImports,
  ({ one, many }) => ({
    user: one(users, {
      fields: [exerciseImports.userId],
      references: [users.id],
    }),
    workspace: one(workspaces, {
      fields: [exerciseImports.workspaceId],
      references: [workspaces.id],
    }),
    exercises: many(importedExercises),
  }),
);

export const importedExercisesRelations = relations(
  importedExercises,
  ({ one }) => ({
    import: one(exerciseImports, {
      fields: [importedExercises.importId],
      references: [exerciseImports.id],
    }),
  }),
);

/**
 * Daily AI usage counters. One row per user, feature, and UTC usage date.
 * The unique key makes quota increments a single conditional upsert.
 */
export const aiUsage = pgTable(
  "ai_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    feature: text("feature").notNull(),
    usageDate: date("usage_date").notNull(),
    count: integer("count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("ai_usage_user_feature_date_unique").on(
      table.userId,
      table.feature,
      table.usageDate,
    ),
    check("ai_usage_count_nonnegative", sql`${table.count} >= 0`),
  ],
);

/**
 * One reservation per metered AI action. Refunds flip status once so a
 * failure cannot decrement usage twice.
 */
export const aiUsageReservations = pgTable(
  "ai_usage_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    feature: text("feature").notNull(),
    usageDate: date("usage_date").notNull(),
    /** Groups multi-step actions (for example an exercise import) into one charge. */
    subjectId: text("subject_id"),
    status: text("status").notNull().default("reserved"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ai_usage_reservations_user_feature_date_idx").on(
      table.userId,
      table.feature,
      table.usageDate,
    ),
    uniqueIndex("ai_usage_reservations_subject_unique")
      .on(table.userId, table.feature, table.usageDate, table.subjectId)
      .where(sql`${table.subjectId} is not null`),
  ],
);

/** Processed Stripe event ids. Failed handlers delete the row so Stripe can retry. */
export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Temporary capture queue. Items stay until the user processes or deletes them.
 * Converting to Vocab/Theory/Writing/Exercise marks processed — does not auto-delete.
 */
export const studyInboxItems = pgTable(
  "study_inbox_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    note: text("note"),
    source: text("source"),
    status: studyInboxStatusEnum("status").notNull().default("unprocessed"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    linkedEntityType: learningEntityTypeEnum("linked_entity_type"),
    linkedEntityId: uuid("linked_entity_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("study_inbox_items_workspace_status_created_idx").on(
      table.workspaceId,
      table.userId,
      table.status,
      table.createdAt,
    ),
    index("study_inbox_items_fts_idx").using(
      "gin",
      sql`to_tsvector('simple', coalesce(${table.content}, '') || ' ' || coalesce(${table.note}, '') || ' ' || coalesce(${table.source}, ''))`,
    ),
  ],
);

/**
 * Cross-module Review Later marks. One row per entity; toggle by insert/delete.
 * Never duplicates the underlying learning item.
 */
export const workspaceBookmarks = pgTable(
  "workspace_bookmarks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    entityType: learningEntityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    purpose: bookmarkPurposeEnum("purpose").notNull().default("review_later"),
    titleSnapshot: text("title_snapshot"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("workspace_bookmarks_unique").on(
      table.workspaceId,
      table.userId,
      table.entityType,
      table.entityId,
      table.purpose,
    ),
    index("workspace_bookmarks_list_idx").on(
      table.workspaceId,
      table.userId,
      table.purpose,
      table.createdAt,
    ),
  ],
);

/**
 * Meaningful learning/workspace events for the Dashboard diary feed.
 * Prefer entity references + titleSnapshot over copying full content.
 */
export const workspaceActivityEvents = pgTable(
  "workspace_activity_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    verb: activityVerbEnum("verb").notNull(),
    entityType: learningEntityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id"),
    titleSnapshot: text("title_snapshot"),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("workspace_activity_events_list_idx").on(
      table.workspaceId,
      table.userId,
      table.createdAt,
    ),
  ],
);

export type User = typeof users.$inferSelect;
export type Account = typeof accounts.$inferSelect;
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
export type ExerciseImport = typeof exerciseImports.$inferSelect;
export type ImportedExercise = typeof importedExercises.$inferSelect;
export type ExerciseImportStatus =
  (typeof exerciseImportStatusEnum.enumValues)[number];
export type ExerciseImportSource =
  (typeof exerciseImportSourceEnum.enumValues)[number];
export type ImportedExerciseType =
  (typeof importedExerciseTypeEnum.enumValues)[number];
export type StudyInboxItem = typeof studyInboxItems.$inferSelect;
export type StudyInboxStatus = (typeof studyInboxStatusEnum.enumValues)[number];
export type WorkspaceBookmark = typeof workspaceBookmarks.$inferSelect;
export type LearningEntityType =
  (typeof learningEntityTypeEnum.enumValues)[number];
export type WorkspaceActivityEvent =
  typeof workspaceActivityEvents.$inferSelect;
export type ActivityVerb = (typeof activityVerbEnum.enumValues)[number];
