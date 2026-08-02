/**
 * Rebuild the demo corpus: wipe community content, insert a fresh, realistic one.
 *
 * Run:  npm run seed:demo -w apps/api            (local)
 *       DATABASE_URL=… REDIS_URL=… npm run seed:demo -w apps/api   (any other environment)
 *
 * **This deletes every post, answer, kudos, report and moderation action.** It does *not*
 * touch `identity.members`, `community.handles`, the categories, or the 588-node clinical
 * taxonomy: accounts are how people sign in — including the admin allowlist — and the
 * vocabulary is seeded by migration, not by this.
 *
 * The corpus is shaped for the search and filtering work rather than for volume:
 *
 * - **More than three pages.** `DEFAULT_PAGE_SIZE` is 20, so a keyset cursor that drifts
 *   or repeats only shows up past the second page.
 * - **Terms placed deliberately.** `posts.tsv` weights the title (A) above the body (B),
 *   so the corpus needs the same term in title-only, body-only and both, or the weighting
 *   cannot be told from noise.
 * - **Both spellings of the synonym cases.** "ACL" and "anterior cruciate ligament",
 *   "patellofemoral" and "runner's knee" — EPIC-C §4's planned synonym dictionary has
 *   nothing to prove against a corpus that only ever uses one form.
 * - **Uneven tag and category distribution.** Some tags on a dozen posts, some on one,
 *   some on none; categories deliberately unequal, so a filter that silently ignores its
 *   argument still looks wrong.
 * - **At least one handle above the badge floor.** `DEFAULT_MIN_KUDOS` is 50, so a
 *   top-contributor badge cannot appear at all until someone clears it.
 * - **Threads of every shape**: unanswered, one answer, a long ranked thread, nested
 *   replies, and posts with zero kudos — an empty state is a state.
 *
 * Deterministic: the same seed value produces the same corpus, so a search result that
 * changes between runs is a code change rather than fresh dice.
 */
import { resolve } from 'node:path';
import * as dotenv from 'dotenv';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import Redis from 'ioredis';
import {
  caseAttestations,
  caseDetails,
  categories,
  comments,
  handles,
  kudos,
  members,
  moderationActions,
  notifications,
  postTags,
  posts,
  reports,
  tags,
} from '../src/db/schema';

dotenv.config({ path: resolve(process.cwd(), '../../.env') });

/** Mulberry32 — small, seeded, and good enough to place demo content repeatably. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20260802);
const pick = <T>(xs: T[]): T => xs[Math.floor(rand() * xs.length)];
const pickN = <T>(xs: T[], n: number): T[] => [...xs].sort(() => rand() - 0.5).slice(0, n);
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);

const HANDLE_NAMES = [
  'KneeGeek_99', 'Rehab_Rex', 'TendonTom', 'PitchSideP', 'ShoulderSue', 'GaitLab_G',
  'ReturnToPlay', 'ScrumPhysio', 'MarathonMed', 'YouthAthleteY', 'HandTherapyH', 'SpineSam',
  'AquaRehab', 'StrengthCoachS', 'ClinicalReason',
];

/**
 * Questions, written to be searched.
 *
 * `[title, body, category, tagHints[]]`. Tag hints are matched case-insensitively against
 * the seeded taxonomy by name; a hint that matches nothing is skipped rather than
 * failing the run, because the vocabulary is Andrew's and may be re-cut without this file
 * being told.
 */
