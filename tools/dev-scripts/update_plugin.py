import re

replacement = '''        private static readonly Dictionary<string, string> PrefabAliases = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            // Roofs 45
            { "roof_wood_45", "wood_roof_45" },
            { "wood_roof_45", "wood_roof_45" },
            { "woodroof45", "wood_roof_45" },
            { "piece_woodroof45", "wood_roof_45" },
            { "piece_wood_roof_45", "wood_roof_45" },
            { "roof45", "wood_roof_45" },
            { "roof_45", "wood_roof_45" },
            { "roof_wood_ridge_45", "wood_roof_top_45" },
            { "wood_roof_ridge_45", "wood_roof_top_45" },
            { "wood_roof_top_45", "wood_roof_top_45" },
            { "woodrooftop45", "wood_roof_top_45" },
            { "piece_woodrooftop45", "wood_roof_top_45" },
            { "piece_wood_roof_top_45", "wood_roof_top_45" },
            { "piece_woodrooftop_45", "wood_roof_top_45" },
            { "roof_ridge_45", "wood_roof_top_45" },
            { "roof_wood_corner_45", "wood_roof_ocorner_45" },
            { "roof_wood_icorner_45", "wood_roof_icorner_45" },
            { "roof_wood_ocorner_45", "wood_roof_ocorner_45" },
            { "wood_roof_icorner_45", "wood_roof_icorner_45" },
            { "wood_roof_ocorner_45", "wood_roof_ocorner_45" },
            { "woodroof_corner_45", "wood_roof_ocorner_45" },
            { "woodrooficorner45", "wood_roof_icorner_45" },
            { "woodroofocorner45", "wood_roof_ocorner_45" },

            // Roofs 26
            { "roof_wood_26", "wood_roof_26" },
            { "wood_roof_26", "wood_roof_26" },
            { "woodroof26", "wood_roof_26" },
            { "piece_woodroof26", "wood_roof_26" },
            { "piece_wood_roof_26", "wood_roof_26" },
            { "roof26", "wood_roof_26" },
            { "roof_wood_ridge_26", "wood_roof_top" },
            { "wood_roof_ridge_26", "wood_roof_top" },
            { "wood_roof_top", "wood_roof_top" },
            { "woodrooftop26", "wood_roof_top" },
            { "woodrooftop", "wood_roof_top" },
            { "piece_woodrooftop", "wood_roof_top" },
            { "roof_wood_corner_26", "wood_roof_ocorner" },
            { "roof_wood_icorner_26", "wood_roof_icorner" },
            { "roof_wood_ocorner_26", "wood_roof_ocorner" },
            { "wood_roof_ocorner", "wood_roof_ocorner" },
            { "wood_roof_icorner", "wood_roof_icorner" },

            // Darkwood Roofs
            { "darkwood_roof_45", "darkwood_roof_45" },
            { "darkwood_roof_26", "darkwood_roof_26" },
            { "darkwood_roof_ridge_45", "darkwood_roof_top_45" },
            { "darkwood_roof_top_45", "darkwood_roof_top_45" },
            { "darkwood_roof_ridge_26", "darkwood_roof_top" },
            { "darkwood_roof_top", "darkwood_roof_top" },

            // Walls & Gables
            { "woodwall", "woodwall" },
            { "piece_woodwall", "woodwall" },
            { "wood_wall", "woodwall" },
            { "woodwall_half", "wood_wall_half" },
            { "wood_wall_half", "wood_wall_half" },
            { "piece_woodwallhalf", "wood_wall_half" },
            { "woodwallhalf", "wood_wall_half" },
            { "woodwall_quarter", "wood_wall_quarter" },
            { "wood_wall_quarter", "wood_wall_quarter" },
            { "piece_woodwallquarter", "wood_wall_quarter" },
            { "woodwallquarter", "wood_wall_quarter" },
            { "woodwall_roof_45", "wood_wall_roof_45" },
            { "wood_wall_roof_45", "wood_wall_roof_45" },
            { "woodwallroof45", "wood_wall_roof_45" },
            { "piece_woodwallroof45", "wood_wall_roof_45" },
            { "woodwall_roof", "wood_wall_roof" },
            { "wood_wall_roof", "wood_wall_roof" },
            { "woodwallroof", "wood_wall_roof" },
            { "piece_woodwallroof", "wood_wall_roof" },
            { "woodwall_rooftop_45", "wood_wall_roof_top_45" },
            { "wood_wall_roof_top_45", "wood_wall_roof_top_45" },
            { "woodwallrooftop45", "wood_wall_roof_top_45" },
            { "piece_woodwallrooftop45", "wood_wall_roof_top_45" },
            { "woodwall_rooftop", "wood_wall_roof_top" },
            { "wood_wall_roof_top", "wood_wall_roof_top" },
            { "woodwallrooftop", "wood_wall_roof_top" },
            { "piece_woodwallrooftop", "wood_wall_roof_top" },

            // Doors & Gates
            { "wood_door", "wood_door" },
            { "wooddoor", "wood_door" },
            { "piece_wooddoor", "wood_door" },
            { "door", "wood_door" },
            { "cloth_door", "piece_clothdoor" },
            { "iron_gate", "ironwall" },

            // Floors
            { "woodfloor", "wood_floor" },
            { "piece_woodfloor", "wood_floor" },
            { "wood_floor", "wood_floor" },
            { "woodfloor2x2", "wood_floor" },
            { "woodfloor_2x2", "wood_floor" },
            { "wood_floor_2x2", "wood_floor" },
            { "piece_woodfloor2x2", "wood_floor" },
            { "piece_woodfloor_2x2", "wood_floor" },
            { "woodfloor1x1", "wood_floor_1x1" },
            { "woodfloor_1x1", "wood_floor_1x1" },
            { "wood_floor_1x1", "wood_floor_1x1" },
            { "piece_woodfloor1x1", "wood_floor_1x1" },
            { "piece_woodfloor_1x1", "wood_floor_1x1" },

            // Stone
            { "stonewall4x2", "stone_wall_4x2" },
            { "piece_stonewall4x2", "stone_wall_4x2" },
            { "stone_wall_4x2", "stone_wall_4x2" },
            { "stonewall_4x2", "stone_wall_4x2" },
            { "piece_stone_wall_4x2", "stone_wall_4x2" },
            { "stonewall2x1", "stone_wall_2x1" },
            { "piece_stonewall2x1", "stone_wall_2x1" },
            { "stone_wall_2x1", "stone_wall_2x1" },
            { "stonewall_2x1", "stone_wall_2x1" },
            { "piece_stone_wall_2x1", "stone_wall_2x1" },
            { "stonewall1x1", "stone_wall_1x1" },
            { "piece_stonewall1x1", "stone_wall_1x1" },
            { "stone_wall_1x1", "stone_wall_1x1" },
            { "stonewall_1x1", "stone_wall_1x1" },
            { "piece_stone_wall_1x1", "stone_wall_1x1" },
            { "stonefloor2x2", "stone_floor_2x2" },
            { "piece_stonefloor2x2", "stone_floor_2x2" },
            { "stone_floor_2x2", "stone_floor_2x2" },
            { "stonefloor_2x2", "stone_floor_2x2" },
            { "piece_stone_floor_2x2", "stone_floor_2x2" },
            { "stonefloor", "stone_floor" },
            { "stone_floor", "stone_floor" },
            { "stonefloor4x4", "stone_floor_4x4" },
            { "piece_stonefloor4x4", "stone_floor_4x4" },
            { "stone_floor_4x4", "stone_floor_4x4" },
            { "stonefloor_4x4", "stone_floor_4x4" },
            { "piece_stone_floor_4x4", "stone_floor_4x4" },
            { "stonearch", "stonearch" },
            { "piece_stonearch", "stonearch" },
            { "stone_arch", "stonearch" },
            { "piece_stone_arch", "stonearch" },
            { "stonestair", "stonestair" },
            { "piece_stonestair", "stonestair" },
            { "stonestairs", "stonestair" },
            { "piece_stonestairs", "stonestair" },
            { "stone_stairs", "stonestair" },
            { "piece_stone_stairs", "stonestair" },
            { "stonepillar", "stonepillar" },
            { "piece_stonepillar", "stonepillar" },
            { "stone_pillar", "stonepillar" },

            // Wood Beams & Poles
            { "woodbeam26", "woodbeam26" },
            { "woodbeam_26", "woodbeam26" },
            { "piece_woodbeam26", "woodbeam26" },
            { "woodbeam45", "woodbeam45" },
            { "woodbeam_45", "woodbeam45" },
            { "piece_woodbeam45", "woodbeam45" },
            { "woodbeam1", "woodbeam1" },
            { "woodbeam_1", "woodbeam1" },
            { "piece_woodbeam1", "woodbeam1" },
            { "woodbeam2", "woodbeam2" },
            { "woodbeam_2", "woodbeam2" },
            { "woodbeam", "woodbeam2" },
            { "piece_woodbeam", "woodbeam2" },
            { "piece_woodbeam2", "woodbeam2" },
            { "woodpole", "woodpole" },
            { "piece_woodpole", "woodpole" },
            { "woodpole2", "woodpole2" },
            { "woodpole_2", "woodpole2" },
            { "piece_woodpole2", "woodpole2" },
            { "piece_woodpole_2", "woodpole2" },
            { "logbeam2", "logbeam2" },
            { "logbeam_2", "logbeam2" },
            { "piece_logbeam2", "logbeam2" },
            { "piece_logbeam_2", "logbeam2" },
            { "logbeam4", "logbeam4" },
            { "logbeam_4", "logbeam4" },
            { "piece_logbeam4", "logbeam4" },
            { "piece_logbeam_4", "logbeam4" },
            { "logpole2", "logpole2" },
            { "logpole_2", "logpole2" },
            { "piece_logpole2", "logpole2" },
            { "piece_logpole_2", "logpole2" },
            { "logpole4", "logpole4" },
            { "logpole_4", "logpole4" },
            { "piece_logpole4", "logpole4" },
            { "piece_logpole_4", "logpole4" },

            // Stations & Utilities
            { "workbench", "piece_workbench" },
            { "piece_workbench", "piece_workbench" },
            { "forge", "forge" },
            { "piece_forge", "forge" },
            { "smelter", "smelter" },
            { "piece_smelter", "smelter" },
            { "blastfurnace", "blastfurnace" },
            { "piece_blastfurnace", "blastfurnace" },
            { "fermenter", "fermenter" },
            { "piece_fermenter", "fermenter" },
            { "charcoalkiln", "charcoalkiln" },
            { "charcoal_kiln", "charcoalkiln" },
            { "piece_charcoalkiln", "charcoalkiln" },
            { "kiln", "charcoalkiln" },
            { "cartographytable", "cartographytable" },
            { "cartography_table", "cartographytable" },
            { "piece_cartographytable", "cartographytable" },
            { "spinningwheel", "spinningwheel" },
            { "piece_spinningwheel", "spinningwheel" },
            { "windmill", "windmill" },
            { "piece_windmill", "windmill" },
            { "stonecutter", "piece_stonecutter" },
            { "piece_stonecutter", "piece_stonecutter" },

            // Hearth & Fire
            { "hearth", "hearth" },
            { "piece_hearth", "hearth" },
            { "firepit", "fire_pit" },
            { "fire_pit", "fire_pit" },
            { "piece_firepit", "fire_pit" },
            { "bonfire", "bonfire" },
            { "piece_bonfire", "bonfire" },
            { "firepit_iron", "firepit_iron" },
            { "iron_firepit", "firepit_iron" },
            { "piece_firepit_iron", "firepit_iron" },

            // Furniture & Lights
            { "bed", "bed" },
            { "piece_bed", "bed" },
            { "bed02", "bed02" },
            { "piece_bed02", "bed02" },
            { "chair", "chair" },
            { "piece_chair", "chair" },
            { "darkwoodchair", "piece_darkwoodchair" },
            { "table", "table" },
            { "piece_table", "table" },
            { "table_round", "piece_table_round" },
            { "table_oak", "piece_table_oak" },
            { "standing_wood_torch", "piece_groundtorch_wood" },
            { "groundtorchwood", "piece_groundtorch_wood" },
            { "piece_groundtorchwood", "piece_groundtorch_wood" },
            { "piece_groundtorch_wood", "piece_groundtorch_wood" },
            { "standing_green_torch", "piece_groundtorchgreen" },
            { "groundtorchgreen", "piece_groundtorchgreen" },
            { "piece_groundtorchgreen", "piece_groundtorchgreen" },
            { "piece_groundtorch_green", "piece_groundtorchgreen" },
            { "standing_blue_torch", "piece_groundtorchblue" },
            { "groundtorchblue", "piece_groundtorchblue" },
            { "piece_groundtorchblue", "piece_groundtorchblue" },
            { "piece_groundtorch_blue", "piece_groundtorchblue" },
            { "standing_iron_torch", "piece_groundtorch" },
            { "groundtorch", "piece_groundtorch" },
            { "piece_groundtorch", "piece_groundtorch" },
            { "portal", "portal" },
            { "piece_portal", "portal" },
            { "portal_wood", "portal" },
            { "portal_stone", "portal_stone" },
            { "piece_portal_stone", "portal_stone" },
            { "chest", "piece_chest" },
            { "piece_chest", "piece_chest" },
            { "chest_wood", "piece_chest_wood" },
            { "piece_chestwood", "piece_chest_wood" },
            { "piece_chest_wood", "piece_chest_wood" },
            { "iron_chest", "ironchest" },
        };

        private static readonly Dictionary<string, GameObject> _prefabsByName = new Dictionary<string, GameObject>(StringComparer.OrdinalIgnoreCase);
        private static readonly Dictionary<string, GameObject> _prefabsByNorm = new Dictionary<string, GameObject>(StringComparer.OrdinalIgnoreCase);

        private static string NormalizePrefabKey(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            string lower = s.ToLowerInvariant().Trim();
            if (lower.StartsWith("piece_")) lower = lower.Substring(6);
            else if (lower.StartsWith("piece")) lower = lower.Substring(5);
            return lower.Replace("_", "").Replace(" ", "");
        }

        private static void EnsurePrefabCache()
        {
            if (_prefabsByName.Count > 0) return;

            if (ZNetScene.instance != null && ZNetScene.instance.m_prefabs != null)
            {
                foreach (GameObject go in ZNetScene.instance.m_prefabs)
                {
                    if (go == null) continue;
                    string name = go.name;
                    if (!_prefabsByName.ContainsKey(name)) _prefabsByName[name] = go;
                    string norm = NormalizePrefabKey(name);
                    if (!_prefabsByNorm.ContainsKey(norm)) _prefabsByNorm[norm] = go;
                }
            }

            if (ObjectDB.instance != null)
            {
                try
                {
                    List<GameObject> pieces = ObjectDB.instance.GetAllBuildPieces();
                    if (pieces != null)
                    {
                        foreach (GameObject go in pieces)
                        {
                            if (go == null) continue;
                            string name = go.name;
                            if (!_prefabsByName.ContainsKey(name)) _prefabsByName[name] = go;
                            string norm = NormalizePrefabKey(name);
                            if (!_prefabsByNorm.ContainsKey(norm)) _prefabsByNorm[norm] = go;
                        }
                    }
                }
                catch { }

                try
                {
                    if (ObjectDB.instance.m_items != null)
                    {
                        foreach (GameObject go in ObjectDB.instance.m_items)
                        {
                            if (go == null) continue;
                            string name = go.name;
                            if (!_prefabsByName.ContainsKey(name)) _prefabsByName[name] = go;
                            string norm = NormalizePrefabKey(name);
                            if (!_prefabsByNorm.ContainsKey(norm)) _prefabsByNorm[norm] = go;
                        }
                    }
                }
                catch { }
            }
        }

        private GameObject FindBuildingPrefab(string name)
        {
            if (string.IsNullOrEmpty(name)) return null;

            string clean = name.Trim();
            if (clean.EndsWith("(Clone)")) clean = clean.Substring(0, clean.Length - 7).Trim();

            // 1. Direct match from ZNetScene
            if (ZNetScene.instance != null)
            {
                GameObject direct = ZNetScene.instance.GetPrefab(clean);
                if (direct != null) return direct;
            }

            EnsurePrefabCache();

            // 2. Direct cache lookup (case insensitive)
            GameObject cached;
            if (_prefabsByName.TryGetValue(clean, out cached)) return cached;

            // 3. Known Aliases table
            string mapped;
            if (PrefabAliases.TryGetValue(clean, out mapped))
            {
                if (ZNetScene.instance != null)
                {
                    GameObject direct = ZNetScene.instance.GetPrefab(mapped);
                    if (direct != null) return direct;
                }
                if (_prefabsByName.TryGetValue(mapped, out cached)) return cached;
                string normMapped = NormalizePrefabKey(mapped);
                if (_prefabsByNorm.TryGetValue(normMapped, out cached)) return cached;
            }

            // 4. Normalized lookup (strips "piece_", spaces, and underscores)
            string norm = NormalizePrefabKey(clean);
            if (_prefabsByNorm.TryGetValue(norm, out cached)) return cached;

            // 5. Try stripping "piece_" prefix directly
            string stripped = clean.ToLowerInvariant();
            if (stripped.StartsWith("piece_")) stripped = stripped.Substring(6);
            else if (stripped.StartsWith("piece")) stripped = stripped.Substring(5);

            if (_prefabsByName.TryGetValue(stripped, out cached)) return cached;

            if (PrefabAliases.TryGetValue(stripped, out mapped))
            {
                if (_prefabsByName.TryGetValue(mapped, out cached)) return cached;
                if (_prefabsByNorm.TryGetValue(NormalizePrefabKey(mapped), out cached)) return cached;
            }

            // 6. Try prepending "piece_" directly
            if (_prefabsByName.TryGetValue("piece_" + stripped, out cached)) return cached;

            // 7. Try prepending "wood_" or "stone_" if missing
            if (_prefabsByName.TryGetValue("wood_" + stripped, out cached)) return cached;
            if (_prefabsByName.TryGetValue("stone_" + stripped, out cached)) return cached;

            // 8. Fallback loop over ZNetScene.m_prefabs
            if (ZNetScene.instance != null && ZNetScene.instance.m_prefabs != null)
            {
                foreach (GameObject p in ZNetScene.instance.m_prefabs)
                {
                    if (p == null) continue;
                    string pNorm = NormalizePrefabKey(p.name);
                    if (pNorm == norm) return p;
                }
            }

            return null;
        }'''

file_path = r'c:\Users\Jared\Documents\antigravity\goofy-einstein\src\mod\ValheimLiveBridgePlugin.cs'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = 'private static readonly Dictionary<string, string> PrefabAliases'
end_marker = 'private string BuildBlueprint(string json)'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print(f"Error: markers not found (start: {start_idx}, end: {end_idx})")
    exit(1)

# Find indentation of start_marker
new_content = content[:start_idx] + replacement.strip() + '\n\n        ' + content[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Updated ValheimLiveBridgePlugin.cs successfully!")
