path = r'C:\Users\Jared\.gemini\antigravity\brain\bd8f8b09-d741-4552-b7db-d3e1749f014b\mountain_tavern_blueprints.md'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

for z in [-3, -1, 1, 3]:
    text = text.replace(f'"prefab": "wood_roof_45", "x": -2, "y": 5, "z": {z}, "rx": 0, "ry": 0.7071, "rz": 0, "rw": 0.7071',
                        f'"prefab": "wood_roof_45", "x": -2, "y": 5, "z": {z}, "rx": 0, "ry": -0.7071, "rz": 0, "rw": 0.7071')
    text = text.replace(f'"prefab": "wood_roof_45", "x": 2, "y": 5, "z": {z}, "rx": 0, "ry": -0.7071, "rz": 0, "rw": 0.7071',
                        f'"prefab": "wood_roof_45", "x": 2, "y": 5, "z": {z}, "rx": 0, "ry": 0.7071, "rz": 0, "rw": 0.7071')
    text = text.replace(f'"prefab": "wood_roof_top_45", "x": 0, "y": 6.5, "z": {z}, "rx": 0, "ry": 0, "rz": 0, "rw": 1',
                        f'"prefab": "wood_roof_top_45", "x": 0, "y": 6.5, "z": {z}, "rx": 0, "ry": 0.7071, "rz": 0, "rw": 0.7071')

text = text.replace('"piece_chest"', '"piece_chestwood"')

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated mountain_tavern_blueprints.md successfully!")
