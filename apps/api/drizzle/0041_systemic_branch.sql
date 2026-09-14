-- The systemic branch: a seventh root that is not a body region (Andrew, 2026-09-10/14).
--
-- *"Systemic diseases are not joint specific, so they'd be better placed outside of the body
-- region."* Rheumatoid arthritis was filed under the neck, the thoracic spine and the lumbar
-- spine at once, each copy matching the same twenty papers, because the taxonomy had exactly
-- one shape available and everything had to hang under a body region.
--
-- So there is now a seventh root beside the six regions. It is deliberately not pretending to
-- be anatomy: nothing in it belongs to a body part, which is the entire point.
--
--   Systemic and Inflammatory Conditions
--   ├── Inflammatory arthritis                    RA, psoriatic, JIA, gout, CPPD, septic…
--   ├── Spondyloarthritis                         ankylosing spondylitis, axial/peripheral SpA…
--   ├── Connective tissue and autoimmune disease  SLE, systemic sclerosis, the vasculitides…
--   └── Metabolic and bone-density disease        osteoporosis, osteomalacia, Paget…
--
-- **This is the load that Part 2 was waiting for.** Of Andrew's 349 preferred terms only 90
-- named a tag, and the largest block of the rest was systemic — 66 terms across four sections
-- with nowhere to live, so their synonyms could not be loaded either. 47 of them are created
-- here with their synonyms attached.
--
-- Four tags **move** rather than being recreated, so their ids, their hand-tuned synonyms and
-- anything already tagged with them survive: the cervical copies of rheumatoid arthritis,
-- psoriatic arthritis, polymyalgia rheumatica and ankylosing spondylitis. The lumbar and
-- thoracic copies retire, and the three now-empty `* inflammatory conditions` groups with them.
--
-- **What was left out, and why.** Andrew's rule is that a systemic disease is not joint
-- specific, which also says what does *not* belong here:
--
--   * **Findings, not diseases.** Section B also lists arthralgia, synovitis, tenosynovitis,
--     bursitis, joint effusion, haemarthrosis, contracture, instability, stiffness,
--     dislocation and subluxation. Every one of those happens *at a site*, and the taxonomy
--     already carries them per site — ischial bursitis, iliopsoas bursitis, subacromial
--     bursitis. A bare `Bursitis` at the root would match all of them and recreate exactly
--     the cross-region duplication migrations 0033 to 0038 have been removing.
--   * **`Arthritis` and `Arthropathy` themselves**, for the same reason as 0032's generic
--     names: a single common word matched in a title is not a claim about anything.
--   * **Lumbar and thoracic spondylosis**, which name their region and therefore belong to it.
--   * **Osteonecrosis and osteochondrosis**, which are processes at a site — avascular
--     necrosis is of the femoral head or the lunate, and the site is the clinically load-bearing
--     part.
--   * **Bone infection and bone tumours** (Part 2 sections F and G), which are likewise of a
--     bone. The pelvis already holds sacral osteomyelitis and sacral tumour.
--
-- **Synonyms of four characters or less are held back**, following the existing loader. It
-- matters more here than anywhere else: `AS`, `DM`, `PM`, `OI`, `SLE` and `PsA` are an ordinary
-- English word, diabetes mellitus, an afternoon, and three things a title might mean by
-- accident. The admin tag screen dry-runs a synonym against the real corpus, which is where
-- those belong, one at a time.
--
-- Ids are uuid5 over the tag's path, the scheme migration 0030 established, so every
-- environment lands on the same id for the same term.
--
-- Run a reclassify after deploying.