const QUESTIONS: [string, string, string, string[]][] = [
  ['Return-to-run criteria after hamstring strain',
   'What objective criteria are people using before restarting running after a grade 2 hamstring strain? We use pain-free isometrics at 90 degrees plus symmetry on the Nordic, but I am not confident that is enough for a sprinter.',
   'General', ['Hamstring strain', 'Thigh']],
  ['ACL rehab timelines — who is still using 9 months?',
   'The literature has moved toward criteria-based progression rather than time, but insurers and clubs still ask for a date. How are people handling that conversation? Anterior cruciate ligament reconstruction, recreational-level patients mostly.',
   'General', ['Knee Ligaments', 'Knee Joint']],
  ['Anterior cruciate ligament graft choice and reinjury rates',
   'Hamstring autograft versus BPTB in athletes under 25 — the reinjury figures I have seen conflict. What is the current thinking?',
   'Research', ['Knee Joint']],
  ['Patellofemoral pain that has not responded to loading',
   'Six months of progressive quads loading, good adherence, minimal change. Runner, 30s. Where would you go next before considering imaging?',
   'General', ['Patellofemoral pain syndrome', 'Knee Cartilage']],
  ['Runner\'s knee or something else entirely?',
   'Lateral knee pain in a marathon runner that gets worse downhill. I keep coming back to ITB but the palpation findings do not fit. What am I missing?',
   'General', ['Knee Joint']],
  ['Achilles tendinopathy — isometrics or heavy slow resistance first?',
   'Mid-portion Achilles tendinopathy, irritable presentation. Do people still start with isometrics for analgesia, or go straight to heavy slow resistance now?',
   'General', ['Achilles tendinopathy', 'Ankle']],
  ['Calf strain in a masters sprinter — return timelines',
   'Soleus rather than gastrocnemius. Any rules of thumb people use for the difference in return-to-sprint timelines?',
   'General', ['Lower Leg', 'Soleus']],
  ['Shoulder instability in a teenage swimmer',
   'Multidirectional, no trauma, very mobile generally. Conservative management obviously, but how aggressive do people get with the strengthening in a skeletally immature athlete?',
   'General', ['Shoulder Joint Disorders']],
  ['Rotator cuff related shoulder pain — what is the current terminology?',
   'I keep seeing subacromial impingement, rotator cuff related shoulder pain, and subacromial pain syndrome used interchangeably. Is there consensus now?',
   'Research', ['Shoulder Rotator Cuff', 'Rotator cuff tendinopathy']],
  ['Tennis elbow that is really the neck?',
   'Lateral elbow pain with a normal grip test but reproducible on cervical quadrant. How often are people finding a cervical driver in what presents as tennis elbow?',
   'General', ['Elbow', 'Cervical radiculopathy']],
  ['Low back pain and return to rowing',
   'Rower with a six-week history of lumbar pain, no red flags, imaging unremarkable. What does a sensible return-to-erg progression look like?',
   'General', ['Lumbar Spine']],
  ['Hip and groin pain — the terminology is a mess',
   'Athletic groin pain, sportsman\'s hernia, adductor-related groin pain. Is everyone using the Doha agreement terminology now or has that not stuck?',
   'Research', ['Hip', 'Adductor strain']],
  ['FAI syndrome — surgery referral thresholds',
   'At what point are people referring femoroacetabular impingement syndrome on for a surgical opinion rather than continuing conservative care?',
   'General', ['Hip']],
  ['Medial tibial stress syndrome vs stress fracture',
   'What is your clinical threshold for imaging shin pain in a runner? I do not want to image everyone, but I have been caught out once.',
   'General', ['Medial tibial stress syndrome', 'Lower Leg']],
  ['Concussion return-to-play in grassroots rugby',
   'The protocols assume a level of medical support that grassroots clubs do not have. How are people managing this in practice?',
   'General', ['Cervical radiculopathy']],
  ['Ankle sprain — is bracing still recommended long term?',
   'Recurrent lateral ankle sprains in a netballer. Balance work is going well. Do people keep them braced for competition indefinitely?',
   'General', ['Ankle', 'Lateral ankle sprain']],
  ['Plantar heel pain — night splints, still a thing?',
   'Do people still use night splints for plantar heel pain, or has that fallen away in favour of loading alone?',
   'General', ['Foot', 'Plantar fasciitis']],
  ['Cervical radiculopathy in a cyclist',
   'Arm pain reproduced by sustained neck extension, which is exactly the cycling position. Beyond position changes, what has worked for people?',
   'General', ['Cervical radiculopathy']],
  ['Thoracic mobility work — does it change anything?',
   'I use a lot of thoracic mobility work with overhead athletes out of habit. Is there anything actually supporting it for shoulder outcomes?',
   'Research', ['Thoracic Spine', 'Shoulder Joint Disorders']],
  ['Wrist pain in a gymnast — dorsal impingement?',
   'Young gymnast, dorsal wrist pain on weight-bearing. Growth plate concerns obviously. How are people staging return to tumbling?',
   'General', ['Wrist', 'TFCC injury']],
  ['Blood flow restriction training — who is actually using it?',
   'BFR keeps coming up at courses. Is anyone using it routinely in practice, and for what?',
   'Equipment', ['Knee Joint']],
  ['Which force plate for a small clinic?',
   'Looking at portable force plates for return-to-play testing. Budget is limited. What are people using and is it worth it over jump-mat plus judgement?',
   'Equipment', []],
  ['Isokinetic dynamometry — worth the money in 2026?',
   'We have an ageing isokinetic dynamometer. Replace, or put the money into handheld dynamometry and better testing protocols?',
   'Equipment', ['Knee Joint']],
  ['Handheld dynamometer recommendations',
   'After something reliable for hip and knee strength testing that will survive a busy clinic. Recommendations?',
   'Equipment', ['Hip', 'Knee Joint']],
  ['Ultrasound in clinic — diagnostic or a distraction?',
   'Considering training in diagnostic ultrasound. Has it changed anyone\'s practice meaningfully, or does it mostly confirm what you already knew?',
   'Equipment', []],
  ['Moving from NHS to private — what surprised you?',
   'Considering the jump after eight years in the NHS. For those who have done it, what did you underestimate?',
   'Career', []],
  ['First year as a sports physio — imposter syndrome',
   'Six months into my first sports role and I second-guess every decision. Does this settle, and what helped?',
   'Career', []],
  ['Is an MSc worth it for a sports physio?',
   'Mid-career, considering an MSc in sports and exercise medicine. Did it change your practice or mainly your CV?',
   'Career', []],
  ['Working with a club — contract red flags',
   'Offered a part-time role with a semi-professional club. What should I be looking for in the contract that I might not think of?',
   'Career', []],
  ['Burnout in pitch-side roles',
   'Weekends, evenings, travel. How are people making pitch-side work sustainable long term?',
   'Career', []],
  ['How much does grip strength tell us about anything?',
   'Grip strength keeps appearing as a general health marker. Is it useful in a sports population or is it noise?',
   'Research', ['Wrist', 'TFCC injury']],
  ['Eccentric versus heavy slow resistance for tendinopathy',
   'Is there now a clear answer for tendinopathy loading, or is adherence still the deciding factor?',
   'Research', ['Achilles tendinopathy']],
  ['Do we still believe in the core stability model?',
   'Genuine question rather than provocation. How much of the core stability model has survived the last decade?',
   'Research', ['Lumbar Spine']],
  ['Sleep and injury risk in adolescent athletes',
   'The association looks strong. Is anyone actually screening for it, and what do you do with the answer?',
   'Research', []],
  ['Menstrual cycle tracking and injury risk',
   'What is the state of the evidence, and how are people raising this with athletes without it feeling intrusive?',
   'Research', []],
  ['Load management in a two-game week',
   'Semi-professional side, two fixtures a week for a month. How are people distributing training load around that?',
   'General', []],
  ['GPS data — how much of it do you actually use?',
   'We collect a lot and act on very little. What are the two or three metrics that actually change your decisions?',
   'Equipment', []],
  ['Return to play after a fifth metatarsal fracture',
   'Zone 2, conservative management. Football. How are people staging the return to change of direction?',
   'General', ['Foot', 'Stress fracture']],
  ['Osgood-Schlatter — how much rest is too much?',
   'Adolescent footballer, classic presentation. Parents want complete rest. Trying to keep him active without flaring it.',
   'General', ['Knee Tendons', 'Knee Other']],
  ['Sever\'s disease in a young sprinter',
   'Calcaneal apophysitis in a 12-year-old. Load management is going well but the parents are asking about long-term consequences.',
   'General', ['Foot', 'Lower Leg']],
  ['Shoulder dislocation — first-time, young athlete, surgery?',
   'First-time anterior dislocation, 19-year-old rugby player. Recurrence rates argue for early stabilisation. What are people advising?',
   'General', ['Shoulder Joint Disorders']],
  ['Hamstring injury prevention — is Nordic adherence the whole story?',
   'The Nordic hamstring exercise works when it is done. Adherence is dreadful. What alternatives are people getting compliance with?',
   'Research', ['Hamstring strain']],
  ['Groin pain in an ice hockey player',
   'Adductor-related, recurrent. Skating loads are hard to modify. Anyone worked with hockey specifically?',
   'General', ['Hip', 'Adductor strain']],
  ['Managing expectations after a Lisfranc injury',
   'Long recovery, and the athlete is fixated on a return date. How do people frame that conversation early?',
   'General', ['Foot']],
  ['Proximal hamstring tendinopathy — sitting is the problem',
   'Office worker and a runner. The sitting aggravation is the hardest part to modify. What has worked?',
   'General', ['Hamstring strain']],
  ['Chronic exertional compartment syndrome — referral or rehab?',
   'Classic history, symptoms resolve with rest. How long do people persist with gait retraining before referring for pressure testing?',
   'General', ['Chronic exertional compartment syndrome', 'Lower Leg']],
  ['Bone stress injury and RED-S screening',
   'Second stress fracture in a distance runner in eighteen months. What does a practical RED-S screen look like in a clinic setting?',
   'Research', ['Stress fracture']],
  ['Return to swimming after shoulder surgery',
   'Stroke-specific progression after stabilisation. Anyone got a progression they are happy with?',
   'General', ['Shoulder Joint Disorders']],
  ['Neck strength training in contact sport',
   'Growing interest in neck strength for concussion mitigation. What is a realistic protocol for a club with limited kit?',
   'General', ['Cervical Spine (Neck)', 'Cervical radiculopathy']],
  ['Telehealth follow-ups — what works and what does not',
   'Post-lockdown we kept some telehealth. Works for some, not others. Where have people drawn the line?',
   'Career', []],
  ['Documentation — how much is enough?',
   'Trying to balance defensible notes against spending my evenings writing them. What does good look like?',
   'Career', []],
  ['Explaining pain science without patronising anyone',
   'The explanations that work in the literature can sound condescending out loud. How are people phrasing this?',
   'General', []],
  ['Do wearables change behaviour or just measure it?',
   'Athletes love the data. I am not convinced it changes what they do. Anyone seen it work?',
   'Equipment', []],
  ['Screening for hypermobility in dancers',
   'Beighton is crude. What are people using alongside it, and does the label change management?',
   'General', []],
  ['Returning to sport after long COVID',
   'Graded return, but the setbacks are unpredictable. What has worked for people managing that uncertainty?',
   'General', []],
];

