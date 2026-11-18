# Unique Combat Layout Plan for 34 Arenas

Date: September 23, 2026  
Status: On September 23, 2026, core terrain geometry, authentic previews, and map-specific spawn pads were implemented in game code; automated test suites passed. Visual gameplay validation and extended balance simulations are in progress.  
Baseline: [Map Design Review](map-design-review.md), existing terrain, movement physics, and match launch codebase.

## 1. Design Philosophy

Every map must pose a distinct tactical question. Altering colors, peak heights, and background scenery props is insufficient. How a player approaches an opponent, lines up firing trajectories, maintains cover, and carves terrain must vary from arena to arena.

The visual and thematic affinity between robots and their home arenas is preserved; however, no arena should be playable exclusively by its own signature robot. Moving platforms, dynamic hazard zones, slippery ice physics, mandatory digging, or custom air currents are out of scope for this milestone. Priority centers on generating distinct tactical encounters using existing locomotion, weapons, and destructible terrain systems.

### Dimensional Standards and Spawn Rules

- Playfield is framed within the standard 960×540 viewport. All `x` values below represent percentages of viewport width; heights represent the vertical pixel coordinate **y where robot feet rest**. Smaller `y` indicates higher elevation.
- Numeric values represent initial greybox targets; balance is validated through automated bot and physics trials. Primary terrain surfaces generally sit within y=250–410.
- Each map specification defines six candidate spawn positions ordered left-to-right (A–F). Two-player matches evaluate A/F; 3-player matches test A/C/F and A/D/F; 4-player matches test A/B/E/F; 5-player matches test A/B/C/E/F and A/B/D/E/F; 6-player matches evaluate all six pads. These represent initial candidate points subject to playtesting. Unfair distributions are adjusted on a per-map basis rather than falling back to naive equidistant math.
- Spawn pads require at least 64 px of flat ground and unobstructed vertical clearance for chassis height and barrel elevation. Deep trenches, razor-thin bridges, narrow ridges, or inescapable pits cannot serve as spawn points. Wide-chassis robots are tested explicitly.
- Player slot indices (P1, P2...) must not permanently correlate with high ground or tactical advantages. Free-for-all matches randomize spawn pads; balance harnesses rotate seat assignments and turn order.
- Mandatory traversal routes are connected via walkable ramps. The standard walking model allows stepping up to 16 px; steeper grades require constructed ramps. Specialized mobility skills provide shortcuts rather than mandatory passage.
- Physical cover constitutes part of the destructible collision mask; scenery props do not provide collision cover. Unsupported floating terrain does not simulate structural collapse: "destruction" refers exclusively to voxels eroded by explosions.

### Two Construction Architectures

**Surface:** Defined by a single contiguous height profile. All vertical columns below the surface profile are solid. Ramps, bowls, hills, and ground-anchored barricades belong to this group.

**Layered:** Contains vertically stacked surfaces or internal subterranean chambers. Requires composite solid/void geometry generation, tiered spawn selection, and multi-level bot navigation. The initial release features MH-02, DR-23, and KU-26 in this group.

---

## 2. Arena Layout Specifications

### 01 · HS-01 · FIX-8 — Old Maintenance Pit

- **Tactical Question / Type:** Drop into the pit for defensive cover, or hold the outer rim for superior firing angles? Surface.
- **Geometry:** Maintenance trench at y=395 between x=34–62. Left rim at y=315 with extended ramp; right rim at y=295 followed by an intermediate terrace at y=345. Trench floor has no second high barricade to prevent claustrophobic turtle camping.
- **Spawn X:** 10, 25, 41, 57, 75, 90. A/F start outside the pit, C/D on the floor.
- **Combat Dynamic:** Left approach is gentle; right approach offers higher firing lines but requires a longer retreat path. Retreating into the pit for repairs leaves the player vulnerable to high-angle mortar trajectories.
- **Destruction / Tuning:** Carving the pit lip opens flat direct-fire lanes. Ensure destruction of the right lip does not permanently trap robots on the floor. Background service floodlights anchor the theme without offering collision.

### 02 · MH-02 · MIK-0 — Magnet Bridge

- **Tactical Question / Type:** Choose between the exposed upper skybridge and the sheltered lower maintenance track. Layered.
- **Geometry:** Upper skybridge between x=30–70 at y=295 (initial thickness 36 px). Beneath sits an uninterrupted maintenance catwalk at y=410 with access steps on both flanks. The gap between catwalk and bridge is a true negative void in the collision mask.
- **Spawn X:** 10, 23, 40, 60, 77, 90. C/D spawn on the **lower track**; no spawns on the bridge itself.
- **Combat Dynamic:** Skybridge grants wide firing angles but offers zero overhead protection. Lower track shields from orbital bombardments but requires climbing ramps to engage opposing flanks.
- **Destruction / Tuning:** Breaching the bridge causes upper players to fall safely to the lower catwalk without instant-kill pits. Verify bots do not mistake the bridge ceiling for local ground. Horseshoe magnet sits in background.

