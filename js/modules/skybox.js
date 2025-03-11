/**
 * Epic Skybox Module for Neon Drift Protocol (Version 2)
 * 
 * Creates a stunning vaporwave/outrun-style backdrop with improved integration
 * with the game world, proper scaling, and optimized visual layering.
 */

// Constants for better skybox scaling and positioning
const SKYBOX_CONFIG = {
    SCALE: 2000,              // Match camera.far for proper depth perception
    HORIZON_HEIGHT: 0,        // Align exactly with world ground plane
    SUN_POSITION: { x: 0, y: 100, z: -1800 }, // Moved much further away 
    FLOATING_OBJECTS_DISTANCE: 1600, // Increased distance for better depth effect
    GRID_OPACITY: 0.3,        // Further reduced for better visual balance
    MOUNTAINS_DISTANCE: 1750, // Mountains much further away at horizon
    ROTATION_SPEED: 0.00001,  // Further reduced for more subtle effect
    VERTICAL_OFFSET: -50,     // Negative offset to keep skybox below camera
};

class Skybox {
    constructor(camera, scene) {
        this.camera = camera;
        this.scene = scene;
        this.skybox = null;
        this.skyboxSun = null;
        this.skyboxSunGlow = null;
        this.skyboxGrid = null;
        this.skyboxScanlines = null;
        this.skyboxObjects = [];
        
        // Create a separate container for skybox elements that should follow camera position
        // but not camera rotation
        this.worldSkybox = new THREE.Object3D();
        this.worldSkybox.name = "worldSkybox";
    }

