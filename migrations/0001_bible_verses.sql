CREATE TABLE IF NOT EXISTS bible_verses (
  reference TEXT NOT NULL,
  translation TEXT NOT NULL,
  text TEXT NOT NULL,
  PRIMARY KEY (reference, translation)
);

CREATE INDEX IF NOT EXISTS idx_ref ON bible_verses(reference);
