import * as THREE from "./node_modules/three/build/three.module.js";
import { OrbitControls } from "./node_modules/three/examples/jsm/controls/OrbitControls.js"
// Scene, camera, renderer...
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 2;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("app").appendChild(renderer.domElement);

// --- Lighting ---
// Ambient light to ensure all parts of the scene are slightly lit
const ambientLight = new THREE.AmbientLight(0x333333); // Soft white light
scene.add(ambientLight);

// Directional light to simulate sunlight
const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // White light, intensity 1
directionalLight.position.set(5, 3, 5); // Position the light source
scene.add(directionalLight);

// --- Earth Geometry and Material ---
const earthGeometry = new THREE.SphereGeometry(1, 64, 64); // Radius 1, 64 width segments, 64 height segments for smooth sphere

let earthMaterial;
const textureLoader = new THREE.TextureLoader();
try {
  // Attempt to load a high-resolution Earth daymap texture
  // Make sure you have a 'textures' folder with 'earth_daymap.jpg' in your project root
  const earthTexture = textureLoader.load("textures/earth_daymap.jpg");
  earthMaterial = new THREE.MeshPhongMaterial({
    map: earthTexture, // Apply the loaded texture
    shininess: 10, // Adjust shininess for a more planet-like surface
  });
} catch (error) {
  console.warn(
    "Texture 'textures/earth_daymap.jpg' not found. Using a basic blue material.",
    error
  );
  // Fallback to a basic color if texture loading fails
  earthMaterial = new THREE.MeshPhongMaterial({
    color: 0x0000ff, // Blue color
    specular: 0x333333, // Reflective color
    shininess: 10, // Shininess of the material
  });
}

const earth = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earth);

// --- Stars Background (Optional) ---
function addStars() {
  const starGeometry = new THREE.BufferGeometry();
  const starVertices = [];

  for (let i = 0; i < 10000; i++) {
    const x = (Math.random() - 0.5) * 2000; // Random x within a large range
    const y = (Math.random() - 0.5) * 2000; // Random y within a large range
    const z = (Math.random() - 0.5) * 2000; // Random z within a large range
    starVertices.push(x, y, z);
  }

  starGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(starVertices, 3)
  );

  const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 });
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);
}
addStars();

// --- OrbitControls Setup ---
// Allows for interactive camera control (rotate, zoom, pan)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Enable smooth camera movement
controls.dampingFactor = 0.05; // Damping factor
controls.screenSpacePanning = false; // Disable panning in screen space
controls.minDistance = 1.5; // Minimum zoom distance
controls.maxDistance = 10; // Maximum zoom distance

// --- Animation Loop ---
function animate() {
  requestAnimationFrame(animate);

  // Rotate the Earth around its Y-axis
  earth.rotation.y += 0.002; // Adjust rotation speed as needed

  controls.update(); // Update orbit controls in each frame

  renderer.render(scene, camera); // Render the scene with the camera
}
animate();

// --- Handle Window Resizing ---
window.addEventListener("resize", () => {
  // Update camera aspect ratio
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  // Update renderer size
  renderer.setSize(window.innerWidth, window.innerHeight);
});