INSERT INTO "community"."tags" ("id", "name", "facet", "parent_id", "synonyms", "sort_order") VALUES
  ('b9288f0a-225a-576a-a839-367ec3cc7253', 'Systemic and Inflammatory Conditions', 'region', NULL, '{}', 7),
  ('9ff2c252-5ce6-57e3-98fa-48ec24075698', 'Inflammatory arthritis', 'pathology', 'b9288f0a-225a-576a-a839-367ec3cc7253', '{}', 1),
  ('7d28d073-e995-5f8d-9d23-c146fdbf5ac1', 'Juvenile idiopathic arthritis', 'pathology', '9ff2c252-5ce6-57e3-98fa-48ec24075698', '{"juvenile arthritis","juvenile rheumatoid arthritis"}', 1),
  ('ea341a20-481b-5277-a3b2-9836658e8f7e', 'Gout', 'pathology', '9ff2c252-5ce6-57e3-98fa-48ec24075698', '{"gouty arthritis","gouty arthropathy"}', 2),
  ('218a4adf-6d9f-5a83-8599-7fb4af68be54', 'Calcium pyrophosphate deposition disease', 'pathology', '9ff2c252-5ce6-57e3-98fa-48ec24075698', '{"cppd disease","calcium pyrophosphate crystal deposition disease","pseudogout"}', 3),
  ('15323f0a-3593-587e-91c0-3a22ca61336b', 'Reactive arthritis', 'pathology', '9ff2c252-5ce6-57e3-98fa-48ec24075698', '{"reiter syndrome","reiter''s disease","post-infectious arthritis"}', 4),
  ('1c103e41-d218-5a4a-8b81-92284bffeb52', 'Septic arthritis', 'pathology', '9ff2c252-5ce6-57e3-98fa-48ec24075698', '{"infectious arthritis","pyogenic arthritis","bacterial arthritis"}', 5),
  ('c38f90a2-5ea6-5a09-9a51-3094c2e086a3', 'Viral arthritis', 'pathology', '9ff2c252-5ce6-57e3-98fa-48ec24075698', '{"viral arthropathy","viral-associated arthritis"}', 6),
  ('dd27cb43-cb4d-55c5-953e-58a2dc120c44', 'Enteropathic arthritis', 'pathology', '9ff2c252-5ce6-57e3-98fa-48ec24075698', '{"enteropathic arthropathy","ibd-associated arthritis"}', 7),
  ('f652fe73-8f88-54a7-8bf4-5d5df9f69e32', 'Undifferentiated arthritis', 'pathology', '9ff2c252-5ce6-57e3-98fa-48ec24075698', '{"undifferentiated inflammatory arthritis"}', 8),
  ('1b1de6a7-7b40-5634-97bf-0af704f182f5', 'Palindromic rheumatism', 'pathology', '9ff2c252-5ce6-57e3-98fa-48ec24075698', '{"palindromic arthritis","palindromic arthropathy"}', 9),
  ('ec3cdfdc-974c-5b9e-b759-faff99c3335e', 'Polyarthritis', 'pathology', '9ff2c252-5ce6-57e3-98fa-48ec24075698', '{"multiple-joint arthritis"}', 10),
  ('afa861ea-3a87-59ed-a1d4-e493b336d874', 'Monoarthritis', 'pathology', '9ff2c252-5ce6-57e3-98fa-48ec24075698', '{"single-joint arthritis"}', 11),
  ('74e51332-7d55-5d90-82df-e8de953cf33b', 'Oligoarthritis', 'pathology', '9ff2c252-5ce6-57e3-98fa-48ec24075698', '{"pauciarthritis"}', 12),
  ('65411f3b-488b-5f78-97cd-5bac742fbdf8', 'Spondyloarthritis', 'pathology', 'b9288f0a-225a-576a-a839-367ec3cc7253', '{}', 2),
  ('3b705d77-4e21-529e-9be1-853962211112', 'Axial spondyloarthritis', 'pathology', '65411f3b-488b-5f78-97cd-5bac742fbdf8', '{"axspa","axial spa"}', 1),
  ('bffb770f-98a5-56e1-8304-9375759621ca', 'Radiographic axial spondyloarthritis', 'pathology', '65411f3b-488b-5f78-97cd-5bac742fbdf8', '{"r-axspa"}', 2),
  ('28388835-34b3-5d61-ba51-e22355ffb4f5', 'Non-radiographic axial spondyloarthritis', 'pathology', '65411f3b-488b-5f78-97cd-5bac742fbdf8', '{"nr-axspa"}', 3),
  ('d6dd89c9-9a26-5cb6-8cf8-be4f0099c1b2', 'Peripheral spondyloarthritis', 'pathology', '65411f3b-488b-5f78-97cd-5bac742fbdf8', '{"peripheral spa"}', 4),
  ('7a13bfe5-99c7-5d1e-8a91-02e9ac072a00', 'Psoriatic spondyloarthritis', 'pathology', '65411f3b-488b-5f78-97cd-5bac742fbdf8', '{"psoriatic spa"}', 5),
  ('bfd88f62-d1df-5a41-b2c7-8ef7dfe1c46d', 'Reactive spondyloarthritis', 'pathology', '65411f3b-488b-5f78-97cd-5bac742fbdf8', '{"reactive spa"}', 6),
  ('8b56bef6-7992-526c-907e-32f321ba1108', 'Spondylitis', 'pathology', '65411f3b-488b-5f78-97cd-5bac742fbdf8', '{"vertebral inflammation","spinal inflammation"}', 7),
  ('ae5bd169-fc04-5d7f-b01e-360f8f6d0ebf', 'Connective tissue and autoimmune disease', 'pathology', 'b9288f0a-225a-576a-a839-367ec3cc7253', '{}', 3),
  ('c0d053a3-c7a7-5ec0-bfc5-d19a2e792872', 'Systemic lupus erythematosus', 'pathology', 'ae5bd169-fc04-5d7f-b01e-360f8f6d0ebf', '{"lupus","lupus erythematosus"}', 1),
  ('544f21b8-02bb-5023-8655-799e8a9e7c94', 'Systemic sclerosis', 'pathology', 'ae5bd169-fc04-5d7f-b01e-360f8f6d0ebf', '{"scleroderma","systemic scleroderma"}', 2),
  ('0240b528-3cbf-5eb0-80f0-735549fca0e4', 'Sjögren syndrome', 'pathology', 'ae5bd169-fc04-5d7f-b01e-360f8f6d0ebf', '{"sjögren''s syndrome","sjögren disease"}', 3),
  ('cf965cde-34df-5be9-8cda-c33692a45ecd', 'Mixed connective-tissue disease', 'pathology', 'ae5bd169-fc04-5d7f-b01e-360f8f6d0ebf', '{}', 4),
  ('e3f55528-6405-5e9b-8add-5d1110fdc21b', 'Dermatomyositis', 'pathology', 'ae5bd169-fc04-5d7f-b01e-360f8f6d0ebf', '{"inflammatory myopathy with cutaneous involvement"}', 5),
  ('63ef562f-a802-5bd0-b1c8-04913af1e570', 'Polymyositis', 'pathology', 'ae5bd169-fc04-5d7f-b01e-360f8f6d0ebf', '{"inflammatory myopathy"}', 6),
  ('d2f19639-fe9b-5234-a30d-6040d087eb38', 'Immune-mediated necrotising myopathy', 'pathology', 'ae5bd169-fc04-5d7f-b01e-360f8f6d0ebf', '{"necrotising autoimmune myopathy"}', 7),
  ('d392e3fd-71e5-531c-ba67-3489657e3b9b', 'Adult-onset Still disease', 'pathology', 'ae5bd169-fc04-5d7f-b01e-360f8f6d0ebf', '{"adult still disease"}', 8),
  ('0bbb57ed-a4e7-5d6a-a35f-308d4d19c939', 'Behçet disease', 'pathology', 'ae5bd169-fc04-5d7f-b01e-360f8f6d0ebf', '{"behçet syndrome","behçet''s disease"}', 9),
  ('36279a3f-1598-591e-93c9-50a61813daff', 'Antiphospholipid syndrome', 'pathology', 'ae5bd169-fc04-5d7f-b01e-360f8f6d0ebf', '{"hughes syndrome"}', 10),
  ('584fc9d0-a576-5b8e-a9fd-2199f4a166b9', 'Systemic vasculitis', 'pathology', 'ae5bd169-fc04-5d7f-b01e-360f8f6d0ebf', '{"vasculitic disease","systemic vasculitis"}', 11),
  ('ac55eedf-907e-5251-a74b-49f787afcd30', 'Giant cell arteritis', 'pathology', 'ae5bd169-fc04-5d7f-b01e-360f8f6d0ebf', '{"temporal arteritis"}', 12),
  ('151840dc-82e1-5dfa-a68f-6fb0b0579d7a', 'Takayasu arteritis', 'pathology', 'ae5bd169-fc04-5d7f-b01e-360f8f6d0ebf', '{"takayasu disease","aortic arch syndrome"}', 13),
  ('34f7c98b-0e6e-53ed-b0a0-86ed8f44d97e', 'Granulomatosis with polyangiitis', 'pathology', 'ae5bd169-fc04-5d7f-b01e-360f8f6d0ebf', '{"wegener granulomatosis"}', 14),
  ('56bee29a-22d6-5118-9579-a44b838e9324', 'Microscopic polyangiitis', 'pathology', 'ae5bd169-fc04-5d7f-b01e-360f8f6d0ebf', '{}', 15),
  ('359549ca-0afd-529d-a82a-0e51ea21b3c2', 'Eosinophilic granulomatosis with polyangiitis', 'pathology', 'ae5bd169-fc04-5d7f-b01e-360f8f6d0ebf', '{"churg-strauss syndrome"}', 16),
  ('c0b540f2-6925-52e4-8b8f-5b8b3bf6ba33', 'Metabolic and bone-density disease', 'pathology', 'b9288f0a-225a-576a-a839-367ec3cc7253', '{}', 4),
  ('286aca50-17bb-5934-9242-528c579b2d01', 'Osteoporosis', 'pathology', 'c0b540f2-6925-52e4-8b8f-5b8b3bf6ba33', '{"bone loss","porous bone disease"}', 1),
  ('38b2b231-a705-529e-903e-b07a080487f9', 'Osteopenia', 'pathology', 'c0b540f2-6925-52e4-8b8f-5b8b3bf6ba33', '{"low bone mineral density","reduced bmd"}', 2),
  ('097af428-b8e3-5ce3-a2af-41c50a29fd7f', 'Osteomalacia', 'pathology', 'c0b540f2-6925-52e4-8b8f-5b8b3bf6ba33', '{"adult rickets","defective bone mineralisation"}', 3),
  ('da3e1630-0cf0-5902-a393-01185f8d135c', 'Rickets', 'pathology', 'c0b540f2-6925-52e4-8b8f-5b8b3bf6ba33', '{"childhood osteomalacia","nutritional rickets"}', 4),
  ('413be46c-6a7e-5334-8fe8-8dca3827d442', 'Osteogenesis imperfecta', 'pathology', 'c0b540f2-6925-52e4-8b8f-5b8b3bf6ba33', '{"brittle bone disease"}', 5),
  ('3684433c-414d-5517-98ab-579205e39efc', 'Paget disease of bone', 'pathology', 'c0b540f2-6925-52e4-8b8f-5b8b3bf6ba33', '{"paget''s disease of bone","osteitis deformans"}', 6),
  ('3413d0db-2aa7-5f72-9b81-c5155aa5b7d6', 'Osteopetrosis', 'pathology', 'c0b540f2-6925-52e4-8b8f-5b8b3bf6ba33', '{"marble bone disease"}', 7),
  ('fd70cd1a-1954-58cf-8185-9af1e7b5452e', 'Fibrous dysplasia', 'pathology', 'c0b540f2-6925-52e4-8b8f-5b8b3bf6ba33', '{"fibro-osseous dysplasia"}', 8),
  ('1372ea9a-04e4-5cec-9e57-b2a03fbe3603', 'Osteitis fibrosa cystica', 'pathology', 'c0b540f2-6925-52e4-8b8f-5b8b3bf6ba33', '{"brown tumour disease","osteodystrophia fibrosa"}', 9),
  ('26c4b6c5-1699-52b5-ad3d-475432bbb2bc', 'Renal osteodystrophy', 'pathology', 'c0b540f2-6925-52e4-8b8f-5b8b3bf6ba33', '{"renal bone disease"}', 10),
  ('a1a490ea-929b-54de-8cad-43107c27c879', 'Hyperparathyroid bone disease', 'pathology', 'c0b540f2-6925-52e4-8b8f-5b8b3bf6ba33', '{"osteitis fibrosa","hyperparathyroid osteopathy"}', 11),
  ('8faaf0e3-1ef1-5dec-ad71-3cf14421dd7f', 'Hyperostosis', 'pathology', 'c0b540f2-6925-52e4-8b8f-5b8b3bf6ba33', '{"excessive bone formation"}', 12)
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