### 03 · DR-03 · BOM-12 — Pressure Depot

- **Tactical Question / Type:** Choosing which small bunker to blast open rather than facing a single monolithic wall. Surface.
- **Geometry:** Base ground at y=370. Three discrete ground-anchored barricades around x=29, 51, 72 with heights of 40, 55, 35 px respectively. Variable widths with ample walking clearances; central sky is completely unobstructed.
- **Spawn X:** 9, 21, 40, 62, 81, 92. No spawns atop barricades.
- **Combat Dynamic:** High-explosive ordnance can be invested into clearing bunkers or saved for exposed enemies. Players position behind walls according to enemy trajectory vectors.
- **Destruction / Tuning:** Eroding bunkers transitions the arena into an open duel arena. Verify a single standard explosion cannot wipe out all three barricades simultaneously. Pressure tanks sit in background; no exploding barrel hazards.

### 04 · ST-04 · ZIP — Glacial Steps

- **Tactical Question / Type:** Stepped vertical ascent with tactical decision points at each landing. Surface.
- **Geometry:** Three wide tiers ascending left to right at y=395, 345, 295. Transition ramps between x=28–38 and 62–72; each terrace offers retreat pockets.
- **Spawn X:** 10, 23, 43, 56, 78, 90. Spawns on the same tier are spaced apart.
- **Combat Dynamic:** ZIP can bypass ramps via vertical jumps; other robots advance along walking inclines. Holding the top terrace grants commanding firing lines, but advancing sacrifices height advantage.
- **Destruction / Tuning:** Blasting terrace edges creates intermediate notches. Verify upper landing cannot oppress lower spawns with zero return-fire risk. Frost coloring is cosmetic; no slippery ice physics.

### 05 · BA-05 · ÇİFT-6 — Twin Paint Booths

- **Tactical Question / Type:** Long-range dueling between two asymmetric sniper perches. Surface.
- **Geometry:** Left booth plinth x=18–33 at y=300; right booth plinth x=69–83 at y=325. Central floor at y=400 is wide. Booth exteriors feature long ramps; interior ramps are shorter. Solid raised pedestals rather than hollow interiors.
- **Spawn X:** 9, 25, 42, 58, 76, 91. B/E on pedestals, C/D on center ground.
- **Combat Dynamic:** Plinking cross-map from perches versus pushing through the center basin. Firing buckshot too close to booth lips risks clipping pellets on friendly cover.
- **Destruction / Tuning:** Carving the inner lip of one booth reconfigures visibility to the center while leaving the opposing booth intact. Test elevation disparity by alternating starting seats. Dual paint spray arms anchor background.

### 06 · DR-06 · PRES-4 — Stamping Plaza

- **Tactical Question / Type:** Descending voluntarily into a wide central arena for close-quarters engagement. Surface.
- **Geometry:** Broad, flat central floor x=30–70 at y=405; outer flanks elevated at y=310. Extended approach ramps with low berms at the entrance to the plaza. Zero central towers.
- **Spawn X:** 10, 24, 40, 60, 76, 90. Two-player matches begin on outer flanks.
- **Combat Dynamic:** Upper perches provide safe stand-off range; dropping to the floor enables aggressive point-blank skirmishing. Initial turns do not force immediate contact.
- **Destruction / Tuning:** Destroying entrance berms exposes the plaza; large basin should not collapse into a single inescapable pothole. Stamping presses are animated background art, not active traps.

### 07 · DY-07 · KES-9 — Cutting Pier

- **Tactical Question / Type:** Sacrificing high ground to cross the central void and assault opposing terraces. Surface.
- **Geometry:** Left pier x=14–38 at y=300; right pier x=62–86 at y=345. Low intermediate bridge deck at y=410 with stepped access ramps. Solid under-pier foundations in V1.
- **Spawn X:** 9, 27, 44, 56, 74, 91. C/D positioned on outer edges of connecting deck.
- **Combat Dynamic:** Players cannot walk directly across without dropping down, exposing themselves during transit. Melee rewards compensate for the traversal hazard.
- **Destruction / Tuning:** Carving pier noses pushes firing lines backward. Verify players spawning on the bridge deck are not instantly pinned from both cliffs. Cutting rails sit in background.

### 08 · AA-08 · SAP-3 — Pipe Elbow

