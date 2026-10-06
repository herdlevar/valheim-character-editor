import re
import json

# Define dimensions of key Valheim pieces:
# Format: (width_x, height_y, depth_z) when unrotated (yaw = 0)
PIECE_DIMS = {
    'stone_floor_2x2': (2.0, 0.5, 2.0),
    'stone_wall_4x2': (4.0, 2.0, 1.0),
    'stone_wall_2x1': (2.0, 1.0, 1.0),
    'stone_wall_1x1': (1.0, 1.0, 1.0),
    'stone_arch': (2.0, 2.0, 1.0),
    'stone_stair': (2.0, 2.0, 3.0),
    'wood_floor': (2.0, 0.1, 2.0),
    'wood_floor_1x1': (1.0, 0.1, 1.0),
    'woodwall': (2.0, 2.0, 0.1),
    'wood_wall_half': (2.0, 1.0, 0.1),
    'wood_wall_quarter': (1.0, 1.0, 0.1),
    'wood_door': (1.0, 2.0, 0.2), # fits in 2m frame or 1m opening
    'wood_roof_45': (2.0, 2.0, 2.0),
    'wood_roof': (2.0, 1.0, 2.0),
    'wood_roof_top_45': (2.0, 1.0, 2.0),
    'wood_roof_top': (2.0, 0.5, 2.0),
    'wood_wall_roof_45': (2.0, 2.0, 0.1),
    'wood_wall_roof_top_45': (2.0, 1.0, 0.1),
    'wood_stair': (2.0, 2.0, 2.0),
    'wood_beam': (2.0, 0.2, 0.2),
    'wood_pole': (0.2, 1.0, 0.2),
    'wood_pole2': (0.2, 2.0, 0.2),
    'wood_pole_log_4': (0.4, 4.0, 0.4),
    'wood_pole_log': (0.4, 2.0, 0.4),
    'hearth': (2.0, 1.5, 2.0),
    'bed': (1.2, 0.8, 2.0),
    'piece_table': (1.2, 0.8, 2.5),
    'piece_chair': (0.6, 0.8, 0.6),
    'fermenter': (1.5, 2.0, 1.5),
    'piece_chest_wood': (1.0, 0.6, 0.6),
    'piece_workbench': (1.5, 1.5, 1.0),
    'forge': (1.5, 1.5, 1.2),
    'smelter': (2.5, 4.0, 2.5),
    'charcoal_kiln': (3.0, 3.5, 3.0),
    'portal_wood': (2.5, 3.0, 0.5),
}

