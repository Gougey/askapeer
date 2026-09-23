-- A Joints axis per region (Andrew, 2026-09-22).
--
-- Item 2 of his testing review: *"select upper limb > upper limb muscles, ligaments,
-- conditions, but no 'joints' section to follow anything shoulder/hip/knee"*. He then sent a
-- list of 52 joints grouped by region, and answered the two questions that decided the shape:
-- a joint's ligaments **should live under the joint**, and the knee's three joints are
-- separate but one area, with the existing groupings underneath them.
--
-- **Roughly half those joints already existed** — as the group names inside each region's
-- ligaments branch, which was already organised by joint (`Glenohumeral joint`, `Hip joint`,
-- `Subtalar joint`, `Elbow joint`…). Creating a parallel Joints list would have reproduced
-- exactly the cross-region duplication migrations 0033–0042 spent weeks removing: two
-- identically named nodes in one region, matching the same papers.
--
-- So nothing here is copied and nothing is retired. Two shapes only, and the existing name
-- decides which applies:
--
--   **MOVE** — the live group already *is* the joint, so it moves into the Joints axis and
--   keeps its id, its name and its children. `Glenohumeral joint` simply relocates.
--
--   **CREATE + ADOPT** — the joint did not exist, or existed only under a ligament-shaped
--   name (`Ankle — lateral collateral ligaments`). The joint node is created and the ligament
--   group is *moved* beneath it, never copied and never renamed.
--
-- Every existing node keeps its id, so article matches and member interests survive untouched.
-- What the ligaments branch keeps is what was never a joint: the segmental spinal ligaments,
-- the interosseous membrane, the plantar structures, the retinacula and pulley systems.
--
-- Judgement calls worth naming, each reversible:
--
--   * **The pelvis gains no new nodes.** Its three joints already existed under bones &
--     landmarks, so they *move* into the joints axis and bring their ligaments with them. A
--     fourth `Sacroiliac joint` in a region that already has two would be the old bug again.
--   * **Andrew lists some joints twice** — lumbosacral and sacrococcygeal under both lumbar
--     and pelvis, the hip under both pelvis and lower limb. Each is filed once, in the region
--     he assigned it to in September: the hip is lower limb, the sacrococcygeal joint pelvic.
--   * **The dens ligaments** move under the atlanto-axial joint, which is the joint they
--     stabilise.
--   * **The glenoid labrum** moves under the shoulder, beside the glenohumeral joint.
--   * **Muscles are not moved.** He wrote "existing ligaments and muscles then grouped with
--     them"; the ligaments are unambiguous, but the muscle tree is organised by compartment
--     (Thigh > Quadriceps / Hamstrings / Adductors) and hamstrings do not belong to the
--     tibiofemoral joint in the way the cruciates do. Worth a separate answer from him.
--
--   * **Andrew's sub-headings are not nodes.** He grouped his list under "Shoulder",
--     "Knee", "Foot" and so on, but each of those names already exists in the same region as
--     a *conditions* group — a second tag called "Knee" would match every knee paper twice
--     over, which is the duplication 0033–0042 removed. His grouping survives as the order
--     the joints appear in, which is what a browsing member actually reads.
--
-- Run a reclassify after deploying: the new tags match nothing until it does.

