"""Refresh the simplified municipal outlines used by Fieldnotes."""

import json
from collections import defaultdict
from itertools import combinations
from math import cos, hypot, radians
import re
import unicodedata
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen


DATA = Path(__file__).resolve().parent.parent / "data"
QUERY = (
    "https://services1.arcgis.com/hWUp5lYOh3Fi9WoQ/arcgis/rest/services/"
    "GvulotShputRashuyotVaadim/FeatureServer/0/query?"
)
# GeoNames spellings that differ from the municipality layer.
CODES = {293286: "2710", 293831: "8200", 10227184: "9400", 293308: "2100"}


def query(**params):
    with urlopen(QUERY + urlencode(params), timeout=40) as response:
        result = json.load(response)
    if "error" in result or result.get("exceededTransferLimit"):
        raise ValueError(str(result.get("error", "Boundary query exceeded transfer limit")))
    return result["features"]


def normalize(value):
    return re.sub(r"[^a-z0-9א-ת]", "", unicodedata.normalize("NFKD", value or "").lower())


def orient_for_d3(ring, exterior):
    # D3 uses clockwise exterior rings for small spherical polygons.
    signed_area = sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(ring, ring[1:]))
    return ring[::-1] if (signed_area > 0) == exterior else ring


def main():
    rows = query(where="1=1", outFields="Muni_Heb,Muni_Eng,CR_PNIM",
                 returnDistinctValues="true", returnGeometry="false", f="json")
    rows = [row["attributes"] for row in rows]
    cities = json.loads((DATA / "israel-cities.json").read_text(encoding="utf-8"))
    matched = {}
    for city in sorted(cities, key=lambda city: -city["population"]):
        city_id = city["geonameid"]
        names = {normalize(name) for name in [city["name"], *city["alternatenames"]]}
        names = {name for name in names if len(name) > 2}
        codes = {row["CR_PNIM"] for row in rows if row["CR_PNIM"] and
                 names.intersection(normalize(row[key]) for key in ("Muni_Heb", "Muni_Eng"))}
        code = CODES.get(city_id) or (next(iter(codes)) if len(codes) == 1 else None)
        if code:
            matched.setdefault(code, city_id)

    codes = ",".join(f"'{code}'" for code in matched)
    where = f"CR_PNIM IN ({codes})"
    rows = query(where=where, outFields="CR_PNIM,Muni_Heb",
                 outSR=4326, geometryPrecision=5, maxAllowableOffset=0.00015, f="geojson")
    municipalities = {}
    for row in rows:
        geometry = row["geometry"]
        if not geometry:
            continue
        fields = row["properties"]
        city_id = matched[fields["CR_PNIM"]]
        feature = municipalities.setdefault(city_id, {
            "type": "Feature", "id": city_id, "properties": {"name": fields["Muni_Heb"]},
            "geometry": {"type": "MultiPolygon", "coordinates": []},
        })
        polygons = geometry["coordinates"]
        if geometry["type"] == "Polygon":
            polygons = [polygons]
        feature["geometry"]["coordinates"].extend(
            [orient_for_d3(ring, index == 0) for index, ring in enumerate(polygon)]
            for polygon in polygons
        )
    output = {"type": "FeatureCollection", "features": list(municipalities.values())}
    (DATA / "israel-municipalities.geojson").write_text(
        json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8"
    )
    print(f"Wrote {len(municipalities)} municipal outlines")

    # Find shared boundary segments before display simplification. A point
    # contact alone does not count as a crossing.
    segment_owners = defaultdict(set)
    for row in query(where=where, outFields="CR_PNIM", outSR=4326, geometryPrecision=7, f="geojson"):
        geometry = row["geometry"]
        if not geometry:
            continue
        city_id = matched[row["properties"]["CR_PNIM"]]
        polygons = geometry["coordinates"]
        if geometry["type"] == "Polygon":
            polygons = [polygons]
        for polygon in polygons:
            for ring in polygon:
                for a, b in zip(ring, ring[1:]):
                    segment_owners[tuple(sorted((tuple(a[:2]), tuple(b[:2]))))].add(city_id)
    lengths = defaultdict(float)
    for ((x1, y1), (x2, y2)), owners in segment_owners.items():
        if len(owners) < 2:
            continue
        meters = hypot((x2 - x1) * cos(radians((y1 + y2) / 2)), y2 - y1) * 111_195
        for pair in combinations(sorted(owners), 2):
            lengths[pair] += meters
    neighbors = {city_id: [] for city_id in municipalities}
    for (left, right), meters in sorted(lengths.items()):
        if meters >= 10 and left in neighbors and right in neighbors:
            neighbors[left].append(right)
            neighbors[right].append(left)
    (DATA / "israel-city-borders.json").write_text(
        json.dumps(neighbors, separators=(",", ":")) + "\n", encoding="utf-8"
    )
    print(f"Wrote {sum(map(len, neighbors.values())) // 2} shared borders")


if __name__ == "__main__":
    main()
