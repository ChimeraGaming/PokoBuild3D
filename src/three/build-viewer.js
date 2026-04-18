import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { createPieceMesh, summarizeVisibleMaterials, updateMeshStyle } from './piece-factory.js'

export class BuildViewer {
  constructor(container, build, options) {
    this.container = container
    this.build = build
    this.options = options || {}
    this.state = {
      layerMode: 'all',
      currentLayer: this.getHighestLayer(),
      wireframe: false,
      showGrid: true,
      explode: 0
    }

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#f4efe4')
    this.scene.fog = new THREE.Fog('#f4efe4', 28, 72)
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200)
    this.camera.position.set(16, 16, 16)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.target.set(0, 2, 0)
    this.container.innerHTML = ''
    this.container.appendChild(this.renderer.domElement)
    this.loader = new GLTFLoader()
    this.rootGroup = new THREE.Group()
    this.scene.add(this.rootGroup)
    this.meshEntries = []

    this.addLights()
    this.addGround()
    this.addGrid()
    this.loadBuild()
    this.resizeObserver = new ResizeObserver(this.handleResize.bind(this))
    this.resizeObserver.observe(this.container)
    this.boundAnimate = this.animate.bind(this)
    this.animationFrame = window.requestAnimationFrame(this.boundAnimate)
  }

  addLights() {
    var ambient = new THREE.AmbientLight('#fff6eb', 1.2)
    var sun = new THREE.DirectionalLight('#fff7ec', 1.7)
    sun.position.set(12, 22, 8)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    this.scene.add(ambient, sun)
  }

  addGround() {
    var plane = new THREE.Mesh(
      new THREE.CircleGeometry(20, 40),
      new THREE.MeshStandardMaterial({
        color: '#e5ddca',
        roughness: 1,
        metalness: 0
      })
    )
    plane.rotation.x = -Math.PI / 2
    plane.position.y = -0.05
    plane.receiveShadow = true
    this.scene.add(plane)
  }

  addGrid() {
    this.gridHelper = new THREE.GridHelper(28, 28, '#769076', '#c8cabf')
    this.gridHelper.position.y = 0
    this.scene.add(this.gridHelper)
  }

  getHighestLayer() {
    if (!this.build.editorDataJson?.pieces?.length) {
      return 0
    }

    return this.build.editorDataJson.pieces.reduce(function (maxLayer, piece) {
      return Math.max(maxLayer, piece.y)
    }, 0)
  }

  async loadBuild() {
    if (this.build.modelType === 'editor' && this.build.editorDataJson?.pieces?.length) {
      this.loadEditorPieces(this.build.editorDataJson.pieces)
      return
    }

    if (this.build.modelUrl) {
      await this.loadModel(this.build.modelUrl)
    }
  }

  loadEditorPieces(pieces) {
    var viewer = this

    this.clearRoot()
    this.meshEntries = pieces.map(function (piece) {
      var mesh = createPieceMesh(piece, {
        wireframe: viewer.state.wireframe
      })
      viewer.rootGroup.add(mesh)
      return {
        piece: piece,
        mesh: mesh
      }
    })
    this.refreshLayerVisibility()
  }

  async loadModel(url) {
    var viewer = this
    this.clearRoot()
    var gltf = await this.loader.loadAsync(url)
    gltf.scene.traverse(function (child) {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    viewer.rootGroup.add(gltf.scene)
  }

  clearRoot() {
    while (this.rootGroup.children.length) {
      var child = this.rootGroup.children[0]
      this.rootGroup.remove(child)
      child.traverse(function (node) {
        if (node.geometry) {
          node.geometry.dispose()
        }
        if (node.material) {
          if (Array.isArray(node.material)) {
            node.material.forEach(function (material) {
              material.dispose()
            })
          } else {
            node.material.dispose()
          }
        }
      })
    }
  }

  handleResize() {
    var width = Math.max(this.container.clientWidth, 200)
    var height = Math.max(this.container.clientHeight, 280)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  setLayerMode(mode) {
    this.state.layerMode = mode
    this.refreshLayerVisibility()
  }

  setCurrentLayer(layerIndex) {
    this.state.currentLayer = Number(layerIndex)
    this.refreshLayerVisibility()
  }

  toggleWireframe() {
    this.state.wireframe = !this.state.wireframe
    this.meshEntries.forEach(function (entry) {
      updateMeshStyle(entry.mesh, {
        wireframe: entry.mesh.material.wireframe ? false : true,
        mode: 'solid'
      })
    })
  }

  setDisplayMode(mode) {
    this.state.displayMode = mode
    this.meshEntries.forEach(function (entry) {
      updateMeshStyle(entry.mesh, {
        wireframe: mode === 'wireframe',
        mode: mode
      })
    })
  }

  toggleGrid() {
    this.state.showGrid = !this.state.showGrid
    this.gridHelper.visible = this.state.showGrid
  }

  setExplode(value) {
    this.state.explode = Number(value)
    this.refreshLayerVisibility()
  }

  resetCamera() {
    this.camera.position.set(16, 16, 16)
    this.controls.target.set(0, 2, 0)
    this.controls.update()
  }

  getVisibleMaterials() {
    return summarizeVisibleMaterials(
      this.build.editorDataJson?.pieces || [],
      this.state.layerMode,
      this.state.currentLayer
    )
  }

  refreshLayerVisibility() {
    var viewer = this

    this.meshEntries.forEach(function (entry) {
      var isVisible = true

      if (viewer.state.layerMode === 'current') {
        isVisible = entry.piece.y === viewer.state.currentLayer
      } else if (viewer.state.layerMode === 'current-and-below') {
        isVisible = entry.piece.y <= viewer.state.currentLayer
      }

      entry.mesh.visible = isVisible
      entry.mesh.position.y = entry.mesh.userData.baseY + viewer.state.explode * entry.piece.y * 0.18
    })

    if (typeof this.options.onLayerChange === 'function') {
      this.options.onLayerChange({
        currentLayer: this.state.currentLayer,
        materials: this.getVisibleMaterials()
      })
    }
  }

  animate() {
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
    this.animationFrame = window.requestAnimationFrame(this.boundAnimate)
  }

  destroy() {
    window.cancelAnimationFrame(this.animationFrame)
    this.resizeObserver.disconnect()
    this.controls.dispose()
    this.renderer.dispose()
    this.clearRoot()
    this.container.innerHTML = ''
  }
}
