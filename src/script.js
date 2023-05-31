import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'lil-gui'
import * as d3 from 'd3'

/**
 * Base
 */

// Parameters
const config = {
    materialColor: '#9b5de5', // #00f5d4 #e9eaf2 #5db5f9 #232d34 #9b5de5
    wireframe: true
}

// Debug
const gui = new dat.GUI()
gui
    .addColor(config, 'materialColor')
    .onChange(() =>
    {
        material.color.set(config.materialColor)
    })
gui.add(config, 'wireframe')
.onChange(() => dataMeshes.forEach(m => m.material.wireframe = config.wireframe))

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Data
 */

const inputData = [
    {key: "A", value: 10},
    {key: "B", value: 3},
    {key: "C", value: 5},
    {key: "D", value: 20}
]

// Transform data
const data = []
inputData.forEach(d => {
    console.log(d.value)
    for(let i = 0; i < d.value; i++){
        data.push(d.key)
    }
})

/**
 * Scales
 */
const color = new d3.scaleOrdinal()
    .domain([new Set(data)])
    .range(["9b5de5","e9eaf2","5db5f9","00f5d4"])

/**
 * Objects
 */

const createDataMesh = (d, i) => {
    const meshColor = new THREE.Color(color(d))
    meshColor.lerp(new THREE.Color('#9b5de5'), 0.5)
    const geometry = new THREE.BoxGeometry(1*i/10, 1*i/10, 1*i/10, 4, 4, 4)
    const material = new THREE.MeshBasicMaterial({ color: meshColor , wireframe: config.wireframe})
    const mesh = new THREE.Mesh(geometry, material)
    return mesh
}

const dataMeshGroup = new THREE.Group();
const dataMeshes = []
data.forEach((d, i) => {
    let mesh = createDataMesh(d, i)
    dataMeshes.push(mesh)
    dataMeshGroup.add(mesh)
})
scene.add(dataMeshGroup)
console.log(dataMeshes)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})


/**
 * Camera
 */

// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 1
camera.position.y = 1
camera.position.z = 1
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()