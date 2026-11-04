-- Two links from Andrew's testing (November 2026). He searched "medial tibial stress syndrome"
-- and "shin splints" and found the two systematic reviews under the second were missing from the
-- first; and "hip replacement" never met the literature's "hip arthroplasty" (473 papers and
-- 834, with 1,195 between them).
--
-- Both are two-way, being pairs of names rather than an abbreviation and its full term: see
-- migration 0060. The view and function there read this table, so nothing else changes and
-- nothing is reindexed.
INSERT INTO "community"."search_abbreviations" ("short_form", "full_term", "two_way") VALUES
  ('shin splints', 'medial tibial stress syndrome', true),
  ('hip replacement', 'hip arthroplasty', true);
