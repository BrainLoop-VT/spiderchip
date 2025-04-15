#!/bin/bash

# Get current timestamp once
TIMESTAMP=$(date +%Y%m%d%H%M%S)
MIGRATION_DIR="prisma/migrations/${TIMESTAMP}_baseline"

# Create the migrations directory
mkdir -p "$MIGRATION_DIR"

# Create the migration file
cat > "$MIGRATION_DIR/migration.sql" << 'EOL'
-- This is a baseline migration representing the current state of the database
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."levels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pre_description" TEXT,
    "input_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "levels_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."roles" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "roles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "roles_name_key" UNIQUE ("name")
);

CREATE TABLE "public"."users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashed_password" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "role_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_username_key" UNIQUE ("username"),
    CONSTRAINT "users_email_key" UNIQUE ("email")
);

CREATE TABLE "public"."submissions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "level_id" UUID NOT NULL,
    "submission_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "submissions_user_id_level_id_key" UNIQUE ("user_id", "level_id")
);

CREATE TABLE "public"."user_progress" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "level_id" UUID NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "current_solution" TEXT,
    "test_case_results" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "last_attempt_at" TIMESTAMP(6),
    CONSTRAINT "user_progress_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_progress_user_id_level_id_key" UNIQUE ("user_id", "level_id")
);

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "fk_role_id" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."submissions" ADD FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."submissions" ADD FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_progress" ADD FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."user_progress" ADD FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EOL

# Create the migration metadata file
cat > "$MIGRATION_DIR/migration.meta.json" << EOL
{
  "version": "5",
  "dialect": "postgresql",
  "id": "${TIMESTAMP}_baseline",
  "checksum": "$(sha1sum "$MIGRATION_DIR/migration.sql" | awk '{print $1}')",
  "operations": [],
  "length": 1
}
EOL

echo "Created baseline migration in $MIGRATION_DIR"
echo "Now run: npx prisma migrate resolve --applied ${TIMESTAMP}_baseline" 