with open('src/utils/blueprintParser.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Analyze createFrostpeakTavernPieces
print("="*60)
print("GEOMETRIC & ALIGNMENT ANALYSIS OF PRESET BLUEPRINTS")
print("="*60)

# Check Frostpeak Tavern
# In createFrostpeakTavernPieces:
# Foundation: stonefloor2x2 from x in [-2, 0, 2], z in [-3, -1, 1, 3] -> 6m x 8m
# Walls: West x = -3, East x = 3, North z = -4, South z = 4
# Notice: Foundation is [-3, 3] in X (from x=-2 to 2 with 2m floors = [-3, 3])
# and [-4, 4] in Z (from z=-3 to 3 with 2m floors = [-4, 4])
# Walls are at x = -3, x = 3, z = -4, z = 4.
# Heights of walls: y = 2 and y = 4 (covers y from 1 to 5).
# Floor is at y = 1.
# Roof: x = -2, y = 5 and x = 2, y = 5; ridge at x = 0, y = 7.
# Roof width: at 45 deg, slope spans 2m horizontal for 2m vertical:
# From x = -3 to x = -1, delta x = 2m, delta y = 2m (rises from y = 5 to y = 7).
# Peak meets at x = 0! But wood_roof_45 center is at x = -2!
# A 2m roof piece centered at x = -2 spans x in [-3, -1].
# At x = -1, its top edge is at height y = 5 + 1.0 = 6 (if pivot is center) or y = 7 (if pivot is eave).
# And the ridge piece wood_roof_top_45 is centered at x = 0, y = 7.0!
# A 2m ridge piece centered at x = 0 spans x in [-1, 1]!
# So the west slope ends at x = -1, the ridge spans [-1, 1], and east slope starts at x = 1!
# That is a PERFECT continuous seam with NO roof gaps!

# Now check Wolfstone Tavern:
# Foundation: x in [-3, -1, 1, 3], z in [-3, -1, 1, 3] -> spans x in [-4, 4], z in [-4, 4] (8m x 8m).
# Walls: West at x = -4, East at x = 4, North at z = -4.
# Heights: y = 1 and y = 3 (covers y from 0 to 4).
# BUT Rooftop battlement floor:
# woodfloor2x2 at y = 5!
# If wall top is at y = 4, but floor is at y = 5, the floor is FLOATING 1 METER ABOVE THE WALLS!
print("\n[Wolfstone Keep Finding 1]:")
print("  Wall top is at y = 4.0 (stonewall4x2 at y=1 and y=3, height 2m each).")
print("  Battlement wood floor is placed at y = 5.0!")
print("  Issue: 1m vertical gap! The floor floats 1m above the walls unless walls reach y=4.5/5.0 or floor is at y=4.0!")

# Check Wolfstone Front Wall:
# South Front Wall with Arched Gate:
# Left wall: stonewall2x1 at x = -3, y = 1, 2, 3, 4 (height 1m each, so reaches y = 4).
# Left jamb: stonewall1x1 at x = -1.5, y = 1, 2, 3, 4 (height 1m each).
# Right jamb: stonewall1x1 at x = 1.5, y = 1, 2, 3, 4 (height 1m each).
# Opening is between x = -1.0 and x = 1.0 (width 2m).
# Arch: stone_arch at x = 0, y = 3.
# Lintel: stonewall2x1 at x = 0, y = 4.
# Door: wooddoor at x = 0, y = 1.
# Stair: stonestair at x = 0, y = 0.1, z = 5.2.
# BUT wait! Where is the roof floor battlements?
# Stone parapet battlements:
# stonewall1x1 at y = 5.5, x = -4, 4, z = -4, 4!
# If floor is at y = 5.0, then parapet at y = 5.5 has bottom at y = 5.0, which sits on the floor.
# But the floor at y = 5.0 has no support underneath between y=4 and y=5 on the outer perimeter!
# To fix: add stonewall2x1 at y = 4 on west, east, and north walls, OR place floor at y = 4.0!

# Now check Viking Longhouse:
# In createVikingLonghousePieces():
# Floor: x in [-3, -1, 1, 3], z in [-5, -3, -1, 1, 3, 5] -> spans x in [-4, 4] (8m wide), z in [-6, 6] (12m long).
# West wall: x = -4, y = 1 and y = 3.
# East wall: x = 4, y = 1 and y = 3.
# Back wall: z = -6, x in [-3, -1, 1, 3], y = 1 and y = 3.
# Front wall: z = 6.
# Look at the front door:
# pieces.push({ prefab: 'woodwall', x: -3, y: 1, z: 6 });
# pieces.push({ prefab: 'woodwall', x: -3, y: 3, z: 6 });
# pieces.push({ prefab: 'wooddoor', x: -0.5, y: 0, z: 6 });
# pieces.push({ prefab: 'woodwall', x: 1, y: 3, z: 6 });  <-- WAIT! Where is y = 1 at x = 1?
# pieces.push({ prefab: 'woodwall', x: 3, y: 1, z: 6 });
# pieces.push({ prefab: 'woodwall', x: 3, y: 3, z: 6 });
print("\n[Viking Longhouse Finding 2]:")
print("  Look at the Front Wall (z = 6):")
print("    x = -3: woodwall at y=1, y=3")
print("    x = -0.5: wooddoor at y=0")
print("    x = 1: woodwall at y=3 ONLY! y=1 IS MISSING! There is a 2m hole at x=1, y=1!")
print("    x = 3: woodwall at y=1, y=3")
print("  Also look at door position: x = -0.5, y = 0. Wood door is 1m wide, but floor is at y=0.")
print("  Between x=-2 and x=0, a door is at -0.5, but x=0 to x=2 has no lower wall at x=1!")

# Now check Blacksmith Workshop:
print("\n[Blacksmith Workshop Finding 3]:")
# Stone floor: 6m x 6m (x in [-2, 0, 2], z in [-2, 0, 2]).
# Log poles: logpole4 at x = -3, z = -3; x = 3, z = -3; x = -3, z = 3; x = 3, z = 3.
# Height of poles: 4m.
# Roof: wood_roof_26 at x = -1.5, y = 4; x = 1.5, y = 4.
# Notice: Roof length along Z is only 1 piece! (z = 0).
# The workshop is 6m long (z = -2 to 2), but the roof only has ONE 2m roof piece at z=0!
# It is missing roof pieces at z = -2 and z = 2!
# Two thirds of the workshop is completely unroofed / open to the sky and rain!
print("  Workshop floor is 6m long (z in [-2, 0, 2]), but roof ONLY has pieces at z = 0!")
print("  z = -2 and z = +2 have NO ROOF! Smelter and Kiln are exposed to rain (rain damages wood and stops smelters)!")

# Now check Watchtower:
print("\n[Watchtower Finding 4]:")
# Base: 4m x 4m (stonefloor2x2 at x in [-1, 1], z in [-1, 1]).
# Walls: 3 levels: lvl 0 (y=1), lvl 1 (y=3), lvl 2 (y=5).
# Top battlement deck: woodfloor2x2 at y = 6.
# Parapet: woodwallhalf at y = 7.
# Roof cap: wood_roof_45 at x = -1, y = 8, z = 0 and x = 1, y = 8, z = 0.
# Again: roof is only at z = 0! Tower is 4m long (z = -1 to 1), so roof only covers 2m of the 4m tower!
# z in [-1, 1] requires roof pieces at z = -1 and z = 1 or centered roof covering the 4x4 area!
print("  Watchtower observation deck is 4x4m, but roof cap only has 2 pieces at z=0 (2m wide)!")
print("  Front and back 1m of the tower deck have no roof coverage!")