- **Tactical Question / Type:** Seizing the high corner perch versus advancing along the lower underbelly. Surface.
- **Geometry:** Left half is low ground at y=395; angled pipe elbow between x=58–72 leads up to a wide terrace at y=285 on the right. Single low approach bunker at x=31.
- **Spawn X:** 9, 24, 43, 58, 77, 91. Pad D features a flat notch at the base of the elbow.
- **Combat Dynamic:** Elevated terrace enjoys panoramic view; low ground advances under cover of the bunker toward the elbow. Once past the corner, combat becomes point-blank.
- **Destruction / Tuning:** Carving the elbow alters ramp access and firing lines. Verify right terrace does not create an insurmountable win-rate skew. L-shaped exhaust duct sits in background.

### 09 · AA-09 · KEPÇE-8 — Settling Basin

- **Tactical Question / Type:** Crossing from one drainage basin to another across a dividing weir. Surface.
- **Geometry:** Broad dry basin x=22–78 at y=405; dividing median weir 35 px tall at x=48–54. Outer rims at y=315 with ramps; both basins are wide.
- **Spawn X:** 9, 28, 41, 61, 73, 91. Dividing weir has no spawn points.
- **Combat Dynamic:** Dividing weir blocks flat trajectories without stopping mortars. Players can vault the weir or hold their home basin and launch indirect barrages.
- **Destruction / Tuning:** Breaching the weir merges the two basins into one. Verify dropping into the basin is not a one-way trap. Liquids are confined to background tanks; dry floor is safe.

### 10 · DR-10 · TOK-2 — Calibration Benches

- **Tactical Question / Type:** Three localized skirmish platforms instead of a single central battleground. Surface.
- **Geometry:** Base ground at y=395 supporting three raised bench plinths (30–45 px high) across x=20–32, 43–56, 69–82. Connected by gentle ramped depressions.
- **Spawn X:** 9, 26, 38, 50, 64, 90. Each spawn has an unobstructed escape trajectory.
- **Combat Dynamic:** Leaving one bench advances toward an enemy while using the next bench as interim cover. Close-quarters combat can erupt across three distinct pockets.
- **Destruction / Tuning:** Destroying one bench leaves the remaining two functional. Verify craters do not create impassable vertical walls. Caliper robot arms anchor background.

### 11 · AA-11 · VUR-5 — Filter Terraces

- **Tactical Question / Type:** Dislodging enemy positions via knockback before attempting direct eliminations. Surface.
- **Geometry:** Extended slopes descending inward from both flanks; broad safe basin x=39–61 at y=405. Left and right slopes feature resting steps at differing elevations.
- **Spawn X:** 10, 26, 42, 58, 74, 90. Steps are leveled for spawn stability.
- **Combat Dynamic:** Knocking an enemy down strips their high-ground advantage. Fallen units can climb back via both flanks; ring-outs are not the sole objective.
- **Destruction / Tuning:** Craters along slopes create new footholds and defensive notches. Verify starting positions cannot be knocked off-screen on turn one. Filter panels frame the sky.

### 12 · AA-12 · PUNTA-1 — Weld Gantries

- **Tactical Question / Type:** Opening or closing a long sightline via a thin central obstacle. Surface.
- **Geometry:** Long elevated bridge deck x=20–80 at y=325; narrow 45 px tall pylon at x=49–52. Flanked by retreat depressions at y=395 with access ramps. Solid under-bridge structure.
- **Spawn X:** 9, 28, 41, 60, 73, 91. Central pylon has no spawns.
- **Combat Dynamic:** Direct pushes along the deck are fast but risk close contact behind the pylon. Dropping to the low flanks provides cover at the cost of visibility.
- **Destruction / Tuning:** Obliterating the central pylon opens an uninterrupted firing lane across the entire map. Deck thickness prevents standard explosions from severing the bridge into isolated islands.

### 13 · DR-13 · SIZ-7 — Old Filter Bay

- **Tactical Question / Type:** Evacuating cramped alcoves before area-of-effect strikes land. Surface.
- **Geometry:** Two shallow alcoves at y=405 between x=23–37 and 63–77; central platform at y=350. Alcoves feature ramped lips and open skies.
- **Spawn X:** 9, 29, 44, 56, 71, 91. C/D in center, B/E in respective alcoves.
- **Combat Dynamic:** Alcoves block flat shots but make occupants vulnerable to napalm or mortars. Holding the center applies pressure down into both pockets.
- **Destruction / Tuning:** Breaching an alcove lip reduces cover while easing exit slopes. No environmental poison gas hazards; standard combat rules apply. Filter pallets detail the background.

### 14 · DY-14 · EMP-80 — Substation Yard