    /**
     * Create an epic vaporwave skybox with better world integration
     */
    create() {
        // Create main containers
        this.skybox = new THREE.Object3D();
        this.skybox.name = "skybox";
        this.skybox.renderOrder = -1000; // Render first, before anything else
        
        // Add the world-relative container to the scene
        this.scene.add(this.worldSkybox);
        
        // 1. Main skybox cube with improved outrun-style gradient
        const skyGeometry = new THREE.BoxGeometry(1, 1, 1);
        
        // Create materials for each face with proper backside rendering
        const skyMaterials = [];
        
        // Create horizon gradient texture (enhanced colors)
        const horizonCanvas = document.createElement('canvas');
        horizonCanvas.width = 2048; // Higher resolution for better quality
        horizonCanvas.height = 2048;
        const horizonCtx = horizonCanvas.getContext('2d');
        
        // Create dramatic horizon gradient with more vibrant colors
        const horizonGradient = horizonCtx.createLinearGradient(0, 0, 0, 2048);
        horizonGradient.addColorStop(0, '#000033');    // Deep blue at top
        horizonGradient.addColorStop(0.4, '#330066');  // Deep purple upper atmosphere
        horizonGradient.addColorStop(0.47, '#660099'); // Mid purple
        horizonGradient.addColorStop(0.49, '#cc00cc'); // Bright magenta near horizon
        horizonGradient.addColorStop(0.5, '#ff00ff');  // Pure magenta at horizon
        horizonGradient.addColorStop(0.51, '#ff33cc'); // Pink just below horizon
        horizonGradient.addColorStop(0.53, '#ff5599'); // Light pink lower
        horizonGradient.addColorStop(0.6, '#ff2277');  // Pink-red lower
        horizonGradient.addColorStop(1, '#000011');    // Dark blue-black at bottom
        
        horizonCtx.fillStyle = horizonGradient;
        horizonCtx.fillRect(0, 0, 2048, 2048);
        
        // Add digital grid lines to horizon (classic outrun style)
        horizonCtx.strokeStyle = 'rgba(255, 0, 255, 0.2)'; // Reduced opacity
        horizonCtx.lineWidth = 2;
        
        // Draw vertical grid lines converging at horizon
        for (let x = 0; x < 2048; x += 128) {
            horizonCtx.beginPath();
            horizonCtx.moveTo(x, 1024); // Start at horizon
            horizonCtx.lineTo(1024 + (x - 1024) * 2, 2048); // End at bottom, converging
            horizonCtx.stroke();
        }
        
        // Top texture (enhanced starfield)
        const topCanvas = document.createElement('canvas');
        topCanvas.width = 2048;
        topCanvas.height = 2048;
        const topCtx = topCanvas.getContext('2d');
        
        // Create deep space gradient
        const spaceGradient = topCtx.createRadialGradient(1024, 1024, 0, 1024, 1024, 1600);
        spaceGradient.addColorStop(0, '#330066');  // Purple core
        spaceGradient.addColorStop(0.3, '#220044'); // Deep purple
        spaceGradient.addColorStop(0.7, '#110033'); // Darker purple
        spaceGradient.addColorStop(1, '#000022');  // Almost black at edges
        
        topCtx.fillStyle = spaceGradient;
        topCtx.fillRect(0, 0, 2048, 2048);
        
        // Add stars of various sizes with more variety
        for (let i = 0; i < 3000; i++) {
            const x = Math.random() * 2048;
            const y = Math.random() * 2048;
            const size = Math.random() * 2.5 + 0.5;
            
            // Random brightness and slight color variation
            const brightness = Math.random() * 0.6 + 0.4;
            
            // Add some colored stars (1 in 6 chance)
            let starColor;
            const colorRoll = Math.floor(Math.random() * 6);
            if (colorRoll === 0) {
                // Cyan star
                starColor = `rgba(100, 255, 255, ${brightness})`;
            } else if (colorRoll === 1) {
                // Pink star
                starColor = `rgba(255, 180, 255, ${brightness})`;
            } else {
                // White star
                starColor = `rgba(255, 255, 255, ${brightness})`;
            }
            
            topCtx.fillStyle = starColor;
            
            // Draw star
            topCtx.beginPath();
            topCtx.arc(x, y, size/2, 0, Math.PI * 2);
            topCtx.fill();
            
            // Add glow to bigger stars
            if (size > 1.5) {
                const glow = topCtx.createRadialGradient(
                    x, y, 0, 
                    x, y, size * 3
                );
                glow.addColorStop(0, `rgba(255, 255, 255, ${brightness * 0.4})`);
                glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
                
                topCtx.fillStyle = glow;
                topCtx.beginPath();
                topCtx.arc(x, y, size * 3, 0, Math.PI * 2);
                topCtx.fill();
            }
        }
        
        // Add more vibrant nebulas
        for (let i = 0; i < 7; i++) {
            const x = Math.random() * 2048;
            const y = Math.random() * 2048;
            const size = 150 + Math.random() * 300;
            
            // Create nebula gradient with more intense colors
            const colors = [
                ['rgba(255, 0, 255, 0.15)', 'rgba(255, 0, 255, 0)'],  // Purple
                ['rgba(0, 255, 255, 0.15)', 'rgba(0, 255, 255, 0)'],  // Cyan
                ['rgba(255, 0, 128, 0.15)', 'rgba(255, 0, 128, 0)'],  // Pink
                ['rgba(128, 0, 255, 0.15)', 'rgba(128, 0, 255, 0)'],  // Violet
                ['rgba(0, 128, 255, 0.15)', 'rgba(0, 128, 255, 0)']   // Blue
            ];
            
            const colorSet = colors[Math.floor(Math.random() * colors.length)];
            const nebulaGradient = topCtx.createRadialGradient(x, y, 0, x, y, size);
            nebulaGradient.addColorStop(0, colorSet[0]);
            nebulaGradient.addColorStop(1, colorSet[1]);
            
            topCtx.fillStyle = nebulaGradient;
            topCtx.beginPath();
            topCtx.arc(x, y, size, 0, Math.PI * 2);
            topCtx.fill();
        }
        
        // Create the six face textures
        for (let i = 0; i < 6; i++) {
            let material;
            
            if (i === 2) { // Top - starfield
                const texture = new THREE.CanvasTexture(topCanvas);
                material = new THREE.MeshBasicMaterial({
                    map: texture,
                    side: THREE.BackSide,
                    fog: false
                });
            } else if (i === 3) { // Bottom - grid
                // Bottom will be handled separately with animated grid
                material = new THREE.MeshBasicMaterial({
                    color: 0x000011,
                    side: THREE.BackSide,
                    transparent: true,
                    opacity: 0.6, // Reduced opacity
                    fog: false
                });
            } else { // Sides - use horizon gradient
                const texture = new THREE.CanvasTexture(horizonCanvas);
                material = new THREE.MeshBasicMaterial({
                    map: texture,
                    side: THREE.BackSide,
                    fog: false
                });
            }
            
            skyMaterials.push(material);
        }
        
        // Create the main skybox cube
        const skyboxMesh = new THREE.Mesh(skyGeometry, skyMaterials);
        
        // Set scale to match camera.far for proper depth perception
        skyboxMesh.scale.set(
            SKYBOX_CONFIG.SCALE, 
            SKYBOX_CONFIG.SCALE, 
            SKYBOX_CONFIG.SCALE
        );
        
        this.skybox.add(skyboxMesh);
        
        // 2. Add sun with enhanced glow (now in world coordinates)
        const sunGeometry = new THREE.CircleGeometry(20, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({
            color: 0xff55ff,
            side: THREE.DoubleSide,
            fog: false
        });
        
        this.skyboxSun = new THREE.Mesh(sunGeometry, sunMaterial);
        // Fixed position to ensure consistent placement regardless of camera movement
        this.skyboxSun.position.set(
            SKYBOX_CONFIG.SUN_POSITION.x,
            SKYBOX_CONFIG.SUN_POSITION.y,
            SKYBOX_CONFIG.SUN_POSITION.z
        );
        this.skyboxSun.lookAt(0, 0, 0);
        
        const sunGlowGeometry = new THREE.CircleGeometry(35, 32);
        const sunGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7,
            fog: false
        });
        
