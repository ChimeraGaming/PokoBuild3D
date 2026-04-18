import { createEditorPayload, createPiece } from '../editor/piece-library.js'

function svgCard(title, subtitle, colors) {
  var svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420">' +
    '<defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1">' +
    '<stop offset="0%" stop-color="' +
    colors[0] +
    '"/>' +
    '<stop offset="100%" stop-color="' +
    colors[1] +
    '"/></linearGradient></defs>' +
    '<rect width="640" height="420" rx="32" fill="url(#g)"/>' +
    '<rect x="42" y="44" width="556" height="332" rx="28" fill="rgba(255,255,255,0.16)"/>' +
    '<path d="M92 310c48-84 136-138 232-138 85 0 148 28 214 102" fill="none" stroke="rgba(255,255,255,0.48)" stroke-width="18" stroke-linecap="round"/>' +
    '<circle cx="166" cy="252" r="38" fill="rgba(255,255,255,0.18)"/>' +
    '<circle cx="438" cy="214" r="52" fill="rgba(255,255,255,0.16)"/>' +
    '<text x="72" y="104" fill="#fffdf7" font-size="52" font-family="Georgia, serif" font-weight="700">' +
    title +
    '</text>' +
    '<text x="74" y="152" fill="rgba(255,253,247,0.86)" font-size="24" font-family="Arial, sans-serif">' +
    subtitle +
    '</text>' +
    '</svg>'

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

function stepImage(label, caption, colors) {
  var svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 640">' +
    '<defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1">' +
    '<stop offset="0%" stop-color="' +
    colors[0] +
    '"/>' +
    '<stop offset="100%" stop-color="' +
    colors[1] +
    '"/></linearGradient></defs>' +
    '<rect width="960" height="640" rx="40" fill="url(#g)"/>' +
    '<rect x="70" y="74" width="820" height="492" rx="32" fill="rgba(255,255,255,0.14)"/>' +
    '<text x="96" y="164" fill="#fffdf7" font-size="70" font-family="Georgia, serif" font-weight="700">' +
    label +
    '</text>' +
    '<text x="96" y="232" fill="rgba(255,253,247,0.84)" font-size="30" font-family="Arial, sans-serif">' +
    caption +
    '</text>' +
    '</svg>'

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

function gardenLatticePieces() {
  var pieces = []
  var x
  var z

  for (x = -1; x <= 1; x += 2) {
    for (z = -2; z <= 2; z += 2) {
      pieces.push(createPiece({ pieceType: 'cube', materialToken: 'mosswood', x: x, y: 0, z: z }))
      pieces.push(createPiece({ pieceType: 'cube', materialToken: 'mosswood', x: x, y: 1, z: z }))
      pieces.push(createPiece({ pieceType: 'post', materialToken: 'forest', x: x, y: 2, z: z }))
    }
  }

  for (z = -2; z <= 2; z += 2) {
    pieces.push(createPiece({ pieceType: 'plank', materialToken: 'pine', x: 0, y: 3, z: z }))
  }

  pieces.push(createPiece({ pieceType: 'ladder', materialToken: 'cream', x: -1, y: 1, z: 0, rotation: 90 }))
  pieces.push(createPiece({ pieceType: 'ladder', materialToken: 'cream', x: 1, y: 1, z: 0, rotation: 90 }))
  pieces.push(createPiece({ pieceType: 'decor', materialToken: 'vine', x: 0, y: 0, z: -3 }))
  pieces.push(createPiece({ pieceType: 'decor', materialToken: 'vine', x: 0, y: 0, z: 3 }))

  return pieces
}

function greenhousePieces() {
  var pieces = []
  var x
  var z

  for (x = -2; x <= 2; x += 1) {
    for (z = -3; z <= 3; z += 1) {
      pieces.push(createPiece({ pieceType: 'floor-tile', materialToken: 'slate', x: x, y: 0, z: z }))
    }
  }

  ;[-2, 2].forEach(function (edgeX) {
    ;[-3, 3].forEach(function (edgeZ) {
      pieces.push(createPiece({ pieceType: 'post', materialToken: 'forest', x: edgeX, y: 1, z: edgeZ }))
      pieces.push(createPiece({ pieceType: 'post', materialToken: 'forest', x: edgeX, y: 2, z: edgeZ }))
    })
  })

  for (x = -1; x <= 1; x += 1) {
    pieces.push(createPiece({ pieceType: 'ladder', materialToken: 'glass', x: x, y: 1, z: -3 }))
    pieces.push(createPiece({ pieceType: 'ladder', materialToken: 'glass', x: x, y: 1, z: 3 }))
  }

  for (z = -2; z <= 2; z += 1) {
    pieces.push(createPiece({ pieceType: 'ladder', materialToken: 'glass', x: -2, y: 1, z: z, rotation: 90 }))
    pieces.push(createPiece({ pieceType: 'ladder', materialToken: 'glass', x: 2, y: 1, z: z, rotation: 90 }))
  }

  for (x = -2; x <= 2; x += 1) {
    pieces.push(createPiece({ pieceType: 'plank', materialToken: 'pine', x: x, y: 3, z: -3 }))
    pieces.push(createPiece({ pieceType: 'plank', materialToken: 'pine', x: x, y: 3, z: 3 }))
  }

  for (z = -2; z <= 2; z += 1) {
    pieces.push(createPiece({ pieceType: 'stair', materialToken: 'cream', x: -1, y: 3, z: z }))
    pieces.push(createPiece({ pieceType: 'stair', materialToken: 'cream', x: 1, y: 3, z: z, rotation: 180 }))
  }

  return pieces
}

function marketPieces() {
  var pieces = []
  var x
  var z

  for (x = -2; x <= 2; x += 1) {
    for (z = -1; z <= 1; z += 1) {
      pieces.push(createPiece({ pieceType: 'floor-tile', materialToken: 'slate', x: x, y: 0, z: z }))
    }
  }

  ;[-2, 2].forEach(function (edgeX) {
    ;[-1, 1].forEach(function (edgeZ) {
      pieces.push(createPiece({ pieceType: 'post', materialToken: 'forest', x: edgeX, y: 1, z: edgeZ }))
      pieces.push(createPiece({ pieceType: 'post', materialToken: 'forest', x: edgeX, y: 2, z: edgeZ }))
    })
  })

  for (x = -2; x <= 2; x += 1) {
    pieces.push(createPiece({ pieceType: 'plank', materialToken: 'pine', x: x, y: 3, z: -1 }))
    pieces.push(createPiece({ pieceType: 'plank', materialToken: 'pine', x: x, y: 3, z: 1 }))
    pieces.push(createPiece({ pieceType: 'decor', materialToken: 'canvas', x: x, y: 4, z: 0 }))
  }

  pieces.push(createPiece({ pieceType: 'cube', materialToken: 'mosswood', x: -1, y: 1, z: 0 }))
  pieces.push(createPiece({ pieceType: 'cube', materialToken: 'mosswood', x: 0, y: 1, z: 0 }))
  pieces.push(createPiece({ pieceType: 'cube', materialToken: 'mosswood', x: 1, y: 1, z: 0 }))

  return pieces
}

var gardenPayload = createEditorPayload('build-garden-lattice', {
  pieces: gardenLatticePieces(),
  grid: { width: 14, height: 8, depth: 14 },
  layerMeta: {
    0: { layerName: 'Footing', note: 'Set the temporary support blocks with two spaces between each span.' },
    1: { layerName: 'Posts', note: 'Raise the sides before adding the panel guides.' },
    2: { layerName: 'Cross braces', note: 'Lock the lattice shape with narrow posts.' },
    3: { layerName: 'Top planks', note: 'Bridge the top and finish with decor around the base.' }
  },
  notes: 'A compact arch for gardens and paths.'
})

var greenhousePayload = createEditorPayload('build-cottage-greenhouse', {
  pieces: greenhousePieces(),
  grid: { width: 16, height: 8, depth: 16 },
  layerMeta: {
    0: { layerName: 'Foundation', note: 'Lay the slate floor first.' },
    1: { layerName: 'Frames', note: 'Set the upright posts and glass walls.' },
    2: { layerName: 'Upper frame', note: 'Repeat the support ring before roofing.' },
    3: { layerName: 'Roof', note: 'Finish the soft cream roof wedges.' }
  },
  notes: 'Bright greenhouse shell with a narrow walkway.'
})

var marketPayload = createEditorPayload('build-small-market-stall', {
  pieces: marketPieces(),
  grid: { width: 14, height: 8, depth: 12 },
  layerMeta: {
    0: { layerName: 'Paving', note: 'Lay the stall footprint.' },
    1: { layerName: 'Counter', note: 'Add the center counter and back supports.' },
    2: { layerName: 'Posts', note: 'Raise the roof posts evenly.' },
    3: { layerName: 'Beams', note: 'Connect the top beams before draping the awning.' },
    4: { layerName: 'Awning', note: 'Cap the stand with soft canvas decor pieces.' }
  },
  notes: 'Quick roadside stall with a covered awning.'
})

export var demoBuilds = [
  {
    id: 'build-garden-lattice',
    userId: 'profile-elm',
    slug: 'garden-lattice',
    title: 'Garden lattice',
    description:
      'A slim lattice arch that fits garden paths, orchard entrances, and small courtyards without needing a wide footprint.',
    biome: 'garden',
    category: 'decor',
    difficulty: 'easy',
    tags: ['garden', 'decor', 'beginner'],
    thumbnailUrl: svgCard('Garden lattice', 'Layered arch with clean supports', ['#6f8b4d', '#d7b07f']),
    imageGallery: [
      { id: 'image-gl-reference', label: 'Reference', imageUrl: stepImage('Reference', 'Cozy arch overview', ['#6f8b4d', '#d7b07f']) },
      { id: 'image-gl-1', label: 'Step 1', imageUrl: stepImage('Step 1', 'Stack temporary support blocks two spaces apart.', ['#456950', '#8d714d']) },
      { id: 'image-gl-2', label: 'Step 2', imageUrl: stepImage('Step 2', 'Place bridge planks across the top.', ['#8d714d', '#dccba6']) },
      { id: 'image-gl-3', label: 'Step 3', imageUrl: stepImage('Step 3', 'Remove temporary supports.', ['#6f8b4d', '#f4ead5']) },
      { id: 'image-gl-4', label: 'Step 4', imageUrl: stepImage('Step 4', 'Add ladder sides and decorate around it.', ['#66717d', '#dce6d7']) }
    ],
    materials: [
      { id: 'gl-m-1', itemName: 'Mosswood cube block', qtyRequired: 8, note: 'Temporary supports and lower anchors' },
      { id: 'gl-m-2', itemName: 'Forest post', qtyRequired: 4, note: 'Upper braces' },
      { id: 'gl-m-3', itemName: 'Pine plank block', qtyRequired: 3, note: 'Top bridge span' },
      { id: 'gl-m-4', itemName: 'Cream ladder panel', qtyRequired: 2, note: 'Side detailing' },
      { id: 'gl-m-5', itemName: 'Vine decor piece', qtyRequired: 2, note: 'Base trim' }
    ],
    steps: [
      { id: 'gl-s-1', stepTitle: 'Set temporary supports', stepText: 'Stack temporary support blocks two spaces apart so the arch span lands evenly.', imageUrl: stepImage('Step 1', 'Support blocks in place', ['#456950', '#8d714d']), sortOrder: 0 },
      { id: 'gl-s-2', stepTitle: 'Bridge the top', stepText: 'Place bridge planks across the top line before finishing the side braces.', imageUrl: stepImage('Step 2', 'Top bridge planks', ['#8d714d', '#dccba6']), sortOrder: 1 },
      { id: 'gl-s-3', stepTitle: 'Clean the frame', stepText: 'Remove temporary supports once the top span is holding together.', imageUrl: stepImage('Step 3', 'Supports removed', ['#6f8b4d', '#f4ead5']), sortOrder: 2 },
      { id: 'gl-s-4', stepTitle: 'Finish the sides', stepText: 'Add ladder sides and place small decor around it to soften the entry.', imageUrl: stepImage('Step 4', 'Decor pass', ['#66717d', '#dce6d7']), sortOrder: 3 }
    ],
    modelType: 'editor',
    modelUrl: '',
    editorDataJson: gardenPayload,
    layerData: gardenPayload.layers,
    isPublished: true,
    originalBuildId: '',
    favoriteCount: 19,
    viewCount: 182,
    createdAt: '2026-03-12T16:00:00.000Z',
    updatedAt: '2026-03-12T16:00:00.000Z'
  },
  {
    id: 'build-cottage-greenhouse',
    userId: 'profile-sage',
    slug: 'cottage-greenhouse',
    title: 'Cottage greenhouse',
    description:
      'A narrow glasshouse with a simple raised frame, clear layer passes, and a roof that reads well in detail view.',
    biome: 'house',
    category: 'farm',
    difficulty: 'medium',
    tags: ['house', 'farm', 'glass'],
    thumbnailUrl: svgCard('Cottage greenhouse', 'Slim glasshouse with easy passes', ['#b8d9df', '#456950']),
    imageGallery: [
      { id: 'image-gh-reference', label: 'Reference', imageUrl: stepImage('Reference', 'Whole greenhouse silhouette', ['#b8d9df', '#456950']) },
      { id: 'image-gh-1', label: 'Step 1', imageUrl: stepImage('Step 1', 'Lay the floor and place corner posts.', ['#66717d', '#d7b07f']) },
      { id: 'image-gh-2', label: 'Step 2', imageUrl: stepImage('Step 2', 'Fill the wall spans with ladder panels.', ['#456950', '#b8d9df']) },
      { id: 'image-gh-3', label: 'Step 3', imageUrl: stepImage('Step 3', 'Finish the cream roof wedges.', ['#f4ead5', '#d7b07f']) }
    ],
    materials: greenhousePayload.materials,
    steps: [
      { id: 'gh-s-1', stepTitle: 'Floor pass', stepText: 'Tile the footprint and set the post corners.', imageUrl: stepImage('Step 1', 'Floor and posts', ['#66717d', '#d7b07f']), sortOrder: 0 },
      { id: 'gh-s-2', stepTitle: 'Wall pass', stepText: 'Span the sides with glass ladder panels.', imageUrl: stepImage('Step 2', 'Wall panels', ['#456950', '#b8d9df']), sortOrder: 1 },
      { id: 'gh-s-3', stepTitle: 'Roof pass', stepText: 'Slope the roof inward with cream wedges.', imageUrl: stepImage('Step 3', 'Roof complete', ['#f4ead5', '#d7b07f']), sortOrder: 2 }
    ],
    modelType: 'editor',
    modelUrl: '',
    editorDataJson: greenhousePayload,
    layerData: greenhousePayload.layers,
    isPublished: true,
    originalBuildId: '',
    favoriteCount: 28,
    viewCount: 264,
    createdAt: '2026-03-18T16:00:00.000Z',
    updatedAt: '2026-03-19T16:00:00.000Z'
  },
  {
    id: 'build-small-market-stall',
    userId: 'profile-wren',
    slug: 'small-market-stall',
    title: 'Small market stall',
    description:
      'A compact trading post with a fast awning pass and easy material count, built for village lanes and market corners.',
    biome: 'market',
    category: 'market',
    difficulty: 'easy',
    tags: ['market', 'decor', 'beginner'],
    thumbnailUrl: svgCard('Small market stall', 'Fast awning build for village lanes', ['#c87b5c', '#d7b07f']),
    imageGallery: [
      { id: 'image-ms-reference', label: 'Reference', imageUrl: stepImage('Reference', 'Market stall overview', ['#c87b5c', '#d7b07f']) },
      { id: 'image-ms-1', label: 'Step 1', imageUrl: stepImage('Step 1', 'Lay the paving and center counter.', ['#66717d', '#8d714d']) },
      { id: 'image-ms-2', label: 'Step 2', imageUrl: stepImage('Step 2', 'Raise the roof posts and beams.', ['#456950', '#d7b07f']) },
      { id: 'image-ms-3', label: 'Step 3', imageUrl: stepImage('Step 3', 'Drape the canvas awning.', ['#dccba6', '#c87b5c']) }
    ],
    materials: marketPayload.materials,
    steps: [
      { id: 'ms-s-1', stepTitle: 'Base pass', stepText: 'Lay paving and place the counter blocks.', imageUrl: stepImage('Step 1', 'Base and counter', ['#66717d', '#8d714d']), sortOrder: 0 },
      { id: 'ms-s-2', stepTitle: 'Roof frame', stepText: 'Raise the posts and connect the beams.', imageUrl: stepImage('Step 2', 'Roof frame', ['#456950', '#d7b07f']), sortOrder: 1 },
      { id: 'ms-s-3', stepTitle: 'Awning pass', stepText: 'Add the canvas layer on top of the beam line.', imageUrl: stepImage('Step 3', 'Canvas awning', ['#dccba6', '#c87b5c']), sortOrder: 2 }
    ],
    modelType: 'editor',
    modelUrl: '',
    editorDataJson: marketPayload,
    layerData: marketPayload.layers,
    isPublished: true,
    originalBuildId: '',
    favoriteCount: 11,
    viewCount: 149,
    createdAt: '2026-03-21T16:00:00.000Z',
    updatedAt: '2026-03-24T16:00:00.000Z'
  }
]
