import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'lil-gui'

/**
 * Base
 */

// Parameters
const config = {
    materialColor: '#9b5de5' // #00f5d4 #e9eaf2 #5db5f9 #232d34 #9b5de5
}

// Debug
const gui = new dat.GUI()
gui
    .addColor(config, 'materialColor')
    .onChange(() =>
    {
        material.color.set(config.materialColor)
    })

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
 * Objects
 */

const geometry = new THREE.BoxGeometry(1, 1, 1, 4, 4, 4)
const material = new THREE.MeshBasicMaterial({ color: config.materialColor , wireframe: true})
const mesh = new THREE.Mesh(geometry, material)
scene.add(mesh)

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