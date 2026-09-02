"""Proposed joint blocks for the ligament runs.

The source walks each region joint by joint but never styled the joint names as headings —
except in the cervical spine, where Andrew *did* write them (Atlanto-occipital, Atlantoaxial,
Ligaments associated with the dens, Other upper cervical stabilisers). These ranges apply that
same pattern to the other regions.

Ranges are 1-based, inclusive, over the region's ligament terms **in source order**. Nothing is
moved, reordered, reworded or removed — headings are inserted between existing runs, so every
block is a contiguous slice of the original. `src` marks a name Andrew wrote himself.
"""
BLOCKS = {
 "Cervical spine": [
   (1, 10, "Sub-axial cervical spine", False),
   (11, 14, "Atlanto-occipital ligaments", True),
   (15, 17, "Atlantoaxial ligaments", True),
   (18, 25, "Ligaments associated with the dens", True),
   (26, 28, "Other upper cervical stabilisers", True),
 ],
 "Thoracic spine": [
   (1, 8, "Thoracic spine — segmental ligaments", False),
   (9, 14, "Costovertebral & costotransverse joints", False),
 ],
 "Lumbar spine": [
   (1, 8, "Lumbar spine — segmental ligaments", False),
   (9, 13, "Lumbosacral junction", False),
   (14, 19, "Restated — a second pass over the segmental list", False),
 ],
 "Upper limb": [
   (1, 12, "Acromioclavicular joint & scapular ligaments", False),
   (13, 18, "Sternoclavicular joint", False),
   (19, 22, "Scapular ligaments — restated", False),
   (23, 33, "Glenohumeral joint", False),
   (34, 39, "Glenoid labrum & capsulolabral complexes", False),
   (40, 51, "Elbow joint", False),
   (52, 55, "Proximal radioulnar joint", False),
   (56, 61, "Forearm — restated, with interosseous detail", False),
   (62, 64, "Distal radioulnar joint & TFCC", False),
   (65, 79, "Wrist — radiocarpal & ulnocarpal", False),
   (80, 89, "Wrist — midcarpal & intercarpal", False),
   (90, 92, "Carpometacarpal joints", False),
   (93, 95, "Carpometacarpal joints — restated", False),
   (96, 101, "Thumb — first carpometacarpal joint", False),
   (102, 104, "Thumb — metacarpophalangeal joint", False),
   (105, 111, "Finger metacarpophalangeal joints", False),
   (112, 114, "Proximal interphalangeal joints", False),
   (115, 117, "Distal interphalangeal joints", False),
   (118, 122, "Finger joints — restated collaterals", False),
   (123, 130, "Hand — fascial & retinacular structures", False),
   (131, 140, "Flexor pulley system", False),
 ],
 "Lower limb": [
   (1, 11, "Hip joint", False),
   (12, 16, "Hip joint — restated", False),
   (17, 23, "Sacroiliac joint", False),
   (24, 27, "Pubic symphysis", False),
   (28, 45, "Knee — collateral & corner structures", False),
   (46, 55, "Knee — cruciate & meniscofemoral ligaments", False),
   (56, 63, "Knee — meniscal attachments", False),
   (64, 73, "Knee — extensor mechanism & patellar stabilisers", False),
   (74, 76, "Superior tibiofibular joint", False),
   (77, 79, "Interosseous membrane", True),
   (80, 84, "Distal tibiofibular syndesmosis/syndesmotic ligament", True),
   (85, 89, "Ankle — lateral collateral ligaments", False),
   (90, 94, "Deltoid/medial collateral ligament:", True),
   (95, 99, "Ankle — restated collaterals", False),
   (100, 103, "Subtalar joint", False),
   (104, 110, "Talonavicular joint & spring ligament complex", False),
   (111, 119, "Calcaneocuboid joint & bifurcate ligament", False),
   (120, 122, "Calcaneocuboid — restated", False),
   (123, 129, "Tarsometatarsal (Lisfranc) joints", False),
   (130, 142, "Intertarsal, cuneonavicular & cuboid ligaments", False),
   (143, 147, "Metatarsophalangeal joints", False),
   (148, 153, "First MTP & sesamoid complex", False),
   (154, 157, "Proximal interphalangeal joints", False),
   (158, 161, "Distal interphalangeal joints", False),
   (162, 165, "Plantar structures", False),
   (166, 171, "Plantar structures — restated", False),
   (172, 180, "Retinacula, sheaths & digital pulleys", False),
 ],
}

def apply(region_name, items):
    blocks = BLOCKS.get(region_name)
    if not blocks:
        return None
    if blocks[-1][1] != len(items):
        raise SystemExit(f"{region_name}: ranges cover {blocks[-1][1]} but there are {len(items)} terms")
    return [{"name": n, "src": src, "items": items[a - 1:b]} for a, b, n, src in blocks]
