"""Extract only the supplied silver d6/d20; leave the source collection unchanged."""
from pathlib import Path
import struct, zlib, json
ROOT = Path(__file__).resolve().parents[1]
raw = (ROOT / 'assets/dnd-dice-set/source/DiceSet.fbx').read_bytes()
version = struct.unpack_from('<I', raw, 23)[0]
wide = version >= 7500
header = 25 if wide else 13
assert version == 7400, 'Revalidate UV mapping before changing the supplied FBX revision'
pos = 27

def prop():
    global pos
    t = chr(raw[pos])
    pos += 1
    if t in 'YCFDIL':
        fmt = {'Y': 'h', 'C': '?', 'F': 'f', 'D': 'd', 'I': 'i', 'L': 'q'}[t]
        v = struct.unpack_from('<' + fmt, raw, pos)[0]
        pos += struct.calcsize(fmt)
        return v
    if t in 'SR':
        n = struct.unpack_from('<I', raw, pos)[0]
        pos += 4
        v = raw[pos:pos + n]
        pos += n
        return v.decode('utf-8', 'replace') if t == 'S' else None
    n, enc, size = struct.unpack_from('<III', raw, pos)
    pos += 12
    data = raw[pos:pos + size]
    pos += size
    if enc:
        data = zlib.decompress(data)
    fmt = {'f': 'f', 'd': 'd', 'l': 'q', 'i': 'i', 'b': '?', 'c': 'b'}[t]
    return list(struct.unpack('<' + str(n) + fmt, data))

def node():
    global pos
    end, count, length, name_len = struct.unpack_from('<QQQB' if wide else '<IIIB', raw, pos)
    pos += header
    if not end:
        return None
    name = raw[pos:pos + name_len].decode()
    pos += name_len
    props = [prop() for _ in range(count)]
    children = []
    while pos < end - header:
        child = node()
        if child:
            children.append(child)
    pos = end
    return {'name': name, 'props': props, 'children': children}
nodes = []
while pos < len(raw) - header:
    n = node()
    if not n:
        break
    nodes.append(n)
import math, hashlib
from PIL import Image
objects = next((n['children'] for n in nodes if n['name'] == 'Objects'))
connections = next((n['children'] for n in nodes if n['name'] == 'Connections'))
output = ROOT / 'src/features/presentation/dice-assets'
output.mkdir(parents=True, exist_ok=True)

def sub(a, b):
    return [x - y for x, y in zip(a, b)]

def dot(a, b):
    return sum((x * y for x, y in zip(a, b)))

def cross(a, b):
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

def unit(a):
    return [x / math.sqrt(dot(a, a)) for x in a]
