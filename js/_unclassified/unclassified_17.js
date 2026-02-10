// Module: unclassified_17
// Source: lines 6354-6434 of original file
// Category: _unclassified
// ═══════════════════════════════════════════════════════════

[
  {
    "id": "dungeon_room_basic",
    "tags": ["dungeon", "room"],
    "weight": 3,
    "depth": [0.62, 0.92],
    "anchor": [0.5, 0.5],
    "placement": { "mode": "underground", "minSolidRatio": 0.55, "defaultWall": 2 },
    "pattern": [
      "#############",
      "#...........#",
      "#..l.....l..#",
      "#...........#",
      "#.....C.....#",
      "#...........#",
      "#..l.....l..#",
      "#...........#",
      "#############"
    ],
    "legend": {
      "#": { "tile": "DUNGEON_BRICK", "replace": "any" },
      ".": { "tile": "AIR", "wall": 2, "replace": "any" },
      "l": { "tile": "LANTERN", "replace": "any" },
      "C": { "tile": "TREASURE_CHEST", "replace": "any" }
    },
    "connectors": [
      { "x": 0, "y": 4, "dir": "left", "len": 18, "carve": true, "wall": 2 },
      { "x": 12, "y": 4, "dir": "right", "len": 18, "carve": true, "wall": 2 }
    ]
  },
  {
    "id": "ruin_shrine",
    "tags": ["ruin", "room"],
    "weight": 2,
    "depth": [0.38, 0.74],
    "anchor": [0.5, 0.5],
    "placement": { "mode": "underground", "minSolidRatio": 0.45, "defaultWall": 1 },
    "pattern": [
      "  #######  ",
      " ##.....## ",
      "##..#.#..##",
      "#...#C#...#",
      "##..#.#..##",
      " ##.....## ",
      "  #######  "
    ],
    "legend": {
      "#": { "tile": "COBBLESTONE" },
      ".": { "tile": "AIR", "wall": 1 },
      "C": { "tile": "TREASURE_CHEST" }
    },
    "connectors": [
      { "x": 5, "y": 6, "dir": "down", "len": 10, "carve": true, "wall": 1 }
    ]
  },
  {
    "id": "ancient_tree",
    "tags": ["tree"],
    "weight": 2,
    "depth": [0.05, 0.35],
    "anchor": [0.5, 1.0],
    "placement": { "mode": "surface" },
    "pattern": [
      "   LLL   ",
      "  LLLLL  ",
      " LLLLLLL ",
      "  LLLLL  ",
      "   LLL   ",
      "    T    ",
      "    T    ",
      "    T    ",
      "    T    "
    ],
    "legend": {
      "L": { "tile": "LEAVES", "replace": "air" },
      "T": { "tile": "WOOD", "replace": "any" }
    }
  }
]
