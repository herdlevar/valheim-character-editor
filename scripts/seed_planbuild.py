import json
import os
import re

CANONICAL = {
    'woodfloor': 'wood_floor',
    'piece_woodfloor': 'wood_floor',
    'woodfloor2x2': 'wood_floor',
    'piece_woodfloor2x2': 'wood_floor',
    'wood_floor_2x2': 'wood_floor',
    'piece_woodfloor1x1': 'wood_floor_1x1',
    'woodfloor1x1': 'wood_floor_1x1',
    'piece_woodwall': 'woodwall',
    'woodwall': 'woodwall',
    'piece_woodwallhalf': 'wood_wall_half',
    'woodwall_half': 'wood_wall_half',
    'piece_wooddoor': 'wood_door',
    'wooddoor': 'wood_door',
    'wood_door': 'wood_door',
    'piece_woodwallroof45': 'wood_wall_roof_45',
    'woodwallroof45': 'wood_wall_roof_45',
    'wood_wall_roof_45': 'wood_wall_roof_45',
    'piece_woodwallrooftop45': 'wood_wall_roof_top_45',
    'woodwallrooftop45': 'wood_wall_roof_top_45',
    'wood_wall_roof_top_45': 'wood_wall_roof_top_45',
    'piece_woodroof45': 'wood_roof_45',
    'woodroof45': 'wood_roof_45',
    'wood_roof_45': 'wood_roof_45',
    'piece_woodrooftop45': 'wood_roof_top_45',
    'woodrooftop45': 'wood_roof_top_45',
    'wood_roof_top_45': 'wood_roof_top_45',
    'piece_woodroof26': 'wood_roof_26',
    'woodroof26': 'wood_roof_26',
    'piece_woodrooftop': 'wood_roof_top',
    'woodrooftop': 'wood_roof_top',
    'piece_stonefloor2x2': 'stone_floor_2x2',
    'stonefloor2x2': 'stone_floor_2x2',
    'stone_floor_2x2': 'stone_floor_2x2',
    'piece_stonewall2x1': 'stone_wall_2x1',
    'stonewall2x1': 'stone_wall_2x1',
    'stone_wall_2x1': 'stone_wall_2x1',
    'piece_stonewall4x2': 'stone_wall_4x2',
    'stonewall4x2': 'stone_wall_4x2',
    'stone_wall_4x2': 'stone_wall_4x2',
    'piece_stonewall1x1': 'stone_wall_1x1',
    'stonewall1x1': 'stone_wall_1x1',
    'piece_stonearch': 'stone_arch',
    'stonearch': 'stone_arch',
    'stone_arch': 'stone_arch',
    'piece_stonestair': 'stone_stair',
    'stonestair': 'stone_stair',
    'stone_stair': 'stone_stair',
    'piece_stonepillar': 'stone_pillar',
    'stonepillar': 'stone_pillar',
    'stone_pillar': 'stone_pillar',
    'piece_hearth': 'hearth',
    'hearth': 'hearth',
    'piece_table': 'piece_table',
    'table': 'piece_table',
    'piece_chair': 'piece_chair',
    'chair': 'piece_chair',
    'piece_bed': 'bed',
    'bed': 'bed',
    'piece_fermenter': 'fermenter',
    'fermenter': 'fermenter',
    'piece_chestwood': 'piece_chest_wood',
    'wood_chest': 'piece_chest_wood',
    'chest': 'piece_chest_wood',
    'piece_chest_wood': 'piece_chest_wood',
    'piece_chestblackmetal': 'piece_chest_blackmetal',
    'piece_chest_blackmetal': 'piece_chest_blackmetal',
    'piece_chest': 'piece_chest',
    'piece_groundtorch_wood': 'piece_groundtorch_wood',
    'piece_groundtorchwood': 'piece_groundtorch_wood',
    'piece_groundtorch_green': 'piece_groundtorch_green',
    'piece_groundtorchgreen': 'piece_groundtorch_green',
    'piece_groundtorch_blue': 'piece_groundtorch_blue',
    'piece_groundtorchblue': 'piece_groundtorch_blue',
    'piece_groundtorch': 'piece_groundtorch',
    'wood_roof_26': 'wood_roof',
    'piece_woodroof26': 'wood_roof',
    'woodroof26': 'wood_roof',
    'wood_roof': 'wood_roof',
    'logpole4': 'wood_pole_log_4',
    'piece_logpole4': 'wood_pole_log_4',
    'wood_pole_log_4': 'wood_pole_log_4',
    'charcoalkiln': 'charcoal_kiln',
    'piece_charcoalkiln': 'charcoal_kiln',
    'charcoal_kiln': 'charcoal_kiln',
    'portal': 'portal_wood',
    'piece_portal': 'portal_wood',
    'portal_wood': 'portal_wood',
}

