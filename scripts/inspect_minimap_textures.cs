using System;
using System.IO;
using System.Reflection;
using UnityEngine;

public class InspectMinimapTextures
{
    public static void Run()
    {
        using (StreamWriter sw = new StreamWriter("scripts/minimap_textures.txt"))
        {
            sw.WriteLine("--- MINIMAP FIELDS ---");
            foreach (FieldInfo f in typeof(Minimap).GetFields(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static))
            {
                if (f.FieldType == typeof(Texture2D) || 
                    f.FieldType == typeof(Sprite) || 
                    f.FieldType == typeof(RenderTexture) ||
                    f.Name.IndexOf("texture", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    f.Name.IndexOf("map", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    f.Name.IndexOf("fog", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    f.Name.IndexOf("explored", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    f.Name.IndexOf("pixel", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    sw.WriteLine(f.FieldType.Name + " " + f.Name);
                }
            }

            sw.WriteLine("\n--- MINIMAP METHODS ---");
            foreach (MethodInfo m in typeof(Minimap).GetMethods(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static))
            {
                if (m.Name.IndexOf("Texture", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    m.Name.IndexOf("Explore", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    m.Name.IndexOf("Map", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    m.Name.IndexOf("Fog", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    sw.WriteLine(m.ReturnType.Name + " " + m.Name);
                }
            }
        }
    }
}