- **Tactical Question / Type:** Holding high ground in the center provides commanding lines of fire at the cost of being targeted from both sides. Surface.
- **Geometry:** Central pedestal x=42–58 at y=280; flanking courtyards at y=385. Sloped ramps connect both sides. Flanking approaches wrap around the pedestal without tunnels.
- **Spawn X:** 9, 25, 37, 63, 75, 91. Center pedestal has no initial spawns.
- **Combat Dynamic:** Holding the pedestal gives panoramic vision; point-blank skills require dropping down. Pedestal cannot cover both flanks simultaneously.
- **Destruction / Tuning:** Destroying one approach ramp leaves the other accessible. In 6-player matches, verify holding center is not an automatic victory. Substation transformers sit in background.

### 15 · MH-15 · SİREN-6 — Warning Tower

- **Tactical Question / Type:** Trading sniper height for point-blank area control. Surface.
- **Geometry:** Elevated tower plinth x=22–37 at y=260; lower service deck x=62–80 at y=345; central floor at y=395. Stepped access ramps on both flanks of the tower.
- **Spawn X:** 9, 28, 44, 57, 71, 91. B starts on tower without bonus barricades.
- **Combat Dynamic:** Tower holder controls long-range artillery. Dropping down is required to apply short-range skills; players cannot enjoy maximum range and close-up safety simultaneously.
- **Destruction / Tuning:** Eroding tower edges narrows safe sniper footholds; tower does not physically collapse. Validate tower spawn fairness across match rotations. Strobe lights do not obscure HUD.

### 16 · DY-16 · REZ-7 — Echo Hangar

- **Tactical Question / Type:** Breaching a central dividing ridge to engage in sudden point-blank brawling. Surface.
- **Geometry:** Shallow hangar basin x=18–82 at y=390; wide, rounded ridge x=44–56 at y=325. Outer flanks at y=350; zero secondary barricades.
- **Spawn X:** 9, 25, 38, 62, 75, 91. Ridge crest starts unpopulated.
- **Combat Dynamic:** High-angle indirect artillery over the ridge versus cresting the top to face the enemy directly. Passing the crest collapses engagement distances instantly.
- **Destruction / Tuning:** Eroding the ridge opens direct sightlines. Verify barrels angled over the ridge do not clip into terrain. Hangar arch is cosmetic background art; no bullet-rebound mechanics.

### 17 · MH-17 · DÖNER-5 — Sorting Bowl

- **Tactical Question / Type:** Maintaining spacing from the edges versus controlling the flat central basin. Surface.
- **Geometry:** Flat bowl floor x=32–68 at y=400; intermediate terraces at y=350 and outer rims at y=300. Differs from KEPÇE by omitting a central dividing weir.
- **Spawn X:** 9, 24, 40, 60, 76, 91. Center spawns have independent escape directions.
- **Combat Dynamic:** Close-quarters combat dominates the basin; holding the rim provides high angles but requires range calculation. Turntable is static in V1.
- **Destruction / Tuning:** Carving bowl lips strips rim protection; flat basin fractures under cratering. If center spawns are targeted too heavily in 6-player games, relocate C/D to intermediate terraces.

### 18 · AA-18 · DALGA-2 — Drainage Weirs

- **Tactical Question / Type:** Approaching opponents across stepped vertical tiers. Surface.
- **Geometry:** Three wide weirs at x=22–30/y=340, 46–55/y=315, 72–80/y=355; shallow basins at y=400 in between. Ramped weirs at varying elevations.
- **Spawn X:** 9, 25, 38, 62, 76, 91. Basins maintain dual exits.
- **Combat Dynamic:** Evaluating elevation disparities alongside horizontal distance before deploying area effects. Weirs serve as firing platforms; basins serve as approach trenches.
- **Destruction / Tuning:** Breaching one weir connects adjacent basins without flattening the entire arena. Standard range limits apply. Sluice gates detail background.

### 19 · ST-19 · KRİYO-7 — Frozen Tank Yard

- **Tactical Question / Type:** Traversing an exposed low passage between distant elevated garrisons. Surface.
- **Geometry:** Wide elevated terraces x=15–31 and 69–85 at y=280; open low ground x=39–61 at y=410. Zero bunkers in the center; long ramp transitions.
- **Spawn X:** 9, 23, 43, 57, 77, 91. Wide flat area for C/D in center.
- **Combat Dynamic:** Holding terraces favors long-range artillery; dropping down enables closing distance rapidly. Lacks intermediate rest steps found in ZIP.
- **Destruction / Tuning:** Eroding terrace lips forces snipers backward. Test low-ground survival rates in multi-player matches; add protective notches if needed. Cryo tanks sit in background.

### 20 · DO-20 · ŞOK-9 — Seismic Test Bed

