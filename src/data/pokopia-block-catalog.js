import { PIECE_LIBRARY } from '../editor/piece-library.js'
import { slugify } from '../utils/format.js'

export var POKOPIA_BLOCK_SOURCE = {
  label: 'Game8 List of All Blocks',
  url: 'https://game8.co/games/Pokemon-Pokopia/archives/586478',
  pulledOn: '2026-04-16'
}

export var POKOPIA_BLOCK_GROUPS = [
  { value: 'all', label: 'All groups' },
  { value: 'walls', label: 'Walls and pillars' },
  { value: 'floors', label: 'Floors and roads' },
  { value: 'patterns', label: 'Prints and patterns' },
  { value: 'terrain', label: 'Grass and soil' },
  { value: 'stone', label: 'Stone and ore' },
  { value: 'utility', label: 'Utility blocks' }
]

var FLOOR_KEYWORDS = ['flooring', 'carpeting', 'carpet', 'mat', 'tiling', 'road', 'marble']
var TERRAIN_KEYWORDS = ['grass', 'soil', 'sand', 'ash', 'clay', 'mossy']
var STONE_KEYWORDS = ['rock', 'stone', 'sandstone', 'deposit', 'gravel', 'limestone', 'ice']
var UTILITY_KEYWORDS = ['hay pile', 'iron plating', 'cube light', 'foundation', 'levee', 'scrap cube']

var GAME8_BLOCK_NAMES = [
  'Wooden wall (Block)',
  'Light wooden wall (Block)',
  'Painted wall (Block)',
  'Plaster wall (Block)',
  'Cloth wall (Block)',
  'Guest-room wall',
  'Starry-sky wall (Block)',
  'Cushy wall',
  'Modern wall (Block)',
  'Broken-tiling wall (Block)',
  'Cobblestone wall (Block)',
  'Brick wall (Block)',
  'Stone brick wall (Block)',
  'Aged-stone wall (Block)',
  'Patterned aged-stone wall (Block)',
  'Concrete Wall',
  'Rough Wall (Block)',
  'Striped Wall (Block)',
  'Bronze Wall (Block)',
  'Stylish Bronze Wall (Block)',
  'Iron Wall (Block)',
  'Stylish Iron Wall (Block)',
  'Gold Wall (Block)',
  'Stylish gold wall (Block)',
  'Crystal Wall (Block)',
  'Poke Ball Wall (Block)',
  'Warning Wall (Block)',
  'Stylish Wall (Upper)',
  'Stylish Wall (Middle)',
  'Stylish Wall (Lower)',
  'Antique Wall (Upper)',
  'Antique Wall (Middle)',
  'Antique Wall (Lower)',
  'Light Antique Wall (Upper)',
  'Light Antique Wall (Middle)',
  'Light Antique Wall (Lower)',
  'Wooden Pillar (Upper)',
  'Wooden Pillar (Middle)',
  'Wooden Pillar (Lower)',
  'Stylish Brick Wall (Upper)',
  'Stylish Brick Wall (Middle)',
  'Stylish Brick Wall (Lower)',
  'Stone Pillar (Upper)',
  'Stone Pillar (Middle)',
  'Stone Pillar (Lower)',
  'Pop Art Wall (Upper)',
  'Pop Art Wall (Middle)',
  'Pop Art Wall (Lower)',
  'Confectionery Wall (Upper)',
  'Confectionery Wall (Middle)',
  'Confectionery Wall (Lower)',
  'Pokemon Center Wall (Trim)',
  'Pokemon Center Wall (Upper)',
  'Pokemon Center Wall (Middle)',
  'Pokemon Center Wall (Lower)',
  'Wooden Flooring (Block)',
  'Diagonal Wooden Flooring (Block)',
  'Crisscross Wooden Flooring (Block)',
  'Hardwood Flooring (Block)',
  'Modern Carpeting (Block)',
  'Woven Carpeting (Block)',
  'Fluffy Flooring (Block)',
  'Soft Carpeting',
  'Extravagant Carpeting',
  'Tatami Mat',
  'Felt Mat (Block)',
  'Puffy-tree pillar (Block)',
  'Grass flooring (Block)',
  'Simple Flooring (Block)',
  'Marble (Block)',
  'Stone Flooring (Block)',
  'Lined-stone flooring (Block)',
  'Dark Marble Flooring',
  'Light marble flooring (Block)',
  'Aged-Stone Flooring',
  'Simple Square Tiling (Block)',
  'Stylish tiling (Block)',
  'Hexagonal Flooring (Block)',
  'Shop Flooring (Block)',
  'Triangle-Design Flooring (Block)',
  'Iron-Plate Flooring (Block)',
  'Iron Tiling (Block)',
  'Neon Flooring (Block)',
  'Cyber Flooring (Block)',
  'Arched tiling (Block)',
  'Stone tiling (Block)',
  'Square tiling (Block)',
  'Mosaic Tiling (Block)',
  'Brick Flooring (Block)',
  'Stylish Stone Flooring (Block)',
  'Fish-scale tiling (Block)',
  'Asphalt Road',
  'Marked Road (Horizontal)',
  'Marked Road (Vertical)',
  'Gray circle flooring',
  'Hay pile (Block)',
  'Iron plating (Block)',
  'Cube Light (Block)',
  'Foundation',
  'Levee',
  'Scrap cube (Block)',
  'Polka-Dot Print (Block)',
  'Vertical-Stripe Print (Block)',
  'Horizontal-Stripe Print (Block)',
  'Gingham Print (Block)',
  'Tartan Print (Block)',
  'Argyle Print (Block)',
  'Berry Print (Block)',
  'Poke Ball Print (Block)',
  'Stylish Poke Ball Print (Block)',
  'Bubble Print (Block)',
  'Houndstooth Print (Block)',
  'Vine Print (Block)',
  'Swirl Print (Block)',
  'Winter Print (Block)',
  'Zig-Zag Print (Block)',
  'Leaf Print (Block)',
  'Flower Print (Block)',
  'Star Print (Block)',
  'Curry Print (Block)',
  'Field grass',
  'Seashore grass',
  'Alpine Grass',
  'Sky-High Grass',
  'Ordinary soil',
  'Seashell soil',
  'Striped Soil',
  'Pure-White Soil',
  'Clay',
  'Ordinary Sand',
  'Beach Sand',
  'Skyland Sand',
  'Bumpy Beach Sand',
  'Volcanic Ash',
  'Sandstone',
  'Skyland Sandstone',
  'Cliff rock',
  'Spotted cliff rock',
  'Red cliff rock',
  'Red spotted cliff rock',
  'Black Cliff Rock',
  'Black Spotted Cliff Rock',
  'Skyland Cliff Rock',
  'Skyland Spotted Cliff Rock',
  'White Rock',
  'Coarse Rock',
  'Light brown rock',
  'Red Rock',
  'Yellow Rock',
  'Black Rock',
  'Lava Rock',
  'Cave Rock',
  'Ocean Rock',
  'Reddish-Brown Cave Rock',
  'Volcanic Rock',
  'Carved White Rock',
  'Carved Coarse Rock',
  'Carved Light-Brown Rock',
  'Carved Red Rock',
  'Carved Yellow Rock',
  'Copper Deposit (Ordinary Soil)',
  'Copper Deposit (Seashell Soil)',
  'Copper Deposit (Striped Soil)',
  'Copper Deposit (Pure-White Soil)',
  'Iron Deposit',
  'Gold Deposit',
  'Pokemetal Deposit',
  'Mossy Soil',
  'Gravel',
  'Limestone',
  'Glowing Stone',
  'Mysterious Stone',
  'Ice',
  'Cracked Sandstone'
]