/** Case discussions: slug, age band, days since onset, the four fields, tag hints. */
const CASES: [string, 'child' | 'youth' | 'adult', number, string, string, string, string, string[]][] = [
  ['hamstring-sprinter', 'adult', 21,
   'Acute posterior thigh pain during maximal sprint effort, unable to continue. Sharp at the time, now a persistent ache with apprehension on acceleration.',
   'Semi-professional sprinter. Sudden onset mid-session, no contact. Two prior hamstring strains on the same side, most recent last season.',
   'Tenderness at the proximal musculotendinous junction. Pain and weakness on resisted knee flexion at 90 degrees. Neurovascularly intact, no bony tenderness.',
   'Tried relative rest then progressive isometric and eccentric loading. Good early progress then a plateau at higher-speed running with recurring apprehension. What criteria are others using to progress to maximal sprinting after a repeat hamstring injury?',
   ['Hamstring strain', 'Thigh']],
  ['knee-youth-footballer', 'youth', 45,
   'Medial knee pain in a youth footballer, worse on cutting and pivoting, settles with rest.',
   'Gradual onset over six weeks of increased match load at a youth level. No single incident, no swelling reported.',
   'Tender over the medial joint line. Pain on valgus stress at 30 degrees, stable at 0. Full range, no effusion.',
   'Tried load management with partial relief. How are others staging return to pivoting in a skeletally immature athlete?',
   ['Knee Ligaments', 'Knee Joint']],
  ['heel-child-gymnast', 'child', 30,
   'Heel pain in a child gymnast on landing and after tumbling, easing overnight.',
   'Gradual onset over a month of increased training in the run-up to a competition. No trauma.',
   'Tender at the calcaneal apophysis, pain on the squeeze test. Reduced ankle dorsiflexion.',
   'Reduced impact volume and started calf loading with some improvement. How are others managing load here without stopping altogether?',
   ['Foot', 'Lower Leg']],
  ['shoulder-swimmer', 'youth', 90,
   'Anterior shoulder pain in a swimmer, worst in the recovery phase of freestyle, no instability episodes.',
   'Gradual onset across a season of increasing yardage. No dislocation, no trauma.',
   'Painful arc between 70 and 110 degrees. Positive Hawkins-Kennedy. Generalised laxity, Beighton 6.',
   'Scapular and cuff loading has helped the pain but the stroke volume is still limited. What is working for others with hypermobile swimmers?',
   ['Shoulder Rotator Cuff', 'Rotator cuff tendinopathy']],
  ['achilles-runner', 'adult', 120,
   'Mid-portion Achilles pain in a recreational runner, worst on the first steps in the morning and warming up with activity.',
   'Gradual onset after a step up in weekly mileage for a first marathon. No acute event.',
   'Tender 4cm above the insertion, fusiform thickening. Pain on single-leg heel raise, reduced endurance on that side.',
   'Twelve weeks of heavy slow resistance with good adherence and only partial improvement. What would others try next before considering imaging or injection?',
   ['Achilles tendinopathy', 'Lower Leg']],
  ['groin-hockey', 'adult', 60,
   'Adductor-related groin pain in an ice hockey player, worse with skating stride and change of direction.',
   'Gradual onset across the season, recurrent from a similar episode last year. No acute event.',
   'Tender at the adductor longus origin. Pain on resisted adduction and the squeeze test at 45 degrees.',
   'Copenhagen adduction progression has improved strength but symptoms return with skating volume. How are others modifying on-ice load?',
   ['Hip', 'Adductor strain']],
  ['lumbar-rower', 'adult', 42,
   'Central lumbar pain in a rower, worse at the catch and with sustained flexion, no leg symptoms.',
   'Gradual onset during a winter block of high erg volume. No trauma, no red flags.',
   'Pain reproduced in sustained flexion, eased by extension. Neurological examination normal. No bony tenderness.',
   'Technique work and load reduction have helped on the water but the erg is still provocative. What progression are others using back to full erg volume?',
   ['Lumbar Spine']],
  ['ankle-netballer', 'youth', 14,
   'Lateral ankle pain after an inversion injury landing from a rebound, able to weight-bear immediately.',
   'Acute, single incident at training two weeks ago. Two previous sprains on the same ankle.',
   'Swelling over the anterior talofibular ligament, tender on palpation. Anterior drawer laxity compared to the other side. Ottawa rules negative.',
   'Early loading and balance work going well. How are others deciding on bracing for return to competition after a third sprain?',
   ['Ankle', 'Lateral ankle sprain']],
  ['shin-recruit', 'adult', 28,
   'Diffuse medial shin pain in a military recruit, present during and after running, easing with rest.',
   'Gradual onset four weeks into a training programme with a sharp increase in running volume.',
   'Tenderness along the posteromedial border of the tibia over more than 5cm. No focal bony tenderness, hop test negative.',
   'Reduced running volume and started calf and foot loading. At what point would others image to exclude a bone stress injury?',
   ['Medial tibial stress syndrome', 'Stress fracture']],
  ['elbow-thrower', 'youth', 75,
   'Medial elbow pain in an overhead athlete, worst in late cocking, settles between sessions.',
   'Gradual onset over a season of increased throwing volume. No acute event, no locking or catching.',
   'Tender over the medial epicondyle and along the ulnar collateral ligament. Pain on valgus stress at 30 degrees. Normal neurology.',
   'Throwing volume reduced and posterior chain work started. How are others staging a return-to-throw programme in a skeletally immature athlete?',
   ['Elbow', 'Nerve (elbow)']],
  ['wrist-climber', 'adult', 55,
   'Ulnar-sided wrist pain in a climber, worse on crimping and rotation under load.',
   'Gradual onset over two months of increased bouldering. No fall, no acute injury.',
   'Tender over the TFCC. Pain on ulnar deviation with axial load. Grip strength reduced by 20 percent.',
   'Relative rest and grip loading have helped but crimping remains provocative. What has worked for others with climbers here?',
   ['Wrist', 'TFCC injury']],
  ['knee-runner-pfp', 'adult', 180,
   'Anterior knee pain in a recreational runner, worse on stairs and after prolonged sitting.',
   'Gradual onset over six months, no trauma. Coincided with a change to a desk-based role.',
   'Pain on patellar compression. Weak hip abduction and external rotation. No effusion, full range, ligaments stable.',
   'Six months of progressive quads and hip loading with good adherence and minimal change. Where would others go next?',
   ['Patellofemoral pain syndrome', 'Knee Cartilage']],
];

