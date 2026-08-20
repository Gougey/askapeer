# Body parts, conditions and synonyms

<style>
details.tree { border-left: 2px solid var(--border, #ddd); margin: .35rem 0 .35rem .1rem; padding-left: .9rem; }
details.tree > summary { cursor: pointer; padding: .18rem 0; list-style-position: outside; }
details.tree > summary::marker { color: var(--muted, #888); }
details.tree[open] > summary { font-weight: 600; }
details.tree .count { color: var(--muted, #777); font-weight: 400; font-size: .88em; }
details.tree .ok { color: var(--muted, #777); font-weight: 400; font-size: .82em; }
details.tree .warn { color: #b3541e; font-weight: 600; font-size: .82em; }
@media (prefers-color-scheme: dark) { details.tree .warn { color: #ff9f5a; } }
details.lvl1 > summary { font-size: 1.12em; }
.treebar { margin: 1rem 0; display: flex; gap: .5rem; }
.treebar button { font: inherit; font-size: .85em; padding: .3rem .7rem; cursor: pointer;
  border: 1px solid var(--border, #ccc); background: var(--card-bg, #fff); color: inherit; border-radius: 6px; }
</style>

**Source:** `docs/Body Part, Conditions, and Synonym List.pdf` — supplied by Andrew Renshaw, August 2026. **This file is a faithful re-formatting of that PDF**, extracted programmatically rather than retyped. Nothing has been added, removed or clinically re-worded. Every section is collapsed by default so the shape is readable at a glance — click any heading to open it.

> **Status: reference material, not yet a decision.** Nothing here has been mapped to the live tag taxonomy or loaded into the database.

<div class="treebar">
<button type="button" onclick="document.querySelectorAll('details.tree').forEach(d=>d.open=true)">Expand all</button>
<button type="button" onclick="document.querySelectorAll('details.tree').forEach(d=>d.open=false)">Collapse all</button>
</div>

## Structure health

Every branch of Part 1, worst first. **The flag is about the *shape* of the list, not the clinical content** — a branch is only as loadable as its weakest column here, because the taxonomy requires each term to sit under a named parent and forbids two siblings sharing a name.

| Branch | Terms | Groups | Loose terms | Duplicate names | |
|---|---:|---:|---:|---:|---|
| Upper limb → Ligaments | 140 | 0 | 140 | 28 | **⚠** no sub-grouping · 28 duplicate term names |
| Lower limb → Ligaments | 180 | 3 | 76 | 36 | **⚠** 76 loose · 36 duplicate term names |
| Lumbar spine → Ligaments | 19 | 0 | 19 | 4 | **⚠** no sub-grouping · 4 duplicate term names |
| Pelvis, hip and pelvic floor → Muscles | 281 | 40 | 0 | 11 | **⚠** 2 duplicate term names · 9 duplicate group names |
| Thoracic spine → Ligaments | 14 | 0 | 14 | 0 | **⚠** no sub-grouping |
| Cervical spine → Ligaments | 28 | 4 | 10 | 0 | **⚠** 10 loose |
| Upper limb → Muscles | 49 | 14 | 0 | 2 | **⚠** 2 duplicate group names |
| Upper limb → Conditions | 78 | 15 | 0 | 1 | **⚠** 1 duplicate group names |
| Cervical spine → Muscles | 35 | 8 | 0 | 0 | ✓ |
| Cervical spine → Conditions | 59 | 11 | 0 | 0 | ✓ |
| Thoracic spine → Muscles | 22 | 4 | 0 | 0 | ✓ |
| Thoracic spine → Conditions | 29 | 8 | 0 | 0 | ✓ |
| Lumbar spine → Muscles | 15 | 3 | 0 | 0 | ✓ |
| Lumbar spine → Conditions | 41 | 11 | 0 | 0 | ✓ |
| Lower limb → Muscles | 51 | 16 | 0 | 0 | ✓ |
| Lower limb → Conditions | 102 | 16 | 0 | 0 | ✓ |

Read that as three tiers:

- **Muscles and conditions** — every term sits in a named group and no two terms clash under the same parent. These already match the live taxonomy leaf for leaf and need no further input. The only blemish is in the upper limb, where three group names repeat (*Superficial*, *Deep*, *Nerve* are each used twice, for the flexor and extensor compartments); qualifying those names is a one-line fix, not a clinical question.
- **Ligaments are the weak spot.** 249 of the 309 ligaments have no group heading at all — the upper limb is a single flat run of 140 — and 68 names repeat *inside* that flat run, because the source walks joint by joint and some ligaments serve two joints. Expand *Upper limb → Ligaments* below and the problem is immediately visible. As it stands this branch cannot be loaded: sibling names must be unique.
- **The pelvis is organised on a different plan** from every other region — bone by bone, not muscles/ligaments/conditions — with 40 groups, nine repeated group names (*Common associated conditions* appears six times), one heading that is only the tail of a wrapped line, and two that are notes to us rather than clinical terms.

---

## Part 1 — Anatomy and conditions by region

<details class="tree lvl1">
<summary>Cervical spine <span class="count">— 122 terms, 3 branches</span></summary>

<details class="tree">
<summary>Muscles <span class="count">— 35 terms, 8 groups</span> <span class="ok">✓ structured</span></summary>

<details class="tree">
<summary>Superficial <span class="count">— 3</span></summary>

- Platysma
- Sternocleidomastoid
- Trapezius (upper fibres)

</details>
<details class="tree">
<summary>Hyoid Muscles <span class="count">— 0</span></summary>


</details>
<details class="tree">
<summary>Suprahyoid <span class="count">— 4</span></summary>

- Digastric
- Mylohyoid
- Geniohyoid
- Stylohyoid

</details>
<details class="tree">
<summary>Infrahyoid <span class="count">— 4</span></summary>

- Sternohyoid
- Sternothyroid
- Thyrohyoid
- Omohyoid

</details>
<details class="tree">
<summary>Deep Neck Flexors <span class="count">— 4</span></summary>

- Longus colli
- Longus capitis
- Rectus capitis anterior
- Rectus capitis lateralis

</details>
<details class="tree">
<summary>Scalenes <span class="count">— 4</span></summary>

- Anterior scalene
- Middle scalene
- Posterior scalene
- Scalenus minimus (variable)

</details>
<details class="tree">
<summary>Suboccipital Muscles <span class="count">— 4</span></summary>

- Rectus capitis posterior major
- Rectus capitis posterior minor
- Obliquus capitis superior
- Obliquus capitis inferior

</details>
<details class="tree">
<summary>Posterior Cervical Muscles <span class="count">— 12</span></summary>

- Splenius capitis
- Splenius cervicis
- Semispinalis capitis
- Semispinalis cervicis
- Longissimus capitis
- Longissimus cervicis
- Iliocostalis cervicis
- Multifidus (cervical)
- Rotatores (cervical)
- Interspinales (cervical)
- Intertransversarii (cervical)
- Levator scapulae

</details>
</details>
<details class="tree">
<summary>Ligaments <span class="count">— 28 terms, 4 groups</span> <span class="warn">⚠ 10 loose</span></summary>

<p class="count">10 terms below sit directly under this branch with no group heading in the source.</p>

- Anterior longitudinal ligament
- Posterior longitudinal ligament
- Ligamenta flava
- Interspinous ligaments
- Supraspinous ligament
- Ligamentum nuchae
- Intertransverse ligaments
- Facet joint capsular ligaments
- Uncovertebral joint capsular ligaments
- Intervertebral disc annular fibres / annulus fibrosus

<details class="tree">
<summary>Atlanto-occipital ligaments <span class="count">— 4</span></summary>

- Anterior atlanto-occipital membrane
- Posterior atlanto-occipital membrane
- Atlanto-occipital joint capsules
- Lateral atlanto-occipital capsular ligament

</details>
<details class="tree">
<summary>Atlantoaxial ligaments <span class="count">— 3</span></summary>

- Anterior atlantoaxial membrane
- Posterior atlantoaxial membrane
- Atlantoaxial joint capsule

</details>
<details class="tree">
<summary>Ligaments associated with the dens <span class="count">— 8</span></summary>

- Transverse ligament of the atlas
- Cruciform ligament of the atlas
  - Transverse band
  - Superior longitudinal band
  - Inferior longitudinal band
- Alar ligaments
- Apical ligament of the dens
- Tectorial membrane

</details>
<details class="tree">
<summary>Other upper cervical stabilisers <span class="count">— 3</span></summary>

- Ligamentum nuchae
- Atlantoaxial capsular ligaments
- Atlanto-occipital capsular ligaments

</details>
</details>
<details class="tree">
<summary>Conditions <span class="count">— 59 terms, 11 groups</span> <span class="ok">✓ structured</span></summary>

<details class="tree">
<summary>Cervical Spine MSK conditions (tags) <span class="count">— 0</span></summary>


</details>
<details class="tree">
<summary>Muscular Conditions <span class="count">— 12</span></summary>

- Cervical muscle strain
- Cervical muscle tear
- Myofascial pain syndrome
- Trigger points
- Cervical muscle spasm
- Deep neck flexor dysfunction
- Upper crossed syndrome
- Whiplash-associated disorder (WAD)
- Postural syndrome
- Torticollis (acute and chronic)
- SCM syndrome
- Levator scapulae syndrome

</details>
<details class="tree">
<summary>Tendon Disorders <span class="count">— 4</span></summary>

- Cervical tendinopathy
- Tendon strain
- Tendon rupture (rare)
- Calcific tendinopathy (muscle insertions)

</details>
<details class="tree">
<summary>Ligament Injuries <span class="count">— 5</span></summary>

- Cervical ligament sprain
- Alar ligament injury
- Transverse ligament injury
- Capsular sprain
- Atlantoaxial instability

</details>
<details class="tree">
<summary>Disc Disorders <span class="count">— 7</span></summary>

- Cervical disc degeneration
- Disc bulge
- Disc protrusion
- Disc extrusion
- Disc sequestration
- Annular tear
- Herniated cervical disc

</details>
<details class="tree">
<summary>Facet Joint Disorders <span class="count">— 4</span></summary>

- Facet syndrome
- Facet arthropathy
- Facet joint osteoarthritis
- Facet capsule injury

</details>
<details class="tree">
<summary>Joint Disorders <span class="count">— 5</span></summary>

- Cervical spondylosis
- Osteoarthritis
- Segmental instability
- Hypermobility
- Hypomobility

</details>
<details class="tree">
<summary>Nerve Conditions <span class="count">— 7</span></summary>

- Cervical radiculopathy
- Cervical radiculitis
- Cervical nerve root compression
- Cervical spinal stenosis
- Thoracic outlet syndrome
- Occipital neuralgia
- Brachial plexopathy

</details>
<details class="tree">
<summary>Bone Conditions <span class="count">— 4</span></summary>

- Cervical fracture
- Stress fracture
- Osteoporosis-related fracture
- Odontoid fracture

</details>
<details class="tree">
<summary>Inflammatory Conditions <span class="count">— 4</span></summary>

- Rheumatoid arthritis
- Ankylosing spondylitis
- Psoriatic arthritis
- Polymyalgia rheumatica

</details>
<details class="tree">
<summary>Other <span class="count">— 7</span></summary>

- Cervicogenic headache
- Mechanical neck pain
- Cervical instability
- Degenerative disc disease
- Cervical kyphosis
- Cervical scoliosis
- Post-operative cervical fusion rehabilitation Top of FormBottom of Form

</details>
</details>
</details>
<details class="tree lvl1">
<summary>Upper limb <span class="count">— 267 terms, 3 branches</span></summary>

<details class="tree">
<summary>Muscles <span class="count">— 49 terms, 14 groups</span> <span class="warn">⚠ 2 duplicate group names</span></summary>

<details class="tree">
<summary>Shoulder & Scapular Muscles <span class="count">— 14</span></summary>

- Deltoid
- Supraspinatus
- Infraspinatus
- Teres minor
- Teres major
- Subscapularis
- Pectoralis major
- Pectoralis minor
- Serratus anterior
- Latissimus dorsi
- Rhomboid major
- Rhomboid minor
- Levator scapulae
- Subclavius

</details>
<details class="tree">
<summary>Arm (Anterior Compartment) <span class="count">— 3</span></summary>

- Biceps brachii
- Brachialis
- Coracobrachialis

</details>
<details class="tree">
<summary>Arm (Posterior Compartment) <span class="count">— 2</span></summary>

- Triceps brachii
- Anconeus

</details>
<details class="tree">
<summary>Forearm Flexor Compartment <span class="count">— 0</span></summary>


</details>
<details class="tree">
<summary>Superficial <span class="count">— 4</span></summary>

- Pronator teres
- Flexor carpi radialis
- Palmaris longus
- Flexor carpi ulnaris

</details>
<details class="tree">
<summary>Intermediate <span class="count">— 1</span></summary>

- Flexor digitorum superficialis

</details>
<details class="tree">
<summary>Deep <span class="count">— 3</span></summary>

- Flexor digitorum profundus
- Flexor pollicis longus
- Pronator quadratus

</details>
<details class="tree">
<summary>Forearm Extensor Compartment <span class="count">— 0</span></summary>


</details>
<details class="tree">
<summary>Superficial <span class="count">— 6</span></summary>

- Brachioradialis
- Extensor carpi radialis longus
- Extensor carpi radialis brevis
- Extensor digitorum
- Extensor digiti minimi
- Extensor carpi ulnaris

</details>
<details class="tree">
<summary>Deep <span class="count">— 5</span></summary>

- Supinator
- Abductor pollicis longus
- Extensor pollicis brevis
- Extensor pollicis longus
- Extensor indicis

</details>
<details class="tree">
<summary>Hand <span class="count">— 0</span></summary>


</details>
<details class="tree">
<summary>Thenar <span class="count">— 4</span></summary>

- Abductor pollicis brevis
- Flexor pollicis brevis
- Opponens pollicis
- Adductor pollicis

</details>
<details class="tree">
<summary>Hypothenar <span class="count">— 4</span></summary>

- Abductor digiti minimi
- Flexor digiti minimi brevis
- Opponens digiti minimi
- Palmaris brevis

</details>
<details class="tree">
<summary>Central <span class="count">— 3</span></summary>

- Lumbricals (1–4)
- Palmar interossei (3)
- Dorsal interossei (4)

</details>
</details>
<details class="tree">
<summary>Ligaments <span class="count">— 140 terms, 0 groups</span> <span class="warn">⚠ no sub-grouping · 28 duplicate term names</span></summary>

<p class="count">140 terms below sit directly under this branch with no group heading in the source.</p>

- Acromioclavicular ligament
- Superior acromioclavicular ligament
- Inferior acromioclavicular ligament
- Coracoclavicular ligament
  - Conoid ligament
  - Trapezoid ligament
- Coracoacromial ligament
- Coracohumeral ligament
- Superior transverse scapular ligament
- Inferior transverse scapular ligament
- Spinoglenoid ligament
- Suprascapular ligament
- Anterior sternoclavicular ligament
- Posterior sternoclavicular ligament
- Superior sternoclavicular ligament
- Costoclavicular ligament
- Interclavicular ligament
- Sternoclavicular joint capsule
- Superior transverse scapular ligament
- Inferior transverse scapular ligament
- Spinoglenoid ligament
- Coracoacromial ligament
- Glenohumeral joint capsule
- Superior glenohumeral ligament
- Middle glenohumeral ligament
- Inferior glenohumeral ligament
  - Anterior band
  - Posterior band
  - Axillary pouch
- Coracohumeral ligament
- Transverse humeral ligament
- Coracoacromial ligament
- Acromioclavicular ligament
- Superior labral complex
- Glenoid labrum
- Rotator interval capsule/ligamentous complex
- Anterior capsulolabral complex
- Posterior capsulolabral complex
- Inferior glenohumeral ligament complex
- Ulnar collateral ligament
- Medial collateral ligament
  - Anterior bundle
  - Posterior bundle
  - Transverse bundle
- Radial collateral ligament
- Lateral ulnar collateral ligament
- Annular ligament of radius
- Accessory lateral collateral ligament
- Posterior capsule
- Anterior capsule
- Elbow joint capsule
- Annular ligament of radius
- Quadrate ligament
- Interosseous membrane of forearm
- Oblique cord
- Annular ligament
- Quadrate ligament
- Interosseous membrane of forearm
- Central band
- Accessory bands
- Distal oblique bundle
- Palmar radioulnar ligament
- Dorsal radioulnar ligament
- Articular disc / triangular fibrocartilage complex
- Palmar radiocarpal ligaments
  - Radioscaphocapitate ligament
  - Long radiolunate ligament
  - Short radiolunate ligament
  - Ulnocarpal ligament complex
- Dorsal radiocarpal ligament
- Dorsal intercarpal ligament
- Ulnocarpal ligament complex
  - Ulnolunate ligament
  - Ulnotriquetral ligament
  - Ulnocapitate ligament
- Radial collateral ligament of wrist
- Ulnar collateral ligament of wrist
- Scapholunate interosseous ligament
- Lunotriquetral interosseous ligament
- Scaphocapitate ligament
- Scaphotrapeziotrapezoid ligament
- Trapeziotrapezoid ligament
- Trapeziocapitate ligament
- Capitohamate ligament
- Triquetrohamate ligament
- Pisotriquetral ligament
- Pisohamate ligament
- Pisometacarpal ligament
- Dorsal intercarpal ligament
- Dorsal carpometacarpal ligaments
- Palmar intercarpal ligaments
- Palmar carpometacarpal ligaments
- Dorsal carpometacarpal ligaments
- Palmar carpometacarpal ligaments
- Intermetacarpal ligaments
- Anterior oblique ligament
- Beak ligament
- Dorsoradial ligament
- Posterior oblique ligament
- Ulnar collateral ligament
- First carpometacarpal joint capsule
- Radial collateral ligament
- Ulnar collateral ligament
- Accessory collateral ligament
- Palmar plate
- Deep transverse metacarpal ligament
- Ulnar collateral ligament
- Radial collateral ligament
- Accessory collateral ligaments
- Volar plate
- Adductor pollicis aponeurosis
- Proper collateral ligaments
- Accessory collateral ligaments
- Palmar plates
- Proper collateral ligaments
- Accessory collateral ligaments
- Palmar plates
- Radial collateral ligament
- Ulnar collateral ligament
- Accessory collateral ligaments
- Palmar plate
- Deep transverse metacarpal ligament
- Superficial transverse metacarpal ligament
- Natatory ligaments
- Cleland's ligaments
- Grayson's ligaments
- Sagittal bands
- Retinacular ligaments
- Oblique retinacular ligament
- Transverse retinacular ligament
- Annular pulleys
  - A1 pulley
  - A2 pulley
  - A3 pulley
  - A4 pulley
  - A5 pulley
- Cruciate pulleys
  - C1
  - C2
  - C3

</details>
<details class="tree">
<summary>Conditions <span class="count">— 78 terms, 15 groups</span> <span class="warn">⚠ 1 duplicate group names</span></summary>

<details class="tree">
<summary>Upper Limb MSK conditions (tags) <span class="count">— 0</span></summary>


</details>
<details class="tree">
<summary>Shoulder <span class="count">— 0</span></summary>


</details>
<details class="tree">
<summary>Rotator Cuff <span class="count">— 4</span></summary>

- Rotator cuff tendinopathy
- Rotator cuff tear (partial/full thickness)
- Rotator cuff impingement
- Calcific tendinitis

</details>
<details class="tree">
<summary>Bursa <span class="count">— 2</span></summary>

- Subacromial bursitis
- Subdeltoid bursitis

</details>
<details class="tree">
<summary>Labrum <span class="count">— 3</span></summary>

- SLAP lesion
- Bankart lesion
- Labral tear

</details>
<details class="tree">
<summary>Joint Disorders <span class="count">— 9</span></summary>

- Glenohumeral osteoarthritis
- AC joint osteoarthritis
- Frozen shoulder (adhesive capsulitis)
- Shoulder instability
- Shoulder dislocation
- Shoulder subluxation
- AC joint sprain
- AC joint separation
- Sternoclavicular joint sprain

</details>
<details class="tree">
<summary>Tendons <span class="count">— 3</span></summary>

- Biceps tendinopathy
- Long head biceps rupture
- Pectoralis major rupture

</details>
<details class="tree">
<summary>Scapular Disorders <span class="count">— 3</span></summary>

- Scapular dyskinesis
- Snapping scapula syndrome
- Winged scapula

</details>
<details class="tree">
<summary>Fractures <span class="count">— 3</span></summary>

- Clavicle fracture
- Proximal humerus fracture
- Scapular fracture

</details>
<details class="tree">
<summary>Elbow <span class="count">— 13</span></summary>

- Lateral epicondylopathy (tennis elbow)
- Medial epicondylopathy (golfer's elbow)
- Distal biceps tendinopathy
- Distal biceps rupture
- Triceps tendinopathy
- Triceps rupture
- Olecranon bursitis
- Elbow osteoarthritis
- UCL sprain
- Radial collateral ligament injury
- Elbow instability
- Elbow dislocation
- Capitellar OCD

</details>
<details class="tree">
<summary>Nerve <span class="count">— 3</span></summary>

- Cubital tunnel syndrome
- Radial tunnel syndrome
- Posterior interosseous nerve syndrome

</details>
<details class="tree">
<summary>Forearm <span class="count">— 6</span></summary>

- Muscle strain
- Tendinopathy
- Chronic exertional compartment syndrome
- Radius fracture
- Ulna fracture
- Stress fracture

</details>
<details class="tree">
<summary>Wrist <span class="count">— 13</span></summary>

- Wrist sprain
- TFCC injury
- De Quervain's tenosynovitis
- ECU tendinopathy
- FCR tendinopathy
- FCU tendinopathy
- Wrist osteoarthritis
- Scapholunate instability
- Lunotriquetral instability
- Carpal instability
- Ganglion cyst
- Distal radius fracture
- Scaphoid fracture

</details>
<details class="tree">
<summary>Nerve <span class="count">— 2</span></summary>

- Carpal tunnel syndrome
- Guyon's canal syndrome

</details>
<details class="tree">
<summary>Hand & Fingers <span class="count">— 14</span></summary>

- Trigger finger
- Dupuytren's disease
- Mallet finger
- Boutonniere deformity
- Swan-neck deformity
- Jersey finger
- Thumb UCL injury (Skier's thumb)
- CMC osteoarthritis
- MCP arthritis
- Finger sprain
- Finger dislocation
- Tendon laceration
- Flexor tenosynovitis
- Extensor tendon injury

</details>
</details>
</details>
<details class="tree lvl1">
<summary>Thoracic spine <span class="count">— 65 terms, 3 branches</span></summary>

<details class="tree">
<summary>Muscles <span class="count">— 22 terms, 4 groups</span> <span class="ok">✓ structured</span></summary>

<details class="tree">
<summary>Superficial Back <span class="count">— 5</span></summary>

- Trapezius
- Latissimus dorsi
- Rhomboid major
- Rhomboid minor
- Levator scapulae

</details>
<details class="tree">
<summary>Intermediate <span class="count">— 2</span></summary>

- Serratus posterior superior
- Serratus posterior inferior

</details>
<details class="tree">
<summary>Intrinsic Back <span class="count">— 9</span></summary>

- Splenius thoracis (where present)
- Iliocostalis thoracis
- Longissimus thoracis
- Spinalis thoracis
- Semispinalis thoracis
- Multifidus (thoracic)
- Rotatores (thoracic)
- Interspinales (thoracic)
- Intertransversarii (thoracic)

</details>
<details class="tree">
<summary>Thoracic Wall <span class="count">— 6</span></summary>

- External intercostals
- Internal intercostals
- Innermost intercostals
- Subcostals
- Transversus thoracis
- Diaphragm

</details>
</details>
<details class="tree">
<summary>Ligaments <span class="count">— 14 terms, 0 groups</span> <span class="warn">⚠ no sub-grouping</span></summary>

<p class="count">14 terms below sit directly under this branch with no group heading in the source.</p>

- Anterior longitudinal ligament
- Posterior longitudinal ligament
- Ligamenta flava
- Interspinous ligaments
- Supraspinous ligament
- Intertransverse ligaments
- Facet joint capsular ligaments
- Intervertebral disc annular fibres / annulus fibrosus
- Radiate ligament of head of rib
- Intra-articular ligament of head of rib
- Capsular ligament of the costovertebral joint
- Costotransverse ligament
- Lateral costotransverse ligament
- Superior costotransverse ligament

</details>
<details class="tree">
<summary>Conditions <span class="count">— 29 terms, 8 groups</span> <span class="ok">✓ structured</span></summary>

<details class="tree">
<summary>Thoracic Spine MSK conditions (tags) <span class="count">— 0</span></summary>


</details>
<details class="tree">
<summary>Muscular <span class="count">— 4</span></summary>

- Thoracic muscle strain
- Myofascial pain syndrome
- Trigger points
- Postural syndrome

</details>
<details class="tree">
<summary>Joint <span class="count">— 6</span></summary>

- Thoracic facet syndrome
- Costovertebral dysfunction
- Costotransverse dysfunction
- Rib dysfunction
- Thoracic stiffness
- Thoracic instability

</details>
<details class="tree">
<summary>Disc <span class="count">— 3</span></summary>

- Thoracic disc bulge
- Thoracic disc prolapse
- Thoracic disc degeneration

</details>
<details class="tree">
<summary>Bone <span class="count">— 5</span></summary>

- Compression fracture
- Osteoporotic fracture
- Rib fracture
- Stress fracture
- Scheuermann's disease

</details>
<details class="tree">
<summary>Inflammatory <span class="count">— 3</span></summary>

- Ankylosing spondylitis
- Rheumatoid arthritis
- Psoriatic arthritis

</details>
<details class="tree">
<summary>Nerve <span class="count">— 2</span></summary>

- Thoracic radiculopathy
- Intercostal neuralgia

</details>
<details class="tree">
<summary>Other <span class="count">— 6</span></summary>

- Thoracic outlet syndrome
- Costochondritis
- Tietze syndrome
- Mechanical thoracic pain
- Hyperkyphosis
- Scoliosis

</details>
</details>
</details>
<details class="tree lvl1">
<summary>Lumbar spine <span class="count">— 75 terms, 3 branches</span></summary>

<details class="tree">
<summary>Muscles <span class="count">— 15 terms, 3 groups</span> <span class="ok">✓ structured</span></summary>

<details class="tree">
<summary>Posterior <span class="count">— 7</span></summary>

- Iliocostalis lumborum
- Longissimus thoracis
- Multifidus (lumbar)
- Rotatores (lumbar)
- Interspinales (lumbar)
- Intertransversarii (lumbar)
- Quadratus lumborum

</details>
<details class="tree">
<summary>Abdominal Wall <span class="count">— 5</span></summary>

- Rectus abdominis
- Pyramidalis
- External oblique
- Internal oblique
- Transversus abdominis

</details>
<details class="tree">
<summary>Hip Flexors Affecting Lumbar Spine <span class="count">— 3</span></summary>

- Psoas major
- Psoas minor (variable)
- Iliacus

</details>
</details>
<details class="tree">
<summary>Ligaments <span class="count">— 19 terms, 0 groups</span> <span class="warn">⚠ no sub-grouping · 4 duplicate term names</span></summary>

<p class="count">19 terms below sit directly under this branch with no group heading in the source.</p>

- Anterior longitudinal ligament
- Posterior longitudinal ligament
- Ligamenta flava
- Interspinous ligaments
- Supraspinous ligament
- Intertransverse ligaments
- Facet joint capsular ligaments
- Intervertebral disc annular fibres / annulus fibrosus
- Iliolumbar ligament
- Lumbosacral iliolumbar ligament
- Lumbosacral ligament
- Lateral lumbosacral ligament
- Lumbosacral facet joint capsules
- Anterior longitudinal ligament
- Posterior longitudinal ligament
- Ligamentum flavum
- Interspinous ligament
- Supraspinous ligament
- Iliolumbar ligament

</details>
<details class="tree">
<summary>Conditions <span class="count">— 41 terms, 11 groups</span> <span class="ok">✓ structured</span></summary>

<details class="tree">
<summary>Lumbar Spine MSK conditions (tags) <span class="count">— 0</span></summary>


</details>
<details class="tree">
<summary>Muscular <span class="count">— 5</span></summary>

- Lumbar strain
- Quadratus lumborum syndrome
- Multifidus dysfunction
- Myofascial pain syndrome
- Trigger points

</details>
<details class="tree">
<summary>Disc Disorders <span class="count">— 7</span></summary>

- Lumbar disc degeneration
- Disc bulge
- Disc prolapse
- Disc herniation
- Annular tear
- Disc extrusion
- Disc sequestration

</details>
<details class="tree">
<summary>Facet Disorders <span class="count">— 3</span></summary>

- Lumbar facet syndrome
- Facet arthropathy
- Facet osteoarthritis

</details>
<details class="tree">
<summary>Joint Disorders <span class="count">— 4</span></summary>

- Mechanical low back pain
- Lumbar instability
- Hypermobility
- Spondylosis

</details>
<details class="tree">
<summary>Nerve <span class="count">— 5</span></summary>

- Sciatica
- Lumbar radiculopathy
- Lumbar spinal stenosis
- Cauda equina syndrome
- Peripheral nerve entrapment

</details>
<details class="tree">
<summary>Bone <span class="count">— 5</span></summary>

- Spondylolysis
- Spondylolisthesis
- Compression fracture
- Pars defect
- Osteoporotic fracture

</details>
<details class="tree">
<summary>SI Joint <span class="count">— 3</span></summary>

- Sacroiliac joint dysfunction
- SI joint sprain
- SI joint arthritis

</details>
<details class="tree">
<summary>Hip-related <span class="count">— 3</span></summary>

- Iliopsoas tendinopathy
- Iliopsoas bursitis
- Hip flexor strain

</details>
<details class="tree">
<summary>Inflammatory <span class="count">— 3</span></summary>

- Ankylosing spondylitis
- Rheumatoid arthritis
- Psoriatic arthritis

</details>
<details class="tree">
<summary>Other <span class="count">— 3</span></summary>

- Degenerative disc disease
- Flat back syndrome
- Post-lumbar surgery rehabilitation

</details>
</details>
</details>
<details class="tree lvl1">
<summary>Lower limb <span class="count">— 333 terms, 3 branches</span></summary>

<details class="tree">
<summary>Muscles <span class="count">— 51 terms, 16 groups</span> <span class="ok">✓ structured</span></summary>

<details class="tree">
<summary>Gluteal Region <span class="count">— 10</span></summary>

- Gluteus maximus
- Gluteus medius
- Gluteus minimus
- Tensor fasciae latae
- Piriformis
- Superior gemellus
- Inferior gemellus
- Obturator internus
- Obturator externus
- Quadratus femoris

</details>
<details class="tree">
<summary>Thigh <span class="count">— 0</span></summary>


</details>
<details class="tree">
<summary>Anterior <span class="count">— 6</span></summary>

- Sartorius
- Rectus femoris
- Vastus lateralis
- Vastus medialis
- Vastus intermedius
- Articularis genu

</details>
<details class="tree">
<summary>Medial <span class="count">— 6</span></summary>

- Pectineus
- Adductor longus
- Adductor brevis
- Adductor magnus
- Gracilis
- Obturator externus

</details>
<details class="tree">
<summary>Posterior <span class="count">— 4</span></summary>

- Biceps femoris (long head)
- Biceps femoris (short head)
- Semitendinosus
- Semimembranosus

</details>
<details class="tree">
<summary>Leg (Anterior) <span class="count">— 4</span></summary>

- Tibialis anterior
- Extensor hallucis longus
- Extensor digitorum longus
- Fibularis tertius

</details>
<details class="tree">
<summary>Leg (Lateral) <span class="count">— 2</span></summary>

- Fibularis longus
- Fibularis brevis

</details>
<details class="tree">
<summary>Leg (Posterior) <span class="count">— 0</span></summary>


</details>
<details class="tree">
<summary>Superficial <span class="count">— 3</span></summary>

- Gastrocnemius
- Soleus
- Plantaris

</details>
<details class="tree">
<summary>Deep <span class="count">— 4</span></summary>

- Popliteus
- Tibialis posterior
- Flexor hallucis longus
- Flexor digitorum longus

</details>
<details class="tree">
<summary>Foot <span class="count">— 0</span></summary>


</details>
<details class="tree">
<summary>Dorsum <span class="count">— 2</span></summary>

- Extensor digitorum brevis
- Extensor hallucis brevis

</details>
<details class="tree">
<summary>Plantar Layer 1 <span class="count">— 3</span></summary>

- Abductor hallucis
- Flexor digitorum brevis
- Abductor digiti minimi

</details>
<details class="tree">
<summary>Plantar Layer 2 <span class="count">— 2</span></summary>

- Quadratus plantae
- Lumbricals (1–4)

</details>
<details class="tree">
<summary>Plantar Layer 3 <span class="count">— 3</span></summary>

- Flexor hallucis brevis
- Adductor hallucis
- Flexor digiti minimi brevis

</details>
<details class="tree">
<summary>Plantar Layer 4 <span class="count">— 2</span></summary>

- Plantar interossei (3)
- Dorsal interossei (4)

</details>
</details>
<details class="tree">
<summary>Ligaments <span class="count">— 180 terms, 3 groups</span> <span class="warn">⚠ 76 loose · 36 duplicate term names</span></summary>

<p class="count">76 terms below sit directly under this branch with no group heading in the source.</p>

- Iliofemoral ligament
  - Superior band
  - Inferior band
- Pubofemoral ligament
- Ischiofemoral ligament
- Zona orbicularis
- Acetabular labrum
- Transverse acetabular ligament
- Ligament of head of femur
  - Ligamentum teres
- Hip joint capsule
- Iliofemoral ligament
- Pubofemoral ligament
- Ischiofemoral ligament
- Transverse acetabular ligament
- Acetabular labrum
- Anterior sacroiliac ligament
- Interosseous sacroiliac ligament
- Short posterior sacroiliac ligament
- Long posterior sacroiliac ligament
- Sacrotuberous ligament
- Sacrospinous ligament
- Iliolumbar ligament
- Superior pubic ligament
- Inferior/arcuate pubic ligament
- Anterior pubic ligament
- Posterior pubic ligament
- Medial collateral ligament
  - Superficial MCL
  - Deep MCL
- Lateral collateral ligament
- Fibular collateral ligament
- Medial patellofemoral ligament
- Medial patellotibial ligament
- Medial patellomeniscal ligament
- Posteromedial capsule
- Posterior oblique ligament
- Lateral patellofemoral ligament
- Lateral patellotibial ligament
- Lateral patellomeniscal ligament
- Anterolateral ligament
- Arcuate ligament
- Popliteofibular ligament
- Fabellofibular ligament — variable
- Lateral capsular ligament
- Anterior cruciate ligament
  - Anteromedial bundle
  - Posterolateral bundle
- Posterior cruciate ligament
  - Anterolateral bundle
  - Posteromedial bundle
- Anterior meniscofemoral ligament
- Posterior meniscofemoral ligament
- Humphrey ligament
- Wrisberg ligament
- Transverse ligament of knee
- Anterior meniscotibial ligaments
- Posterior meniscotibial ligaments
- Meniscofemoral ligaments
- Coronary ligaments
- Medial meniscotibial ligaments
- Lateral meniscotibial ligaments
- Meniscal root
- Patellar ligament
- Medial patellofemoral ligament
- Lateral patellofemoral ligament
- Medial patellotibial ligament
- Lateral patellotibial ligament
- Medial patellomeniscal ligament
- Lateral patellomeniscal ligament
- Patellar retinacula
  - Medial patellar retinaculum
  - Lateral patellar retinaculum
- Anterior superior tibiofibular ligament
- Posterior superior tibiofibular ligament
- Superior tibiofibular joint capsule

<details class="tree">
<summary>Interosseous membrane <span class="count">— 3</span></summary>

- Interosseous membrane
- Central interosseous band
- Accessory interosseous band

</details>
<details class="tree">
<summary>Distal tibiofibular syndesmosis/syndesmotic ligament <span class="count">— 10</span></summary>

- Anterior inferior tibiofibular ligament
- Posterior inferior tibiofibular ligament
- Inferior transverse tibiofibular ligament
- Interosseous tibiofibular ligament
- Distal tibiofibular syndesmotic capsul
- Anterior talofibular ligament
- Calcaneofibular ligament
- Posterior talofibular ligament
- Talocalcaneal interosseous ligament
- Cervical ligament

</details>
<details class="tree">
<summary>Deltoid/medial collateral ligament: <span class="count">— 91</span></summary>

    - Superficial layer- Tibionavicular ligament, Superficial tibiocalcaneal
    - ligament, Posterior tibiotalar ligament
- Deep layer- Deep tibiotalar ligament, Anterior tibiotalar ligament
- Anterior talocrural capsule
- Posterior talocrural capsule
- Medial collateral ligament
- Lateral collateral ligament
- Distal tibiofibular syndesmotic ligaments
- Interosseous talocalcaneal ligament
- Cervical ligament
- Medial talocalcaneal ligament
- Lateral talocalcaneal ligament
- Posterior talocalcaneal ligament
- Talocalcaneal joint capsule
- Dorsal talonavicular ligament
- Plantar talonavicular ligament
- Calcaneonavicular ligament
- Spring ligament complex
  - Superior/medial calcaneonavicular ligament
  - Inferior calcaneonavicular ligament
  - Superomedial calcaneonavicular ligament
- Dorsal calcaneocuboid ligament
- Plantar calcaneocuboid ligament
- Long plantar ligament
- Short plantar ligament
- Bifurcate ligament
  - Calcaneonavicular component
  - Calcaneocuboid component
- Talonavicular ligaments
- Calcaneocuboid ligaments
- Long plantar ligament
- Short plantar ligament
- Plantar calcaneonavicular ligament
- Dorsal tarsometatarsal ligaments
- Plantar tarsometatarsal ligaments
- Interosseous tarsometatarsal ligaments
- Lisfranc ligament
- Interosseous cuneometatarsal ligament
- Plantar Lisfranc ligament
- Dorsal Lisfranc ligament
- Interosseous talocalcaneal ligament
- Interosseous cuneiform ligaments
- Dorsal intertarsal ligaments
- Plantar intertarsal ligaments
- Interosseous intertarsal ligaments
- Dorsal talonavicular ligament
- Plantar talonavicular ligament
- Dorsal cuneonavicular ligaments
- Plantar cuneonavicular ligaments
- Interosseous cuneonavicular ligaments
- Dorsal cuboid ligaments
- Plantar cuboid ligaments
- Interosseous cuboid ligaments
- Medial collateral ligament
- Lateral collateral ligament
- Accessory collateral ligaments
- Plantar plate
- Deep transverse metatarsal ligament
- Medial collateral ligament
- Lateral collateral ligament
- Sesamoid ligaments
- Metatarsosesamoid ligaments
- Inter-sesamoid ligament
- Plantar plate
- Medial collateral ligament
- Lateral collateral ligament
- Accessory collateral ligaments
- Plantar plate
- Medial collateral ligament
- Lateral collateral ligament
- Accessory collateral ligaments
- Plantar plate
- Plantar calcaneonavicular ligament / spring ligament
- Long plantar ligament
- Short plantar ligament
- Plantar aponeurosis
- Long plantar ligament
- Short plantar ligament
- Plantar calcaneocuboid ligament
- Deep transverse metatarsal ligament
- Intermetatarsal ligaments
- Interosseous ligaments
- Superior extensor retinaculum
- Inferior extensor retinaculum
- Flexor retinaculum
- Superior peroneal retinaculum
- Inferior peroneal retinaculum
- Plantar aponeurosis
- Digital fibrous sheaths
- Annular pulleys of toes
- Cruciate pulleys of toes

</details>
</details>
<details class="tree">
<summary>Conditions <span class="count">— 102 terms, 16 groups</span> <span class="ok">✓ structured</span></summary>

<details class="tree">
<summary>Lower Limb MSK conditions (tags) <span class="count">— 0</span></summary>


</details>
<details class="tree">
<summary>Hip <span class="count">— 18</span></summary>

- Greater trochanteric pain syndrome
- Gluteal tendinopathy
- Gluteus medius tear
- Gluteus minimus tear
- Hip osteoarthritis
- Femoroacetabular impingement (FAI)
- Hip labral tear
- Hip dysplasia
- Snapping hip syndrome
- Piriformis syndrome
- Iliopsoas tendinopathy
- Iliopsoas bursitis
- Hamstring origin tendinopathy
- Adductor tendinopathy
- Athletic pubalgia
- Hip flexor strain
- Hip dislocation
- Femoral neck stress fracture

</details>
<details class="tree">
<summary>Groin <span class="count">— 6</span></summary>

- Adductor strain
- Adductor tendinopathy
- Osteitis pubis
- Sports hernia
- Athletic pubalgia
- Inguinal disruption

</details>
<details class="tree">
<summary>Thigh <span class="count">— 7</span></summary>

- Quadriceps strain
- Hamstring strain
- Hamstring tendinopathy
- Quadriceps tendinopathy
- Muscle tear
- Contusion
- Myositis ossificans

</details>
<details class="tree">
<summary>Knee <span class="count">— 0</span></summary>


</details>
<details class="tree">
<summary>Ligaments <span class="count">— 5</span></summary>

- ACL rupture
- PCL rupture
- MCL sprain
- LCL sprain
- PLC injury

</details>
<details class="tree">
<summary>Meniscus <span class="count">— 3</span></summary>

- Medial meniscus tear
- Lateral meniscus tear
- Degenerative meniscal tear

</details>
<details class="tree">
<summary>Tendons <span class="count">— 4</span></summary>

- Patellar tendinopathy
- Quadriceps tendinopathy
- Patellar tendon rupture
- Quadriceps tendon rupture

</details>
<details class="tree">
<summary>Cartilage <span class="count">— 3</span></summary>

- Chondromalacia patella
- Osteochondral lesion
- Osteochondritis dissecans

</details>
<details class="tree">
<summary>Joint <span class="count">— 4</span></summary>

- Knee osteoarthritis
- Patellofemoral pain syndrome
- Patellar instability
- Patellar dislocation

</details>
<details class="tree">
<summary>Bursa <span class="count">— 3</span></summary>

- Prepatellar bursitis
- Pes anserine bursitis
- Infrapatellar bursitis

</details>
<details class="tree">
<summary>Other <span class="count">— 4</span></summary>

- ITB syndrome
- Baker's cyst
- Plica syndrome
- Hoffa's fat pad syndrome

</details>
<details class="tree">
<summary>Lower Leg <span class="count">— 10</span></summary>

- Medial tibial stress syndrome
- Tibial stress fracture
- Fibular stress fracture
- Chronic exertional compartment syndrome
- Shin splints
- Gastrocnemius tear
- Soleus strain
- Achilles tendinopathy
- Achilles rupture
- Plantaris rupture

</details>
<details class="tree">
<summary>Nerve <span class="count">— 2</span></summary>

- Common peroneal neuropathy
- Tibial nerve entrapment

</details>
<details class="tree">
<summary>Ankle <span class="count">— 12</span></summary>

- Lateral ankle sprain
- Syndesmosis injury
- Deltoid ligament sprain
- Chronic ankle instability
- Ankle osteoarthritis
- Osteochondral lesion of the talus
- Ankle impingement
- Peroneal tendinopathy
- Peroneal tendon tear
- Tibialis posterior dysfunction
- Flexor hallucis longus tendinopathy
- Tibialis anterior tendinopathy

</details>
<details class="tree">
<summary>Foot <span class="count">— 21</span></summary>

- Plantar fasciopathy
- Plantar fascia rupture
- Morton's neuroma
- Hallux rigidus
- Hallux valgus
- Turf toe
- Metatarsalgia
- Sesamoiditis
- Stress fractures
- Lisfranc injury
- Tarsal tunnel syndrome
- Cuboid syndrome
- Posterior tibial tendon dysfunction
- Flat foot (pes planus)
- Cavus foot
- Toe deformities (hammer toe, claw toe, mallet toe)
- Freiberg disease
- Sever's disease
- Achilles insertional tendinopathy
- Heel fat pad syndrome
- Sinus tarsi syndrome

</details>
</details>
</details>
<details class="tree lvl1">
<summary>Pelvis, hip and pelvic floor <span class="count">— 281 terms, 1 branches</span></summary>

<details class="tree">
<summary>Muscles <span class="count">— 281 terms, 40 groups</span> <span class="warn">⚠ 2 duplicate term names · 9 duplicate group names</span></summary>

<details class="tree">
<summary>Abdominal / trunk <span class="count">— 10</span></summary>

- Rectus abdominis
- Pyramidalis
- External oblique
- Internal oblique
- Transversus abdominis
- Quadratus lumborum
- Multifidus
- Erector spinae
- Iliocostalis lumborum
- Longissimus thoracis

</details>
<details class="tree">
<summary>Gluteal / deep hip <span class="count">— 10</span></summary>

- Gluteus maximus
- Gluteus medius
- Gluteus minimus
- Tensor fasciae latae
- Piriformis
- Obturator internus
- Obturator externus
- Superior gemellus
- Inferior gemellus
- Quadratus femoris

</details>
<details class="tree">
<summary>Iliopsoas / anterior hip <span class="count">— 5</span></summary>

- Iliacus
- Psoas major
- Psoas minor
- Rectus femoris
- Sartorius

</details>
<details class="tree">
<summary>Adductors / medial thigh <span class="count">— 5</span></summary>

- Pectineus
- Adductor longus
- Adductor brevis
- Adductor magnus
- Gracilis

</details>
<details class="tree">
<summary>Hamstrings <span class="count">— 3</span></summary>

- Biceps femoris
- Semitendinosus
- Semimembranosus

</details>
<details class="tree">
<summary>Pelvic floor <span class="count">— 4</span></summary>

- Puborectalis
- Pubococcygeus
- Iliococcygeus
- Coccygeus (ischiococcygeus)

</details>
<details class="tree">
<summary>Perineal muscles <span class="count">— 7</span></summary>

- Superficial transverse perineal
- Deep transverse perineal
- Ischiocavernosus
- Bulbospongiosus
- External anal sphincter
- Compressor urethrae
- Sphincter urethrovaginalis

</details>
<details class="tree">
<summary>Pelvic bones / bony landmarks <span class="count">— 10</span></summary>

- Ilium
- Iliac crest
- Anterior superior iliac spine (ASIS)
- Anterior inferior iliac spine (AIIS)
- Posterior superior iliac spine (PSIS)
- Posterior inferior iliac spine (PIIS)
- Iliac fossa
- Gluteal surface
- Auricular surface
- Arcuate line

</details>
<details class="tree">
<summary>Pelvic ligaments <span class="count">— 7</span></summary>

- Iliolumbar ligament
- Anterior sacroiliac ligament
- Interosseous sacroiliac ligament
- Posterior sacroiliac ligament
- Sacrotuberous ligament
- Sacrospinous ligament
- Iliac portion of the inguinal ligament

</details>
<details class="tree">
<summary>Pelvic bony conditions <span class="count">— 11</span></summary>

- Iliac crest contusion
- Iliac crest fracture
- Iliac wing fracture
- Iliac stress fracture
- Iliac apophysitis
- ASIS avulsion fracture
- AIIS avulsion fracture
- ASIS apophysitis
- AIIS apophysitis
- Iliac enthesopathy
- Sacroiliac joint pathology

</details>
<details class="tree">
<summary>Bones / bony landmarks from Ischium bone: <span class="count">— 7</span></summary>

- Ischium
- Ischial body
- Ischial ramus
- Ischial tuberosity
- Ischial spine
- Greater sciatic notch
- Lesser sciatic notch

</details>
<details class="tree">
<summary>Major ligaments <span class="count">— 5</span></summary>

- Sacrotuberous ligament
- Sacrospinous ligament
- Ischiofemoral ligament
- Posterior sacroiliac ligament
- Interosseous sacroiliac ligament

</details>
<details class="tree">
<summary>Common associated conditions <span class="count">— 10</span></summary>

- Ischial tuberosity fracture
- Ischial stress fracture
- Ischial apophysitis
- Ischial tuberosity avulsion
- Proximal hamstring avulsion
- Proximal hamstring tendinopathy
- Ischial bursitis
- Ischial enthesopathy
- Ischial nerve-related pain
- Ischiogluteal bursitis

</details>
<details class="tree">
<summary>Bones / bony landmarks- Pubis bone <span class="count">— 10</span></summary>

- Pubic body
- Superior pubic ramus
- Inferior pubic ramus
- Pubic crest
- Pubic tubercle
- Pectineal line
- Superior pubic ramus
- Inferior pubic ramus
- Ischiopubic ramus
- Pubic symphysis

</details>
<details class="tree">
<summary>Common associated conditions <span class="count">— 15</span></summary>

- Osteitis pubis
- Pubic symphysis dysfunction
- Pubic symphysis instability
- Pubic symphysis diastasis
- Pubic symphysis arthritis
- Pubic ramus fracture
- Pubic ramus stress fracture
- Pubic bone stress injury
- Adductor origin injury
- Athletic pubalgia
- Core muscle injury
- Rectus abdominis–adductor injury
- Pubic osteomyelitis
- Acetabulum- needs to be added as a keyword as it forms part of the hip joint- (the area of the
- hip joint known as ‘the socket’- and formed by the ilium, ischium and pubis):

</details>
<details class="tree">
<summary>Structures <span class="count">— 6</span></summary>

- Acetabular rim
- Acetabular fossa
- Lunate surface
- Acetabular notch
- Transverse acetabular ligament
- Acetabular labrum

</details>
<details class="tree">
<summary>Common associated conditions <span class="count">— 11</span></summary>

- Acetabular fracture
- Acetabular stress fracture
- Acetabular dysplasia
- Acetabular retroversion
- Acetabular overcoverage
- Femoroacetabular impingement
- Acetabular labral tear
- Acetabular cartilage injury
- Hip instability
- Hip dislocation
- Hip osteoarthritis

</details>
<details class="tree">
<summary>Sacroiliac joint- Bones / structures <span class="count">— 6</span></summary>

- Sacrum
- Ilium
- Sacral auricular surface
- Iliac auricular surface
- SI joint capsule
- SI joint articular surfaces

</details>
<details class="tree">
<summary>Common associated conditions <span class="count">— 13</span></summary>

- Sacroiliac joint dysfunction
- Sacroiliitis
- SI joint sprain
- SI joint instability
- SI joint hypermobility
- SI joint hypomobility
- SI joint osteoarthritis
- SI joint ankylosis
- SI joint fracture
- SI joint fracture-dislocation
- Inflammatory sacroiliitis
- Infectious sacroiliitis
- Pregnancy-related SI dysfunction

</details>
<details class="tree">
<summary>Sacrum Bones / structures <span class="count">— 9</span></summary>

- Sacrum
- Sacral promontory
- Sacral ala
- Sacral canal
- Sacral foramina
- Sacral hiatus
- Sacral cornua
- Sacral bodies
- Sacral articular processes

</details>
<details class="tree">
<summary>Common associated conditions <span class="count">— 9</span></summary>

- Sacral fracture
- Sacral stress fracture
- Sacral insufficiency fracture
- Sacroiliitis
- Sacral stress reaction
- Sacral tumour
- Sacral osteomyelitis
- Sacral nerve-root compression
- Sacralization/lumbosacral transitional anatomy

</details>
<details class="tree">
<summary>Coccyx Bones / structures <span class="count">— 5</span></summary>

- Coccyx
- Coccygeal vertebrae
- Coccygeal cornua
- Sacrococcygeal joint
- Anococcygeal region

</details>
<details class="tree">
<summary>Common associated conditions <span class="count">— 8</span></summary>

- Coccydynia
- Coccygeal fracture
- Coccygeal dislocation
- Coccygeal subluxation
- Coccygeal instability
- Sacrococcygeal joint degeneration
- Coccygeal osteoarthritis
- Post-traumatic coccygeal pain

</details>
<details class="tree">
<summary>Pelvic ring- needs to be added as an individual term- Bones / structures (already <span class="count">— 0</span></summary>


</details>
<details class="tree">
<summary>detailed above) <span class="count">— 9</span></summary>

- Sacrum
- Right innominate bone
- Left innominate bone
- Ilium
- Ischium
- Pubis
- Pubic symphysis
- Sacroiliac joints
- Acetabula/Acetabulum

</details>
<details class="tree">
<summary>Common injuries- not already detailed above <span class="count">— 12</span></summary>

- Pelvic ring fracture
- Stable pelvic fracture
- Unstable pelvic fracture
- Open pelvic fracture
- APC injury
- Lateral compression injury
- Vertical shear injury
- Combined-mechanism injury
- Pubic symphysis disruption
- SI joint disruption
- Pelvic ring diastasis
- Pelvic stress fracture

</details>
<details class="tree">
<summary>Inguinal region-This is worth separating because it is a major source of groin/pubic pain. <span class="count">— 0</span></summary>


</details>
<details class="tree">
<summary>Structures <span class="count">— 9</span></summary>

- Inguinal canal
- Deep inguinal ring
- Superficial inguinal ring
- Pubic tubercle
- Pubic crest
- Pectineal line
- Conjoint tendon
- Rectus sheath
- Transversalis fascia

</details>
<details class="tree">
<summary>Common conditions <span class="count">— 7</span></summary>

- Inguinal hernia
- Femoral hernia
- Sports hernia
- Athletic pubalgia
- Inguinal-related groin pain
- Conjoint tendon injury
- Abdominal wall injury

</details>
<details class="tree">
<summary>Pelvic floor Muscles <span class="count">— 5</span></summary>

- Levator ani
  - Puborectalis
  - Pubococcygeus
  - Iliococcygeus
- Coccygeus

</details>
<details class="tree">
<summary>Common conditions <span class="count">— 10</span></summary>

- Pelvic floor muscle weakness
- Pelvic floor hypertonicity
- Pelvic floor myalgia
- Pelvic floor muscle spasm
- Levator ani syndrome
- Pelvic floor muscle injury
- Levator ani avulsion
- Pelvic floor dysfunction
- Pelvic floor muscle trigger points
- Pelvic floor muscle coordination disorders

</details>
<details class="tree">
<summary>Perineum: <span class="count">— 0</span></summary>


</details>
<details class="tree">
<summary>Muscles <span class="count">— 7</span></summary>

- Superficial transverse perineal
- Deep transverse perineal
- Ischiocavernosus
- Bulbospongiosus
- External anal sphincter
- Compressor urethrae
- Sphincter urethrovaginalis

</details>
<details class="tree">
<summary>Common conditions <span class="count">— 6</span></summary>

- Perineal muscle injury
- Pelvic floor muscle injury
- Perineal pain
- Perineal muscle spasm
- Pelvic floor dysfunction
- Obstetric pelvic floor injury

</details>
<details class="tree">
<summary>Pelvic ligaments: <span class="count">— 0</span></summary>


</details>
<details class="tree">
<summary>Sacroiliac / posterior pelvis <span class="count">— 7</span></summary>

- Anterior sacroiliac ligament
- Interosseous sacroiliac ligament
- Short posterior sacroiliac ligament
- Long posterior sacroiliac ligament
- Sacrotuberous ligament
- Sacrospinous ligament
- Iliolumbar ligament

</details>
<details class="tree">
<summary>Pubic / anterior pelvis <span class="count">— 8</span></summary>

- Superior pubic ligament
- Inferior pubic ligament
- Anterior pubic ligament
- Posterior pubic ligament
- Inguinal ligament
- Lacunar ligament
- Pectineal ligament
- Reflected inguinal ligament

</details>
<details class="tree">
<summary>Hip / acetabulum <span class="count">— 5</span></summary>

- Iliofemoral ligament
- Pubofemoral ligament
- Ischiofemoral ligament
- Transverse acetabular ligament
- Ligament of head of femur

</details>
<details class="tree">
<summary>Sacrum / coccyx <span class="count">— 4</span></summary>

- Anterior sacrococcygeal ligament
- Posterior sacrococcygeal ligament
- Lateral sacrococcygeal ligaments
- Intercornual ligaments

</details>
<details class="tree">
<summary>Pelvic floor / perineum <span class="count">— 6</span></summary>

- Arcus tendineus levator ani
- Sacrospinous ligament
- Sacrotuberous ligament
- Anococcygeal ligament/raphe
- Perineal membrane
- Endopelvic fascial condensations

</details>
</details>
</details>

---

## Part 2 — Synonyms

Each table maps one **preferred term** to the alternatives that should resolve to it.

<details class="tree lvl1">
<summary>A. General musculoskeletal terminology <span class="count">— 11 terms, 27 synonyms</span></summary>

| Preferred term | Synonyms / alternative terms |
|---|---|
| Musculoskeletal disorder | Musculoskeletal disease; musculoskeletal condition; MSK disorder; MSK condition |
| Musculoskeletal injury | MSK injury; musculoskeletal trauma |
| Musculoskeletal pain | MSK pain; musculoskeletal pains |
| Rheumatic disease | Rheumatic disorder; rheumatic condition; rheumatism |
| Joint disease | Joint disorder; arthropathy; arthropathies |
| Bone disease | Bone disorder; osteopathy; osteopathy disorder |
| Muscle disease | Muscular disease; muscle disorder; myopathy |
| Soft-tissue disorder | Soft-tissue disease; soft-tissue condition |
| Connective-tissue disease | Connective-tissue disorder; connective tissue disorder |
| Orthopaedic disorder | Orthopedic disorder; orthopaedic condition; orthopedic condition |
| Reinjury | — |

</details>
<details class="tree lvl1">
<summary>B. Arthritis and inflammatory joint disorders <span class="count">— 29 terms, 66 synonyms</span></summary>

| Preferred term | Synonyms / alternative terms |
|---|---|
| Osteoarthritis | OA; osteoarthrosis; degenerative joint disease; DJD; degenerative arthritis; arthrosis |
| Rheumatoid arthritis | RA; rheumatoid disease; rheumatoid polyarthritis |
| Juvenile idiopathic arthritis | JIA; juvenile arthritis; juvenile rheumatoid arthritis; JRA |
| Psoriatic arthritis | PsA; psoriatic arthropathy |
| Gout | Gouty arthritis; gouty arthropathy |
| Calcium pyrophosphate deposition disease | CPPD; CPPD disease; calcium pyrophosphate crystal deposition disease; pseudogout* |
| Reactive arthritis | Reiter syndrome; Reiter's disease; post- infectious arthritis |
| Septic arthritis | Infectious arthritis; pyogenic arthritis; bacterial arthritis |
| Viral arthritis | Viral arthropathy; viral-associated arthritis |
| Enteropathic arthritis | Enteropathic arthropathy; IBD-associated arthritis |
| Undifferentiated arthritis | Undifferentiated inflammatory arthritis |
| Inflammatory arthritis | Inflammatory joint disease; inflammatory arthropathy |
| Palindromic rheumatism | Palindromic arthritis; palindromic arthropathy |
| Arthritis | Arthritic disease; joint inflammation |
| Arthropathy | Joint disorder; joint disease |
| Polyarthritis | Multiple-joint arthritis |
| Monoarthritis | Single-joint arthritis |
| Oligoarthritis | Pauciarthritis |
| Arthralgia | Joint pain; joint ache |
| Synovitis | Synovial inflammation; inflammation of synovium |
| Tenosynovitis | Tendon-sheath inflammation |
| Bursitis | Bursa inflammation; inflammation of a bursa |
| Joint effusion | Joint fluid; synovial effusion; hydrarthrosis |
| Hemarthrosis | Haemarthrosis; bleeding into joint; joint haemorrhage |
| Joint contracture | Contracture; fixed joint stiffness |
| Joint instability | Joint laxity; ligamentous instability |
| Joint stiffness | Articular stiffness; stiffness of joint |
| Joint dislocation | Luxation; complete joint dislocation |
| Subluxation | Partial dislocation; incomplete dislocation |

</details>
<details class="tree lvl1">
<summary>C. Spondyloarthritis and spinal inflammatory disease <span class="count">— 14 terms, 24 synonyms</span></summary>

| Preferred term | Synonyms / alternative terms |
|---|---|
| Spondyloarthritis | Spondyloarthropathy; spondylarthritis; SpA |
| Ankylosing spondylitis | AS; ankylosing spondyloarthritis; Bechterew disease; Marie-Strümpell disease |
| Axial spondyloarthritis | AxSpA; axial SpA |
| Radiographic axial spondyloarthritis | r-axSpA |
| Non-radiographic axial spondyloarthritis | nr-axSpA |
| Peripheral spondyloarthritis | Peripheral SpA |
| Psoriatic spondyloarthritis | Psoriatic SpA |
| Reactive spondyloarthritis | Reactive SpA |
| Sacroiliitis | Sacroiliac joint inflammation; SI-joint inflammation |
| Spondylitis | Vertebral inflammation; spinal inflammation |
| Spondylosis | Spinal osteoarthritis; degenerative spinal disease |
| Cervical spondylosis | Cervical degenerative disease; neck spondylosis |
| Lumbar spondylosis | Lumbar degenerative disease |
| Thoracic spondylosis | Thoracic degenerative disease |

</details>
<details class="tree lvl1">
<summary>D. Connective-tissue and systemic rheumatic disorders <span class="count">— 17 terms, 33 synonyms</span></summary>

| Preferred term | Synonyms / alternative terms |
|---|---|
| Systemic lupus erythematosus | SLE; lupus; lupus erythematosus |
| Systemic sclerosis | Scleroderma; systemic scleroderma |
| Sjögren syndrome | Sjögren's syndrome; Sjögren disease |
| Mixed connective-tissue disease | MCTD |
| Dermatomyositis | DM; inflammatory myopathy with cutaneous involvement |
| Polymyositis | PM; inflammatory myopathy |
| Immune-mediated necrotising myopathy | IMNM; necrotising autoimmune myopathy |
| Polymyalgia rheumatica | PMR; polymyalgia |
| Adult-onset Still disease | AOSD; adult Still disease |
| Behçet disease | Behçet syndrome; Behçet's disease |
| Antiphospholipid syndrome | APS; Hughes syndrome |
| Systemic vasculitis | Vasculitic disease; systemic vasculitis |
| Giant cell arteritis | GCA; temporal arteritis |
| Takayasu arteritis | Takayasu disease; aortic arch syndrome |
| Granulomatosis with polyangiitis | GPA; Wegener granulomatosis |
| Microscopic polyangiitis | MPA |
| Eosinophilic granulomatosis with polyangiitis | EGPA; Churg-Strauss syndrome |

</details>
<details class="tree lvl1">
<summary>E. Bone-density and metabolic bone disorders <span class="count">— 14 terms, 25 synonyms</span></summary>

| Preferred term | Synonyms / alternative terms |
|---|---|
| Osteoporosis | Bone loss; porous bone disease |
| Osteopenia | Low bone mineral density; reduced BMD |
| Osteomalacia | Adult rickets; defective bone mineralisation |
| Rickets | Childhood osteomalacia; nutritional rickets |
| Osteogenesis imperfecta | OI; brittle bone disease |
| Paget disease of bone | Paget's disease of bone; osteitis deformans |
| Osteonecrosis | Avascular necrosis; AVN; aseptic necrosis; ischaemic bone necrosis |
| Osteochondrosis | Osteochondrosis disorder |
| Hyperostosis | Excessive bone formation |
| Osteopetrosis | Marble bone disease |
| Fibrous dysplasia | Fibro-osseous dysplasia |
| Osteitis fibrosa cystica | Brown tumour disease; osteodystrophia fibrosa |
| Renal osteodystrophy | Renal bone disease |
| Hyperparathyroid bone disease | Osteitis fibrosa; hyperparathyroid osteopathy |

</details>
<details class="tree lvl1">
<summary>F. Bone infection and inflammation <span class="count">— 7 terms, 8 synonyms</span></summary>

| Preferred term | Synonyms / alternative terms |
|---|---|
| Osteomyelitis | Bone infection; infection of bone |
| Acute osteomyelitis | Acute bone infection |
| Chronic osteomyelitis | Chronic bone infection |
| Osteitis | Bone inflammation |
| Periostitis | Periosteal inflammation |
| Infectious osteitis | Infectious bone inflammation |
| Osteochondritis | Osteochondral inflammation |

</details>
<details class="tree lvl1">
<summary>G. Bone tumours and tumour-like conditions <span class="count">— 11 terms, 17 synonyms</span></summary>

| Preferred term | Synonyms / alternative terms |
|---|---|
| Osteochondroma | Osteocartilaginous exostosis; exostosis |
| Osteosarcoma | Osteogenic sarcoma; osteoblastic sarcoma |
| Chondrosarcoma | Cartilage sarcoma |
| Ewing sarcoma | Ewing tumour; Ewing's sarcoma |
| Osteoma | Benign bone tumour |
| Osteoid osteoma | Osteoid osteoma |
| Enchondroma | Intramedullary cartilage tumour |
| Chondroblastoma | Chondroblastoma of bone |
| Giant cell tumour of bone | Osteoclastoma; giant-cell tumour |
| Aneurysmal bone cyst | ABC; aneurysmal bone cyst of bone |
| Simple bone cyst | Unicameral bone cyst; solitary bone cyst |

</details>
<details class="tree lvl1">
<summary>H. Fractures and bony trauma <span class="count">— 23 terms, 32 synonyms</span></summary>

| Preferred term | Synonyms / alternative terms |
|---|---|
| Bone fracture | Fracture; broken bone; bone break |
| Traumatic fracture | Injury fracture |
| Fragility fracture | Low-trauma fracture; osteoporotic fracture |
| Stress fracture | Fatigue fracture; stress injury |
| Insufficiency fracture | Insufficiency-type stress fracture |
| Pathological fracture | Pathologic fracture; disease-related fracture |
| Compression fracture | Vertebral compression fracture |
| Vertebral fracture | Spinal fracture; vertebral body fracture |
| Hip fracture | Proximal femoral fracture |
| Femoral neck fracture | Neck-of-femur fracture; NOF fracture |
| Intertrochanteric fracture | Pertrochanteric fracture |
| Subtrochanteric fracture | Subtrochanteric femoral fracture |
| Pelvic fracture | Pelvic ring fracture |
| Acetabular fracture | Fracture of acetabulum |
| Fracture-dislocation | Fracture dislocation |
| Avulsion fracture | Traction fracture; tendon/ligament avulsion fracture |
| Greenstick fracture | Incomplete paediatric fracture |
| Buckle fracture | Torus fracture |
| Open fracture | Compound fracture |
| Closed fracture | Simple fracture |
| Non-union | Fracture nonunion; non-united fracture |
| Delayed union | Delayed fracture healing |
| Malunion | Malunited fracture |

</details>
<details class="tree lvl1">
<summary>I. Muscle disorders <span class="count">— 20 terms, 34 synonyms</span></summary>

| Preferred term | Synonyms / alternative terms |
|---|---|
| Myalgia | Muscle pain; muscular pain |
| Myopathy | Muscle disease; muscular disorder |
| Myositis | Muscle inflammation; inflammatory myopathy |
| Fibromyalgia | Fibromyalgia syndrome; FMS |
| Myofascial pain syndrome | MPS; myofascial pain; trigger-point pain syndrome; myofascial; trigger point |
| Muscle weakness | Muscular weakness |
| Muscle stiffness | Muscular stiffness; muscle rigidity |
| Muscle spasm | Muscular spasm |
| Muscle cramp | Muscular cramp |
| Sarcopenia | Age-related muscle loss; loss of skeletal muscle mass |
| Rhabdomyolysis | Skeletal-muscle breakdown; muscle breakdown |
| Muscular dystrophy | Muscular dystrophies |
| Duchenne muscular dystrophy | DMD; Duchenne disease |
| Becker muscular dystrophy | BMD; Becker disease |
| Myotonic dystrophy | DM; dystrophia myotonica |
| Congenital myopathy | Congenital muscle disorder |
| Mitochondrial myopathy | Mitochondrial muscle disease |
| Metabolic myopathy | Metabolic muscle disease |
| Periodic paralysis | Periodic paralytic disorder |
| Myotonia | Myotonic disorder |

</details>
<details class="tree lvl1">
<summary>J. Muscle injuries <span class="count">— 11 terms, 16 synonyms</span></summary>

| Preferred term | Synonyms / alternative terms |
|---|---|
| Muscle injury | Muscle damage; muscular injury |
| Muscle tear | Muscle fibre tear; muscular tear |
| Muscle strain | Muscular strain; muscle injury |
| Partial muscle tear | Partial muscle rupture |
| Complete muscle tear | Complete muscle rupture |
| Muscle contusion | Muscle bruise; muscular contusion |
| Intramuscular haematoma | Muscle haematoma |
| Intermuscular haematoma | Intermuscular bleeding |
| Delayed-onset muscle soreness | DOMS; post-exercise muscle soreness |
| Exercise-induced muscle damage | EIMD |
| Muscle avulsion | Musculotendinous avulsion |

</details>
<details class="tree lvl1">
<summary>K. Tendon and enthesis disorders <span class="count">— 24 terms, 36 synonyms</span></summary>

| Preferred term | Synonyms / alternative terms |
|---|---|
| Tendinopathy | Tendon disorder; tendon disease |
| Tendinitis | Tendonitis; tendon inflammation |
| Tendinosis | Degenerative tendinopathy |
| Tenosynovitis | Tendon-sheath inflammation |
| Enthesopathy | Enthesis disorder; enthesopathies |
| Enthesitis | Enthesis inflammation |
| Tendon tear | Tendon rupture; tendon injury |
| Partial tendon tear | Partial tendon rupture |
| Complete tendon rupture | Complete tendon tear |
| Tendon avulsion | Tendon insertion avulsion |
| Achilles tendinopathy | Achilles tendinitis; Achilles tendon disorder |
| Achilles tendon rupture | Achilles rupture; ruptured Achilles |
| Patellar tendinopathy | Patellar tendinitis; jumper's knee |
| Rotator cuff tendinopathy | Rotator cuff tendinitis |
| Gluteal tendinopathy | Gluteal tendinosis; lateral hip tendinopathy |
| Hamstring tendinopathy | Proximal hamstring tendinopathy |
| Lateral epicondylitis | Tennis elbow; lateral elbow tendinopathy |
| Medial epicondylitis | Golfer's elbow; medial elbow tendinopathy |
| De Quervain tenosynovitis | De Quervain disease; De Quervain's tenosynovitis |
| Trigger finger | Stenosing tenosynovitis |
| Trigger thumb | Stenosing tenosynovitis of thumb |
| Peroneal tendinopathy | Fibularis tendinopathy |
| Posterior tibial tendinopathy | Tibialis posterior tendinopathy |
| Plantar fasciitis | Plantar fasciopathy; plantar fascial pain |

</details>
<details class="tree lvl1">
<summary>L. Ligament injuries and sprains <span class="count">— 26 terms, 31 synonyms</span></summary>

| Preferred term | Synonyms / alternative terms |
|---|---|
| Ligament injury | Ligamentous injury; ligament damage |
| Ligament sprain | Ligamentous sprain; sprained ligament |
| Ligament tear | Ligament rupture |
| Partial ligament tear | Partial ligament rupture |
| Complete ligament tear | Complete ligament rupture |
| Ligament avulsion | Ligament insertion avulsion |
| Ankle sprain | Ankle ligament sprain; lateral ankle sprain |
| Lateral ankle sprain | Low ankle sprain |
| High ankle sprain | Syndesmotic sprain; syndesmosis injury |
| ATFL injury | Anterior talofibular ligament injury |
| CFL injury | Calcaneofibular ligament injury |
| Deltoid ligament injury | Medial ankle ligament injury |
| ACL injury | Anterior cruciate ligament injury |
| ACL tear | Anterior cruciate ligament tear; ACL rupture |
| PCL injury | Posterior cruciate ligament injury |
| PCL tear | Posterior cruciate ligament tear |
| MCL injury | Medial collateral ligament injury |
| MCL tear | Medial collateral ligament tear |
| LCL injury | Lateral collateral ligament injury |
| LCL tear | Lateral collateral ligament tear |
| UCL injury | Ulnar collateral ligament injury |
| Tommy John injury | UCL injury of the elbow |
| UCL tear | Ulnar collateral ligament tear |
| TFCC injury | Triangular fibrocartilage complex injury |
| AC ligament injury | Acromioclavicular ligament injury |
| Coracoclavicular ligament injury | CC ligament injury |

</details>
<details class="tree lvl1">
<summary>M. Bursal disorders <span class="count">— 9 terms, 11 synonyms</span></summary>

| Preferred term | Synonyms / alternative terms |
|---|---|
| Bursitis | Inflamed bursa; bursal inflammation |
| Subacromial bursitis | Subdeltoid bursitis |
| Olecranon bursitis | Student's elbow |
| Prepatellar bursitis | Housemaid's knee |
| Infrapatellar bursitis | Clergyman's knee |
| Pes anserine bursitis | Pes anserinus bursitis |
| Trochanteric bursitis | Greater trochanteric bursitis |
| Ischial bursitis | Weaver's bottom; weaver's bursitis |
| Iliopsoas bursitis | Iliopectineal bursitis |

</details>
<details class="tree lvl1">
<summary>N. Spine, back and neck disorders <span class="count">— 29 terms, 52 synonyms</span></summary>

| Preferred term | Synonyms / alternative terms |
|---|---|
| Back pain | Dorsalgia; backache |
| Low back pain | LBP; lower back pain; lumbar pain; lumbalgia |
| Chronic low back pain | Chronic LBP; persistent low back pain |
| Neck pain | Cervicalgia; cervical pain |
| Thoracic back pain | Thoracic spine pain |
| Sciatica | Sciatic neuralgia; sciatic pain |
| Radiculopathy | Nerve-root disorder; nerve-root syndrome |
| Cervical radiculopathy | Cervical nerve-root disorder |
| Lumbar radiculopathy | Lumbar nerve-root disorder |
| Cervical myelopathy | Cervical spinal cord compression/ dysfunction |
| Spinal stenosis | Spinal canal stenosis |
| Cervical spinal stenosis | Cervical canal stenosis |
| Lumbar spinal stenosis | Lumbar canal stenosis |
| Intervertebral disc disorder | Disc disorder; disc disease |
| Disc degeneration | Intervertebral disc degeneration |
| Degenerative disc disease | DDD; degenerative intervertebral disc disease |
| Disc herniation | Herniated disc; slipped disc; prolapsed disc; ruptured disc |
| Disc protrusion | Disc bulge; protruding disc |
| Disc extrusion | Extruded disc; herniated disc |
| Spondylolisthesis | Vertebral slippage; slipped vertebra |
| Spondylolysis | Pars interarticularis defect; pars defect |
| Kyphosis | Hyperkyphosis; excessive kyphotic curvature |
| Lordosis | Hyperlordosis; excessive lumbar curvature |
| Scoliosis | Spinal curvature; lateral spinal curvature |
| Degenerative scoliosis | Adult degenerative scoliosis |
| Spinal deformity | Vertebral deformity; spinal malalignment |
| Coccygodynia | Coccydynia; tailbone pain |
| Sacroiliac joint dysfunction | SIJ dysfunction; sacroiliac joint disorder |
| Sacroiliac joint pain | SIJ pain |

</details>
<details class="tree lvl1">
<summary>O. Cartilage and osteochondral disorders <span class="count">— 10 terms, 16 synonyms</span></summary>

| Preferred term | Synonyms / alternative terms |
|---|---|
| Chondromalacia | Cartilage softening |
| Chondromalacia patellae | Patellar chondromalacia; patellar cartilage softening |
| Osteochondral lesion | Osteochondral defect; cartilage-bone lesion |
| Osteochondral defect | OCD; osteochondral lesion |
| Osteochondritis dissecans | OCD; osteochondral fragmentation |
| Chondropathy | Cartilage disorder; cartilage disease |
| Chondrosis | Cartilage degeneration |
| Meniscal tear | Meniscus tear; meniscal injury |
| Meniscal degeneration | Degenerative meniscal disease |
| Meniscopathy | Meniscal disorder |

</details>
<details class="tree lvl1">
<summary>P. Hip disorders <span class="count">— 14 terms, 19 synonyms</span></summary>

| Preferred term | Synonyms / alternative terms |
|---|---|
| Hip osteoarthritis | Hip OA; hip arthrosis |
| Hip arthropathy | Hip joint disorder |
| Femoroacetabular impingement | FAI; hip impingement |
| Acetabular dysplasia | Developmental dysplasia of the hip; DDH* |
| Hip dysplasia | Developmental hip dysplasia |
| Greater trochanteric pain syndrome | GTPS; lateral hip pain syndrome |
| Gluteal tendinopathy | Lateral hip tendinopathy |
| Hip labral tear | Acetabular labral tear |
| Iliopsoas syndrome | Internal snapping hip |
| Snapping hip syndrome | Coxa saltans |
| External snapping hip | External coxa saltans |
| Internal snapping hip | Internal coxa saltans |
| Meralgia paraesthetica | Lateral femoral cutaneous nerve entrapment |
| Hip flexor strain | Iliopsoas strain; hip flexor injury |

</details>
<details class="tree lvl1">
<summary>Q. Knee disorders <span class="count">— 17 terms, 25 synonyms</span></summary>

| Preferred term | Synonyms / alternative terms |
|---|---|
| Knee osteoarthritis | Knee OA; knee arthrosis |
| Patellofemoral pain syndrome | PFPS; patellofemoral syndrome; runner's knee |
| Patellofemoral disorder | Patellofemoral dysfunction |
| Patellar instability | Patellar dislocation tendency; kneecap instability |
| Patellar dislocation | Kneecap dislocation |
| Patellar subluxation | Partial patellar dislocation |
| Patellar tendinopathy | Jumper's knee; patellar tendinitis |
| Osgood-Schlatter disease | Tibial tubercle apophysitis |
| Sinding-Larsen-Johansson syndrome | Inferior patellar pole apophysitis |
| Hoffa's fat-pad syndrome | Infrapatellar fat-pad impingement |
| Iliotibial band syndrome | ITBS; runner's knee* |
| Meniscal injury | Meniscus injury |
| Meniscal tear | Torn meniscus |
| Baker cyst | Popliteal cyst; popliteal synovial cyst |
| Knee effusion | Water on the knee; knee joint effusion |
| Knee instability | Knee laxity |
| Chondromalacia patellae | Patellofemoral cartilage degeneration |

</details>
<details class="tree lvl1">
<summary>R. Foot and ankle disorders <span class="count">— 21 terms, 34 synonyms</span></summary>

| Preferred term | Synonyms / alternative terms |
|---|---|
| Flat foot | Pes planus; fallen arches |
| High-arched foot | Pes cavus; cavus foot |
| Hallux valgus | Bunions; bunion deformity |
| Hallux rigidus | Stiff big toe; rigid great toe |
| Hallux limitus | Limited great-toe motion |
| Hammer toe | Hammertoe; lesser-toe flexion deformity |
| Claw toe | Claw-toe deformity |
| Mallet toe | Mallet-toe deformity |
| Metatarsalgia | Forefoot pain; metatarsal pain |
| Morton's neuroma | Interdigital neuroma; Morton's metatarsalgia |
| Plantar fasciitis | Plantar fasciopathy; plantar fascial pain |
| Heel spur | Calcaneal spur; calcaneal osteophyte |
| Achilles tendinopathy | Achilles tendinitis |
| Posterior tibial tendon dysfunction | PTTD; tibialis posterior tendon dysfunction |
| Adult acquired flatfoot deformity | AAFD; progressive collapsing foot deformity |
| Peroneal tendinopathy | Fibularis tendinopathy |
| Tarsal tunnel syndrome | Tibial nerve entrapment |
| Ankle instability | Chronic ankle instability; functional ankle instability |
| Ankle impingement | Ankle impingement syndrome |
| Osteochondral lesion of talus | Talar osteochondral lesion; talar dome lesion |
| Sever disease | Calcaneal apophysitis |

</details>
<details class="tree lvl1">
<summary>S. Hand, wrist and elbow disorders <span class="count">— 16 terms, 21 synonyms</span></summary>

| Preferred term | Synonyms / alternative terms |
|---|---|
| Carpal tunnel syndrome | CTS; median nerve entrapment at wrist |
| Cubital tunnel syndrome | Ulnar neuropathy at elbow |
| De Quervain tenosynovitis | De Quervain disease |
| Trigger finger | Stenosing tenosynovitis |
| Trigger thumb | Stenosing tenosynovitis of thumb |
| Dupuytren disease | Dupuytren's contracture |
| Ganglion cyst | Ganglion; synovial cyst |
| Tennis elbow | Lateral epicondylitis; lateral elbow tendinopathy |
| Golfer's elbow | Medial epicondylitis; medial elbow tendinopathy |
| Olecranon bursitis | Student's elbow |
| Wrist sprain | Wrist ligament injury |
| Scapholunate ligament injury | SL ligament injury |
| TFCC injury | Triangular fibrocartilage complex injury |
| Ulnar-sided wrist pain | Ulnar wrist pain |
| Thumb UCL injury | Skier's thumb; gamekeeper's thumb |
| Distal radioulnar joint instability | DRUJ instability |

</details>
<details class="tree lvl1">
<summary>T. Shoulder disorders <span class="count">— 20 terms, 22 synonyms</span></summary>

| Preferred term | Synonyms / alternative terms |
|---|---|
| Rotator cuff disorder | Rotator cuff disease; rotator cuff tendinopathy |
| Rotator cuff tendinopathy | Rotator cuff tendinitis |
| Rotator cuff tear | Rotator cuff rupture |
| Subacromial pain syndrome | Shoulder impingement syndrome; subacromial impingement |
| Shoulder impingement | Subacromial impingement |
| Subacromial bursitis | Subdeltoid bursitis |
| Adhesive capsulitis | Frozen shoulder |
| Glenohumeral osteoarthritis | Shoulder OA |
| Shoulder instability | Glenohumeral instability |
| Shoulder dislocation | Glenohumeral dislocation |
| Shoulder subluxation | Glenohumeral subluxation |
| Labral tear | Glenoid labral tear |
| SLAP lesion | Superior labral anterior-to-posterior lesion |
| Biceps tendinopathy | Long-head biceps tendinopathy |
| Biceps tendon rupture | Biceps rupture |
| AC joint osteoarthritis | Acromioclavicular osteoarthritis |
| AC joint injury | Acromioclavicular joint injury |
| AC joint separation | Acromioclavicular separation |
| Scapular dyskinesis | Scapular movement dysfunction |
| Snapping scapula syndrome | Scapulothoracic bursitis |

</details>
<details class="tree lvl1">
<summary>U. Temporomandibular and craniofacial musculoskeletal disorders <span class="count">— 6 terms, 7 synonyms</span></summary>

| Preferred term | Synonyms / alternative terms |
|---|---|
| Temporomandibular disorder | TMD; TMJ disorder |
| Temporomandibular joint dysfunction | TMJ dysfunction |
| TMJ arthralgia | Temporomandibular joint pain |
| TMJ osteoarthritis | Temporomandibular osteoarthritis |
| TMJ disc displacement | Internal derangement of TMJ |
| Masticatory myofascial pain | Myofascial jaw pain |

</details>

### Injury grading scales

Four grading scales close Part 2 (source pp. 54–55). In the original these are loose text rather
than tables — only the "Grade 1" ligament row was laid out as one — so they are reconstructed here
in the same shape as the tables above. Each is reproduced exactly as supplied; the gaps are real and
are raised in [Appendix A](#appendix-a--things-to-check-with-andrew).

#### UK muscle-injury grading — BAMIC

British Athletics Muscle Injury Classification — 'BAMIC'. The source notes that **both terms are
needed as tags** (the full name and the abbreviation), and lists the grades required to cover the
scale:

`0a` · `0b` · `2a` · `2b` · `2c` · `3a` · `3b` · `3c` · `4` · `4c`

> **Grades 1a, 1b and 1c are absent from the source list.** Reproduced as supplied — see Appendix A.1.

#### UK ligamentous-injury grading

The source also notes that **MRI and "Magnetic resonance imaging" are both needed as tags**.

| Preferred term | Synonyms / alternative terms |
|---|---|
| Grade 1 | Grade I; grade I sprain; mild ligament sprain; mild; ligament stretch; low grade ligament injury; low grade ligament tear |
| Grade 2 | Grade II; grade II sprain; moderate ligament injury; partial ligament tear; partial ligament rupture |
| Grade 3 | Grade III; grade III sprain; severe ligament injury; complete ligament tear; complete ligament rupture; high grade ligament |

#### UK cartilage injury grading

"Grades for tags", with the note that **both the number and the letter are needed as separate tags**:

| Grade | As supplied |
|---|---|
| 1 | `1/I` |
| 2 | `2/II` |
| 3 | `3/II` |

> **`3/II` is presumably a typo for `3/III`, and there is no grade 4.** Reproduced as supplied — see
> Appendix A.2.

#### Types of meniscal tear

- Horizontal
- Vertical/longitudinal
- Radial
- Oblique
- Complex
- Bucket-handle (also known as displaced longitudinal)
- Root tear
- Flap tear


---

## Part 3 — Assessment, treatment and equipment vocabulary

Fifteen numbered sections. Entries written `Name — Abbreviation` in the source have the abbreviation split into its own column.

<details class="tree lvl1">
<summary>1. Assessment & Clinical Examination <span class="count">— 77 terms, 10 groups</span></summary>

<details class="tree">
<summary>Pain assessment <span class="count">— 8</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Visual Analogue Scale | VAS |
| Numeric Rating Scale | NRS / NPRS |
| Verbal Rating Scale | VRS |
| Pain Drawing | Body Chart / Pain Map |
| Pressure Pain Threshold | PPT |
| Mechanical Pain Threshold | MPT |
| Movement-Evoked Pain | MEP |
| Central Sensitisation Inventory | CSI |

</details>
<details class="tree">
<summary>Range of motion <span class="count">— 5</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Active Range of Motion | AROM |
| Passive Range of Motion | PROM |
| Active-Assisted Range of Motion | AAROM |
| Goniometry | Goniometric ROM |
| Inclinometry | Digital Inclinometer |

</details>
<details class="tree">
<summary>Flexibility <span class="count">— 9</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Straight-Leg Raise | SLR / Lasègue Test |
| Slump Test | Slump Neural Tension Test |
| Sit-and-Reach Test | S&R |
| Thomas Test | — |
| Modified Thomas Test | — |
| Ober Test | — |
| Ely's Test | — |
| Silfverskiöld Test | — |
| Craig's Test / Ryder Test | — |

</details>
<details class="tree">
<summary>Strength <span class="count">— 13</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Manual Muscle Testing | MMT |
| Medical Research Council Scale | MRC |
| Hand-Held Dynamometry | HHD |
| Isokinetic Dynamometry | — |
| Isometric Strength Testing | — |
| One-Repetition Maximum | 1RM |
| Three-Repetition Maximum | 3RM |
| Five-Repetition Maximum | 5RM |
| Ten-Repetition Maximum | 10RM |
| Maximal Voluntary Isometric Contraction | MVIC / MVC |
| Grip Strength Testing | — |
| Pinch Strength Testing | — |
| Muscular Endurance Testing | — |

</details>
<details class="tree">
<summary>Functional mobility <span class="count">— 9</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Timed Up and Go | TUG |
| Five Times Sit-to-Stand | 5xSTS / 5STS |
| 30-Second Sit-to-Stand | 30sSTS / 30CST |
| 6-Minute Walk Test | 6MWT |
| 2-Minute Walk Test | 2MWT |
| 10-Metre Walk Test | 10MWT |
| 400-Metre Walk Test | 400MWT |
| Stair Climb Test | SCT |
| Stair-Climb Power Test | SCPT |

</details>
<details class="tree">
<summary>Balance <span class="count">— 9</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Berg Balance Scale | BBS |
| Functional Reach Test | FRT |
| Single-Leg Stance | SLS |
| Single-Leg Balance Test | — |
| Y-Balance Test | YBT |
| Star Excursion Balance Test | SEBT |
| Tandem Stance | — |
| Romberg Test | — |
| Sharpened Romberg Test | — |

</details>
<details class="tree">
<summary>Proprioception / sensorimotor <span class="count">— 5</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Joint Position Sense | JPS |
| Joint Repositioning Error | JRE |
| Proprioception Testing | — |
| Kinesthesia Testing | — |
| Balance Error Scoring System | BESS |

</details>
<details class="tree">
<summary>Movement assessment <span class="count">— 8</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Functional Movement Screen | FMS |
| Selective Functional Movement Assessment | SFMA |
| Movement Competency Assessment | MCA |
| Functional Movement Assessment | FMA |
| Single-Leg Squat Assessment | SLS |
| Double-Leg Squat Assessment | DLS |
| Step-Down Test | — |
| Lateral Step-Down Test | — |

</details>
<details class="tree">
<summary>Gait assessment <span class="count">— 7</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Observational Gait Analysis | OGA |
| Instrumented Gait Analysis | — |
| 2D Gait Analysis | — |
| 3D Gait Analysis | — |
| Video Gait Analysis | — |
| Running Gait Analysis | — |
| Walking Speed Assessment | — |

</details>
<details class="tree">
<summary>Work/function <span class="count">— 4</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Functional Capacity Evaluation | FCE |
| Work Capacity Evaluation | WCE |
| Functional Performance Testing | — |
| Job-Specific Functional Testing | — |

</details>
</details>
<details class="tree lvl1">
<summary>2. Orthopaedic Special Tests <span class="count">— 85 terms, 3 groups</span></summary>

<details class="tree">
<summary>Shoulder <span class="count">— 40</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Neer Impingement Test | Neer Sign |
| Hawkins-Kennedy Test | Hawkins Test |
| Painful Arc Test | Painful Arc Sign |
| Empty Can Test | Jobe Test |
| Full Can Test | — |
| Drop Arm Test | Codman Drop-Arm Test |
| External Rotation Lag Sign | ERLS |
| Internal Rotation Lag Sign | IRLS |
| Lift-Off Test | Gerber Lift-Off Test |
| Belly-Press Test | Napoleon Test |
| Bear-Hug Test | — |
| Belly-Off Test | — |
| Hornblower's Sign | — |
| External Rotation Resistance Test | — |
| Internal Rotation Resistance Test | — |
| Speed's Test | — |
| Yergason's Test | — |
| O'Brien's Test | Active Compression Test |
| Crank Test | — |
| Clunk Test | — |
| Anterior Apprehension Test | — |
| Relocation Test | Jobe Relocation Test |
| Surprise Test | Release Test |
| Load-and-Shift Test | — |
| Sulcus Sign | — |
| Inferior Sulcus Test | — |
| Anterior Drawer Test | — |
| Posterior Drawer Test | — |
| Load-and-Shift Test | — |
| Jerk Test | — |
| Kim Test | — |
| Cross-Body Adduction Test | Scarf Test |
| AC Shear Test | — |
| Paxinos Test | — |
| Biceps Load Test I | — |
| Biceps Load Test II | — |
| O'Brien's Test | — |
| Crank Test | — |
| Anterior Slide Test | — |
| Dynamic Labral Shear Test | — |

</details>
<details class="tree">
<summary>Elbow <span class="count">— 17</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Cozen's Test | — |
| Mill's Test | — |
| Maudsley's Test | Resisted Middle-Finger Extension Test |
| Chair Lift Test | — |
| Book Test | — |
| Golfer's Elbow Test | — |
| Resisted Wrist Flexion Test | — |
| Valgus Stress Test | Medial Stress Test |
| Varus Stress Test | Lateral Stress Test |
| Moving Valgus Stress Test | — |
| Milking Maneuver | — |
| Tinel's Sign | Cubital Tunnel |
| Elbow Flexion Test | — |
| Ulnar Nerve Subluxation Test | — |
| Posterolateral Rotatory Drawer Test | — |
| Pivot Shift Test | Elbow |
| Chair Push-Up Test | — |

</details>
<details class="tree">
<summary>Wrist & Hand <span class="count">— 28</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Finkelstein Test | — |
| Eichhoff Test | — |
| WHAT Test | Wrist Hyperflexion and Abduction of the Thumb Test |
| Phalen's Test | — |
| Reverse Phalen's Test | Prayer Test |
| Tinel's Sign | — |
| Durkan's Test | Carpal Compression Test |
| Carpal Compression Test | — |
| Watson Test | Scaphoid Shift Test |
| Scaphoid Compression Test | — |
| Ballottement Test | — |
| DRUJ Ballottement Test | — |
| Piano Key Test | — |
| Grind Test | CMC Grind Test |
| Froment's Sign | — |
| Jeanne's Sign | — |
| Wartenberg's Sign | — |
| Bunnell-Littler Test | — |
| Elson Test | — |
| Modified Elson Test | — |
| Allen Test | — |
| Finkelstein Test | — |
| Eichhoff Test | — |
| Lunotriquetral Ballottement Test | — |
| Ulnar Fovea Sign | — |
| TFCC Load Test | — |
| Press Test | — |
| Piano Key Test | — |

</details>
</details>
<details class="tree lvl1">
<summary>3. Hip <span class="count">— 30 terms, 1 groups</span></summary>

<details class="tree">
<summary>(ungrouped) <span class="count">— 30</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| FABER Test | Patrick's Test |
| FADIR Test | — |
| Flexion-Adduction-Internal Rotation Test | — |
| Scour Test | Quadrant Test |
| Log Roll Test | — |
| Thomas Test | — |
| Modified Thomas Test | — |
| Ober Test | — |
| Trendelenburg Test | Trendelenburg Sign |
| Stinchfield Test | Resisted Straight-Leg Raise |
| Ely's Test | — |
| Craig's Test | Ryder Test |
| Drehmann's Sign | — |
| Hip Quadrant Test | — |
| Anterior Impingement Test | — |
| Posterior Impingement Test | — |
| Resisted Straight-Leg Raise | — |
| Resisted Hip Flexion Test | — |
| Resisted Hip Abduction Test | — |
| Resisted Hip Adduction Test | — |
| Resisted Hip Extension Test | — |
| Single-Leg Stance Test | — |
| Single-Leg Squat Test | — |
| FABER | — |
| FADIR | — |
| Scour | — |
| Log Roll | — |
| Thomas | — |
| Ober | — |
| Trendelenburg | — |

</details>
</details>
<details class="tree lvl1">
<summary>4. Knee <span class="count">— 41 terms, 1 groups</span></summary>

<details class="tree">
<summary>(ungrouped) <span class="count">— 41</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Lachman Test | — |
| Anterior Drawer Test | — |
| Pivot Shift Test | — |
| Posterior Drawer Test | — |
| Posterior Sag Sign | Godfrey Test |
| Quadriceps Active Test | — |
| Valgus Stress Test | — |
| Varus Stress Test | — |
| McMurray Test | — |
| Thessaly Test | — |
| Apley's Compression Test | Apley Grind Test |
| Apley's Distraction Test | — |
| Sweep Test | Bulge Sign |
| Patellar Apprehension Test | — |
| Clarke's Sign | Patellar Grind Test |
| J-Sign | — |
| Patellar Tap Test | — |
| Ballotable Patella Test | — |
| Noble Compression Test | — |
| Ober Test | — |
| Wilson Test | — |
| Dial Test | — |
| Slocum Test | — |
| Hughston's Plica Test | — |
| Plica Stutter Test | — |
| Waldron Test | — |
| Fairbank's Apprehension Test | — |
| Patellar Glide Test | — |
| Patellar Tilt Test | — |
| Step-Down Test | — |
| Single-Leg Squat Test | — |
| Thessaly | — |
| McMurray | — |
| Apley's | — |
| Lachman | — |
| Anterior Drawer | — |
| Pivot Shift | — |
| Posterior Drawer | — |
| Posterior Sag | — |
| Valgus Stress | — |
| Varus Stress | — |

</details>
</details>
<details class="tree lvl1">
<summary>5. Ankle & Foot <span class="count">— 27 terms, 1 groups</span></summary>

<details class="tree">
<summary>(ungrouped) <span class="count">— 27</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Anterior Drawer Test | Ankle Anterior Drawer |
| Talar Tilt Test | Inversion Stress Test |
| Kleiger Test | External Rotation Stress Test |
| Squeeze Test | Tibiofibular Squeeze Test |
| Thompson Test | Simmonds-Thompson Test |
| Matles Test | Matles Sign |
| Windlass Test | Jack Test |
| Tinel's Sign | Tarsal Tunnel |
| Silfverskiöld Test | — |
| Single-Leg Heel Raise | SLHR |
| Heel-Rise Test | — |
| Heel-Rise Endurance Test | — |
| Navicular Drop Test | — |
| Foot Posture Index | FPI |
| Forefoot-to-Rearfoot Test | — |
| First MTP Dorsiflexion Test | — |
| Mulder's Sign | — |
| Metatarsal Squeeze Test | — |
| Tinel's Test | — |
| Talar Tilt | — |
| Anterior Drawer | — |
| Squeeze Test | — |
| Kleiger Test | — |
| Thompson Test | — |
| Windlass Test | — |
| Single-Leg Hop Test | — |
| Single-Leg Balance Test | — |

</details>
</details>
<details class="tree lvl1">
<summary>6. Spine & Neurological MSK Testing <span class="count">— 53 terms, 4 groups</span></summary>

<details class="tree">
<summary>Cervical spine <span class="count">— 16</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Spurling Test | Foraminal Compression Test |
| Cervical Distraction Test | Traction Test |
| Upper Limb Tension Test | ULTT |
| ULTT1 | Median Nerve Bias |
| ULTT2a | Median Nerve Bias |
| ULTT2b | Radial Nerve Bias |
| ULTT3 | Ulnar Nerve Bias |
| Bakody Sign | Shoulder Abduction Sign |
| Cervical Rotation Test | — |
| Cervical Flexion-Rotation Test | FRT |
| Sharp-Purser Test | — |
| Alar Ligament Test | — |
| Transverse Ligament Test | — |
| Vertebral Artery Test | — |
| Cranio-Cervical Flexion Test | — |
| Deep Neck Flexor Endurance Test | — |

</details>
<details class="tree">
<summary>Thoracic spine <span class="count">— 7</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Thoracic Rotation Test | — |
| Thoracic Flexion Test | — |
| Thoracic Extension Test | — |
| Rib Spring Test | — |
| Rib Compression Test | — |
| Rib Expansion Test | — |
| Thoracic Mobility Testing | — |

</details>
<details class="tree">
<summary>Lumbar spine <span class="count">— 20</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Straight-Leg Raise | SLR |
| Crossed Straight-Leg Raise | Well-Leg SLR |
| Slump Test | — |
| Femoral Nerve Stretch Test | Prone Knee Bend |
| Prone Instability Test | PIT |
| Passive Lumbar Extension Test | — |
| Lumbar Flexion Test | — |
| Lumbar Extension Test | — |
| Lumbar Side-Flexion Test | — |
| Repeated Movement Testing | RMT |
| Centralisation Testing | — |
| Peripheralisation Testing | — |
| Active Straight-Leg Raise | ASLR |
| Schober Test | — |
| Modified Schober Test | — |
| Slump Test | — |
| Straight-Leg Raise | — |
| Crossed Straight-Leg Raise | — |
| Femoral Nerve Stretch | — |
| Prone Knee Bend | — |

</details>
<details class="tree">
<summary>Sacroiliac joint <span class="count">— 10</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| SIJ Distraction Test | — |
| SIJ Compression Test | — |
| Thigh Thrust Test | Posterior Shear Test |
| Sacral Thrust Test | — |
| Gaenslen's Test | — |
| FABER Test | — |
| Gillet Test | Stork Test |
| Standing Flexion Test | — |
| Seated Flexion Test | — |
| Fortin Finger Test | — |

</details>
</details>
<details class="tree lvl1">
<summary>7. Standardised MSK Outcome Measures <span class="count">— 65 terms, 9 groups</span></summary>

<details class="tree">
<summary>General <span class="count">— 9</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Patient-Specific Functional Scale | PSFS |
| Numeric Pain Rating Scale | NPRS |
| Visual Analogue Scale | VAS |
| Patient Global Impression of Change | PGIC |
| Global Rating of Change | GROC |
| Patient-Reported Outcomes Measurement Information System | PROMIS |
| PROMIS Physical Function | PROMIS-PF |
| Short Form-36 | SF-36 |
| EuroQol 5-Dimension | EQ-5D |

</details>
<details class="tree">
<summary>Spine <span class="count">— 6</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Oswestry Disability Index | ODI |
| Roland-Morris Disability Questionnaire | RMDQ / RMD |
| Neck Disability Index | NDI |
| Quebec Back Pain Disability Scale | QBPDS |
| Bournemouth Questionnaire | BQ |
| Fear-Avoidance Beliefs Questionnaire | FABQ |

</details>
<details class="tree">
<summary>Shoulder <span class="count">— 9</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Disabilities of the Arm, Shoulder and Hand | DASH |
| QuickDASH | — |
| Shoulder Pain and Disability Index | SPADI |
| American Shoulder and Elbow Surgeons Score | ASES |
| Constant-Murley Score | CMS |
| Oxford Shoulder Score | OSS |
| Western Ontario Rotator Cuff Index | WORC |
| Shoulder Disability Questionnaire | SDQ |
| University of California Los Angeles Shoulder Score | UCLA Shoulder Score |

</details>
<details class="tree">
<summary>Elbow <span class="count">— 5</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Patient-Rated Tennis Elbow Evaluation | PRTEE |
| Disabilities of the Arm, Shoulder and Hand | DASH |
| QuickDASH | — |
| Oxford Elbow Score | OES |
| Mayo Elbow Performance Score | MEPS |

</details>
<details class="tree">
<summary>Wrist & hand <span class="count">— 6</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Patient-Rated Wrist Evaluation | PRWE |
| Disabilities of the Arm, Shoulder and Hand | DASH |
| QuickDASH | — |
| Michigan Hand Outcomes Questionnaire | MHQ |
| Boston Carpal Tunnel Questionnaire | BCTQ |
| Carpal Tunnel Syndrome Assessment Questionnaire | CTSAQ |

</details>
<details class="tree">
<summary>Hip <span class="count">— 7</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Hip Disability and Osteoarthritis Outcome Score | HOOS |
| HOOS-PS | — |
| Hip Outcome Score | HOS |
| Oxford Hip Score | OHS |
| Harris Hip Score | HHS |
| Modified Harris Hip Score | mHHS |
| WOMAC | — |

</details>
<details class="tree">
<summary>Knee <span class="count">— 10</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Knee Injury and Osteoarthritis Outcome Score | KOOS |
| KOOS-PS | — |
| International Knee Documentation Committee | IKDC |
| Lysholm Knee Score | — |
| Tegner Activity Scale | — |
| Oxford Knee Score | OKS |
| WOMAC | — |
| Kujala Anterior Knee Pain Scale | AKPS |
| Cincinnati Knee Rating System | — |
| Marx Activity Rating Scale | — |

</details>
<details class="tree">
<summary>Foot & ankle <span class="count">— 8</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Foot and Ankle Ability Measure | FAAM |
| FAAM-ADL | — |
| FAAM-Sports | — |
| Foot Function Index | FFI |
| American Orthopaedic Foot & Ankle Society Score | AOFAS |
| Foot Health Status Questionnaire | FHSQ |
| Manchester-Oxford Foot Questionnaire | MOXFQ |
| Cumberland Ankle Instability Tool | CAIT |

</details>
<details class="tree">
<summary>Tendons <span class="count">— 5</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| VISA-A | Victorian Institute of Sport Assessment–Achilles |
| VISA-P | Victorian Institute of Sport Assessment–Patella |
| VISA-H | Victorian Institute of Sport Assessment–Hamstring |
| VISA-G | Victorian Institute of Sport Assessment–Gluteal |
| VISA-S | Victorian Institute of Sport Assessment–Shoulder |

</details>
</details>
<details class="tree lvl1">
<summary>8. Rehabilitation Methods <span class="count">— 114 terms, 7 groups</span></summary>

<details class="tree">
<summary>Range of motion / mobility <span class="count">— 18</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Active Range of Motion | AROM |
| Passive Range of Motion | PROM |
| Active-Assisted Range of Motion | AAROM |
| Joint Mobility Exercises | — |
| Joint Mobilisation | — |
| Self-Mobilisation | — |
| Mobility Exercises | — |
| Dynamic Mobility | — |
| Active Mobility | — |
| Passive Mobility | — |
| Stretching | — |
| Static Stretching | — |
| Dynamic Stretching | — |
| Ballistic Stretching | — |
| PNF Stretching | Proprioceptive Neuromuscular Facilitation |
| Contract-Relax Stretching | — |
| Hold-Relax Stretching | — |
| Agonist-Contract Stretching | — |

</details>
<details class="tree">
<summary>Strength / resistance <span class="count">— 19</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Therapeutic Exercise | TE |
| Exercise Therapy | — |
| Resistance Training | RT |
| Strength Training | — |
| Progressive Resistance Exercise | PRE |
| Progressive Resistance Training | PRT |
| Isometric Exercise | — |
| Isotonic Exercise | — |
| Isokinetic Exercise | — |
| Concentric Exercise | — |
| Eccentric Exercise | — |
| Eccentric Loading | — |
| Heavy Slow Resistance | HSR |
| Maximal Strength Training | — |
| Muscular Endurance Training | — |
| Hypertrophy Training | — |
| Power Training | — |
| Explosive Strength Training | — |
| Functional Strength Training | — |

</details>
<details class="tree">
<summary>Neuromuscular / motor control <span class="count">— 18</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Neuromuscular Training | NMT |
| Neuromuscular Re-education | — |
| Motor Control Exercise | MCE |
| Motor Control Training | — |
| Movement Retraining | — |
| Movement-Control Training | — |
| Proprioceptive Training | — |
| Sensorimotor Training | — |
| Joint Position Training | — |
| Balance Training | — |
| Postural Control Training | — |
| Perturbation Training | — |
| Reactive Balance Training | — |
| Coordination Training | — |
| Agility Training | — |
| Change-of-Direction Training | — |
| Dynamic Stability Training | — |
| Static Stability Training | — |

</details>
<details class="tree">
<summary>Functional rehabilitation <span class="count">— 17</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Functional Exercise | — |
| Functional Rehabilitation | — |
| Task-Specific Training | — |
| Activity-Specific Training | — |
| Gait Training / Biomechanics / Biomechanical | — |
| Walking Retraining | — |
| Running Retraining | — |
| Running Re-education | — |
| Return-to-Running Programme | RTR |
| Return-to-Sport Programme | RTS |
| Return-to-Play | RTP |
| Return-to-Work | RTW |
| Functional Capacity Training | — |
| Occupational Rehabilitation | — |
| Work Conditioning | — |
| Work Hardening | — |
| Sport-Specific Rehabilitation | — |

</details>
<details class="tree">
<summary>Plyometric / performance <span class="count">— 14</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Plyometric Training | Plyos |
| Stretch-Shortening Cycle Training | SSC |
| Jump Training | — |
| Hop Training | — |
| Landing Training | — |
| Deceleration Training | — |
| Acceleration Training | — |
| Sprint Training | — |
| Agility Training | — |
| Change-of-Direction Training | COD |
| Reactive Agility Training | — |
| Power Training | — |
| Explosive Training | — |
| Sports-Specific Conditioning | — |

</details>
<details class="tree">
<summary>Tendon rehabilitation <span class="count">— 12</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Progressive Tendon Loading | — |
| Tendon Loading Programme | — |
| Isometric Loading | — |
| Isotonic Loading | — |
| Eccentric Loading | — |
| Concentric Loading | — |
| Heavy Slow Resistance | HSR |
| Energy-Storage Loading | — |
| Energy-Storage and Release Training | — |
| Plyometric Loading | — |
| Return-to-Running Loading | — |
| Return-to-Sport Loading | — |

</details>
<details class="tree">
<summary>Pain / behavioural rehabilitation <span class="count">— 16</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Graded Activity | — |
| Graded Exposure | — |
| Activity Pacing | — |
| Load Management | — |
| Pain Education | — |
| Pain Neuroscience Education | PNE |
| Therapeutic Education | — |
| Self-Management | — |
| Cognitive Functional Therapy | CFT |
| Cognitive Behavioural Therapy | CBT |
| Behavioural Exercise Therapy | — |
| Fear-Avoidance Rehabilitation | — |
| Acceptance and Commitment Therapy | ACT |
| Relaxation Training | — |
| Breathing Exercises | — |
| Mindfulness-Based Rehabilitation | — |

</details>
</details>
<details class="tree lvl1">
<summary>9. Manual Therapy <span class="count">— 27 terms, 1 groups</span></summary>

<details class="tree">
<summary>(ungrouped) <span class="count">— 27</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Joint Mobilisation | JM |
| Joint Manipulation | — |
| Spinal Manipulation | SMT |
| Spinal Mobilisation | — |
| Passive Accessory Mobilisation | PAM |
| Physiological Mobilisation | — |
| Maitland Mobilisation | — |
| Maitland Grades I–V | — |
| Kaltenborn Mobilisation | — |
| Mulligan Mobilisation | — |
| Mobilisation With Movement | MWM |
| High-Velocity Low-Amplitude Manipulation | HVLA |
| Soft-Tissue Mobilisation | STM |
| Soft-Tissue Therapy | STT |
| Massage Therapy | — |
| Therapeutic Massage | — |
| Myofascial Release | MFR |
| Trigger-Point Therapy | — |
| Trigger-Point Release | — |
| Muscle Energy Technique | MET |
| Positional Release | — |
| Strain-Counterstrain | — |
| Active Release Technique | ART |
| Instrument-Assisted Soft-Tissue Mobilisation | IASTM |
| Scar Mobilisation | — |
| Scar Tissue Therapy | — |
| Manual Lymphatic Drainage | MLD |

</details>
</details>
<details class="tree lvl1">
<summary>10. Electrotherapy & Physical Modalities <span class="count">— 36 terms, 1 groups</span></summary>

<details class="tree">
<summary>(ungrouped) <span class="count">— 36</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Transcutaneous Electrical Nerve Stimulation | TENS |
| Neuromuscular Electrical Stimulation | NMES |
| Electrical Muscle Stimulation | EMS |
| Functional Electrical Stimulation | FES |
| Russian Stimulation | — |
| Interferential Current | IFC / IFT |
| Therapeutic Ultrasound | US |
| Phonophoresis | — |
| Sonophoresis | — |
| Low-Level Laser Therapy | LLLT |
| Photobiomodulation | PBM |
| Extracorporeal Shockwave Therapy | ESWT |
| Radial Shockwave Therapy | rESWT |
| Focused Shockwave Therapy | fESWT |
| Shortwave Diathermy | SWD |
| Pulsed Shortwave Diathermy | PSWD |
| Infrared Therapy | IR |
| Superficial Heat | — |
| Thermotherapy | — |
| Cryotherapy | — |
| Cold Therapy | — |
| Ice Therapy | — |
| Contrast Therapy | — |
| Hydrotherapy | — |
| Aquatic Therapy | — |
| Balneotherapy | — |
| Compression Therapy | — |
| Pneumatic Compression | — |
| Intermittent Pneumatic Compression | IPC |
| Mechanical Traction | — |
| Cervical Traction | — |
| Lumbar Traction | — |
| Biofeedback | — |
| Electromyographic Biofeedback | EMG-BF |
| Virtual Reality Rehabilitation | VR Rehab |
| Telerehabilitation | Telerehab |

</details>
</details>
<details class="tree lvl1">
<summary>11. Taping, Bracing & Orthotics <span class="count">— 43 terms, 1 groups</span></summary>

<details class="tree">
<summary>(ungrouped) <span class="count">— 43</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Kinesiology Tape | KT / Kinesiotape |
| Elastic Therapeutic Tape | ETT |
| Athletic Tape | — |
| Rigid Tape | — |
| Leukotape | — |
| McConnell Taping | — |
| Patellar Taping | — |
| Low-Dye Taping | — |
| Mulligan Taping | — |
| Ankle Brace | — |
| Ankle Orthosis | — |
| Knee Brace | — |
| Knee Orthosis | — |
| Hinged Knee Brace | — |
| Functional Knee Brace | — |
| ACL Brace | — |
| Functional ACL Orthosis | — |
| Wrist Splint | — |
| Wrist Orthosis | — |
| Thumb Spica | — |
| Thumb Orthosis | — |
| Elbow Brace | — |
| Elbow Orthosis | — |
| Shoulder Sling | — |
| Arm Sling | — |
| Cervical Collar | — |
| Neck Brace | — |
| Lumbar Support | — |
| Lumbar Orthosis | — |
| Sacroiliac Belt | SI Belt |
| Compression Sleeve | — |
| Compression Garment | — |
| Orthotic | — |
| Orthosis | — |
| Foot Orthosis | FO |
| Foot Orthotic | — |
| Insole | — |
| Footbed | — |
| Foot Insert | — |
| Heel Lift | — |
| Heel Raise | — |
| Ankle-Foot Orthosis | AFO |
| Knee-Ankle-Foot Orthosis | KAFO |

</details>
</details>
<details class="tree lvl1">
<summary>12. Rehabilitation Equipment <span class="count">— 103 terms, 7 groups</span></summary>

<details class="tree">
<summary>Resistance equipment <span class="count">— 17</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Dumbbells | — |
| Barbells | — |
| Kettlebells | — |
| Weight Machines | — |
| Cable Machines | — |
| Resistance Bands | — |
| Resistance Tubes | — |
| Theraband | — |
| Ankle Weights | — |
| Wrist Weights | — |
| Weighted Vest | — |
| Weight Plates | — |
| Medicine Ball | — |
| Slam Ball | — |
| Sandbag | — |
| Landmine | — |
| Pulley System | — |

</details>
<details class="tree">
<summary>Strength testing equipment <span class="count">— 7</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Hand-Held Dynamometer | HHD |
| Isokinetic Dynamometer - IKD | — |
| Isometric Dynamometer | — |
| Grip Dynamometer | — |
| Pinch Gauge | — |
| Force Plate | — |
| Force Platform | — |

</details>
<details class="tree">
<summary>Mobility equipment <span class="count">— 26</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Treatment Plinth | — |
| Treatment Table | — |
| Exercise Mat | — |
| Parallel Bars | — |
| Walking Frame | — |
| Zimmer Frame | — |
| Rollator | — |
| Crutches | — |
| Axillary Crutches | — |
| Elbow Crutches | — |
| Forearm Crutches | — |
| Walking Stick | — |
| Cane | — |
| Quad Cane | — |
| Stair Trainer | — |
| Step Box | — |
| Treadmill | — |
| Anti-Gravity Treadmill | — |
| AlterG Treadmill | — |
| Exercise Bike | — |
| Stationary Bicycle | — |
| Recumbent Bike | — |
| Cross-Trainer | — |
| Elliptical | — |
| Rowing Ergometer | — |
| Upper-Body Ergometer | UBE |

</details>
<details class="tree">
<summary>Balance equipment <span class="count">— 14</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Balance Board | — |
| Wobble Board | — |
| Rocker Board | — |
| BOSU | — |
| Foam Pad | — |
| Airex Pad | — |
| Balance Disc | — |
| Stability Ball | — |
| Swiss Ball | — |
| Gym Ball | — |
| Force Plate | — |
| Pressure Plate | — |
| Pressure Mat | — |
| Balance Platform | — |

</details>
<details class="tree">
<summary>Upper-limb equipment <span class="count">— 10</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Shoulder Pulley | — |
| Finger Ladder | — |
| Wall Ladder | — |
| Therapy Ball | — |
| Hand Exerciser | — |
| Grip Trainer | — |
| Therapy Putty | — |
| Wrist Roller | — |
| Arm Ergometer | — |
| Upper-Body Ergometer | UBE |

</details>
<details class="tree">
<summary>Hydrotherapy equipment <span class="count">— 8</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Hydrotherapy Pool | — |
| Aquatic Treadmill | — |
| Pool Dumbbells | — |
| Aquatic Resistance Gloves | — |
| Pool Noodles | — |
| Flotation Belts | — |
| Buoyancy Cuffs | — |
| Aquatic Weights | — |

</details>
<details class="tree">
<summary>Assessment technology <span class="count">— 21</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Goniometer | — |
| Digital Goniometer | — |
| Inclinometer | — |
| Digital Inclinometer | — |
| Hand-Held Dynamometer | HHD |
| Force Plate | — |
| Pressure Plate | — |
| Pressure Mat | — |
| Electromyography | EMG |
| Surface Electromyography | sEMG |
| Accelerometer | — |
| Gyroscope | — |
| Magnetometer | — |
| Inertial Measurement Unit | IMU |
| Motion-Capture System | — |
| 2D Motion Analysis | — |
| 3D Motion Analysis | — |
| Video Analysis | — |
| Musculoskeletal Ultrasound | MSK-US |
| Diagnostic Ultrasound | — |
| Ultrasound Imaging | — |

</details>
</details>
<details class="tree lvl1">
<summary>13. Functional & Performance Testing <span class="count">— 46 terms, 1 groups</span></summary>

<details class="tree">
<summary>(ungrouped) <span class="count">— 46</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Single-Leg Squat | SLS |
| Double-Leg Squat | DLS |
| Single-Leg Hop | SLH |
| Single Hop for Distance | SHD |
| Triple Hop for Distance | THD |
| Triple Crossover Hop | TCH |
| Crossover Hop for Distance | — |
| 6-Metre Timed Hop | 6MTH |
| Drop Jump | DJ |
| Countermovement Jump | CMJ |
| Squat Jump | SJ |
| Vertical Jump | VJ |
| Broad Jump | — |
| Standing Long Jump | — |
| Y-Balance Test | YBT |
| Star Excursion Balance Test | SEBT |
| Single-Leg Stance | SLS |
| Step-Down Test | — |
| Lateral Step-Down Test | LSD |
| Heel-Rise Test | — |
| Single-Leg Heel-Rise Test | SLHR |
| Heel-Rise Endurance Test | HRET |
| Biering-Sørensen Test | — |
| Sorensen Test | — |
| Isokinetic dynamometry - IKD | — |
| McGill Trunk Endurance Tests | — |
| Side Plank Endurance Test | — |
| Side Bridge Test | — |
| Front Plank Test | — |
| Sit-and-Reach Test | — |
| Modified Thomas Test | — |
| Timed Up and Go | TUG |
| Five Times Sit-to-Stand | 5xSTS |
| 30-Second Sit-to-Stand | 30sSTS |
| 6-Minute Walk Test | 6MWT |
| 10-Metre Walk Test | 10MWT |
| Functional Reach Test | FRT |
| Stair Climb Test | SCT |
| Stair-Climb Power Test | SCPT |
| Agility T-Test | — |
| Illinois Agility Test | — |
| 505 Agility Test | — |
| Yo-Yo Intermittent Recovery Test | — |
| Beep Test | Multistage Shuttle Run Test |
| Cooper Test | — |
| Rockport Walk Test | — |

</details>
</details>
<details class="tree lvl1">
<summary>14. Pathology-Specific Rehabilitation <span class="count">— 357 terms, 25 groups</span></summary>

<details class="tree">
<summary>Osteoarthritis — OA <span class="count">— 16</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Strength Training | — |
| Resistance Training | — |
| Progressive Resistance Exercise | PRE |
| Aerobic Exercise | — |
| Cardiovascular Exercise | — |
| Range-of-Motion Exercise | ROM |
| Flexibility Training | — |
| Functional Exercise | — |
| Balance Training | — |
| Neuromuscular Training | NMT |
| Aquatic Exercise | — |
| Hydrotherapy | — |
| Load Management | — |
| Activity Pacing | — |
| Education | — |
| Weight-Management Intervention | — |

</details>
<details class="tree">
<summary>Low-Back Pain — LBP <span class="count">— 20</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Exercise Therapy | — |
| Motor-Control Exercise | MCE |
| Core Training | — |
| Trunk Strengthening | — |
| Lumbar Stabilisation | — |
| Spinal Mobility Exercise | — |
| Aerobic Exercise | — |
| Resistance Training | — |
| Graded Activity | — |
| Graded Exposure | — |
| Functional Rehabilitation | — |
| Gait Training | — |
| Load Management | — |
| Activity Pacing | — |
| Pain Neuroscience Education | PNE |
| Manual Therapy | — |
| Neural Mobilisation | — |
| McKenzie Method | MDT |
| Directional Preference Exercise | — |
| Cognitive Functional Therapy | CFT |

</details>
<details class="tree">
<summary>Neck Pain <span class="count">— 15</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Cervical ROM | — |
| Cervical Strengthening | — |
| Deep Neck Flexor Training | DNF |
| Cranio-Cervical Flexion Training | CCF |
| Scapular Strengthening | — |
| Postural Training | — |
| Sensorimotor Training | — |
| Proprioceptive Training | — |
| Neuromuscular Training | — |
| Cervical Mobilisation | — |
| Cervical Manipulation | — |
| Neural Mobilisation | — |
| Traction | — |
| Aerobic Exercise | — |
| Resistance Training | — |

</details>
<details class="tree">
<summary>Rotator Cuff-Related Shoulder Pain <span class="count">— 15</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Rotator Cuff Strengthening | — |
| Progressive Resistance Exercise | PRE |
| Isometric Exercise | — |
| Eccentric Loading | — |
| Concentric Loading | — |
| Heavy Slow Resistance | HSR |
| Scapular Strengthening | — |
| Scapular Stabilisation | — |
| ROM Exercise | — |
| Mobility Exercise | — |
| Neuromuscular Training | — |
| Proprioceptive Training | — |
| Functional Exercise | — |
| Load Management | — |
| Graded Return to Activity | — |

</details>
<details class="tree">
<summary>Adhesive Capsulitis <span class="count">— 10</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Passive ROM | PROM |
| Active-Assisted ROM | AAROM |
| Active ROM | AROM |
| Stretching | — |
| Joint Mobilisation | — |
| Maitland Mobilisation | — |
| Kaltenborn Mobilisation | — |
| Mulligan Mobilisation | — |
| Functional Exercise | — |
| Progressive Strengthening | — |

</details>
<details class="tree">
<summary>Shoulder Instability <span class="count">— 12</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Rotator Cuff Strengthening | — |
| Scapular Strengthening | — |
| Scapular Stabilisation | — |
| Proprioceptive Training | — |
| Neuromuscular Training | — |
| Closed-Kinetic-Chain Exercise | CKC |
| Open-Kinetic-Chain Exercise | OKC |
| Perturbation Training | — |
| Plyometric Training | — |
| Functional Training | — |
| Sport-Specific Training | — |
| Return-to-Sport | RTS |

</details>
<details class="tree">
<summary>Lateral Epicondylalgia / Tennis Elbow <span class="count">— 13</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Wrist Extensor Strengthening | — |
| Isometric Loading | — |
| Isotonic Loading | — |
| Eccentric Loading | — |
| Concentric Loading | — |
| Heavy Slow Resistance | HSR |
| Grip Strengthening | — |
| Forearm Strengthening | — |
| Progressive Resistance Exercise | PRE |
| Stretching | — |
| Neural Mobilisation | — |
| Manual Therapy | — |
| Load Management | — |

</details>
<details class="tree">
<summary>Carpal Tunnel Syndrome — CTS <span class="count">— 10</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Median Nerve Gliding | — |
| Neural Mobilisation | — |
| Nerve Flossing | — |
| Tendon Gliding | — |
| Wrist ROM | — |
| Wrist Strengthening | — |
| Splinting | — |
| Activity Modification | — |
| Ergonomic Modification | — |
| Desensitisation | — |

</details>
<details class="tree">
<summary>ACL Injury / Reconstruction <span class="count">— 20</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Range of Motion | ROM |
| Quadriceps Activation | — |
| Quadriceps Strengthening | — |
| Hamstring Strengthening | — |
| Hip Strengthening | — |
| Calf Strengthening | — |
| Progressive Resistance Training | PRT |
| Neuromuscular Training | NMT |
| Proprioceptive Training | — |
| Balance Training | — |
| Perturbation Training | — |
| Plyometric Training | — |
| Landing Training | — |
| Running Progression | — |
| Agility Training | — |
| Change-of-Direction Training | COD |
| Hop Training | — |
| Sport-Specific Training | — |
| Return-to-Running | RTR |
| Return-to-Sport | RTS |

</details>
<details class="tree">
<summary>Meniscal Pathology <span class="count">— 13</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| ROM Exercise | — |
| Quadriceps Strengthening | — |
| Hamstring Strengthening | — |
| Hip Strengthening | — |
| Calf Strengthening | — |
| Neuromuscular Training | — |
| Balance Training | — |
| Proprioceptive Training | — |
| Functional Exercise | — |
| Gait Training | — |
| Progressive Loading | — |
| Plyometric Training | — |
| Return-to-Sport Training | — |

</details>
<details class="tree">
<summary>Patellofemoral Pain — PFP <span class="count">— 15</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Quadriceps Strengthening | — |
| Hip Abductor Strengthening | — |
| Hip External Rotator Strengthening | — |
| Gluteal Strengthening | — |
| Progressive Resistance Training | PRT |
| Closed-Kinetic-Chain Exercise | CKC |
| Open-Kinetic-Chain Exercise | OKC |
| Neuromuscular Training | — |
| Movement Retraining | — |
| Running Retraining | — |
| Load Management | — |
| Activity Modification | — |
| Patellar Taping | — |
| Foot Orthoses | — |
| Functional Exercise | — |

</details>
<details class="tree">
<summary>Patellar Tendinopathy <span class="count">— 11</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Isometric Loading | — |
| Isotonic Loading | — |
| Eccentric Loading | — |
| Heavy Slow Resistance | HSR |
| Progressive Tendon Loading | — |
| Energy-Storage Loading | — |
| Plyometric Training | — |
| Jump Training | — |
| Landing Training | — |
| Running Progression | — |
| Sport-Specific Loading | — |

</details>
<details class="tree">
<summary>Achilles Tendinopathy <span class="count">— 13</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Isometric Loading | — |
| Isotonic Loading | — |
| Eccentric Loading | — |
| Concentric Loading | — |
| Heavy Slow Resistance | HSR |
| Progressive Tendon Loading | — |
| Calf Strengthening | — |
| Soleus Strengthening | — |
| Gastrocnemius Strengthening | — |
| Energy-Storage Loading | — |
| Plyometric Training | — |
| Running Progression | — |
| Return-to-Sport Training | — |

</details>
<details class="tree">
<summary>Ankle Sprain <span class="count">— 19</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| ROM Exercise | — |
| Ankle Mobility | — |
| Calf Strengthening | — |
| Peroneal Strengthening | — |
| Tibialis Anterior Strengthening | — |
| Tibialis Posterior Strengthening | — |
| Balance Training | — |
| Proprioceptive Training | — |
| Neuromuscular Training | — |
| Perturbation Training | — |
| Single-Leg Training | — |
| Hopping | — |
| Plyometrics | — |
| Agility Training | — |
| Change-of-Direction Training | — |
| Running Progression | — |
| Sport-Specific Training | — |
| Ankle Bracing | — |
| Taping | — |

</details>
<details class="tree">
<summary>Plantar Heel Pain <span class="count">— 13</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Plantar-Flexor Strengthening | — |
| Foot Intrinsic Strengthening | — |
| Calf Strengthening | — |
| Toe Strengthening | — |
| Stretching | — |
| Plantar Fascia Stretching | — |
| Calf Stretching | — |
| Progressive Resistance Training | — |
| Load Management | — |
| Foot Orthoses | — |
| Taping | — |
| Balance Training | — |
| Functional Exercise | — |

</details>
<details class="tree">
<summary>Hip Osteoarthritis <span class="count">— 14</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Hip Strengthening | — |
| Gluteal Strengthening | — |
| Hip Abductor Strengthening | — |
| Hip Extensor Strengthening | — |
| Hip Flexor Strengthening | — |
| ROM Exercise | — |
| Mobility Exercise | — |
| Aerobic Exercise | — |
| Resistance Training | — |
| Aquatic Exercise | — |
| Functional Exercise | — |
| Balance Training | — |
| Gait Training | — |
| Load Management | — |

</details>
<details class="tree">
<summary>Hip Tendinopathy <span class="count">— 11</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Isometric Loading | — |
| Isotonic Loading | — |
| Progressive Resistance Training | — |
| Heavy Slow Resistance | HSR |
| Gluteal Strengthening | — |
| Hip Abductor Strengthening | — |
| Hip Extensor Strengthening | — |
| Functional Loading | — |
| Energy-Storage Loading | — |
| Plyometric Loading | — |
| Running Progression | — |

</details>
<details class="tree">
<summary>Hamstring Injury <span class="count">— 16</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Acute Load Modification | — |
| ROM Exercise | — |
| Progressive Strengthening | — |
| Isometric Loading | — |
| Isotonic Loading | — |
| Eccentric Loading | — |
| Nordic Hamstring Exercise | NHE |
| Heavy Slow Resistance | HSR |
| Hip Strengthening | — |
| Trunk Strengthening | — |
| Running Progression | — |
| Sprint Progression | — |
| Plyometric Training | — |
| Agility Training | — |
| Sport-Specific Training | — |
| Return-to-Sport | RTS |

</details>
<details class="tree">
<summary>Adductor / Groin Injury <span class="count">— 11</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Adductor Strengthening | — |
| Isometric Adduction | — |
| Progressive Resistance Training | — |
| Copenhagen Adduction Exercise | CAE |
| Hip Strengthening | — |
| Core Strengthening | — |
| Dynamic Strengthening | — |
| Running Progression | — |
| Change-of-Direction Training | — |
| Agility Training | — |
| Sport-Specific Training | — |

</details>
<details class="tree">
<summary>Muscle Strain <span class="count">— 13</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Load Modification | — |
| ROM Exercise | — |
| Isometric Exercise | — |
| Isotonic Exercise | — |
| Concentric Exercise | — |
| Eccentric Exercise | — |
| Progressive Resistance Exercise | PRE |
| Heavy Slow Resistance | HSR |
| Plyometric Training | — |
| Running Progression | — |
| Sprint Progression | — |
| Agility Training | — |
| Sport-Specific Training | — |

</details>
<details class="tree">
<summary>Fracture Rehabilitation <span class="count">— 13</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Protected ROM | — |
| Active ROM | AROM |
| Passive ROM | PROM |
| Active-Assisted ROM | AAROM |
| Progressive Loading | — |
| Weight-Bearing Progression | — |
| Strength Training | — |
| Resistance Training | — |
| Balance Training | — |
| Proprioceptive Training | — |
| Gait Training | — |
| Functional Training | — |
| Return-to-Activity Programme | — |

</details>
<details class="tree">
<summary>Joint Replacement <span class="count">— 12</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| ROM Exercise | — |
| Strength Training | — |
| Progressive Resistance Training | — |
| Gait Training | — |
| Balance Training | — |
| Functional Exercise | — |
| Transfer Training | — |
| Stair Training | — |
| Aerobic Conditioning | — |
| Endurance Training | — |
| Proprioceptive Training | — |
| Return-to-Activity Programme | — |

</details>
<details class="tree">
<summary>Tendon Repair <span class="count">— 14</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Protected ROM | — |
| Passive ROM | PROM |
| Active-Assisted ROM | AAROM |
| Active ROM | AROM |
| Isometric Exercise | — |
| Progressive Loading | — |
| Isotonic Strengthening | — |
| Eccentric Loading | — |
| Concentric Loading | — |
| Heavy Slow Resistance | HSR |
| Functional Training | — |
| Plyometric Training | — |
| Sport-Specific Training | — |
| Return-to-Sport | RTS |

</details>
<details class="tree">
<summary>Ligament Injury <span class="count">— 17</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Protection | — |
| Load Modification | — |
| ROM Exercise | — |
| Strength Training | — |
| Progressive Resistance Training | — |
| Isometric Exercise | — |
| Isotonic Exercise | — |
| Neuromuscular Training | — |
| Proprioceptive Training | — |
| Balance Training | — |
| Perturbation Training | — |
| Plyometric Training | — |
| Agility Training | — |
| Change-of-Direction Training | — |
| Running Progression | — |
| Sport-Specific Training | — |
| Return-to-Sport | RTS |

</details>
<details class="tree">
<summary>Persistent / Chronic MSK Pain <span class="count">— 21</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Exercise Therapy | — |
| Aerobic Exercise | — |
| Resistance Training | — |
| Strength Training | — |
| Motor-Control Exercise | MCE |
| Functional Exercise | — |
| Graded Activity | — |
| Graded Exposure | — |
| Activity Pacing | — |
| Load Management | — |
| Pain Neuroscience Education | PNE |
| Cognitive Functional Therapy | CFT |
| Cognitive Behavioural Therapy | CBT |
| Acceptance and Commitment Therapy | ACT |
| Self-Management | — |
| Relaxation Training | — |
| Breathing Exercises | — |
| Mindfulness-Based Rehabilitation | — |
| Functional Rehabilitation | — |
| Return-to-Work Rehabilitation | RTW |
| Return-to-Sport Rehabilitation | RTS |

</details>
</details>
<details class="tree lvl1">
<summary>15. Psychosocial / Pain Assessment <span class="count">— 19 terms, 3 groups</span></summary>

<details class="tree">
<summary>(ungrouped) <span class="count">— 9</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Fear-Avoidance Beliefs Questionnaire | FABQ |
| Tampa Scale for Kinesiophobia | TSK |
| Pain Catastrophizing Scale | PCS |
| Pain Self-Efficacy Questionnaire | PSEQ |
| Central Sensitisation Inventory | CSI |
| Patient Health Questionnaire-9 | PHQ-9 |
| Generalised Anxiety Disorder-7 | GAD-7 |
| Örebro Musculoskeletal Pain Screening Questionnaire | ÖMPSQ |
| Optimal Screening for Prediction of Referral and Outcome–Yellow Flag | OSPRO- |

</details>
<details class="tree">
<summary>YF <span class="count">— 10</span></summary>

| Term | Abbreviation / alternative |
|---|---|
| Chronic Pain Acceptance Questionnaire | CPAQ |
| Pain Anxiety Symptoms Scale | PASS |
| Psychological Inflexibility in Pain Scale | PIPS |
| Pain Vigilance and Awareness Questionnaire | PVAQ |
| Pain Disability Index | PDI |
| Brief Pain Inventory | BPI |
| PainDETECT Questionnaire | — |
| Douleur Neuropathique 4 | DN4 |
| Leeds Assessment of Neuropathic Symptoms and Signs | LANSS |
| Self-Administered Leeds Assessment of Neuropathic Symptoms and Signs | S- |

</details>
<details class="tree">
<summary>LANSS <span class="count">— 0</span></summary>

| Term | Abbreviation / alternative |
|---|---|

</details>
</details>


---

## Appendix A — things to check with Andrew

Reproduced faithfully above; listed here because each looks like an editing artefact or an
unfinished decision rather than clinical intent.

**1. The BAMIC muscle-injury grades are missing grade 1.** The source lists the tags required as:
`0a, 0b, 2a, 2b, 2c, 3a, 3b, 3c, 4, 4c` (p54). Grades `1a`, `1b` and `1c` are absent, and a bare
`4` sits alongside `4c`. If grade 1 was meant to be omitted deliberately, that is worth recording;
otherwise three tags are missing.

**2. The cartilage grading is incomplete and has a probable typo.** The source gives `1/I`, `2/II`,
`3/II` (p55) — the third is presumably `3/III`, and there is no grade 4.

**3. The ligament-grading table is half-finished.** "Grade 1" and its synonyms appear twice, and
Grades 2 and 3 are loose text outside the table rather than rows in it (pp54–55). The content is
recoverable, but the structure is not.

**4. A stray heading `R` sits on p44**, immediately after the `Reinjury` row — which is the one row
in the whole synonym set with no synonyms at all. It reads like an edit that was interrupted
mid-word.

**5. Instructions to us are embedded in the content.** Three headings carry build notes rather than
clinical terms:
- p40 — "Pelvic ring- **needs to be added as an individual term**- Bones / structures (already detailed above)"
- p54 — "British Athletics Muscle Injury Classification — 'BAMIC' **(both terms needed for tags)**"
- p54 — "MRI / Magnetic resonance imaging **(both needed as tags)**"

These are actionable, but they need to move out of the term list and into a decision.

**6. Sixteen preferred terms appear in two different synonym tables, and eight of those carry
*different* synonym sets.** The lettered tables run by pathology (I–O) and then by region (P–U), so
the same condition is reached twice. Examples:

| Term | In pathology table | In region table |
|---|---|---|
| Bursitis | Bursa inflammation; inflammation of a bursa | Inflamed bursa; bursal inflammation |
| Achilles tendinopathy | Achilles tendinitis; Achilles tendon disorder | Achilles tendinitis |
| Chondromalacia patellae | Patellar chondromalacia; patellar cartilage softening | Patellofemoral cartilage degeneration |
| Meniscal tear | Meniscus tear; meniscal injury | Torn meniscus |
| Gluteal tendinopathy | Gluteal tendinosis; lateral hip tendinopathy | Lateral hip tendinopathy |
| De Quervain tenosynovitis | De Quervain disease; De Quervain's tenosynovitis | De Quervain disease |

Whether these should be merged into a single term carrying the union of both lists, or whether the
duplication signals a real distinction, is a clinical judgement — not one to make silently in code.

**7. Two deliberate clinical caveats are recorded as footnotes** and must survive into whatever data
model this becomes, because both warn against a synonym mapping that would otherwise look obvious:

> \*DDH is a developmental disorder rather than simply a synonym for every form of acetabular dysplasia.

> \*"Runner's knee" is ambiguous and should not be treated as a unique synonym because it is also
> commonly used for patellofemoral pain syndrome.

**8. 154 terms in Part 1 appear in more than one region** — "Medial collateral ligament" appears
seven times, "Lateral collateral ligament" six. This is correct anatomy (the knee and the elbow both
have one), and it matches how the live taxonomy already works: a tag's identity is its name *within
its parent*, not globally. Noted only so it is not mistaken for duplication to be cleaned up.

---

## Appendix B — how this relates to the live taxonomy

For context in the discussion that follows this document. **No mapping or loading has been done.**

The live taxonomy holds **588 tag rows** (538 distinct names, repeated across branches by design)
under 5 region roots, seeded from Andrew's Body Part List v2.0 in July 2026. Of those, **11 carry
search synonyms**.

Measured against that, this new list contains **1,996 distinct terms**, of which **1,557 do not
currently exist as a tag**:

| Part | Distinct terms | Already a tag | Not yet a tag |
|---|---:|---:|---:|
| 1. Anatomy and conditions | 920 | 439 | 481 |
| 2. Synonyms (preferred terms) | 334 | 76 | 258 |
| 3. Assessment and treatment | 823 | 0 | 823 |

Three observations worth carrying into the discussion:

- **Part 2 is the immediately valuable piece.** Only 76 of its preferred terms match a live tag, but
  those 76 would bring **138 synonyms** — against the 11 tags that have any today. That is the
  known weak spot in feed classification, and it needs no taxonomy changes to land.
- **Part 3 is a different kind of vocabulary.** It has *zero* overlap with the body-part taxonomy
  because it describes tests, treatments and equipment rather than anatomy or pathology. It is not
  an extension of the tag tree; it is either a second dimension or out of scope.
- **Part 1 is roughly half new.** 481 new terms against 588 existing rows is not a top-up, it is a
  significant expansion — and the interests picker already offers members the whole tree, so
  anything added here lands in front of them.