- **Tactical Question / Type:** Three massive bedrock blocks that deform slowly over prolonged bombardment. Surface.
- **Geometry:** Heavy bedrock foundations at x=12–29/y=325, 39–59/y=285, 70–88/y=345; connected by ramped ground at y=385. Substantial solid terrain beneath.
- **Spawn X:** 9, 22, 44, 55, 77, 91. Distance between central spawns is measured carefully.
- **Combat Dynamic:** Deciding which massive slab to erode rather than blasting through thin barricades. Center block is highest but exposed to crossfire from both flanks.
- **Destruction / Tuning:** Heavy terrain deforms through deep craters without vanishing in a single shot. "Heavy" does not imply indestructible. Seismographs anchor theme.

### 21 · DY-21 · TEK-8 — Loading Incline

- **Tactical Question / Type:** Setting up a sprint lane and choosing when to charge. Surface.
- **Geometry:** Long flat straightaway x=18–67 at y=370; loading incline x=67–83 climbing up to y=290. Left flank features a short retreat step at y=330.
- **Spawn X:** 9, 25, 41, 58, 77, 91. Spawns tuned around dash skill distances.
- **Combat Dynamic:** Dropping into the straightaway maximizes sprint momentum; retreating to the incline breaks line-of-sight. No spawn pair forces an unpreventable turn-one rush.
- **Destruction / Tuning:** Blasting craters into the straightaway disrupts charge paths; opponents can crater the lane defensively. Overhead gantry cranes detail background.

### 22 · HS-22 · BİLYE-3 — Scrap Derby

- **Tactical Question / Type:** Two short acceleration runways separated by a central depression. Surface.
- **Geometry:** Two flat runways x=14–39 and 61–86 at y=330; shallow central dip at y=390. Ramped exits wide enough to fit multiple passing robots.
- **Spawn X:** 9, 27, 42, 58, 73, 91. Center spawns on inner steps of dip rims.
- **Combat Dynamic:** Building speed on one runway to stop in the center or vault across. Shorter sprint straightaways than TEK.
- **Destruction / Tuning:** Cratering one runway leaves the opposite runway open for sprint maneuvers. Clear pathing prevents immediate accidental falls into the trench. Scrap sorting rings in background.

### 23 · DR-23 · KANCA-4 — Three-Tier Racks

- **Tactical Question / Type:** Navigating between genuine multi-tier platforms. Layered.
- **Geometry:** Continuous ground floor at y=425; lower rack x=21–48 at y=335; upper rack x=53–80 at y=245. Rack thicknesses start at 24 px. Step heights allow standard robots to ascend via standard jumps.
- **Spawn X:** 9, 28, 43, 59, 75, 91. All spawns on **ground floor** in V1; overhead head/barrel clearances verified. Upper racks serve as contested perches.
- **Combat Dynamic:** Lower ground offers roof protection with narrow firing angles. Climbing onto racks grants superior sightlines while exposing chassis to artillery. Mobility skills speed up vertical transit.
- **Destruction / Tuning:** Breaching a rack creates new vertical firing apertures and drop chutes. Standard robots must be able to reach racks without skills. Bot pathing must navigate ceilings correctly.

### 24 · KU-24 · ZIP-X — Dune Leap

- **Tactical Question / Type:** Scaling a commanding central peak via two asymmetric approaches. Surface.
- **Geometry:** Central peak x=43–57 at y=255; intermediate terraces at y=325; base ground at y=400. Long continuous incline on left; two stepped ramps on right.
- **Spawn X:** 9, 25, 37, 63, 75, 91. Peak crest begins unoccupied.
- **Combat Dynamic:** Specialized jump skills bypass ramps to take the peak quickly. Standard robots hike ramps or launch arcing mortar shots over the peak.
- **Destruction / Tuning:** Eroding the peak splits the high ground into two smaller perches. Peak exposure to low-angle fire tested. Blowing sand animations do not push robots or alter terrain.

### 25 · MH-25 · VIZIR — Overhead Monorail

- **Tactical Question / Type:** Choosing a drop-in landing from high ground while planning the climb back up. Surface.
- **Geometry:** High left staging dock x=14–28 at y=245; descending descending terraces to the right at y=300, 350, and 400. Connected by continuous walkable ramps; zero bottomless pits.
- **Spawn X:** 9, 22, 40, 58, 76, 91. Each spawn sits on a level landing.
- **Combat Dynamic:** Gliding allows selective landing on lower tiers; walking allows navigating between all tiers. Moving right drops elevation; returning left requires climbing.
- **Destruction / Tuning:** Carving landings constricts footholds without trapping non-flying robots. Asymmetric win-rates tested extensively across seat rotations. Monorail structure in background.

### 26 · KU-26 · MAT-6 — Buried Service Tunnel