-- Every id being moved must still carry the name this migration expects.
DO $$
DECLARE wrong int;
BEGIN
  SELECT count(*) INTO wrong FROM (VALUES
    ('37b8b916-b61a-5856-bcb5-62449cff08f0'::uuid, 'Sternoclavicular joint'),
    ('a7995fce-c1c4-542e-8e2a-42f216c6f0e9'::uuid, 'Glenohumeral joint'),
    ('ab88e6e6-03da-51a7-9aaa-b7427a38cab3'::uuid, 'Glenoid labrum & capsulolabral complexes'),
    ('0fed32d7-30f6-5f6c-877b-631a878411fd'::uuid, 'Elbow joint'),
    ('478beab6-2f99-5534-bca6-91654eca3bc2'::uuid, 'Proximal radioulnar joint'),
    ('341bd056-74dd-5ecc-a1ec-21892b98c109'::uuid, 'Distal radioulnar joint & TFCC'),
    ('bae90ab1-2f8e-5bbf-a48a-979253d4e2c1'::uuid, 'Carpometacarpal joints'),
    ('65522105-c1e9-55c1-8824-30c3287ca5bc'::uuid, 'Finger metacarpophalangeal joints'),
    ('ce45cae2-7838-5557-82cd-cf356c4d8d60'::uuid, 'Proximal interphalangeal joints'),
    ('2629f26d-4be4-59dc-993b-a2b6ae5d7729'::uuid, 'Distal interphalangeal joints'),
    ('64295ccc-57c8-527c-a8a1-05734f26fdd3'::uuid, 'Thumb — first carpometacarpal joint'),
    ('363fc1df-ae1b-560b-a297-f5f7a4b13acc'::uuid, 'Thumb — metacarpophalangeal joint'),
    ('c4b9e7d1-c7ee-5582-98f0-5b7118bd67d2'::uuid, 'Costovertebral & costotransverse joints'),
    ('f7e199b3-294c-5c9e-b519-8e86e8ecef80'::uuid, 'Sacroiliac joint'),
    ('33c4095b-678b-5664-8e38-7fe58476d410'::uuid, 'Pubic symphysis'),
    ('edc429c9-496c-5fcf-9145-1c93c9f65b58'::uuid, 'Sacrococcygeal joint'),
    ('6a449cdf-a4d3-5c8d-8ca7-f2bd1e1c2026'::uuid, 'Hip joint'),
    ('c4c23d88-385a-513e-a82d-8922f99c9000'::uuid, 'Superior tibiofibular joint'),
    ('d16e1b85-41c0-5b00-afe5-0eace841ceb1'::uuid, 'Subtalar joint'),
    ('5eb22608-98f8-595d-b371-1c41f21a28b6'::uuid, 'Calcaneocuboid joint & bifurcate ligament'),
    ('5143ec39-561a-5b7a-8f77-ab5cb8de5de5'::uuid, 'Tarsometatarsal (Lisfranc) joints'),
    ('930994dc-8c0a-5fbc-8293-52f00bd0f47d'::uuid, 'Metatarsophalangeal joints'),
    ('aece6610-a2ae-5ca3-aeff-5df63e3cea34'::uuid, 'Proximal interphalangeal joints'),
    ('db699560-5450-5ef8-8d02-378134c6f3b2'::uuid, 'Distal interphalangeal joints')
  ) AS expected(id, name)
  WHERE NOT EXISTS (
    SELECT 1 FROM "community"."tags" t WHERE t.id = expected.id AND t.name = expected.name
  );
  IF wrong > 0 THEN
    RAISE EXCEPTION 'the taxonomy has moved since 0044 was written: % of 24 are not where expected', wrong;
  END IF;
END $$;--> statement-breakpoint