const ANSWERS = [
  'We use pain-free maximal isometrics plus within-10-percent symmetry on eccentric knee flexor strength before any sprint exposure. The apprehension usually settles once the strength gap closes, and if it does not, that is worth its own conversation.',
  'Criteria over calendar, every time. The date question is a management problem rather than a clinical one — I give a range and explain what would move it either way.',
  'Worth checking the lumbar spine before you accept this as local. I have been caught out by a referred pattern that looked exactly like this twice now.',
  'Adherence beats protocol. Whatever loading you choose, the one they actually do at home is the one that works.',
  'Have you retested under fatigue? A lot of these look fine fresh and fall apart at the end of a session, which is when they get injured.',
  'We moved to a criteria-based framework two seasons ago and the reinjury rate dropped, though I would not claim that as causal with our numbers.',
  'The evidence is thinner than the confidence with which it gets quoted at courses. I would treat it as one input rather than the answer.',
  'In a skeletally immature athlete I stay well away from maximal loading and prioritise volume control. Growth plates do not forgive impatience.',
  'Ask about sleep and food before you add more rehab. Twice now the thing that unlocked a stalled case was neither.',
  'I would image if the pain is focal, night pain is present, or it has not moved in six weeks despite a genuine load reduction. Otherwise I hold.',
  'We use a simple traffic-light system with the coaches. It is cruder than the data we collect but it is the only thing that actually changes selection.',
  'Consider the contralateral side as your benchmark with caution — in a chronic case it is often deconditioned too.',
  'Two things that helped us: making the home programme shorter, and putting it in whatever app they already open daily.',
  'The terminology has shifted but the management has not much. I would not spend long on the label with the patient.',
  'Talk to the coach directly rather than through the athlete. Half the load problems I see are communication problems.',
];