- **Tactical Question / Type:** Moving over the surface or excavating an underground transit tunnel. Layered.
- **Geometry:** Heavy central mass x=30–70 at y=285. Beneath sit two service alcoves (floor y=425, ceiling ~y=340); separated by a 60 px thick diggable soil plug in the center. Ramped surface paths on both flanks.
- **Spawn X:** 9, 23, 40, 60, 77, 91. C/D on **surface**; no spawns inside tunnel.
- **Combat Dynamic:** Drill modules clear the underground passage rapidly; other units traverse the surface or clear the plug via heavy weapons. Tunnel interior does not grant complete invulnerability.
- **Destruction / Tuning:** Eroding the plug connects the alcoves into a continuous underground tunnel. Ceilings do not simulate gravity collapse. Bots must not get stuck walking into uncarved soil.

### 27 · HS-27 · ZIRH-2 — Armor Bunker

- **Tactical Question / Type:** Anchoring behind a single heavy wall versus maneuvering between dual light barricades. Surface.
- **Geometry:** Base ground at y=390. Left heavy bunker x=27–37 at y=300; right dual low berms at x=62–68/y=340 and 79–85/y=350. Wide open center; left bunker features access ramps.
- **Spawn X:** 9, 21, 44, 56, 73, 92. No spawns inside bunkers or on narrow crests.
- **Combat Dynamic:** Left flank turtles behind a thick barrier; right flank shifts between two low berms. Heavy bunker is open to high-angle indirect artillery.
- **Destruction / Tuning:** Destroying one right berm leaves the second functional; breaching the left bunker radically alters defense. Rotational testing ensures wall durability does not skew win rates.

### 28 · DR-28 · HAYALET-4 — Inspection Runway

- **Tactical Question / Type:** Choosing which protective face to break out from for each shot. Surface.
- **Geometry:** Slightly ascending floor with three barriers at x=29, 50, 72 (heights 50, 35, 60 px; center barrier is lowest). Spreading behind barriers or climbing them yields distinct shooting angles.
- **Spawn X:** 9, 21, 40, 61, 82, 92. Barrel clearance verified between spawns and barriers.
- **Combat Dynamic:** Because ground ascends, safe angles behind one barrier differ from the next. Repositioning between shots is rewarded; zero stealth or fog-of-war mechanics.
- **Destruction / Tuning:** Destroying the low center barrier opens diagonal sightlines between outer bastions. Outer barriers should not completely shut down arcing fire. Overhead inspection frames in background.

### 29 · DO-29 · FIRIN-3 — Smelting Hearth

- **Tactical Question / Type:** Descending from elevated flanks into the center to close distance. Surface.
- **Geometry:** Broad flanking decks x=12–36 and 64–88 at y=330; central hearth at y=405. Single low slag berm in center at x=47–53 (y=375). Both descents are ramped.
- **Spawn X:** 9, 25, 41, 59, 75, 91. Spawns avoid the central slag berm.
- **Combat Dynamic:** Upper flanks favor stand-off artillery; the low slag berm enables aggressive pushes. Lower deck elevations than KRİYO with usable center cover.
- **Destruction / Tuning:** Eliminating the center berm makes dropping down far riskier. Smelting furnace sits in background; no molten lava ground hazard. Standard robot traversal verified.

### 30 · ST-30 · SOĞUT-2 — Cooling Trenches

- **Tactical Question / Type:** Timing when to breach the high central ridge separating dual basins. Surface.
- **Geometry:** Two shallow channels at y=400 across x=20–43 and 57–80; narrow dividing ridge at x=47–53 (y=310). Outer flanks at y=345 with accessible slopes flanking the ridge.
- **Spawn X:** 9, 28, 39, 61, 72, 91. No spawns on the narrow central ridge.
- **Combat Dynamic:** Holding the ridge provides high-angle firing lines; breaching it opens flat direct fire. More pronounced sightline obstruction than KEPÇE.
- **Destruction / Tuning:** Carving an aperture through the base of the ridge connects both trenches without collapsing the upper span. Collision consistency verified. Radiator piping in background.

### 31 · DR-31 · PERÇİN-3 — Shipping Gantry

- **Tactical Question / Type:** Exploiting narrow vertical firing windows during multi-projectile salvos. Surface.
- **Geometry:** Long base ground at y=400; three narrow upright pylons at x=28–33/y=310, 49–54/y=340, 71–76/y=295. Solid ground-anchored obstacles; zero floating shelves.
- **Spawn X:** 9, 21, 41, 62, 83, 92. No spawns on pylon tops.
- **Combat Dynamic:** Narrow pylons intercept partial spread; stepping sideways alters exposure windows. Creates tighter firing lanes than Pressure Depot.
- **Destruction / Tuning:** Carving a pylon widens its specific firing window. If pylons obstruct traversal, reduce heights or widen ramp clearances. Tested with spread weapons and standard chassis.