        this.skyboxSunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
        this.skyboxSunGlow.position.copy(this.skyboxSun.position);
        this.skyboxSunGlow.lookAt(0, 0, 0);
        
        // Add sun and glow to world skybox container
        this.worldSkybox.add(this.skyboxSun);
        this.worldSkybox.add(this.skyboxSunGlow);
        
        // 3. Create improved horizon grid plane
        const gridGeometry = new THREE.PlaneGeometry(1000, 1000);
        const gridCanvas = document.createElement('canvas');
        gridCanvas.width = 2048;
        gridCanvas.height = 2048;
        const gridCtx = gridCanvas.getContext('2d');
        
        // Create grid texture with a darker background
        gridCtx.fillStyle = 'rgba(0, 0, 17, 0.9)';
        gridCtx.fillRect(0, 0, 2048, 2048);
        
        // Draw cyan grid lines with better perspective
        gridCtx.strokeStyle = 'rgba(0, 255, 255, 0.3)'; // Reduced opacity
        gridCtx.lineWidth = 2;
        
        // Vertical lines - more evenly spaced
        for (let x = 0; x <= 2048; x += 64) {
            gridCtx.beginPath();
            gridCtx.moveTo(x, 0);
            gridCtx.lineTo(x, 2048);
            gridCtx.stroke();
        }
        
        // Horizontal lines with improved perspective convergence
        for (let y = 0; y <= 2048; y += 64) {
            // Enhanced perspective calculation for more realistic grid
            const perspY = 2048 - Math.pow(2048 - y, 1.8) / Math.pow(2048, 0.8);
            
            gridCtx.beginPath();
            gridCtx.moveTo(0, perspY);
            gridCtx.lineTo(2048, perspY);
            gridCtx.stroke();
        }
        
        const gridTexture = new THREE.CanvasTexture(gridCanvas);
        const gridMaterial = new THREE.MeshBasicMaterial({
            map: gridTexture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: SKYBOX_CONFIG.GRID_OPACITY, // Reduced opacity
            fog: false
        });
        
        this.skyboxGrid = new THREE.Mesh(gridGeometry, gridMaterial);
        this.skyboxGrid.rotation.x = Math.PI / 2; // Make horizontal
        this.skyboxGrid.position.y = SKYBOX_CONFIG.HORIZON_HEIGHT; // Align with world ground plane
        
        // Place grid at a greater distance in world skybox for better horizon effect
        this.skyboxGrid.position.z = -800; // Further away for better horizon effect
        this.skyboxGrid.scale.set(3, 3, 1); // Enlarged to cover more of the visible area
        this.worldSkybox.add(this.skyboxGrid);
        