INSERT INTO "community"."tags" ("id", "name", "facet", "parent_id", "sort_order") VALUES
  ('07df856d-e901-5c9b-9ac0-5d40873ed76e', 'Cervical Spine (Neck) joints', 'structure', '13817ae4-4642-5c85-97c8-8636221345cb', 99),
  ('8183b5a1-9427-5e25-9066-8c6e79e105d5', 'Atlanto-occipital joint', 'structure', '07df856d-e901-5c9b-9ac0-5d40873ed76e', 1),
  ('c623719b-f6f0-5d83-b665-312e2171b336', 'Atlanto-axial joint', 'structure', '07df856d-e901-5c9b-9ac0-5d40873ed76e', 2),
  ('70bf19f2-a3e3-5f9d-92b9-2edd77b3d706', 'Median atlanto-axial joint', 'structure', 'c623719b-f6f0-5d83-b665-312e2171b336', 1),
  ('6309e00d-34ee-560a-98a2-6008631d4510', 'Lateral atlanto-axial joints', 'structure', 'c623719b-f6f0-5d83-b665-312e2171b336', 2),
  ('399b3c9d-ad0f-5db1-b3e2-4c086d12ad5a', 'Intervertebral joints (C2–C7)', 'structure', '07df856d-e901-5c9b-9ac0-5d40873ed76e', 5),
  ('291b8350-3638-5206-a355-8308174b2354', 'Zygapophyseal (facet) joints (C2–C7)', 'structure', '07df856d-e901-5c9b-9ac0-5d40873ed76e', 6),
  ('05ae288b-502c-5b7e-beda-de8673963d6d', 'Uncovertebral joints (C3–C7)', 'structure', '07df856d-e901-5c9b-9ac0-5d40873ed76e', 7),
  ('e9d8932c-fac9-5044-aab1-024722af3c90', 'Upper Limb joints', 'structure', 'a30aa659-e562-5f1e-9272-f418e2987a60', 99),
  ('0ee4bfd1-302f-529e-87b9-5d7e24387cc1', 'Acromioclavicular joint', 'structure', 'e9d8932c-fac9-5044-aab1-024722af3c90', 9),
  ('02960948-dd87-5ec5-9956-eeaa2efc7e12', 'Scapulothoracic articulation', 'structure', 'e9d8932c-fac9-5044-aab1-024722af3c90', 10),
  ('e93cd785-6051-5bae-a66f-4836cdaea788', 'Humeroulnar joint', 'structure', 'e9d8932c-fac9-5044-aab1-024722af3c90', 11),
  ('eea4d217-6d08-50a4-a970-4107c5d7ed3d', 'Humeroradial joint', 'structure', 'e9d8932c-fac9-5044-aab1-024722af3c90', 12),
  ('d1b4887b-0ad8-52d3-8ee3-ca17bc390de3', 'Radiocarpal (wrist) joint', 'structure', 'e9d8932c-fac9-5044-aab1-024722af3c90', 13),
  ('0689d8c4-76ab-5948-bd15-691855b56d9d', 'Midcarpal joint', 'structure', 'e9d8932c-fac9-5044-aab1-024722af3c90', 14),
  ('d833f467-f85d-5dfa-a640-96639dba22af', 'Intermetacarpal joints', 'structure', 'e9d8932c-fac9-5044-aab1-024722af3c90', 15),
  ('cce1cfdb-8f74-55a8-b39f-4d22b16002a4', 'Thumb interphalangeal joint', 'structure', 'e9d8932c-fac9-5044-aab1-024722af3c90', 16),
  ('c01c4b2a-7619-5828-8283-fa0ba4dba99f', 'Thoracic Spine joints', 'structure', '4e086bfa-df22-555f-96ee-97145786b16d', 99),
  ('53e09fcc-7ea4-563c-8681-c9bcbadb6473', 'Intervertebral joints (T1–T12)', 'structure', 'c01c4b2a-7619-5828-8283-fa0ba4dba99f', 18),
  ('a1dee643-bdb3-548c-a853-dd3bfc8fa19f', 'Zygapophyseal (facet) joints', 'structure', 'c01c4b2a-7619-5828-8283-fa0ba4dba99f', 19),
  ('94b4a427-3030-5c39-9d13-07b7023f7536', 'Costovertebral joints', 'structure', 'c4b9e7d1-c7ee-5582-98f0-5b7118bd67d2', 1),
  ('cdf863fd-b8cc-599f-91b2-648d0d8cc21a', 'Costotransverse joints', 'structure', 'c4b9e7d1-c7ee-5582-98f0-5b7118bd67d2', 2),
  ('a35f5c48-aa72-50eb-8cfa-2e850bbd5be7', 'Manubriosternal joint', 'structure', 'c01c4b2a-7619-5828-8283-fa0ba4dba99f', 22),
  ('6a53474a-5726-5f67-aa5f-206bde82c04a', 'Xiphisternal joint', 'structure', 'c01c4b2a-7619-5828-8283-fa0ba4dba99f', 23),
  ('d87527de-1d3f-547c-ae0e-416c354a8ab7', 'Lumbar Spine joints', 'structure', '28685490-4759-5ceb-bf9b-d4d944902e91', 99),
  ('85bdb5cc-6659-53ef-a079-6f20068f1039', 'Intervertebral joints (L1–L5)', 'structure', 'd87527de-1d3f-547c-ae0e-416c354a8ab7', 25),
  ('e3553877-f4b6-5773-994e-d460c5faeb46', 'Zygapophyseal (facet) joints', 'structure', 'd87527de-1d3f-547c-ae0e-416c354a8ab7', 26),
  ('c1f76550-b012-53c6-b03c-cfaea500815e', 'Lumbosacral joint (L5–S1)', 'structure', 'd87527de-1d3f-547c-ae0e-416c354a8ab7', 27),
  ('23ccb935-2225-5da3-96f8-260ee38f0c1e', 'Pelvis and Pelvic Floor joints', 'structure', '3cd4d28b-02c2-5c74-984e-571679500dde', 99),
  ('e0a974a5-9595-5cb1-b818-cb386c1f3bf8', 'Lower Limb joints', 'structure', 'f129ad37-8a49-53ae-92ba-da11417e2950', 99),
  ('c1d5e34b-8725-525e-b360-deea3b0c7c95', 'Tibiofemoral joint', 'structure', 'e0a974a5-9595-5cb1-b818-cb386c1f3bf8', 30),
  ('f6781ab5-7273-591a-bb0f-d8d8993ad997', 'Patellofemoral joint', 'structure', 'e0a974a5-9595-5cb1-b818-cb386c1f3bf8', 31),
  ('813b4cea-91b4-5330-93c2-80b0a56a46fc', 'Talocrural (ankle) joint', 'structure', 'e0a974a5-9595-5cb1-b818-cb386c1f3bf8', 32),
  ('5032697e-abb2-5de4-8b2f-65cf0b12ad22', 'Distal tibiofibular joint', 'structure', 'e0a974a5-9595-5cb1-b818-cb386c1f3bf8', 33),
  ('87038913-f6f5-56c6-837b-da4a8dfcfdb2', 'Talocalcaneonavicular joint', 'structure', 'e0a974a5-9595-5cb1-b818-cb386c1f3bf8', 34),
  ('5ee47fa6-9f52-5f1d-a787-f66e2309bc5f', 'Transverse tarsal (midtarsal) joint', 'structure', 'e0a974a5-9595-5cb1-b818-cb386c1f3bf8', 35),
  ('8a573d58-84ea-5035-86ae-b2e38ae58fad', 'Intermetatarsal joints', 'structure', 'e0a974a5-9595-5cb1-b818-cb386c1f3bf8', 36)
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