records = []
for sides, texture in [(6, 'SixSilverAlbedo.png'), (20, 'SilverDiceAlbedo.png')]:
    model = next((o for o in objects if o['name'] == 'Model' and o['props'][1].startswith(str(sides) + 'Silver\x00')))
    links = [c['props'][1] for c in connections if c['props'][2:] == [model['props'][0]]]
    geom = next((o for o in objects if o['name'] == 'Geometry' and o['props'][0] in links))
    children = {c['name']: c for c in geom['children']}
    raw_positions = children['Vertices']['props'][0]
    vertices = [raw_positions[i:i + 3] for i in range(0, len(raw_positions), 3)]
    center = [(min((v[j] for v in vertices)) + max((v[j] for v in vertices))) / 2 for j in range(3)]
    vertices = [sub(v, center) for v in vertices]
    radius = max((math.sqrt(dot(v, v)) for v in vertices))
    vertices = [[x / radius for x in v] for v in vertices]
    uv = {c['name']: c['props'][0] for c in children['LayerElementUV']['children']}
    normals = {c['name']: c['props'][0] for c in children['LayerElementNormal']['children']}
    assert uv['MappingInformationType'] == 'ByPolygonVertex' and normals['MappingInformationType'] == 'ByVertice'
    polygons = []
    polygon = []
    for corner, index in enumerate(children['PolygonVertexIndex']['props'][0]):
        polygon.append((index if index >= 0 else -index - 1, corner))
        if index < 0:
            polygons.append(polygon)
            polygon = []
    data = {'position': [], 'normal': [], 'uv': [], 'poses': []}
    faces = []
    for polygon in polygons:
        points = [vertices[v] for v, _ in polygon]
        uvs = [uv['UV'][uv['UVIndex'][corner] * 2:uv['UVIndex'][corner] * 2 + 2] for _, corner in polygon]
        normal = cross(sub(points[1], points[0]), sub(points[2], points[0]))
        area = math.sqrt(dot(normal, normal))
        normal = unit(normal)
        faces.append((area, points, uvs, normal))
        for i in range(1, len(polygon) - 1):
            for which in [0, i, i + 1]:
                v, corner = polygon[which]
                ni = normals['NormalsIndex'][v]
                data['position'].extend(points[which])
                data['normal'].extend(normals['Normals'][ni * 3:ni * 3 + 3])
                data['uv'].extend(uvs[which])
    for _, points, uvs, normal in sorted(faces, key=lambda f: f[0], reverse=True)[:sides]:
        middle = [sum((p[j] for p in uvs)) / len(uvs) for j in range(2)]
        if sides == 6:
            locations = [(1, 0.5, 0.875), (2, 0.25, 0.625), (3, 0.5, 0.625), (4, 0.5, 0.125), (5, 0.75, 0.625), (6, 0.5, 0.375)]
        else:
            locations = []
            for values, y, xs in [([2, 20, 14, 4, 18], 0.779, [0.091, 0.273, 0.455, 0.636, 0.818]), ([12, 8, 6, 11, 5], 0.556, [0.091, 0.273, 0.455, 0.636, 0.818]), ([10, 16, 9, 13, 15], 0.445, [0.182, 0.364, 0.545, 0.727, 0.909]), ([17, 3, 19, 1, 7], 0.223, [0.182, 0.364, 0.545, 0.727, 0.909])]:
                locations.extend(((value, x, y) for value, x in zip(values, xs)))
        value, u, v = min(locations, key=lambda p: (p[1] - middle[0]) ** 2 + (p[2] - middle[1]) ** 2)
        assert abs(u - middle[0]) < 0.01 and abs(v - middle[1]) < 0.01
        edge1 = sub(points[1], points[0])
        edge2 = sub(points[2], points[0])
        du1, dv1 = sub(uvs[1], uvs[0])
        du2, dv2 = sub(uvs[2], uvs[0])
        det = du1 * dv2 - du2 * dv1
        tangent = unit([(edge1[j] * dv2 - edge2[j] * dv1) / det for j in range(3)])
        tangent = unit(sub(tangent, [dot(tangent, normal) * n for n in normal]))
        up = cross(normal, tangent)
        if sides == 20 and v in [0.556, 0.223]:
            tangent = [-x for x in tangent]
            up = [-x for x in up]
        matrix = [tangent[0], up[0], normal[0], 0, tangent[1], up[1], normal[1], 0, tangent[2], up[2], normal[2], 0, 0, 0, 0, 1]
        assert dot(normal, [sum((p[j] for p in points)) for j in range(3)]) > 0
        assert all((abs(dot(row, normal) - expected) < 1e-05 for row, expected in [(tangent, 0), (up, 0), (normal, 1)]))
        data['poses'].append({'value': value, 'matrix': matrix})
    assert sorted((p['value'] for p in data['poses'])) == list(range(1, sides + 1))
    for key in ['position', 'normal', 'uv']:
        assert all((math.isfinite(x) for x in data[key]))
        data[key] = [round(x, 6) for x in data[key]]
    assert len(data['position']) == len(data['normal']) and len(data['position']) // 3 == len(data['uv']) // 2
    (output / f'd{sides}.json').write_text(json.dumps(data, separators=(',', ':')) + '\n', encoding='utf-8')
    Image.open(ROOT / 'assets/dnd-dice-set/textures' / texture).save(output / f'd{sides}.webp', 'WEBP', lossless=True)
    records.append({'model': str(sides) + 'Silver', 'sourceGeometry': geom['props'][1].split('\x00')[0], 'texture': texture, 'faces': sides, 'triangles': len(data['position']) // 9})
(output / 'provenance.json').write_text(json.dumps({'source': 'assets/dnd-dice-set/source/DiceSet.fbx', 'sourceSha256': hashlib.sha256(raw).hexdigest(), 'providerVerifiedLicense': None, 'userAuthorization': 'User supplied this set and requested its grey d6/d20 for the Listoire reader. Only these two meshes and their silver textures are extracted; no collection redistribution.', 'models': records}, indent=2) + '\n', encoding='utf-8')
print(json.dumps(records))
