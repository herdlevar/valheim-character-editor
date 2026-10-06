with open(r"C:\Program Files (x86)\Steam\userdata\1622853\892970\remote\characters\knut.fch", "rb") as f:
    raw = f.read()

# Let's search for Hair and Beard strings in raw knut.fch
import re
hair_matches = re.findall(rb'Hair[A-Za-z0-9_]*', raw)
beard_matches = re.findall(rb'Beard[A-Za-z0-9_]*', raw)
print("Hair matches in knut.fch:", set(m.decode() for m in hair_matches))
print("Beard matches in knut.fch:", set(m.decode() for m in beard_matches))
