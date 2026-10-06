import struct

# Let's inspect ItemData.Save IL
# We can read the method body from assembly_valheim.dll directly or inspect bytecode
with open(r"D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed\assembly_valheim.dll", "rb") as f:
    dll = f.read()

# Let's see what strings are in ItemData
# Let's search for "ZPackage" calls or WriteInt32 etc.
# In C# / Unity, ZPackage has:
# Write(int)
# Write(string)
# Write(float)
# Write(bool)
# Write(long)
# Write(Vector3)
# Write(byte[])
# Write(ZPackage)