const REPLIES = [
  'Agreed — and worth adding that we retest at the end of a session rather than the start for exactly that reason.',
  'That matches our experience. How long do you typically hold before reassessing?',
  'Interesting, we do the opposite and get similar results. Might be more about the athlete than the protocol.',
  'Do you have a reference for that? Would be useful for a conversation I am having with a coach.',
  'This is the answer I wish I had had two years ago.',
];

async function main(): Promise<void> {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgres://askapeer:askapeer@localhost:5432/askapeer',
  });
  const db = drizzle(pool);
  const redisUrl = process.env.REDIS_URL;
  const redis = redisUrl ? new Redis(redisUrl, { maxRetriesPerRequest: 2 }) : null;

  // ---- wipe content, keep accounts and vocabulary -------------------------------------
  // Order matters only where a FK has no cascade; posts cascade to case_details/post_tags.
  console.log('Clearing existing community content…');
  await db.delete(notifications);
  await db.delete(moderationActions);
  await db.delete(reports);
  await db.delete(kudos);
  await db.delete(comments);
  await db.delete(caseAttestations);
  await db.delete(posts); // cascades: case_details, post_tags
  await db.update(handles).set({ kudosTotal: 0 });

  // ---- authors -------------------------------------------------------------------------
  /*
   * **Real handles first, demo handles to top up.**
   *
   * Every active handle already on the platform takes part — the founders included. They
   * had handles and were never used, so they appeared in the app as members who had never
   * posted, answered or awarded anything, which is the one view of the product nobody
   * needs to test. Ordering them first means the round-robin gives them a fair share of
   * the most recent content rather than the tail.
   */
  const existing = await db
    .select({ id: handles.id, name: handles.handleName })
    .from(handles)
    .where(sql`${handles.status} = 'active'`);
  const byName = new Map(existing.map((h) => [h.name, h]));
  const realHandles = existing.filter((h) => !HANDLE_NAMES.includes(h.name));
  const authors: { id: string; name: string }[] = [...realHandles];

  for (const name of HANDLE_NAMES) {
    const found = byName.get(name);
    if (found) {
      authors.push(found);
      continue;
    }
    /*
     * A handle needs a member behind it, and that member needs to be able to *use* the
     * app — not just own rows.
     *
     * `anonymity_acknowledged_at` was missing on the first cut, and the effect was
     * invisible until someone tried to sign in as a demo account: `requireAppAccess`
     * bounced all fourteen of them to onboarding. Being able to look at the app as another
     * member is most of what demo accounts are for, so they are onboarded here rather than
     * left as authors of content they could never see.
     */
    const [member] = await db
      .insert(members)
      .values({
        legalName: `Demo ${name}`,
        email: `${name.toLowerCase()}@demo.askapeer.invalid`,
        professionalBody: 'hcpc',
        registrationNumber: `DEMO${Math.floor(rand() * 900000 + 100000)}`,
        verificationStatus: 'approved_verified',
        anonymityAcknowledgedAt: new Date(),
      })
      .returning({ id: members.id });
    const [handle] = await db
      .insert(handles)
      .values({ memberId: member.id, handleName: name })
      .returning({ id: handles.id, name: handles.handleName });
    authors.push(handle);
  }
  // Existing handles predate this script and may have been created before the
  // acknowledgement was recorded; without it they cannot reach the app either.
  await db
    .update(members)
    .set({ anonymityAcknowledgedAt: new Date() })
    .where(
      sql`${members.anonymityAcknowledgedAt} is null and exists (
        select 1 from community.handles h where h.member_id = ${members.id}
      )`,
    );
  console.log(
    `${authors.length} authors ready, all able to sign in ` +
      `(${realHandles.length} real: ${realHandles.map((h) => h.name).join(', ') || 'none'}).`,
  );

  // ---- vocabulary lookups ---------------------------------------------------------------
  const cats = await db.select({ id: categories.id, name: categories.name, postType: categories.postType }).from(categories);
  const catByName = new Map(cats.map((c) => [c.name, c]));
  const caseCat = cats.find((c) => c.postType === 'case_discussion');
  if (!caseCat) throw new Error('No category is marked for case discussions — run migrations first.');

  const allTags = await db.select({ id: tags.id, name: tags.name }).from(tags);
  const tagByLower = new Map(allTags.map((t) => [t.name.toLowerCase(), t.id]));
  const resolveTags = (hints: string[]) =>
    hints.map((h) => tagByLower.get(h.toLowerCase())).filter((id): id is string => Boolean(id));

  // ---- questions ------------------------------------------------------------------------
  type Made = { id: string; authorId: string; createdAt: Date };
  const made: Made[] = [];

  for (const [i, [title, body, catName, tagHints]] of QUESTIONS.entries()) {
    const category = catByName.get(catName) ?? catByName.get('General')!;
    // A question must never land in a case-scoped category (the API refuses it too).
    const safeCategory = category.postType === 'case_discussion' ? catByName.get('General')! : category;
    const author = authors[i % authors.length];
    const createdAt = daysAgo(Math.floor(rand() * 240) + 1);
    const [row] = await db
      .insert(posts)
      .values({ handleId: author.id, categoryId: safeCategory.id, type: 'question', title, body, createdAt })
      .returning({ id: posts.id });
    const tagIds = resolveTags(tagHints);
    if (tagIds.length) {
      await db.insert(postTags).values(tagIds.map((tagId) => ({ postId: row.id, tagId })));
    }
    made.push({ id: row.id, authorId: author.id, createdAt });
  }
  console.log(`${QUESTIONS.length} questions.`);

  // ---- case discussions -------------------------------------------------------------------
  const TEMPLATE_LABELS = [
    ['presentingCondition', 'Presenting condition'],
    ['historyPresentingCondition', 'History of presenting condition'],
    ['objectiveFindings', 'Objective findings'],
    ['communityQuestion', 'Question'],
  ] as const;

  for (const [i, [, ageBand, onsetDays, pc, hpc, obj, q, tagHints]] of CASES.entries()) {
    const author = authors[(i + 3) % authors.length];
    const createdAt = daysAgo(Math.floor(rand() * 150) + 1);
    const fields = {
      presentingCondition: pc,
      historyPresentingCondition: hpc,
      objectiveFindings: obj,
      communityQuestion: q,
    };
    // Mirrors CasesService: the title is the presenting condition truncated, the body is
    // the labelled projection that feeds the search index.
    const flat = pc.replace(/\s+/g, ' ').trim();
    const title = flat.length <= 110 ? flat : `${flat.slice(0, flat.slice(0, 110).lastIndexOf(' '))}…`;
    const body = TEMPLATE_LABELS.map(([k, label]) => `${label}: ${fields[k]}`).join('\n\n');

    // The last two are left unpublished on purpose: one draft and one sent back for
    // correction, so those states exist in the corpus rather than only in a test run.
    const status = i === CASES.length - 1 ? 'needs_correction' : i === CASES.length - 2 ? 'draft' : 'published';

    const [row] = await db
      .insert(posts)
      .values({ handleId: author.id, categoryId: caseCat.id, type: 'case_discussion', title, body, status, createdAt })
      .returning({ id: posts.id });
    await db.insert(caseDetails).values({
      postId: row.id,
      ageBand,
      onsetDays,
      ...fields,
      checklistState: status === 'published' ? { no_names: true, no_location: true, age_banded: true, dates_relative: true, no_facility: true, no_documents: true } : {},
    });
    // Clinically sensible tags, not two random nodes — a hamstring case tagged with a
    // thumb muscle would make tag filtering look broken when it is the data that is wrong.
    const tagIds = resolveTags(tagHints);
    if (tagIds.length) {
      await db.insert(postTags).values(tagIds.map((tagId) => ({ postId: row.id, tagId })));
    }

    if (status === 'published') {
      // A published case has an attestation, bound to the author's member id — the same
      // record the real publish route writes (EPIC-E §5).
      const [{ memberId }] = await db
        .select({ memberId: handles.memberId })
        .from(handles)
        .where(sql`${handles.id} = ${author.id}`);
      await db.insert(caseAttestations).values({
        memberId,
        postId: row.id,
        attestationText:
          'I confirm that this case discussion is de-identified in accordance with AskaPeer’s patient privacy policy. I understand that any breach of patient confidentiality is a serious professional and legal matter and may result in permanent removal from the platform and referral to my professional regulatory body.',
        checklistSnapshot: [
          { key: 'no_names', label: 'No patient names, initials, or aliases', confirmed: true },
          { key: 'no_location', label: 'No address, postcode, or identifying location', confirmed: true },
          { key: 'age_banded', label: 'Age given as a band, not a date of birth', confirmed: true },
          { key: 'dates_relative', label: 'Timelines relative, with no calendar dates', confirmed: true },
          { key: 'no_facility', label: 'No facility, club, or team that would identify the patient', confirmed: true },
          { key: 'no_documents', label: 'No documents containing patient identifiers', confirmed: true },
        ],
        attestedAt: createdAt,
      });
      made.push({ id: row.id, authorId: author.id, createdAt });
    }
  }
  console.log(`${CASES.length} case discussions (1 draft, 1 needs_correction).`);

  // ---- answers, replies, kudos -------------------------------------------------------------
  const kudosTally = new Map<string, number>();
  /**
   * `kudos_one_per_handle_unique` means a handle can award a given target only once, and
   * the later "concentrate on three handles" pass deliberately revisits posts that already
   * have kudos. So conflicts are ignored and the tally counts what actually landed —
   * counting the *attempts* would drift `handles.kudos_total` away from the rows, which is
   * the one number that must not lie.
   */
  const addKudos = async (targetType: 'post' | 'comment', targetId: string, ownerHandleId: string, n: number) => {
    const givers = pickN(authors.filter((a) => a.id !== ownerHandleId), n);
    if (!givers.length) return;
    const inserted = await db
      .insert(kudos)
      .values(givers.map((g) => ({ givenByHandleId: g.id, targetType, targetId })))
      .onConflictDoNothing()
      .returning({ id: kudos.id });
    if (inserted.length) {
      kudosTally.set(ownerHandleId, (kudosTally.get(ownerHandleId) ?? 0) + inserted.length);
    }
  };

  let answerCount = 0;
  for (const [i, post] of made.entries()) {
    // Deliberately uneven: every fifth thread stays unanswered so the empty state is real.
    const n = i % 5 === 0 ? 0 : Math.floor(rand() * 6) + 1;
    for (let a = 0; a < n; a++) {
      const author = pick(authors.filter((x) => x.id !== post.authorId));
      const createdAt = new Date(post.createdAt.getTime() + (a + 1) * 3_600_000 * (1 + rand() * 20));
      const [answer] = await db
        .insert(comments)
        .values({ postId: post.id, handleId: author.id, body: pick(ANSWERS), createdAt })
        .returning({ id: comments.id });
      answerCount++;
      await addKudos('comment', answer.id, author.id, Math.floor(rand() * 7));

      // A nested reply on roughly a third of answers, so the ranked-thread layout has
      // something to indent.
      if (rand() < 0.33) {
        const replier = pick(authors);
        await db.insert(comments).values({
          postId: post.id,
          handleId: replier.id,
          parentCommentId: answer.id,
          body: pick(REPLIES),
          createdAt: new Date(createdAt.getTime() + 3_600_000 * (1 + rand() * 10)),
        });
        answerCount++;
      }
    }
    await addKudos('post', post.id, post.authorId, Math.floor(rand() * 9));
  }
  console.log(`${answerCount} answers and replies.`);

  // Concentrate kudos on three handles so at least one clears the badge floor (50).
  for (const star of authors.slice(0, 3)) {
    const theirPosts = made.filter((m) => m.authorId === star.id).slice(0, 6);
    for (const p of theirPosts) await addKudos('post', p.id, star.id, 8);
  }

  // Authoritative totals in Postgres…
  for (const [handleId, total] of kudosTally) {
    await db.update(handles).set({ kudosTotal: total }).where(sql`${handles.id} = ${handleId}`);
  }
  // …mirrored into the Redis leaderboard the badge reads. Skipping this is the dual-store
  // trap: totals would look right on every profile while no badge ever appeared.
  if (redis) {
    await redis.del('kudos:leaderboard');
    for (const [handleId, total] of kudosTally) {
      await redis.zadd('kudos:leaderboard', total, handleId);
    }
    console.log(`Kudos leaderboard synced for ${kudosTally.size} handles.`);
  } else {
    console.warn('REDIS_URL not set — leaderboard NOT synced, so no top-contributor badges.');
  }
  const totalKudos = [...kudosTally.values()].reduce((a, b) => a + b, 0);
  console.log(`${totalKudos} kudos; top handle on ${Math.max(...kudosTally.values())}.`);

  // ---- reports and moderation --------------------------------------------------------------
  const published = made.slice(0, 6);
  // Reporters vary: a real handle files one, demo handles the others. A queue where every
  // report came from the same member is not a queue anyone has triaged.
  const reporters = [authors[0], authors[authors.length - 1], authors[1] ?? authors[0]];
  const cases = await db
    .select({ id: posts.id, handleId: posts.handleId })
    .from(posts)
    .where(sql`${posts.type} = 'case_discussion' and ${posts.status} = 'published'`)
    .limit(2);

  const reportRows = [
    { reporterHandleId: reporters[0].id, targetType: 'post' as const, targetId: published[1].id, category: 'spam' as const, comment: 'Looks like a promotional post.' },
    { reporterHandleId: reporters[1].id, targetType: 'post' as const, targetId: published[2].id, category: 'other' as const, comment: null },
    ...(cases[0] ? [{ reporterHandleId: reporters[2].id, targetType: 'post' as const, targetId: cases[0].id, category: 'identifiable_patient_information' as const, comment: 'The club is named in the history.' }] : []),
  ].filter((r) => {
    // Never let a report point at its own author's content: the moderation queue would
    // show someone reporting themselves, which is not a case worth demonstrating.
    const target = made.find((m) => m.id === r.targetId);
    return target ? target.authorId !== r.reporterHandleId : true;
  });
  const insertedReports = await db.insert(reports).values(reportRows).returning({ id: reports.id, targetId: reports.targetId });

  // One dismissed, one actioned with a warning — so the queue has resolved items as well
  // as open ones, and a member has a notice to open.
  await db.update(reports).set({ status: 'dismissed' }).where(sql`${reports.id} = ${insertedReports[1].id}`);
  const warnedPost = made.find((m) => m.id === insertedReports[0].targetId)!;
  await db.insert(moderationActions).values({
    reportId: insertedReports[0].id,
    targetHandleId: warnedPost.authorId,
    actionType: 'warn',
    moderatorId: (await db.select({ memberId: handles.memberId }).from(handles).where(sql`${handles.id} = ${authors[0].id}`))[0].memberId,
    reason: 'Please keep product recommendations to the Equipment category and disclose any affiliation.',
  });
  await db.update(reports).set({ status: 'actioned' }).where(sql`${reports.id} = ${insertedReports[0].id}`);
  console.log(`${reportRows.length} reports (1 open, 1 dismissed, 1 actioned).`);

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(posts);
  console.log(`\nDone. ${count} posts total.`);

  await pool.end();
  if (redis) await redis.quit();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