### 32 · BA-32 · CİV-1 — Fastener Sorting Table

- **Tactical Question / Type:** Occupying a compact central vantage point briefly before repositioning. Surface.
- **Geometry:** Compact central table x=43–57 at y=315; wide flanking basins x=21–40 and 60–79 at y=390. Outer edges at y=350; two short ramps to central table.
- **Spawn X:** 9, 28, 39, 61, 72, 91. Center begins unoccupied.
- **Combat Dynamic:** Center is easy to reach but exposed from both flanks. Lower elevation and tighter cover than EMP-80; rewards brief "shoot-and-scoot" maneuvers rather than prolonged camping.
- **Destruction / Tuning:** Eroding table edges reduces standing room and opens sightlines between basins. Silhouettes verified against twin-booth profiles. Sorting hopper in background.

### 33 · HS-33 · FAN-5 — Aeration Screen

- **Tactical Question / Type:** Weighing the cost of climbing elevated flanks against open firing lines. Surface.
- **Geometry:** Vast open center x=27–73 at y=390; uninterrupted slopes climbing to y=285 on outer flanks. Zero barricades, ridges, or platforms in the center.
- **Spawn X:** 9, 25, 41, 59, 75, 91. Slopes feature small flattened spawn steps.
- **Combat Dynamic:** Center closes engagement distance with zero cover. Holding outer flanks grants elevation advantage while making close-range skills harder to apply. Cleanest silhouette by design.
- **Destruction / Tuning:** Initial craters serve as the map's first natural defensive trenches. Standard wind mechanics apply; background fans do not push units. Center playability verified.

### 34 · DY-34 · ASİT-6 — Washdown Bay

- **Tactical Question / Type:** Evacuating to adjacent bays to escape persistent area-of-effect hazards. Surface.
- **Geometry:** Base ground at y=405 supporting four low plinths (25–40 px tall) across x=18–28, 37–47, 57–67, 77–87. Connected by gentle slopes; short walk pockets rather than claustrophobic pits.
- **Spawn X:** 9, 23, 42, 62, 82, 92. Plinths meet minimum spawn width requirements.
- **Combat Dynamic:** Moving between bays is encouraged over static camping behind a single plinth. More frequent, lower obstacles than TOK; open artillery trajectories preserved.
- **Destruction / Tuning:** Eroding a plinth merges two pockets into a wider retreat bay. No environmental acid damage pools; standard skill rules apply. Washdown piping in background.

---

## 3. Visual Staging Pipeline

Each map follows a three-stage art pipeline:

1. **Greybox Collision:** Solid terrain, negative voids, spawn points, and robot bounds. Maps that lack distinct identity in pure monochrome silhouettes are redesigned.
2. **Material Palettes:** Zone-specific palette and procedural banding. Bold terrain outlines, low-contrast backdrops, and scenery that never obscures weapon barrels or player sprites.
3. **Primary Landmark:** Single dominant background structure (e.g., floodlight, magnet, pressure tank, press, or exhaust duct). Generic random clutter is prohibited.

Arena cards display the unique arena name prominently, with biome and arena code as secondary metadata. Cards render downscaled representations of the actual in-game geometry. If a bridge features an underpass, it renders hollow in both the card preview and the live match. Scenery props are seeded deterministically from the map ID, remaining stable across sessions.

---

## 4. Technical Implementation Specifications

### A. Single Source of Truth for Layouts

`js/maps.js` retains existing map IDs, `forChar` associations, and biome linkages while introducing map-specific layout records. The biome dictates surface materials; the layout dictates physical geometry. Character skill type no longer serves as the sole generator of terrain profiles.

Proposed layout schema fields:

| Field | Purpose |
|---|---|
| `layout.id`, `layout.version` | Unique identifier and version tracking |
| `layout.profile` | Normalized x/y control points and ramp slopes |
| `layout.solids`, `layout.cutouts` | Solid shapes and negative voids for layered maps |
| `layout.spawnPads` | A–F coordinates, target y/layer, and clearance widths |
| `layout.spawnSets` | Validated pad arrays for 2, 3, 4, 5, and 6 players |
| `layout.landmark` | Landmark drawing key for background scenery |
| `layout.combatHint` | Concise, accessible tactical description |

Schema names represent implementation targets; existing code must not assume unverified properties. If layout data is factored into a separate script, `index.html` and static test runner lists must be updated simultaneously. ES modules, dynamic network fetches, and external dependencies are strictly prohibited.

### B. Terrain Generation and Previews

