import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'lil-gui'
import * as d3 from 'd3'
import * as CANNON from 'cannon-es'

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
    {key: "A", value: 2},
    {key: "B", value: 3},
    {key: "C", value: 5},
    {key: "D", value: 3}
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
    .range(["#9b5de5","#e9eaf2","#5db5f9","#00f5d4"])

/**
 * Physics
 */
const world = new CANNON.World()
world.broadphase = new CANNON.SAPBroadphase(world)
world.allowSleep = true
world.gravity.set(0, - 1, 0)
// world.gravity.set(0, - 9.82, 0)

// Default material
const defaultMaterial = new CANNON.Material('default')
const defaultContactMaterial = new CANNON.ContactMaterial(
    defaultMaterial,
    defaultMaterial,
    {
        friction: 0.1,
        restitution: 0.7
    }
)
world.defaultContactMaterial = defaultContactMaterial

// Floor
const floorShape = new CANNON.Plane()
const floorBody = new CANNON.Body()
floorBody.mass = 0
floorBody.addShape(floorShape)
floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(- 1, 0, 0), Math.PI * 0.5)  // rotate because the plane is also rotated
world.addBody(floorBody)

/**
 * Objects
 */

// Normalization: We use this functions to map the indices of our data to a number 
// between 0 and 1 to use this as a scalar for our meshes size and position
const clamp = (a, min = 0, max = 1) => Math.min(max, Math.max(min, a))
const invlerp = (x, y, a) => clamp((a - x) / (y - x))

const geometry = new THREE.BoxGeometry(1, 1, 1, 2, 2, 2)
const material = new THREE.MeshBasicMaterial({wireframe: config.wireframe})

const createDataMesh = (d, i) => {
    // const scalar = invlerp(0, data.length, i)
    const mesh = new THREE.Mesh(geometry, material.clone())
    mesh.material.color = new THREE.Color(color(d))
    console.log(color(d))
    const positionFactor = 5
    mesh.position.x = Math.random() * positionFactor
    mesh.position.y = Math.random() * positionFactor * 2 
    mesh.position.z = Math.random() * positionFactor
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
camera.position.x = 10
camera.position.y = 10
camera.position.z = 10
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