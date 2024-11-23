// Initialize GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('canvas-container').appendChild(renderer.domElement);

// Mouse tracking for interactive effects
const mouse = {
    x: 0,
    y: 0,
    target: { x: 0, y: 0 }
};

document.addEventListener('mousemove', (event) => {
    mouse.target.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.target.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// Create geometries
const geometries = [
    new THREE.TorusKnotGeometry(1, 0.3, 100, 16),
    new THREE.IcosahedronGeometry(0.8, 0),
    new THREE.OctahedronGeometry(0.7, 0),
    new THREE.TetrahedronGeometry(0.8, 0),
    new THREE.DodecahedronGeometry(0.7, 0),
    new THREE.SphereGeometry(0.5, 32, 32)
];

// Create materials with custom shaders
const vertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    
    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const fragmentShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    uniform vec3 color;
    uniform float time;
    
    void main() {
        float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        vec3 glow = color * intensity;
        float pulse = sin(time * 2.0) * 0.5 + 0.5;
        gl_FragColor = vec4(glow * (0.8 + pulse * 0.2), 0.7);
    }
`;

const materials = [
    new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0x6366F1) },
            time: { value: 0 }
        },
        vertexShader,
        fragmentShader,
        transparent: true
    }),
    new THREE.MeshPhysicalMaterial({
        color: 0x14B8A6,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.8,
        envMapIntensity: 1
    }),
    new THREE.MeshStandardMaterial({
        color: 0xF43F5E,
        metalness: 0.7,
        roughness: 0.2,
        transparent: true,
        opacity: 0.9
    })
];

// Create particle system
const particleCount = 1000;
const particleGeometry = new THREE.BufferGeometry();
const particlePositions = new Float32Array(particleCount * 3);

for(let i = 0; i < particleCount * 3; i += 3) {
    particlePositions[i] = (Math.random() - 0.5) * 50;
    particlePositions[i + 1] = (Math.random() - 0.5) * 50;
    particlePositions[i + 2] = (Math.random() - 0.5) * 50;
}

particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

const particleMaterial = new THREE.PointsMaterial({
    color: 0x6366F1,
    size: 0.1,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
});

const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particleSystem);

// Create interactive objects
const objects = [];

geometries.forEach((geometry, index) => {
    const material = materials[index % materials.length].clone();
    const mesh = new THREE.Mesh(geometry, material);
    
    mesh.position.set(
        Math.random() * 20 - 10,
        Math.random() * 20 - 10,
        Math.random() * 10 - 15
    );
    
    mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
    );
    
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    scene.add(mesh);
    objects.push({
        mesh,
        initialPosition: mesh.position.clone(),
        rotationSpeed: {
            x: Math.random() * 0.01 - 0.005,
            y: Math.random() * 0.01 - 0.005,
            z: Math.random() * 0.01 - 0.005
        },
        floatSpeed: Math.random() * 0.005 + 0.002,
        floatOffset: Math.random() * Math.PI * 2
    });
});

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

const pointLights = [];
const pointLightColors = [0x6366F1, 0x14B8A6, 0xF43F5E];

for(let i = 0; i < 3; i++) {
    const light = new THREE.PointLight(pointLightColors[i], 1, 20);
    light.position.set(
        Math.random() * 10 - 5,
        Math.random() * 10 - 5,
        Math.random() * 5
    );
    scene.add(light);
    pointLights.push(light);
}

camera.position.z = 5;

// Animation
let time = 0;
function animate() {
    requestAnimationFrame(animate);
    time += 0.01;

    // Smooth mouse movement
    mouse.x += (mouse.target.x - mouse.x) * 0.1;
    mouse.y += (mouse.target.y - mouse.y) * 0.1;

    // Update objects
    objects.forEach((obj, i) => {
        // Rotation
        obj.mesh.rotation.x += obj.rotationSpeed.x;
        obj.mesh.rotation.y += obj.rotationSpeed.y;
        obj.mesh.rotation.z += obj.rotationSpeed.z;

        // Wave motion
        const wave = Math.sin(time + obj.floatOffset) * obj.floatSpeed;
        obj.mesh.position.y = obj.initialPosition.y + wave;

        // Circular motion
        const radius = 0.5;
        obj.mesh.position.x = obj.initialPosition.x + Math.cos(time * 0.5 + i) * radius;
        obj.mesh.position.z = obj.initialPosition.z + Math.sin(time * 0.5 + i) * radius;

        // Update shader uniforms
        if(obj.mesh.material.uniforms) {
            obj.mesh.material.uniforms.time.value = time;
        }

        // Interactive movement
        obj.mesh.position.x += mouse.x * 0.1;
        obj.mesh.position.y += mouse.y * 0.1;
    });

    // Animate particle system
    particleSystem.rotation.y += 0.0001;
    const positions = particleSystem.geometry.attributes.position.array;
    for(let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(time + positions[i]) * 0.01;
    }
    particleSystem.geometry.attributes.position.needsUpdate = true;

    // Animate point lights
    pointLights.forEach((light, i) => {
        light.position.x = Math.sin(time * 0.5 + i * Math.PI * 2 / 3) * 5;
        light.position.y = Math.cos(time * 0.5 + i * Math.PI * 2 / 3) * 5;
        light.intensity = 1 + Math.sin(time * 2) * 0.2;
    });

    // Camera movement
    camera.position.x += (mouse.x * 2 - camera.position.x) * 0.05;
    camera.position.y += (-mouse.y * 2 - camera.position.y) * 0.05;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
}

// Initialize animations
function initAnimations() {
    // Hero section animations
    gsap.to('.hero-content', {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: 'power3.out',
        delay: 0.5
    });

    // Feature cards animation
    gsap.from('.feature-card', {
        scrollTrigger: {
            trigger: '.features',
            start: 'top center'
        },
        y: 60,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out'
    });

    // Showcase section animation
    gsap.to('.showcase-content', {
        scrollTrigger: {
            trigger: '.showcase',
            start: 'top center'
        },
        opacity: 1,
        y: 0,
        duration: 1,
        ease: 'power3.out'
    });

    gsap.to('.mockup', {
        scrollTrigger: {
            trigger: '.showcase',
            start: 'top center'
        },
        opacity: 1,
        duration: 1,
        delay: 0.3,
        ease: 'power3.out'
    });

    // Testimonial cards animation
    gsap.from('.testimonial-card', {
        scrollTrigger: {
            trigger: '.testimonials',
            start: 'top center'
        },
        y: 60,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out'
    });

    // Pricing cards animation
    gsap.from('.pricing-card', {
        scrollTrigger: {
            trigger: '.pricing',
            start: 'top center'
        },
        y: 60,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out'
    });
}

// Handle window resize
function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', handleResize);

// Mobile menu toggle
const mobileMenu = document.querySelector('.mobile-menu');
const navLinks = document.querySelector('.nav-links');

mobileMenu.addEventListener('click', () => {
    navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
});

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollTop(0);
    });
});

// Initialize everything
window.addEventListener('load', () => {
    // Hide loader
    document.querySelector('.loader').classList.add('hidden');
    
    // Initialize animations
    initAnimations();
    
    // Start animation loop
    animate();
});

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const nav = document.querySelector('nav');
    if (window.scrollY > 100) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
});

// Form submission
const newsletterForm = document.querySelector('.newsletter-form');
newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = e.target.querySelector('input').value;
    // Here you would typically handle the form submission
    console.log('Newsletter subscription:', email);
}); 
