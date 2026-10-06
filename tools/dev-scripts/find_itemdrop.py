import UnityPy, os, re

# Let's inspect bundle or resources.assets for ItemDrop components
res_path = r"D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\resources.assets"
env = UnityPy.load(res_path)

print("Searching resources.assets for ItemDrop or ObjectDB...")
for obj in env.objects:
    if obj.type.name == "MonoBehaviour":
        try:
            data = obj.read()
            # Check script type
            if hasattr(data, "m_Script"):
                script = data.m_Script.read()
                sname = getattr(script, "m_Name", "") or getattr(script, "m_ClassName", "")
                if sname in ["ObjectDB", "ItemDrop"]:
                    print(f"Found {sname} MonoBehaviour in resources.assets! Name={getattr(data, 'm_Name', '')}")
        except Exception as e:
            pass
