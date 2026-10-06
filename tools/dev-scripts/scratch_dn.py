import dnfile

dn = dnfile.dnPE(r'D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed\assembly_valheim.dll')

# Let's list methods in PieceTable
for row in dn.net.mdtables.TypeDef:
    if row.TypeName in ['PieceTable', 'Piece', 'ZNetScene', 'ObjectDB']:
        print(f"=== Type: {row.TypeName} ===")
        # Get method list
        # TypeDef row has MethodList index
        pass

# Let's inspect string user strings (#US stream)
us = dn.net.metadata.streams.get(b'#US')
if us:
    print("User Strings stream exists, size:", len(us.data))
    # Search for roof, piece, torch in #US
    import re
    for match in re.finditer(rb'[\x20-\x7e]{3,}', us.data):
        s = match.group(0).decode('ascii', errors='ignore')
        if any(k in s for k in ['woodroof', 'groundtorch', 'piece_chest', 'piece_wood']):
            print('  US:', s)
