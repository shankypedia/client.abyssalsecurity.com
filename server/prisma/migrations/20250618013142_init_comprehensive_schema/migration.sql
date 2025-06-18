/*
  Warnings:

  - The primary key for the `security_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `details` on the `security_logs` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `device_info` on the `sessions` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - The primary key for the `system_config` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `value` on the `system_config` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `message` to the `security_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `session_token` to the `sessions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "scopes" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" DATETIME,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "revoked_at" DATETIME,
    "revoked_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" DATETIME,
    CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "category" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" DATETIME,
    "data" JSONB,
    "expires_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "performed_by" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rate_limit_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "reset_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_security_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "event_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "details" JSONB,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT,
    "endpoint" TEXT,
    "method" TEXT,
    "status_code" INTEGER,
    "request_id" TEXT,
    "session_id" TEXT,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" DATETIME,
    "resolved_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "security_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_security_logs" ("city", "country", "created_at", "details", "event_type", "id", "ip_address", "region", "severity", "user_agent", "user_id") SELECT "city", "country", "created_at", "details", "event_type", "id", "ip_address", "region", "severity", "user_agent", "user_id" FROM "security_logs";
DROP TABLE "security_logs";
ALTER TABLE "new_security_logs" RENAME TO "security_logs";
CREATE INDEX "security_logs_user_id_idx" ON "security_logs"("user_id");
CREATE INDEX "security_logs_event_type_idx" ON "security_logs"("event_type");
CREATE INDEX "security_logs_ip_address_idx" ON "security_logs"("ip_address");
CREATE INDEX "security_logs_created_at_idx" ON "security_logs"("created_at");
CREATE INDEX "security_logs_severity_idx" ON "security_logs"("severity");
CREATE INDEX "security_logs_resolved_idx" ON "security_logs"("resolved");
CREATE INDEX "security_logs_request_id_idx" ON "security_logs"("request_id");
CREATE TABLE "new_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT,
    "fingerprint" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_suspicious" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" DATETIME,
    "revoked_by" TEXT,
    "last_activity" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "device_info" JSONB,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" DATETIME NOT NULL,
    CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_sessions" ("created_at", "device_info", "expires_at", "id", "ip_address", "is_active", "last_activity", "user_agent", "user_id") SELECT "created_at", "device_info", "expires_at", "id", "ip_address", "is_active", "last_activity", "user_agent", "user_id" FROM "sessions";
DROP TABLE "sessions";
ALTER TABLE "new_sessions" RENAME TO "sessions";
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX "sessions_session_token_idx" ON "sessions"("session_token");
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");
CREATE INDEX "sessions_last_activity_idx" ON "sessions"("last_activity");
CREATE INDEX "sessions_is_active_idx" ON "sessions"("is_active");
CREATE INDEX "sessions_ip_address_idx" ON "sessions"("ip_address");
CREATE TABLE "new_system_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_system_config" ("category", "created_at", "description", "id", "key", "updated_at", "value") SELECT "category", "created_at", "description", "id", "key", "updated_at", "value" FROM "system_config";
DROP TABLE "system_config";
ALTER TABLE "new_system_config" RENAME TO "system_config";
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");
CREATE INDEX "system_config_key_idx" ON "system_config"("key");
CREATE INDEX "system_config_category_idx" ON "system_config"("category");
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" DATETIME,
    "last_login" DATETIME,
    "last_login_ip" TEXT,
    "password_changed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone_number" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" DATETIME,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_secret" TEXT,
    "backup_codes" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "language" TEXT NOT NULL DEFAULT 'en',
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_users" ("backup_codes", "created_at", "email", "email_verified_at", "failed_login_attempts", "first_name", "id", "is_active", "is_verified", "last_login", "last_login_ip", "last_name", "locked_until", "password", "phone_number", "two_factor_enabled", "two_factor_secret", "updated_at", "username") SELECT "backup_codes", "created_at", "email", "email_verified_at", "failed_login_attempts", "first_name", "id", "is_active", "is_verified", "last_login", "last_login_ip", "last_name", "locked_until", "password", "phone_number", "two_factor_enabled", "two_factor_secret", "updated_at", "username" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "users_username_idx" ON "users"("username");
CREATE INDEX "users_last_login_idx" ON "users"("last_login");
CREATE INDEX "users_locked_until_idx" ON "users"("locked_until");
CREATE INDEX "users_is_active_idx" ON "users"("is_active");
CREATE INDEX "users_created_at_idx" ON "users"("created_at");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_keys_user_id_idx" ON "api_keys"("user_id");

-- CreateIndex
CREATE INDEX "api_keys_key_hash_idx" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_keys_is_active_idx" ON "api_keys"("is_active");

-- CreateIndex
CREATE INDEX "api_keys_created_at_idx" ON "api_keys"("created_at");

-- CreateIndex
CREATE INDEX "user_settings_user_id_idx" ON "user_settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key_key" ON "user_settings"("user_id", "key");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "notifications_expires_at_idx" ON "notifications"("expires_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_performed_by_idx" ON "audit_logs"("performed_by");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "rate_limit_entries_identifier_idx" ON "rate_limit_entries"("identifier");

-- CreateIndex
CREATE INDEX "rate_limit_entries_endpoint_idx" ON "rate_limit_entries"("endpoint");

-- CreateIndex
CREATE INDEX "rate_limit_entries_reset_at_idx" ON "rate_limit_entries"("reset_at");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limit_entries_identifier_endpoint_key" ON "rate_limit_entries"("identifier", "endpoint");
