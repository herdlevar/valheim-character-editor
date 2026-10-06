using System;
using System.Reflection;
using UnityEngine;

public class TestTextureExport
{
    public static byte[] GetMapTextureBytes()
    {
        Minimap minimap = Minimap.instance;
        if (minimap == null) return null;

        FieldInfo texField = typeof(Minimap).GetField("m_mapTexture", BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);
        if (texField == null) return null;

        Texture2D mapTex = texField.GetValue(minimap) as Texture2D;
        if (mapTex == null) return null;

        // In Unity, if the texture is readable, EncodeToJPG or EncodeToPNG works directly
        // If not readable, we can blit to RenderTexture and read back
        try
        {
            if (mapTex.isReadable)
            {
                return ImageConversion.EncodeToJPG(mapTex, 85);
            }
        }
        catch { }

        // Blit fallback for unreadable GPU textures
        RenderTexture rt = RenderTexture.GetTemporary(mapTex.width, mapTex.height, 0, RenderTextureFormat.ARGB32);
        Graphics.Blit(mapTex, rt);
        RenderTexture prev = RenderTexture.active;
        RenderTexture.active = rt;

        Texture2D readableTex = new Texture2D(mapTex.width, mapTex.height, TextureFormat.RGBA32, false);
        readableTex.ReadPixels(new Rect(0, 0, rt.width, rt.height), 0, 0);
        readableTex.Apply();

        RenderTexture.active = prev;
        RenderTexture.ReleaseTemporary(rt);

        byte[] bytes = ImageConversion.EncodeToJPG(readableTex, 85);
        UnityEngine.Object.Destroy(readableTex);
        return bytes;
    }
}
