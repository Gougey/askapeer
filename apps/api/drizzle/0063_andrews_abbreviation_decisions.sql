-- Andrew's decisions on the abbreviations he was asked about (November 2026). 25 of the 30
-- rows stay out; these are the five that come in.
--
-- MET, EMS, GPS and SLR: he asked for them "if combined terms can be searched", and they can,
-- since a search needs all its words anyway. Linking them adds little to a bare search and
-- nothing that combining words does not narrow: "SLR sciatica" goes from 71 papers to 124.
--
-- **S&C cannot be a row like the others.** The parser drops the "s" as a stopword and "&" and
-- "+" as punctuation, so "S&C", "S+C" and "S and C" all reach search as the lexeme 'c': the
-- 8,779 papers that say the letter, which is what typing it has always found. A row would key
-- on that 'c' and attach strength and conditioning to "vitamin C". So those spellings are
-- turned into the term before parsing, as one quoted phrase: 434 papers. A second phrase for
-- "strength & conditioning" would add 32, but `or` does not group, so "S&C rehab" would stop
-- requiring rehab. The lookbehind leaves "class and c" and "it's and c" alone, and "and" needs
-- spaces round it, or "sand c" would match.
INSERT INTO "community"."search_abbreviations" ("short_form", "full_term", "two_way") VALUES
  ('MET', 'Muscle Energy Technique', false),
  ('EMS', 'Electrical Muscle Stimulation', false),
  ('GPS', 'Global Positioning System', false),
  ('SLR', 'Straight-Leg Raise', false);--> statement-breakpoint
CREATE OR REPLACE FUNCTION "community"."search_tsquery"(q text) RETURNS tsquery
  LANGUAGE sql STABLE
  AS $$
    SELECT ts_rewrite(
      websearch_to_tsquery(
        'english',
        regexp_replace(
          q,
          $re$(?<![[:alnum:]_'’])s(\s*[&+]\s*|\s+and\s+)c(?![[:alnum:]_])$re$,
          '"strength and conditioning"',
          'gi'
        )
      ),
      'SELECT target, substitute FROM community.search_rewrites'
    )
  $$;
