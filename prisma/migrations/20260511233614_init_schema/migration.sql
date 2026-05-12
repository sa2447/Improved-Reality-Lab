-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "salary" DECIMAL(12,2),
    "hourly_wage" DECIMAL(10,2),
    "rent" DECIMAL(12,2),
    "transportation" DECIMAL(12,2),
    "healthcare" DECIMAL(12,2),
    "food" DECIMAL(12,2),
    "debt" DECIMAL(12,2),
    "dependents" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset_versions" (
    "id" SERIAL NOT NULL,
    "source_name" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dataset_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "state_cost_profiles" (
    "id" TEXT NOT NULL,
    "dataset_version_id" INTEGER NOT NULL,
    "state_code" TEXT NOT NULL,
    "housing" DECIMAL(12,2) NOT NULL,
    "food" DECIMAL(12,2) NOT NULL,
    "transportation" DECIMAL(12,2) NOT NULL,
    "healthcare" DECIMAL(12,2) NOT NULL,
    "utilities" DECIMAL(12,2) NOT NULL,
    "taxes" DECIMAL(12,2) NOT NULL,
    "minimum_wage" DECIMAL(10,2) NOT NULL,
    "living_wage" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "state_cost_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "token_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_comparisons" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "dataset_version_id" INTEGER,
    "name" TEXT NOT NULL,
    "primary_state" TEXT,
    "affordability_score" DECIMAL(10,4),
    "compared_states" JSONB NOT NULL,
    "comparison_data" JSONB NOT NULL,
    "chart_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_comparisons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "chat_session_id" TEXT,
    "event_type" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_response_cache" (
    "id" TEXT NOT NULL,
    "dataset_version_id" INTEGER,
    "prompt_hash" TEXT NOT NULL,
    "normalized_prompt" TEXT NOT NULL,
    "response_payload" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_response_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE INDEX "state_cost_profiles_state_code_idx" ON "state_cost_profiles"("state_code");

-- CreateIndex
CREATE UNIQUE INDEX "state_cost_profiles_dataset_version_id_state_code_key" ON "state_cost_profiles"("dataset_version_id", "state_code");

-- CreateIndex
CREATE UNIQUE INDEX "chat_sessions_session_id_key" ON "chat_sessions"("session_id");

-- CreateIndex
CREATE INDEX "chat_sessions_user_id_idx" ON "chat_sessions"("user_id");

-- CreateIndex
CREATE INDEX "chat_messages_session_id_created_at_idx" ON "chat_messages"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "saved_comparisons_user_id_created_at_idx" ON "saved_comparisons"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "saved_comparisons_primary_state_idx" ON "saved_comparisons"("primary_state");

-- CreateIndex
CREATE INDEX "usage_events_event_type_created_at_idx" ON "usage_events"("event_type", "created_at");

-- CreateIndex
CREATE INDEX "usage_events_user_id_idx" ON "usage_events"("user_id");

-- CreateIndex
CREATE INDEX "ai_response_cache_expires_at_idx" ON "ai_response_cache"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "ai_response_cache_prompt_hash_dataset_version_id_key" ON "ai_response_cache"("prompt_hash", "dataset_version_id");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "state_cost_profiles" ADD CONSTRAINT "state_cost_profiles_dataset_version_id_fkey" FOREIGN KEY ("dataset_version_id") REFERENCES "dataset_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_comparisons" ADD CONSTRAINT "saved_comparisons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_comparisons" ADD CONSTRAINT "saved_comparisons_dataset_version_id_fkey" FOREIGN KEY ("dataset_version_id") REFERENCES "dataset_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_chat_session_id_fkey" FOREIGN KEY ("chat_session_id") REFERENCES "chat_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_response_cache" ADD CONSTRAINT "ai_response_cache_dataset_version_id_fkey" FOREIGN KEY ("dataset_version_id") REFERENCES "dataset_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