- `Terrain.buildProfile()` reads layout records directly. Legacy algorithmic generators remain strictly as fallbacks for unmapped themes.
- Layered map generation sequence: Fill base surface profile → stamp solid structures → carve negative voids → rasterize visual terrain using the exact collision mask. The mask and visual bitmap must never diverge.
- `_previewProfile()` replaces generic procedural sketches with authentic geometry renders. Generating previews must not consume gameplay RNG.
- Layered textures, surface band contours, and props must not render improperly across voids or ceilings. Catwalk underpasses must be visible on selection cards.
- Post-destruction collision consistency and `terrain.version` increments driving bot pathing must be preserved. Dynamic structural collapse physics will not be added.

### C. Spawn Pad Positioning

Replace the legacy equidistant formula in `Game.startGame()` and the 18%/82% terrain flattening pass with map-specific spawn pads. Procedural prop placement must query these pads to avoid spawning decorations on player start locations.

Layered maps require more than simple `surfaceBelow(x, 0)` raycasts, which would incorrectly drop underpass spawns onto upper bridges. Spawn pads must validate target surfaces and vertical chassis clearance against the collision mask. Invalid pads fail hard in development tests rather than shifting silently to alternate tiers.

### D. Bot Navigation and Physics

Validate ramp traversal following cratering. In layered arenas, audit bot assumptions that assume single-surface heights. Bot verification encompasses:

- Navigating lower catwalks, engaging targets on upper platforms, and locating access ramps.
- Avoiding infinite walking attempts against solid tunnel plugs; falling back to surface routes.
- Re-evaluating pathfinding when bridge spans are destroyed.
- Differentiating between standard jumps and specialized mobility skills.

---

## 5. Development Phases and Milestones

### Phase 1 — Shared Foundation and Benchmark Triad

Implement HS-01, MH-02, and DR-03. Exercises three distinct tactical templates: deep pit, multi-tier bridge, and discrete bunker fields. Shared geometry schemas, authentic previews, and spawn selection finalize here. Subsequent layered arenas do not begin until bridge mechanics pass testing.

### Phase 2 — Arenas 04–12

Iterate sequentially from ZIP to PUNTA-1: greybox → traversal/bot checks → palette and landmark → preview validation. Audit silhouettes every three maps to prevent visual or tactical repetition.

### Phase 3 — Arenas 13–22

Iterate sequentially from SIZ-7 to BİLYE-3. Emphasize area-of-effect ranges, high-ground perches, knockback vectors, and dash straightaways. Verify route legibility for opening arena BİLYE-3.

### Phase 4 — Arenas 23–34

Iterate sequentially from KANCA-4 to ASİT-6. Multi-tier tests for rack and tunnel maps; asymmetric balance tests for VIZIR and ZIRH-2. If layered arenas fail validation, track them as isolated blockers without halting independent surface maps.

### Phase 5 — System Integration and Balance

- 34 unique IDs, 34 distinct names, and 34 verified geometry records; zero missing entries.
- 34 maps × 5 player counts = **170 unique map/roster combinations** verified at launch.
- Test standard chassis traversal, skill shortcuts, and multi-player starting clearance on every arena. Not every robot must reach every ledge, but every unit must have viable tactical counters and access to primary lanes.
- Zero-tolerance criteria: initial collision overlap, buried chassis, ceiling pinches, or weapon barrels embedded in cover.
- Blast testing: evaluate small, medium, and heavy detonations on spawn pads, ramp necks, central bunkers, and ceilings. Playable routes and tactical options must survive destruction.
- Headless bot matches: bots must not expend movement repeatedly against insurmountable obstacles, freeze on unreachable targets, or spawn out-of-bounds.
- 2-player rotational balance: mirror matches with identical chassis and loadouts, alternating sides and first-turn order. Benchmark minimum 50 matches per side; >60% win-rate skews warrant review.
- In 3–6 player free-for-all matches, evaluate turn-one damage exposure, escape options, and survival duration for each spawn pad.
- Audit the 34-arena monochrome contact sheet for silhouette repetition. Unique pixel arrays alone do not prove tactical variety.

A standalone, dependency-free test runner (`tests/maps.js`) was introduced alongside `node tests/run.js` to validate geometry, spawn clearances, and multi-layer masks. Automated suites pass; final certification requires live browser gameplay auditing.

---

## 6. Definition of Done

Documenting names and descriptions does not constitute completion. A map is marked complete only when it boots with its dedicated geometry, displays its true terrain on selection cards, executes bot pathfinding, survives destruction without gameplay locks, and passes manual gameplay audits. Currently, 34 static profiles, map card previews, 2–6 player spawn sets, and 3-layer collision masks are implemented. Live browser visual sign-off, layered bot pathing audits, and extended balance simulations represent ongoing work.
