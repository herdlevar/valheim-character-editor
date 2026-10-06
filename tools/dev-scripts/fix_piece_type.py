import re

file_path = r'c:\Users\Jared\Documents\antigravity\goofy-einstein\src\mod\ValheimLiveBridgePlugin.cs'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''                try
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
                catch { }'''

replacement = '''                try
                {
                    List<Piece> pieces = ObjectDB.instance.GetAllBuildPieces();
                    if (pieces != null)
                    {
                        foreach (Piece piece in pieces)
                        {
                            if (piece == null || piece.gameObject == null) continue;
                            GameObject go = piece.gameObject;
                            string name = go.name;
                            if (!_prefabsByName.ContainsKey(name)) _prefabsByName[name] = go;
                            string norm = NormalizePrefabKey(name);
                            if (!_prefabsByNorm.ContainsKey(norm)) _prefabsByNorm[norm] = go;
                        }
                    }
                }
                catch { }'''

if target not in content:
    print("Target not found!")
    exit(1)

content = content.replace(target, replacement)
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated GetAllBuildPieces loop to use List<Piece>!")
