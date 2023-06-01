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
    color1: '#232d34', // #00f5d4 #e9eaf2 #5db5f9 #232d34 #9b5de5
    wireframe: false,
    constraintType: 'distance' // 'distance' 'hinge'

}

// Debug
// const gui = new dat.GUI()
// gui
//     .addColor(config, 'color1')
//     .onChange(() =>
//     {
//         material.color.set(config.color1)
//     })
// gui.add(config, 'wireframe')
// .onChange(() => dataMeshes.forEach(m => m.material.wireframe = config.wireframe))

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Data
 */

const inputData = [
    {key: "A", value: 22},
    {key: "B", value: 30},
    {key: "C", value: 20},
    {key: "D", value: 40}
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
world.gravity.set(0, -5, 0)
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
// const scalar = invlerp(0, data.length, i)

const objectsToUpdate = []

const geometry = new THREE.IcosahedronGeometry(1)
const material = new THREE.MeshStandardMaterial({wireframe: config.wireframe})

const dataMeshGroup = new THREE.Group();
const dataMeshes = []

const createObject = (d, width, height, depth, position) => {

    // Three.js mesh
    const mesh = new THREE.Mesh(geometry, material.clone())
    mesh.material.color = new THREE.Color(color(d))
    mesh.castShadow = true
    mesh.scale.set(width, height, depth)
    mesh.position.copy(position)

    dataMeshes.push(mesh)
    dataMeshGroup.add(mesh)

    // Cannon.js body
    const shape = new CANNON.Sphere(1)
    // const shape = new CANNON.Box(new CANNON.Vec3(width * 0.5, height * 0.5, depth * 0.5))

    const body = new CANNON.Body({
        mass: 1,
        linearDamping: 0.5, // Adjust the linear damping value to reduce bouncing
        position: new CANNON.Vec3(0, 3, 0),
        shape: shape,
        material: defaultMaterial
    })
    body.position.copy(position)

    // body.addEventListener('collide', playHitSound)
    world.addBody(body)

    // Save in objects
    objectsToUpdate.push({ mesh, body })

}

const positionFactor = 10
data.forEach((d, i) => createObject(d, 1, 1, 1, 
    { 
        x: Math.random() * positionFactor, 
        y: Math.random() * positionFactor + 10, 
        z: Math.random() * positionFactor
     }))
scene.add(dataMeshGroup)


/**
 * Constraints
 */
const maxDistance = 2

const addConstraint = (objectA, obecjtB, maxDistance) => {
    // Create the constraint based on the selected type
    if (config.constraintType === 'distance') {
        // Create a distance constraint
        // const distance = maxDistance * Math.random(); // Adjust the maximum distance as needed
        const distance = maxDistance; // Adjust the maximum distance as needed
        const constraint = new CANNON.DistanceConstraint(objectA.body, obecjtB.body, distance);
        world.addConstraint(constraint);
    } else if (config.constraintType === 'hinge') {
        // Create a hinge constraint
        const constraint = new CANNON.HingeConstraint(objectA.body, obecjtB.body);
        world.addConstraint(constraint);
    }
}

// Create random constraints
objectsToUpdate.forEach((object, i) => {

    if(i !== objectsToUpdate.length - 1) {
        // Select two random objects
        var obecjtB = objectsToUpdate[i+1];
        addConstraint(object, obecjtB, maxDistance)  
    }
    let n = 4
    if(i+n <= objectsToUpdate.length - 1) {
        obecjtB = objectsToUpdate[i+n];
        addConstraint(object, obecjtB, maxDistance) 
    }

  })

addConstraint(objectsToUpdate[0], objectsToUpdate[objectsToUpdate.length - 1], 30)

/**
 * Floor
 */
// const floor = new THREE.Mesh(
//     new THREE.PlaneGeometry(100, 100),
//     new THREE.MeshStandardMaterial({
//         color: config.color1,
//         metalness: 0.3,
//         roughness: 0.4,
//     })
// )
// floor.receiveShadow = true
// floor.rotation.x = - Math.PI * 0.5
// scene.add(floor)

/**
 * Lights
*/
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.far = 15
directionalLight.shadow.camera.left = - 7
directionalLight.shadow.camera.top = 7
directionalLight.shadow.camera.right = 7
directionalLight.shadow.camera.bottom = - 7
directionalLight.position.set(5, 5, 5)
scene.add(directionalLight)

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
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 500)

camera.position.z = 30
camera.position.x = 10
camera.position.y = 40
// camera.rotation.x = 90 * Math.PI / -180
// camera.lookAt(scene.position)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.update()

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    aplha: true
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor( 0x000000, 0 )

/**
 * Axes Helper
 */

// const axesHelper = new THREE.AxesHelper( 5 );
// scene.add( axesHelper );

/**
 * Update Scene
 */
function clearScene() {
    var to_remove = [];

    scene.traverse ( function( child ) {
        if ( child instanceof THREE.Mesh && !child.userData.keepMe === true ) {
            to_remove.push( child );
         }
    } );

    for ( var i = 0; i < to_remove.length; i++ ) {
        scene.remove( to_remove[i] );
    }
}

/**
 * Animate
 */
const clock = new THREE.Clock()
let oldElapsedTime = 0

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - oldElapsedTime
    oldElapsedTime = elapsedTime

    // Update physics
    world.step(1 / 60, deltaTime, 3)

    for(const object of objectsToUpdate)
    {
        object.mesh.position.copy(object.body.position)
        object.mesh.quaternion.copy(object.body.quaternion)
    }

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

renderer.render(scene, camera)
setTimeout(tick, 500)