-- Rheumatoid arthritis
UPDATE "community"."tags" SET "parent_id" = '9ff2c252-5ce6-57e3-98fa-48ec24075698', "sort_order" = 0 WHERE "id" = 'a8048cc2-9f0e-5431-b133-2525a17bbcb9';--> statement-breakpoint

-- Psoriatic arthritis
UPDATE "community"."tags" SET "parent_id" = '9ff2c252-5ce6-57e3-98fa-48ec24075698', "sort_order" = 0 WHERE "id" = '612276ed-02d5-5554-af51-990b6edad8a1';--> statement-breakpoint

-- Polymyalgia rheumatica
UPDATE "community"."tags" SET "parent_id" = '9ff2c252-5ce6-57e3-98fa-48ec24075698', "sort_order" = 0 WHERE "id" = '5430cfe4-9bea-57f3-a968-e63a02ecb893';--> statement-breakpoint

-- Ankylosing spondylitis
UPDATE "community"."tags" SET "parent_id" = '65411f3b-488b-5f78-97cd-5bac742fbdf8', "sort_order" = 0 WHERE "id" = '8b9aafa4-e0f9-59f4-85b4-cd54b8fb8f90';--> statement-breakpoint

UPDATE "community"."tags" SET "retired_at" = now() WHERE "id" IN (
  'e5e066fb-754a-54ad-8760-739e7a3b5983',  -- Rheumatoid arthritis (lumbar copy)
  '7e60af28-a28e-5eef-94a5-9650f41a06b9',  -- Rheumatoid arthritis (thoracic copy)
  '8e7beea1-4957-5ea0-a923-8a3e8fe53804',  -- Ankylosing spondylitis (lumbar copy)
  '697f0bcf-0710-5fbf-be76-de2e1d50d56c',  -- Ankylosing spondylitis (thoracic copy)
  'e88c82d5-4c5c-5e7e-b192-c7a5c9b5f0a1',  -- Psoriatic arthritis (lumbar copy)
  'e8c6c1b9-0f5e-5f00-bb55-d96a0109c931',  -- Psoriatic arthritis (thoracic copy)
  'ffe47b6a-1741-587e-a3e3-792433392a5d',  -- Cervical inflammatory conditions (now empty)
  'c8e6500d-aa8b-5810-b3c4-02e35c69d389',  -- Lumbar inflammatory conditions (now empty)
  '3839fc41-0418-56a8-9ce4-89f0dc4b28a0'   -- Thoracic inflammatory conditions (now empty)
);--> statement-breakpoint
