import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { applyPieceTransform, createPieceMesh } from '../three/piece-factory.js'
import { getGridBounds, isCoordInGrid } from '../utils/template-size.js'

export class EditorCanvas {
  constructor(container, editorState, callbacks) {
    this.container = container
    this.editorState = editorState
    this.callbacks = callbacks || {}
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#f4efe4')
    this.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 200)
    this.camera.position.set(18, 18, 18)
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.target.set(0, 2, 0)
    this.pieceGroup = new THREE.Group()
    this.hoverMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({
        color: '#456950',
        transparent: true,
        opacity: 0.24
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
    var ambient = new THREE.AmbientLight('#fff6eb', 1.15)
    var sun = new THREE.DirectionalLight('#fff7ec', 1.7)
    sun.position.set(12, 20, 10)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    this.scene.add(ambient, sun)
  }

  addGround() {
    var plane = new THREE.Mesh(
      new THREE.CircleGeometry(22, 48),
      new THREE.MeshStandardMaterial({
        color: '#e6dfce',
        roughness: 1
      })
    )
    plane.rotation.x = -Math.PI / 2
    plane.position.y = -0.08
    plane.receiveShadow = true
    this.scene.add(plane)
  }

  addGrid() {
    this.gridHelper = new THREE.GridHelper(10, 10, '#769076', '#c8cabf')
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

    this.gridHelper = new THREE.GridHelper(size, size, '#769076', '#c8cabf')
    this.scene.add(this.gridHelper)
    this.resetCamera()
  }

  bindEvents() {
    this.handlePointerMove = this.onPointerMove.bind(this)
    this.handleClick = this.onPointerClick.bind(this)
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove)
    this.renderer.domElement.addEventListener('click', this.handleClick)
  }

  handleResize() {
    var width = Math.max(this.container.clientWidth, 260)
    var height = Math.max(this.container.clientHeight, 360)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  handleStateChange(snapshot) {
    this.snapshot = snapshot
    this.syncGrid(snapshot.grid)
    this.syncPieces(snapshot.pieces)
    this.plane.constant = -snapshot.activeLayer
    if (snapshot.hoverCoord) {
      this.positionHover(snapshot.hoverCoord)
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
        if (mesh.geometry) {
          mesh.geometry.dispose()
        }
        if (mesh.material) {
          mesh.material.dispose()
        }
        editor.meshMap.delete(pieceId)
      }
    })
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
    if (!isCoordInGrid(coord, this.snapshot.grid)) {
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
      this.editorState.setHoverCoord(null)
      return
    }

    this.positionHover(coord)
    this.editorState.setHoverCoord(coord)
  }

  onPointerClick(event) {
    if (!this.snapshot) {
      return
    }

    if (this.snapshot.mode === 'remove') {
      this.removeClickedPiece(event)
      return
    }

    var coord = this.screenToWorld(event)
    if (coord) {
      this.editorState.addPieceAt(coord)
    }
  }

  removeClickedPiece(event) {
    var rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.camera)
    var intersections = this.raycaster.intersectObjects(Array.from(this.meshMap.values()))

    if (intersections.length) {
      this.editorState.removePieceById(intersections[0].object.userData.pieceId)
    }
  }

  resetCamera() {
    var bounds = getGridBounds(this.snapshot?.grid)
    var span = Math.max(
      Number(this.snapshot?.grid?.width || 10),
      Number(this.snapshot?.grid?.height || 10),
      Number(this.snapshot?.grid?.depth || 10)
    )
    this.camera.position.set(span + 4, span + 4, span + 4)
    this.controls.target.set((bounds.minX + bounds.maxX) / 2, 2, (bounds.minZ + bounds.maxZ) / 2)
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
    this.renderer.domElement.removeEventListener('click', this.handleClick)
    this.controls.dispose()
    this.renderer.dispose()
    this.container.innerHTML = ''
  }
}