function includesAny(value, keywords) {
  return keywords.some(function (keyword) {
    return value.includes(keyword)
  })
}

function getGroupLabel(group) {
  return POKOPIA_BLOCK_GROUPS.find(function (item) {
    return item.value === group
  })?.label || 'Other'
}

function inferBlockGroup(name) {
  var lower = name.toLowerCase()

  if (lower.includes('wall') || lower.includes('pillar')) {
    return 'walls'
  }

  if (includesAny(lower, FLOOR_KEYWORDS)) {
    return 'floors'
  }

  if (lower.includes('print')) {
    return 'patterns'
  }

  if (includesAny(lower, TERRAIN_KEYWORDS)) {
    return 'terrain'
  }

  if (includesAny(lower, STONE_KEYWORDS)) {
    return 'stone'
  }

  return 'utility'
}

function getDemoPieceId(name, group) {
  var lower = name.toLowerCase()

  if (lower.includes('pillar')) {
    return 'post'
  }

  if (group === 'walls') {
    return 'cube'
  }

  if (group === 'floors') {
    return 'floor-tile'
  }

  if (group === 'patterns') {
    return 'cube'
  }

  if (group === 'utility' && includesAny(lower, UTILITY_KEYWORDS)) {
    return 'cube'
  }

  return null
}

function getDemoPieceName(pieceId) {
  return PIECE_LIBRARY.find(function (piece) {
    return piece.id === pieceId
  })?.name || ''
}

export var POKOPIA_BLOCK_CATALOG = GAME8_BLOCK_NAMES.map(function (name, index) {
  var group = inferBlockGroup(name)
  var demoPieceId = getDemoPieceId(name, group)

  return {
    id: slugify(name) + '-' + index,
    name: name,
    group: group,
    groupLabel: getGroupLabel(group),
    inDemo: Boolean(demoPieceId),
    demoPieceId: demoPieceId,
    demoPieceName: getDemoPieceName(demoPieceId)
  }
})

export var POKOPIA_BLOCK_SUMMARY = POKOPIA_BLOCK_CATALOG.reduce(
  function (summary, item) {
    summary.total += 1

    if (item.inDemo) {
      summary.inDemo += 1
    } else {
      summary.missing += 1
    }

    return summary
  },
  {
    total: 0,
    inDemo: 0,
    missing: 0
  }
)