        // 4. Add improved CRT scanlines effect
        const scanlineGeometry = new THREE.PlaneGeometry(2, 0.5);
        const scanlineMaterial = new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            transparent: true,
            opacity: 0.02, // Very subtle
            fog: false
        });
        
        this.skyboxScanlines = new THREE.Mesh(scanlineGeometry, scanlineMaterial);
        this.skyboxScanlines.position.z = 0.9; // In front of everything else
        this.skybox.add(this.skyboxScanlines);
        
        // 5. Add enhanced distant mountains on the horizon
        const mountainGeometry = new THREE.PlaneGeometry(800, 120);
        const mountainCanvas = document.createElement('canvas');
        mountainCanvas.width = 2048;
        mountainCanvas.height = 512;
        const mountainCtx = mountainCanvas.getContext('2d');
        
        // Create mountain silhouettes
        mountainCtx.fillStyle = '#000022';
        mountainCtx.fillRect(0, 0, 2048, 512);
        
        // Create several mountain ridges with better colors
        const ridges = [
            { color: '#550055', height: 0.7 },
            { color: '#330044', height: 0.85 },
            { color: '#220033', height: 0.95 }
        ];
        
        ridges.forEach(ridge => {
            mountainCtx.fillStyle = ridge.color;
            mountainCtx.beginPath();
            mountainCtx.moveTo(0, 512);
            
            // Create jagged mountain peaks with smoother variation
            let lastHeight = 0;
            for (let x = 0; x <= 2048; x += 20) {
                // Create smoother transitions between points
                const heightVariation = Math.random() * 100 * ridge.height;
                // Blend with previous height for smoother mountains
                const height = lastHeight * 0.7 + heightVariation * 0.3;
                lastHeight = height;
                
                mountainCtx.lineTo(x, 512 - height);
            }
            
            mountainCtx.lineTo(2048, 512);
            mountainCtx.closePath();
            mountainCtx.fill();
            
            // Add grid lines to mountains for cyber effect - more subtle
            mountainCtx.strokeStyle = 'rgba(255, 0, 255, 0.15)';
            mountainCtx.lineWidth = 1;
            
            for (let x = 0; x < 2048; x += 100) {
                mountainCtx.beginPath();
                mountainCtx.moveTo(x, 256);
                mountainCtx.lineTo(x, 512);
                mountainCtx.stroke();
            }
        });
        
        const mountainTexture = new THREE.CanvasTexture(mountainCanvas);
        const mountainMaterial = new THREE.MeshBasicMaterial({
            map: mountainTexture,
            transparent: true,
            opacity: 0.9,
            fog: false,
            side: THREE.DoubleSide
        });
        
        const mountains = new THREE.Mesh(mountainGeometry, mountainMaterial);
        mountains.position.y = SKYBOX_CONFIG.HORIZON_HEIGHT + 80; // Higher above horizon for better visibility
        mountains.position.z = -SKYBOX_CONFIG.MOUNTAINS_DISTANCE; // Much more distant mountains
        mountains.scale.set(3, 2, 1); // Scale up to make them more imposing
        this.worldSkybox.add(mountains);
        
        // 6. Add a few floating objects in the distance
        this.addFloatingObjects();
        
        // Add camera-relative skybox to camera
        this.camera.add(this.skybox);
        
        // Make sure camera is added to scene
        if (!this.scene.getObjectById(this.camera.id)) {
            this.scene.add(this.camera);
        }
        
        return this.skybox;
    }
    
    /**
     * Add enhanced floating objects to the skybox
     */
    addFloatingObjects() {
        const addFloatingObject = (x, y, z, size, color, shape = 'cube') => {
            let geometry;
            
            // Create different geometric shapes for variety
            if (shape === 'cube') {
                geometry = new THREE.BoxGeometry(size, size, size);
            } else if (shape === 'pyramid') {
                geometry = new THREE.ConeGeometry(size/1.5, size, 4);
            } else if (shape === 'sphere') {
                geometry = new THREE.SphereGeometry(size/1.8, 8, 8);
            } else if (shape === 'diamond') {
                geometry = new THREE.OctahedronGeometry(size/1.5);
            }
            
            const material = new THREE.MeshBasicMaterial({
                color: color,
                wireframe: true,
                fog: false
            });
            
            const object = new THREE.Mesh(geometry, material);
            object.position.set(x, y, z);
            object.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            
            // Store original position and rotation for animation
            object.userData = {
                originalY: y,
                originalX: x,
                rotationSpeed: {
                    x: (Math.random() - 0.5) * 0.001,
                    y: (Math.random() - 0.5) * 0.001,
                    z: (Math.random() - 0.5) * 0.001
                },
                floatSpeed: Math.random() * 0.0008 + 0.0003
            };
            
            // Add to world skybox to keep them at a fixed distance
            this.worldSkybox.add(object);
            return object;
        };
        
        // Add more varied floating objects at fixed world distances
        this.skyboxObjects = [];
        
        // Create objects with different shapes and colors
        const shapes = ['cube', 'pyramid', 'sphere', 'diamond'];
        const colors = [0xff00ff, 0x00ffff, 0xff55aa, 0xaa55ff, 0x5555ff];
        
        // Add more objects in 3D space for greater depth perception
        // Three layers of objects at different distances
        const distanceLayers = [
            SKYBOX_CONFIG.FLOATING_OBJECTS_DISTANCE - 300,
            SKYBOX_CONFIG.FLOATING_OBJECTS_DISTANCE,
            SKYBOX_CONFIG.FLOATING_OBJECTS_DISTANCE + 200
        ];
        
        // Add more objects for greater visual interest
        for (let i = 0; i < 12; i++) {
            const angle = i * Math.PI / 6; // Distribute around a circle (more objects)
            // Pick a distance layer - more objects at the back for parallax effect
            const distanceLayer = distanceLayers[Math.floor(Math.random() * distanceLayers.length)];
            const dist = distanceLayer + (Math.random() * 100 - 50);
            const x = Math.sin(angle) * dist;
            const z = -Math.cos(angle) * dist; // Negative to place in front
            const y = 100 + Math.random() * 200; // Higher up in the sky
            
            // Scale size based on distance for proper perspective
            const distanceRatio = dist / SKYBOX_CONFIG.FLOATING_OBJECTS_DISTANCE;
            const size = (20 + Math.random() * 20) * distanceRatio;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const shape = shapes[Math.floor(Math.random() * shapes.length)];
            
            this.skyboxObjects.push(addFloatingObject(x, y, z, size, color, shape));
        }
    }
    
    /**
     * Update skybox - now with improved handling of world position vs camera
     */
    update() {
        if (this.skybox) {
            // Only apply fixed scale to camera-relative skybox elements
            this.skybox.scale.set(1, 1, 1);
            
            // Update worldSkybox position to follow camera position with adjustments
            const cameraWorldPos = new THREE.Vector3();
            this.camera.getWorldPosition(cameraWorldPos);
            
            // Get camera direction to position horizon correctly
            const cameraDirection = new THREE.Vector3(0, 0, -1);
            cameraDirection.applyQuaternion(this.camera.quaternion);
            
            // Calculate appropriate Y position - follow camera height but with vertical offset
            // This ensures the horizon stays properly positioned relative to the camera
            const worldYPosition = cameraWorldPos.y + SKYBOX_CONFIG.VERTICAL_OFFSET;
            
            // Follow camera position but with adjusted Y
            this.worldSkybox.position.x = cameraWorldPos.x;
            this.worldSkybox.position.y = worldYPosition;
            this.worldSkybox.position.z = cameraWorldPos.z;
            
            // Very slow rotation speed for subtle effects
            this.skyboxGrid.rotation.y -= SKYBOX_CONFIG.ROTATION_SPEED;
            this.skyboxSun.rotation.z += SKYBOX_CONFIG.ROTATION_SPEED * 5;
            
            // Pulse the sun glow
            const pulseAmount = Math.sin(Date.now() * 0.001) * 0.2 + 0.8;
            this.skyboxSunGlow.material.opacity = 0.7 * pulseAmount;
            this.skyboxSunGlow.scale.set(1 + pulseAmount * 0.2, 1 + pulseAmount * 0.2, 1);
            
            // Animate scanlines
            if (this.skyboxScanlines) {
                // Slower scanline movement
                this.skyboxScanlines.position.y = (Date.now() % 10000) / 10000 - 0.5;
            }
            
            // Animate floating objects with improved movement
            if (this.skyboxObjects) {
                this.skyboxObjects.forEach(obj => {
                    // Rotate object
                    obj.rotation.x += obj.userData.rotationSpeed.x;
                    obj.rotation.y += obj.userData.rotationSpeed.y;
                    obj.rotation.z += obj.userData.rotationSpeed.z;
                    
                    // Float up and down + slight horizontal sway
                    const floatOffsetY = Math.sin(Date.now() * obj.userData.floatSpeed) * 5;
                    const floatOffsetX = Math.sin(Date.now() * obj.userData.floatSpeed * 0.7) * 3;
                    
                    obj.position.y = obj.userData.originalY + floatOffsetY;
                    obj.position.x = obj.userData.originalX + floatOffsetX;
                });
            }
        }
    }
}

// Export the skybox class
export { Skybox };