-- ligaments → Atlanto-occipital joint
UPDATE "community"."tags" SET "parent_id" = '8183b5a1-9427-5e25-9066-8c6e79e105d5' WHERE "id" = 'ce39691c-d93c-5355-ba73-f098b9e43b34';--> statement-breakpoint
-- ligaments → Atlanto-axial joint
UPDATE "community"."tags" SET "parent_id" = 'c623719b-f6f0-5d83-b665-312e2171b336' WHERE "id" = '2feb9216-eec2-5f38-bf01-39781042e219';--> statement-breakpoint
-- ligaments → Atlanto-axial joint
UPDATE "community"."tags" SET "parent_id" = 'c623719b-f6f0-5d83-b665-312e2171b336' WHERE "id" = '509a630f-e32b-51a8-803d-72a7505e81ff';--> statement-breakpoint
-- Sternoclavicular joint → Upper Limb joints > Shoulder girdle
UPDATE "community"."tags" SET "parent_id" = 'e9d8932c-fac9-5044-aab1-024722af3c90' WHERE "id" = '37b8b916-b61a-5856-bcb5-62449cff08f0';--> statement-breakpoint
-- ligaments → Acromioclavicular joint
UPDATE "community"."tags" SET "parent_id" = '0ee4bfd1-302f-529e-87b9-5d7e24387cc1' WHERE "id" = 'b08ad3f1-d23b-50bd-abed-1df5adb88747';--> statement-breakpoint
-- Glenohumeral joint → Upper Limb joints > Shoulder
UPDATE "community"."tags" SET "parent_id" = 'e9d8932c-fac9-5044-aab1-024722af3c90' WHERE "id" = 'a7995fce-c1c4-542e-8e2a-42f216c6f0e9';--> statement-breakpoint
-- Glenoid labrum & capsulolabral complexes → Upper Limb joints > Shoulder
UPDATE "community"."tags" SET "parent_id" = 'e9d8932c-fac9-5044-aab1-024722af3c90' WHERE "id" = 'ab88e6e6-03da-51a7-9aaa-b7427a38cab3';--> statement-breakpoint
-- Elbow joint → Upper Limb joints > Elbow
UPDATE "community"."tags" SET "parent_id" = 'e9d8932c-fac9-5044-aab1-024722af3c90' WHERE "id" = '0fed32d7-30f6-5f6c-877b-631a878411fd';--> statement-breakpoint
-- Proximal radioulnar joint → Upper Limb joints > Elbow
UPDATE "community"."tags" SET "parent_id" = 'e9d8932c-fac9-5044-aab1-024722af3c90' WHERE "id" = '478beab6-2f99-5534-bca6-91654eca3bc2';--> statement-breakpoint
-- Distal radioulnar joint & TFCC → Upper Limb joints > Forearm and wrist
UPDATE "community"."tags" SET "parent_id" = 'e9d8932c-fac9-5044-aab1-024722af3c90' WHERE "id" = '341bd056-74dd-5ecc-a1ec-21892b98c109';--> statement-breakpoint
-- ligaments → Radiocarpal (wrist) joint
UPDATE "community"."tags" SET "parent_id" = 'd1b4887b-0ad8-52d3-8ee3-ca17bc390de3' WHERE "id" = '4ee8d2a7-7373-5201-beff-35d2f4024d55';--> statement-breakpoint
-- ligaments → Midcarpal joint
UPDATE "community"."tags" SET "parent_id" = '0689d8c4-76ab-5948-bd15-691855b56d9d' WHERE "id" = 'c997b084-e8f0-52a3-879c-fad8c92ef2e9';--> statement-breakpoint
-- Carpometacarpal joints → Upper Limb joints > Hand
UPDATE "community"."tags" SET "parent_id" = 'e9d8932c-fac9-5044-aab1-024722af3c90' WHERE "id" = 'bae90ab1-2f8e-5bbf-a48a-979253d4e2c1';--> statement-breakpoint
-- Finger metacarpophalangeal joints → Upper Limb joints > Hand
UPDATE "community"."tags" SET "parent_id" = 'e9d8932c-fac9-5044-aab1-024722af3c90' WHERE "id" = '65522105-c1e9-55c1-8824-30c3287ca5bc';--> statement-breakpoint
-- Proximal interphalangeal joints → Upper Limb joints > Hand
UPDATE "community"."tags" SET "parent_id" = 'e9d8932c-fac9-5044-aab1-024722af3c90' WHERE "id" = 'ce45cae2-7838-5557-82cd-cf356c4d8d60';--> statement-breakpoint
-- Distal interphalangeal joints → Upper Limb joints > Hand
UPDATE "community"."tags" SET "parent_id" = 'e9d8932c-fac9-5044-aab1-024722af3c90' WHERE "id" = '2629f26d-4be4-59dc-993b-a2b6ae5d7729';--> statement-breakpoint
-- Thumb — first carpometacarpal joint → Upper Limb joints > Hand
UPDATE "community"."tags" SET "parent_id" = 'e9d8932c-fac9-5044-aab1-024722af3c90' WHERE "id" = '64295ccc-57c8-527c-a8a1-05734f26fdd3';--> statement-breakpoint
-- Thumb — metacarpophalangeal joint → Upper Limb joints > Hand
UPDATE "community"."tags" SET "parent_id" = 'e9d8932c-fac9-5044-aab1-024722af3c90' WHERE "id" = '363fc1df-ae1b-560b-a297-f5f7a4b13acc';--> statement-breakpoint
-- Costovertebral & costotransverse joints → Thoracic Spine joints
UPDATE "community"."tags" SET "parent_id" = 'c01c4b2a-7619-5828-8283-fa0ba4dba99f' WHERE "id" = 'c4b9e7d1-c7ee-5582-98f0-5b7118bd67d2';--> statement-breakpoint
-- ligaments → Lumbosacral joint (L5–S1)
UPDATE "community"."tags" SET "parent_id" = 'c1f76550-b012-53c6-b03c-cfaea500815e' WHERE "id" = '41c7ced5-a88f-5040-a8d5-0649710c8c5a';--> statement-breakpoint
-- Sacroiliac joint → Pelvis and Pelvic Floor joints
UPDATE "community"."tags" SET "parent_id" = '23ccb935-2225-5da3-96f8-260ee38f0c1e' WHERE "id" = 'f7e199b3-294c-5c9e-b519-8e86e8ecef80';--> statement-breakpoint
-- ligaments → Sacroiliac joint
UPDATE "community"."tags" SET "parent_id" = 'f7e199b3-294c-5c9e-b519-8e86e8ecef80' WHERE "id" = 'b075ddd5-d6f9-58e3-90b6-3b8dcd03e4eb';--> statement-breakpoint
-- Pubic symphysis → Pelvis and Pelvic Floor joints
UPDATE "community"."tags" SET "parent_id" = '23ccb935-2225-5da3-96f8-260ee38f0c1e' WHERE "id" = '33c4095b-678b-5664-8e38-7fe58476d410';--> statement-breakpoint
-- ligaments → Pubic symphysis
UPDATE "community"."tags" SET "parent_id" = '33c4095b-678b-5664-8e38-7fe58476d410' WHERE "id" = 'b7d6ea9b-35be-5da7-a77f-ae00b06aec09';--> statement-breakpoint
-- Sacrococcygeal joint → Pelvis and Pelvic Floor joints
UPDATE "community"."tags" SET "parent_id" = '23ccb935-2225-5da3-96f8-260ee38f0c1e' WHERE "id" = 'edc429c9-496c-5fcf-9145-1c93c9f65b58';--> statement-breakpoint
-- ligaments → Sacrococcygeal joint
UPDATE "community"."tags" SET "parent_id" = 'edc429c9-496c-5fcf-9145-1c93c9f65b58' WHERE "id" = '4c55f0b8-afb0-5d4f-b71a-cc6e3ad83274';--> statement-breakpoint
-- Hip joint → Lower Limb joints > Hip
UPDATE "community"."tags" SET "parent_id" = 'e0a974a5-9595-5cb1-b818-cb386c1f3bf8' WHERE "id" = '6a449cdf-a4d3-5c8d-8ca7-f2bd1e1c2026';--> statement-breakpoint
-- ligaments → Tibiofemoral joint
UPDATE "community"."tags" SET "parent_id" = 'c1d5e34b-8725-525e-b360-deea3b0c7c95' WHERE "id" = '2d066f6c-4229-5c7a-a72c-7922a9cee51a';--> statement-breakpoint
-- ligaments → Tibiofemoral joint
UPDATE "community"."tags" SET "parent_id" = 'c1d5e34b-8725-525e-b360-deea3b0c7c95' WHERE "id" = '2bb73fc6-2ad1-54c0-bbc5-73ced5d56bc2';--> statement-breakpoint
-- ligaments → Tibiofemoral joint
UPDATE "community"."tags" SET "parent_id" = 'c1d5e34b-8725-525e-b360-deea3b0c7c95' WHERE "id" = '8c60bdda-dbd2-5428-ad03-38e823404199';--> statement-breakpoint
-- ligaments → Patellofemoral joint
UPDATE "community"."tags" SET "parent_id" = 'f6781ab5-7273-591a-bb0f-d8d8993ad997' WHERE "id" = '2b3763c5-5106-5dc3-b103-6257412350f6';--> statement-breakpoint
-- Superior tibiofibular joint → Lower Limb joints > Knee
UPDATE "community"."tags" SET "parent_id" = 'e0a974a5-9595-5cb1-b818-cb386c1f3bf8' WHERE "id" = 'c4c23d88-385a-513e-a82d-8922f99c9000';--> statement-breakpoint
-- ligaments → Talocrural (ankle) joint
UPDATE "community"."tags" SET "parent_id" = '813b4cea-91b4-5330-93c2-80b0a56a46fc' WHERE "id" = '8fd4e816-0648-5238-9842-fd880ffa649f';--> statement-breakpoint
-- ligaments → Talocrural (ankle) joint
UPDATE "community"."tags" SET "parent_id" = '813b4cea-91b4-5330-93c2-80b0a56a46fc' WHERE "id" = '32872d58-ae9e-5384-b868-517a9f868a49';--> statement-breakpoint
-- ligaments → Distal tibiofibular joint
UPDATE "community"."tags" SET "parent_id" = '5032697e-abb2-5de4-8b2f-65cf0b12ad22' WHERE "id" = '7bc787a7-0f2e-5f14-854b-d97b2f6fce30';--> statement-breakpoint
-- Subtalar joint → Lower Limb joints > Foot
UPDATE "community"."tags" SET "parent_id" = 'e0a974a5-9595-5cb1-b818-cb386c1f3bf8' WHERE "id" = 'd16e1b85-41c0-5b00-afe5-0eace841ceb1';--> statement-breakpoint
-- ligaments → Talocalcaneonavicular joint
UPDATE "community"."tags" SET "parent_id" = '87038913-f6f5-56c6-837b-da4a8dfcfdb2' WHERE "id" = '637e0090-bc4a-5ee4-9e05-6023a9376a5f';--> statement-breakpoint
-- Calcaneocuboid joint & bifurcate ligament → Lower Limb joints > Foot
UPDATE "community"."tags" SET "parent_id" = 'e0a974a5-9595-5cb1-b818-cb386c1f3bf8' WHERE "id" = '5eb22608-98f8-595d-b371-1c41f21a28b6';--> statement-breakpoint
-- ligaments → Transverse tarsal (midtarsal) joint
UPDATE "community"."tags" SET "parent_id" = '5ee47fa6-9f52-5f1d-a787-f66e2309bc5f' WHERE "id" = 'e71730a0-aea0-52e8-a1d3-ca168d59b1ac';--> statement-breakpoint
-- Tarsometatarsal (Lisfranc) joints → Lower Limb joints > Foot
UPDATE "community"."tags" SET "parent_id" = 'e0a974a5-9595-5cb1-b818-cb386c1f3bf8' WHERE "id" = '5143ec39-561a-5b7a-8f77-ab5cb8de5de5';--> statement-breakpoint
-- Metatarsophalangeal joints → Lower Limb joints > Foot
UPDATE "community"."tags" SET "parent_id" = 'e0a974a5-9595-5cb1-b818-cb386c1f3bf8' WHERE "id" = '930994dc-8c0a-5fbc-8293-52f00bd0f47d';--> statement-breakpoint
-- ligaments → Metatarsophalangeal joints
UPDATE "community"."tags" SET "parent_id" = '930994dc-8c0a-5fbc-8293-52f00bd0f47d' WHERE "id" = 'c676f4bc-2354-5cb7-b04a-d39bbeb3a929';--> statement-breakpoint
-- Proximal interphalangeal joints → Lower Limb joints > Foot
UPDATE "community"."tags" SET "parent_id" = 'e0a974a5-9595-5cb1-b818-cb386c1f3bf8' WHERE "id" = 'aece6610-a2ae-5ca3-aeff-5df63e3cea34';--> statement-breakpoint
-- Distal interphalangeal joints → Lower Limb joints > Foot
UPDATE "community"."tags" SET "parent_id" = 'e0a974a5-9595-5cb1-b818-cb386c1f3bf8' WHERE "id" = 'db699560-5450-5ef8-8d02-378134c6f3b2';--> statement-breakpoint
