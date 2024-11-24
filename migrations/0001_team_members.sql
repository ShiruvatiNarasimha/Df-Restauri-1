CREATE TABLE IF NOT EXISTS "team_members" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "name" text NOT NULL,
  "role" text NOT NULL,
  "avatar" text NOT NULL,
  "facebook_url" text,
  "twitter_url" text,
  "instagram_url" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
