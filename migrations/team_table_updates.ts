import { sql } from 'drizzle-orm';

export async function up(db: any) {
  await db.execute(sql`
    DO $$ 
    BEGIN
      -- Ensure social_links is JSONB and not null with default empty array
      IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'team' 
        AND column_name = 'social_links'
      ) THEN
        ALTER TABLE team 
        ALTER COLUMN social_links SET DEFAULT '[]'::jsonb,
        ALTER COLUMN social_links SET NOT NULL;
      END IF;

      -- Add check constraint for valid social links
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'team_social_links_check'
      ) THEN
        ALTER TABLE team
        ADD CONSTRAINT team_social_links_check
        CHECK (jsonb_typeof(social_links) = 'array');
      END IF;

      -- Update timestamps to use timezone
      ALTER TABLE team
      ALTER COLUMN created_at TYPE timestamptz,
      ALTER COLUMN updated_at TYPE timestamptz;
    END $$;
  `);
}

export async function down(db: any) {
  await db.execute(sql`
    DO $$ 
    BEGIN
      -- Remove check constraint
      ALTER TABLE team DROP CONSTRAINT IF EXISTS team_social_links_check;
      
      -- Reset social_links defaults
      ALTER TABLE team 
      ALTER COLUMN social_links DROP DEFAULT,
      ALTER COLUMN social_links DROP NOT NULL;

      -- Revert timestamp types
      ALTER TABLE team
      ALTER COLUMN created_at TYPE timestamp,
      ALTER COLUMN updated_at TYPE timestamp;
    END $$;
  `);
}