md_path = r'C:\Users\Jared\.gemini\antigravity\brain\bd8f8b09-d741-4552-b7db-d3e1749f014b\mountain_tavern_blueprints.md'
with open(md_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Extract json blocks
blocks = re.findall(r'```json\s*(\{.*?\})\s*```', text, re.DOTALL)
print(f'Extracted {len(blocks)} json blocks from markdown')

bp_dir = r'D:\SteamLibrary\steamapps\common\Valheim\BepInEx\config\PlanBuild\blueprints'
os.makedirs(bp_dir, exist_ok=True)

for i, block in enumerate(blocks):
    data = json.loads(block)
    name = data['name']
    author = data.get('author', 'Antigravity')
    desc = data.get('description', '')
    cat = data.get('category', 'Viking')
    pieces = data['pieces']
    
    # Sort pieces by Y elevation ascending
    pieces.sort(key=lambda p: p.get('y', 0))
    
    lines = [
        f'#Name:{name}',
        f'#Creator:{author}',
        f'#Description:"{desc}"',
        f'#Category:{cat}',
        '#SnapPoints',
        '#Pieces'
    ]
    for p in pieces:
        raw_prefab = p['prefab'].replace('(Clone)', '').strip()
        prefab = CANONICAL.get(raw_prefab.lower(), raw_prefab)
        x = float(p.get('x', 0))
        y = float(p.get('y', 0))
        z = float(p.get('z', 0))
        rx = float(p.get('rx', 0))
        ry = float(p.get('ry', 0))
        rz = float(p.get('rz', 0))
        rw = float(p.get('rw', 1))
        lines.append(f'{prefab};{cat};{x:.4f};{y:.4f};{z:.4f};{rx:.6f};{ry:.6f};{rz:.6f};{rw:.6f};""')
        
    safe_filename = name.replace(' ', '_').replace('&', 'and') + '.blueprint'
    target_file = os.path.join(bp_dir, safe_filename)
    with open(target_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')
    print(f'Wrote {target_file} ({len(pieces)} pieces)')

# Also write/update Viking_Mead_Hall.blueprint with canonical prefabs and bottom-to-top Y sorting
hall_file = os.path.join(bp_dir, 'Viking_Mead_Hall.blueprint')
if os.path.exists(hall_file):
    with open(hall_file, 'r', encoding='utf-8') as f:
        hall_lines = [l.strip() for l in f.readlines() if l.strip()]
    header = []
    piece_entries = []
    in_pieces = False
    for line in hall_lines:
        if line.startswith('#Pieces'):
            header.append(line)
            in_pieces = True
            continue
        if not in_pieces:
            header.append(line)
        else:
            parts = line.split(';')
            if len(parts) >= 9:
                p_name = parts[0].strip()
                p_name = CANONICAL.get(p_name.lower(), p_name)
                parts[0] = p_name
                try:
                    y_val = float(parts[3])
                except:
                    y_val = 0.0
                piece_entries.append((y_val, ';'.join(parts)))
    piece_entries.sort(key=lambda x: x[0])
    new_content = '\n'.join(header + [p[1] for p in piece_entries]) + '\n'
    with open(hall_file, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f'Updated {hall_file} with canonical prefabs and elevation sorting')
