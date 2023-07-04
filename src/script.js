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
    color1: '#8C73EA', // #00f5d4 #e9eaf2 #5db5f9 #232d34 #9b5de5
    color2: '#9B5DE5', // #00f5d4 #e9eaf2 #5db5f9 #232d34 #9b5de5
    wireframe: false,
    constraintType: 'none', // 'distance' 'hinge' 'hinge'
    updateScene,
    positionFactor: 10,
    objectDistance: 5,
    endPointDistance: 4,
    objectDensity: 4

}

// Debug
const gui = new dat.GUI()
gui.add(config, 'wireframe')
    .onChange(() => dataMeshes.forEach(m => m.material.wireframe = config.wireframe))
// gui.add(config, 'positionFactor', 0, 30) // only applied at next scene update
gui.add(config, 'objectDistance', 0, 20, 1).onChange(() => {updateObjectConstraints()})
gui.add(config, 'objectDensity', 0, 10, 1).onChange(() => {updateConstraints()})
gui.add(config, 'endPointDistance', 0, 100, 1).onChange(() => {updateEndpointConstraint()})
gui.add( config, 'constraintType' , ['distance', 'hinge', 'none']).onChange(() => {updateConstraints()})
gui.add( config, 'updateScene' ); // Button


// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Data
 */

const inputData = [
    {key: "A", value: 54},
    {key: "B", value: 80},
    {key: "C", value: 55},
    {key: "D", value: 43}
]

// Transform data
let data = []
inputData.forEach(d => {
    console.log(d.value)
    for(let i = 0; i < d.value; i++){
        data.push(d.key)
    }
})
data = d3.shuffle(data)


/**
 * Materials
 */
const textureLoader = new THREE.TextureLoader()

const matcapTextures = [
    textureLoader.load('textures/a.png'),
    textureLoader.load('textures/b.png'),
    textureLoader.load('textures/c.png'),
    textureLoader.load('textures/d.png')
]

/**
 * Scales
 */
const color = new d3.scaleOrdinal()
    .domain([new Set(data)])
    .range(["#9b5de5","#e9eaf2","#5db5f9","#00f5d4"])

const matcap = new d3.scaleOrdinal()
    .domain([new Set(data)])
    .range(matcapTextures)

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


const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({color: config.color2})
)
plane.rotation.x = - Math.PI * 0.5
plane.receiveShadow = true
scene.add(plane)



/**
 * Objects
 */

// Normalization: We use this functions to map the indices of our data to a number 
// between 0 and 1 to use this as a scalar for our meshes size and position
const clamp = (a, min = 0, max = 1) => Math.min(max, Math.max(min, a))
const invlerp = (x, y, a) => clamp((a - x) / (y - x))
// const scalar = invlerp(0, data.length, i)

let objectsToUpdate
let dataMeshGroup 
let dataMeshes

const geometry = new THREE.IcosahedronGeometry(1)
const material = new THREE.MeshMatcapMaterial()
// material.roughness = 0.1
// material.metalness = 0.5

const createObject = (d, width, height, depth, position) => {

    // Three.js mesh
    const mesh = new THREE.Mesh(geometry, material.clone())
    mesh.material.matcap = matcap(d)
    mesh.material.wireframe = config.wireframe
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


const addObjects = () => {
    objectsToUpdate = []
    dataMeshGroup = new THREE.Group();
    dataMeshes = []

    data.forEach((d, i) => createObject(d, 1, 1, 1, 
        { 
            x: Math.random() * config.positionFactor, 
            y: Math.random() * config.positionFactor + 10, 
            z: Math.random() * config.positionFactor
         }))
    scene.add(dataMeshGroup)
}

addObjects()

/**
 * Constraints
 */
let objectsConstraints
let endpointConstraint

const constrainTwoObjects = (objectA, obecjtB, maxDistance) => {
    // Create the constraint based on the selected type
    let constraint
    if (config.constraintType === 'distance') {
        // Create a distance constraint
        // const distance = maxDistance * Math.random(); // Adjust the maximum distance as needed
        const distance = maxDistance; // Adjust the maximum distance as needed
        constraint = new CANNON.DistanceConstraint(objectA.body, obecjtB.body, distance);
        world.addConstraint(constraint);
    } else if (config.constraintType === 'hinge') {
        // Create a hinge constraint
        constraint = new CANNON.HingeConstraint(objectA.body, obecjtB.body);
        world.addConstraint(constraint);
    }
    return constraint
}

const addConstraint = () => {
    // Add consraints for the first an last object
    addEndpointConstraint()
    addObjectConstraints()
}

const addEndpointConstraint = () => {
    endpointConstraint = constrainTwoObjects(objectsToUpdate[0], objectsToUpdate[objectsToUpdate.length - 1], config.endPointDistance)
}

const removeEndpointConstraint = () => {
    world.removeConstraint(endpointConstraint)
}

const updateEndpointConstraint = () => {
    removeEndpointConstraint()
    addEndpointConstraint()
}

const addObjectConstraints = () => {
    objectsConstraints = []

    // Add consraints for all objects
    objectsToUpdate.forEach((object, i) => {

        if(i !== objectsToUpdate.length - 1) {
            // Select two random objects
            var obecjtB = objectsToUpdate[i+1];
            objectsConstraints.push(constrainTwoObjects(object, obecjtB, config.objectDistance)) 
        }

        if(i+config.objectDensity <= objectsToUpdate.length - 1) {
            obecjtB = objectsToUpdate[i+config.objectDensity];
            objectsConstraints.push(constrainTwoObjects(object, obecjtB, config.objectDistance)) 
        }

    })
}

const removeObjectConstraints = () => {
    objectsConstraints.forEach(c => {
        world.removeConstraint(c)
    })
}

const updateObjectConstraints = () => {
    removeObjectConstraints()
    addObjectConstraints()
}

const updateConstraints = () => {
    updateEndpointConstraint()
    updateObjectConstraints()
}

addConstraint()

/**
 * Fog
 */
const fog = new THREE.Fog(config.color2, 30, 100)
scene.fog = fog

/**
 * Lights
*/
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.far = 200
directionalLight.shadow.camera.near = 1
directionalLight.shadow.camera.left = - 100
directionalLight.shadow.camera.top = 100
directionalLight.shadow.camera.right = 100
directionalLight.shadow.camera.bottom = - 100
directionalLight.position.set(10, 10, 10)

scene.add(directionalLight)

// scene.add( new THREE.DirectionalLightHelper( directionalLight ))
// scene.add( new THREE.CameraHelper( directionalLight.shadow.camera ) )

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

camera.position.z = 40
camera.position.x = 0
camera.position.y = 5
// scene.rotation.y = -90 * Math.PI/180
// camera.lookAt(scene.position)
scene.add(camera)
camera.lookAt( scene.position )

// scene.add( new THREE.CameraHelper( camera ) )

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
renderer.setClearColor( config.color2 )

/**
 * Axes Helper
 */

// const axesHelper = new THREE.AxesHelper( 5 );
// scene.add( axesHelper );

/**
 * Update Scene
 */

function updateScene() {
    scene.remove( dataMeshGroup);
    addObjects()
    if(config.constraintType !== 'none') {
        addConstraint()
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