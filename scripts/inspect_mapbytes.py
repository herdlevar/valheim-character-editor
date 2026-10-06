import struct

# Read knut.fch and inspect mapBytes
with open(r"C:\Program Files (x86)\Steam\userdata\1622853\892970\remote\characters\knut.fch", "rb") as f:
    data = f.read()

print(f"Total fch size: {len(data)} bytes")
# Let's see how big the worlds array and mapBytes are
from decode_items import *
# Let's inspect mapBytes length
