import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { applyPieceTransform, createPieceMesh, disposePieceObject } from '../three/piece-factory.js'
import { clampCoordToGrid, getGridBounds, isCoordInGrid } from '../utils/template-size.js'

export class EditorCanvas {
  constructor(container, editorState, callbacks) {
    this.container = container
    this.editorState = editorState
    this.callbacks = callbacks || {}
    this.dragThreshold = 6
    this.pointerDown = null
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#e7dcc8')
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200)
    this.camera.position.set(14, 12, 14)
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.domElement.tabIndex = 0
    this.renderer.domElement.className = 'editor-canvas__surface'
    this.renderer.domElement.setAttribute('aria-label', '3D editor canvas')
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.maxPolarAngle = Math.PI / 2.05
    this.controls.target.set(0, 1.5, 0)
    this.pieceGroup = new THREE.Group()
    this.hoverMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({
        color: '#58a66a',
        transparent: true,
        opacity: 0.26
      })
    )
    this.hoverMesh.visible = false
    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    this.meshMap = new Map()

    this.container.innerHTML = ''
    this.container.appendChild(this.renderer.domElement)
    this.scene.add(this.pieceGroup)
    this.scene.add(this.hoverMesh)
    this.addLights()
    this.addGround()
    this.addGrid()
    this.handleResize()
    this.bindEvents()
    this.resizeObserver = new ResizeObserver(this.handleResize.bind(this))
    this.resizeObserver.observe(container)
    this.boundAnimate = this.animate.bind(this)
    this.editorState.subscribe(this.handleStateChange.bind(this))
    this.animationFrame = window.requestAnimationFrame(this.boundAnimate)
  }

  addLights() {
    var ambient = new THREE.AmbientLight('#fff7ef', 1.12)
    var sun = new THREE.DirectionalLight('#fff5df', 1.85)
    sun.position.set(12, 24, 10)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    this.scene.add(ambient, sun)
  }

  addGround() {
    var plane = new THREE.Mesh(
      new THREE.CircleGeometry(30, 64),
      new THREE.MeshStandardMaterial({
        color: '#d8cbb3',
        roughness: 1
      })
    )
    plane.rotation.x = -Math.PI / 2
    plane.position.y = -0.08
    plane.receiveShadow = true
    this.scene.add(plane)
  }

  addGrid() {
    this.gridHelper = new THREE.GridHelper(10, 10, '#83a183', '#d4d2c8')
    this.gridHelper.position.y = 0.01
    this.scene.add(this.gridHelper)
  }

  syncGrid(grid) {
    var size = Math.max(Number(grid?.width || 10), Number(grid?.depth || 10), 1)
    var nextKey = [grid?.width || size, grid?.depth || size].join(':')

    if (this.gridKey === nextKey) {
      return
    }

    this.gridKey = nextKey

    if (this.gridHelper) {
      this.scene.remove(this.gridHelper)
      this.gridHelper.geometry.dispose()
      if (Array.isArray(this.gridHelper.material)) {
        this.gridHelper.material.forEach(function (material) {
          material.dispose()
        })
      } else {
        this.gridHelper.material.dispose()
      }
    }

    this.gridHelper = new THREE.GridHelper(size, size, '#83a183', '#d4d2c8')
    this.gridHelper.position.y = 0.01
    this.scene.add(this.gridHelper)
    this.resetCamera()
  }

  bindEvents() {
    this.handlePointerMove = this.onPointerMove.bind(this)
    this.handlePointerDown = this.onPointerDown.bind(this)
    this.handlePointerUp = this.onPointerUp.bind(this)
    this.handleKeyDown = this.onKeyDown.bind(this)
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove)
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown)
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp)
    window.addEventListener('keydown', this.handleKeyDown)
  }

  handleResize() {
    var width = Math.max(this.container.clientWidth, 320)
    var height = Math.max(this.container.clientHeight, 480)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  handleStateChange(snapshot) {
    this.snapshot = snapshot
    this.syncGrid(snapshot.grid)
    this.syncPieces(snapshot.pieces)
    this.plane.constant = -snapshot.activeLayer

    if (snapshot.hoverCoord && snapshot.hoverCoord.y !== snapshot.activeLayer) {
      this.editorState.setHoverCoord({
        x: snapshot.hoverCoord.x,
        y: snapshot.activeLayer,
        z: snapshot.hoverCoord.z
      })
      return
    }

    if (snapshot.hoverCoord) {
      this.positionHover(snapshot.hoverCoord)
    } else {
      this.hoverMesh.visible = false
    }

    if (typeof this.callbacks.onStateChange === 'function') {
      this.callbacks.onStateChange(snapshot)
    }
  }

  syncPieces(pieces) {
    var editor = this
    var nextKeys = new Set()

    pieces.forEach(function (piece) {
      nextKeys.add(piece.id)
      if (!editor.meshMap.has(piece.id)) {
        var mesh = createPieceMesh(piece, { wireframe: false })
        editor.meshMap.set(piece.id, mesh)
        editor.pieceGroup.add(mesh)
      } else {
        var existing = editor.meshMap.get(piece.id)
        applyPieceTransform(existing, piece)
      }
    })

    Array.from(this.meshMap.keys()).forEach(function (pieceId) {
      if (!nextKeys.has(pieceId)) {
        var mesh = editor.meshMap.get(pieceId)
        editor.pieceGroup.remove(mesh)
        disposePieceObject(mesh)
        editor.meshMap.delete(pieceId)
      }
    })
  }

  isTextInputTarget(target) {
    return Boolean(
      target &&
      typeof target.closest === 'function' &&
      target.closest('input, select, textarea, button, [contenteditable="true"]')
    )
  }

  getFallbackCoord(layerIndex) {
    var bounds = getGridBounds(this.snapshot?.grid)
    return {
      x: Math.round((bounds.minX + bounds.maxX) / 2),
      y: Number(layerIndex ?? this.snapshot?.activeLayer ?? 0),
      z: Math.round((bounds.minZ + bounds.maxZ) / 2)
    }
  }

  getCursorCoord() {
    if (this.snapshot?.hoverCoord && isCoordInGrid(this.snapshot.hoverCoord, this.snapshot.grid)) {
      return {
        x: this.snapshot.hoverCoord.x,
        y: this.snapshot.activeLayer,
        z: this.snapshot.hoverCoord.z
      }
    }

    return clampCoordToGrid(this.getFallbackCoord(this.snapshot?.activeLayer), this.snapshot.grid)
  }

  setCursorCoord(coord) {
    if (!this.snapshot) {
      return
    }

    var nextCoord = clampCoordToGrid(
      {
        x: coord.x,
        y: coord.y,
        z: coord.z
      },
      this.snapshot.grid
    )

    this.positionHover(nextCoord)
    this.editorState.setHoverCoord(nextCoord)
  }

  moveCursor(deltaX, deltaZ) {
    var coord = this.getCursorCoord()
    this.setCursorCoord({
      x: coord.x + deltaX,
      y: this.snapshot.activeLayer,
      z: coord.z + deltaZ
    })
  }

  changeLayer(delta) {
    var coord = this.getCursorCoord()
    var nextCoord = clampCoordToGrid(
      {
        x: coord.x,
        y: coord.y + delta,
        z: coord.z
      },
      this.snapshot.grid
    )

    this.editorState.setActiveLayer(nextCoord.y)
    this.editorState.setHoverCoord(nextCoord)
  }

  placeAtCursor() {
    var coord = this.getCursorCoord()

    if (this.snapshot.mode === 'remove') {
      this.editorState.removePieceAt(coord)
      this.editorState.setHoverCoord(coord)
      return
    }

    this.editorState.addPieceAt(coord)
    this.editorState.setHoverCoord(coord)
  }

  removeAtCursor() {
    var coord = this.getCursorCoord()
    this.editorState.removePieceAt(coord)
    this.editorState.setHoverCoord(coord)
  }

  rotateSelection() {
    this.editorState.setRotation((Number(this.snapshot?.selectedRotation || 0) + 90) % 360)
  }

  screenToWorld(event) {
    var rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.camera)
    var point = new THREE.Vector3()
    var intersected = this.raycaster.ray.intersectPlane(this.plane, point)

    if (!intersected) {
      return null
    }

    var coord = {
      x: Math.round(point.x),
      y: this.snapshot.activeLayer,
      z: Math.round(point.z)
    }

    if (!isCoordInGrid(coord, this.snapshot.grid)) {
      return null
    }

    return coord
  }

  positionHover(coord) {
    if (!this.snapshot || !isCoordInGrid(coord, this.snapshot.grid)) {
      this.hoverMesh.visible = false
      return
    }

    this.hoverMesh.visible = true
    this.hoverMesh.position.set(coord.x, coord.y + 0.5, coord.z)
  }

  onPointerMove(event) {
    if (!this.snapshot) {
      return
    }

    var coord = this.screenToWorld(event)

    if (!coord) {
      this.hoverMesh.visible = false
      return
    }

    this.positionHover(coord)
    this.editorState.setHoverCoord(coord)
  }

  onPointerDown(event) {
    if (event.button !== 0) {
      return
    }

    this.pointerDown = {
      x: event.clientX,
      y: event.clientY
    }
    this.renderer.domElement.focus()
  }

  onPointerUp(event) {
    if (!this.snapshot || event.button !== 0 || !this.pointerDown) {
      return
    }

    var moved = Math.hypot(
      event.clientX - this.pointerDown.x,
      event.clientY - this.pointerDown.y
    )
    this.pointerDown = null

    if (moved > this.dragThreshold) {
      return
    }

    if (this.snapshot.mode === 'remove') {
      this.removeClickedPiece(event)
      return
    }

    var coord = this.screenToWorld(event)
    if (coord) {
      this.editorState.addPieceAt(coord)
      this.editorState.setHoverCoord(coord)
    }
  }

  onKeyDown(event) {
    if (
      !this.snapshot ||
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      this.isTextInputTarget(event.target)
    ) {
      return
    }

    var key = String(event.key || '')
    var normalized = key.toLowerCase()
    var handled = false

    if (normalized === 'w' || key === 'ArrowUp') {
      this.moveCursor(0, -1)
      handled = true
    } else if (normalized === 's' || key === 'ArrowDown') {
      this.moveCursor(0, 1)
      handled = true
    } else if (normalized === 'a' || key === 'ArrowLeft') {
      this.moveCursor(-1, 0)
      handled = true
    } else if (normalized === 'd' || key === 'ArrowRight') {
      this.moveCursor(1, 0)
      handled = true
    } else if (normalized === 'q' || key === 'PageDown') {
      this.changeLayer(-1)
      handled = true
    } else if (normalized === 'e' || key === 'PageUp') {
      this.changeLayer(1)
      handled = true
    } else if (key === ' ' || key === 'Enter') {
      this.placeAtCursor()
      handled = true
    } else if (key === 'Delete' || key === 'Backspace') {
      this.removeAtCursor()
      handled = true
    } else if (normalized === 'r') {
      this.rotateSelection()
      handled = true
    } else if (normalized === 'f' && typeof this.callbacks.onToggleFullscreen === 'function') {
      this.callbacks.onToggleFullscreen()
      handled = true
    } else if (key === '1') {
      this.editorState.setMode('place')
      handled = true
    } else if (key === '2') {
      this.editorState.setMode('remove')
      handled = true
    }

    if (handled) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  removeClickedPiece(event) {
    var rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.camera)
    var intersections = this.raycaster.intersectObjects(Array.from(this.meshMap.values()), true)

    if (intersections.length) {
      this.editorState.removePieceById(intersections[0].object.userData.pieceId)
    }
  }

  resetCamera() {
    var bounds = getGridBounds(this.snapshot?.grid)
    var width = Number(this.snapshot?.grid?.width || 10)
    var height = Number(this.snapshot?.grid?.height || 10)
    var depth = Number(this.snapshot?.grid?.depth || 10)
    var span = Math.max(width, height, depth)
    var centerX = (bounds.minX + bounds.maxX) / 2
    var centerY = Math.min(bounds.maxY * 0.45 + 1, bounds.maxY + 1)
    var centerZ = (bounds.minZ + bounds.maxZ) / 2
    var distance = Math.max(span * 1.35, 9)

    this.camera.position.set(centerX + distance, centerY + distance * 0.8, centerZ + distance)
    this.controls.target.set(centerX, centerY, centerZ)
    this.controls.minDistance = Math.max(span * 0.35, 4)
    this.controls.maxDistance = Math.max(span * 3.2, 24)
    this.controls.update()
  }

  animate() {
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
    this.animationFrame = window.requestAnimationFrame(this.boundAnimate)
  }

  destroy() {
    window.cancelAnimationFrame(this.animationFrame)
    this.resizeObserver.disconnect()
    this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove)
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown)
    this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp)
    window.removeEventListener('keydown', this.handleKeyDown)
    this.meshMap.forEach(function (mesh) {
      disposePieceObject(mesh)
    })
    this.meshMap.clear()
    this.controls.dispose()
    this.renderer.dispose()
    this.container.innerHTML = ''
  }
}
