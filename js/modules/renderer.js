/**
 * Renderer Module for Neon Drift Protocol
 * 
 * Handles all visual aspects including:
 * - Scene setup and camera management
 * - Lighting and visual effects
 * - Vehicle model creation
 * - UI element updates
 */

// Camera settings
const CAMERA_SETTINGS = {
    fov: 75,
    near: 0.1,
    far: 2000,
    baseHeight: 10,
    baseDistance: 20
};

// Visual effects
class VisualEffects {
    constructor() {
        this.vhsOverlay = document.getElementById('vhs-overlay');
        this.glitchActive = false;
        this.glitchTimeout = null;
    }
    
    /**
     * Apply VHS glitch effect
     */
    applyGlitchEffect(heavy = false) {
        const glitchDuration = heavy ? 500 : 200;
        
        // Clear any existing timeout
        if (this.glitchTimeout) {
            clearTimeout(this.glitchTimeout);
        }
        
        // Add glitch class to body
        document.body.classList.add('glitch');
        this.glitchActive = true;
        
        // Enhance VHS overlay effect
        if (this.vhsOverlay) {
            // Make VHS effect more visible during glitch
            this.vhsOverlay.style.opacity = heavy ? '0.7' : '0.5';
            
            // Add slight position shift to VHS overlay for extra glitchiness
            this.vhsOverlay.style.transform = `translateX(${(Math.random() - 0.5) * 10}px)`;
            
            // Add scanlines effect
            if (heavy) {
                this.vhsOverlay.style.backgroundSize = '100% 4px';
            }
        }
        
        // Remove the effect after a short time
        this.glitchTimeout = setTimeout(() => {
            document.body.classList.remove('glitch');
            this.glitchActive = false;
            
            // Reset VHS overlay
            if (this.vhsOverlay) {
                this.vhsOverlay.style.opacity = '';
                this.vhsOverlay.style.transform = '';
                this.vhsOverlay.style.backgroundSize = '';
            }
        }, glitchDuration);
        
        return this.glitchActive;
    }
    
    /**
     * Handle off-road visual effects
     */
    setOffRoadEffect(isOffRoad) {
        if (isOffRoad) {
            document.body.classList.add('off-road');
            
            // Randomly apply minor glitches when off-road
            if (Math.random() < 0.05) {
                this.applyGlitchEffect(false);
            }
        } else {
            document.body.classList.remove('off-road');
        }
    }
    
    /**
     * Wall collision effect
     */
    triggerWallHitEffect() {
        document.body.classList.add('wall-hit');
        this.applyGlitchEffect(true);
        
        setTimeout(() => {
            document.body.classList.remove('wall-hit');
        }, 500);
    }
    
    /**
     * Show turn notification
     */
    showTurnNotification(direction) {
        const turnMessage = document.getElementById('turnMessage');
        if (!turnMessage) return;
        
        turnMessage.textContent = `TURN ${direction}`;
        turnMessage.style.opacity = 1;
        
        // Fade out the message after 2 seconds
        setTimeout(() => {
            turnMessage.style.opacity = 0;
        }, 2000);
    }
    
    /**
     * Update UI score and speed display
     */
    updateUI(score, speed) {
        // Update score display
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = `SCORE: ${score}`;
        }
        
        // Update speedometer with visual indicator
        const speedElement = document.getElementById('speedometer');
        if (speedElement) {
            // Convert speed to positive value and scale appropriately for display
            const absSpeed = Math.abs(speed);
            
            // Scale to percentage of MAX_SPEED (now 200)
            const speedPercentage = Math.floor((absSpeed / 200) * 100);
            
            // Displayed speed value - divide by 2 to make numbers more reasonable 
            // to read but still increasing with actual speed
            const displaySpeed = Math.floor(absSpeed * 0.5);
            
            // Create speed bar with sensible limits
            let speedBarCount = Math.floor(speedPercentage / 10);
            // Ensure it's always a non-negative number to avoid .repeat() errors
            speedBarCount = Math.max(0, Math.min(10, speedBarCount));
            const speedBar = '|'.repeat(speedBarCount);
            
            // Use appropriate color based on speed percentage
            let barColor = '#00ffff';  // Default cyan color
            if (speedPercentage > 80) {
                barColor = '#ff0000';  // Red for very high speeds
            } else if (speedPercentage > 60) {
                barColor = '#ffff00';  // Yellow for fast speeds
            }
            
            // Update HTML content
            speedElement.innerHTML = `SPEED: ${displaySpeed} MB/s<br><span style="color: ${barColor}">${speedBar}</span>`;
        }
    }
}

// Main renderer class
class GameRenderer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.effects = new VisualEffects();
    }
    
    /**
     * Initialize the renderer and scene
     */
    init() {
        this.createScene();
        this.createLights();
        this.setupEventListeners();
        
        return { scene: this.scene, camera: this.camera, renderer: this.renderer };
    }
    
    /**
     * Create the Three.js scene
     */
    createScene() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x110022, 0.0025);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            CAMERA_SETTINGS.fov, 
            window.innerWidth / window.innerHeight, 
            CAMERA_SETTINGS.near, 
            CAMERA_SETTINGS.far
        );
        this.camera.position.set(0, CAMERA_SETTINGS.baseHeight, -CAMERA_SETTINGS.baseDistance);
        this.camera.lookAt(0, 1, 30);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);
    }
    
    /**
     * Create lighting for the scene
     */
    createLights() {
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0x333333);
        this.scene.add(ambientLight);
        
        // Main directional light (sunset effect)
        const sunLight = new THREE.DirectionalLight(0xff5588, 1);
        sunLight.position.set(10, 30, -10);
        sunLight.castShadow = true;
        this.scene.add(sunLight);
        
        // Add point lights for neon effect
        const purpleLight = new THREE.PointLight(0xcc33ff, 1, 100);
        purpleLight.position.set(0, 10, 50);
        this.scene.add(purpleLight);
        
        const blueLight = new THREE.PointLight(0x3333ff, 1, 100);
        blueLight.position.set(-20, 5, 20);
        this.scene.add(blueLight);
        
        const cyanLight = new THREE.PointLight(0x00ffff, 1, 100);
        cyanLight.position.set(20, 5, 20);
        this.scene.add(cyanLight);
    }
    
    /**
     * Handle window resize events
     */
    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    /**
     * Create the player vehicle mesh
     */
    createVehicleMesh() {
        // Create a vehicle group
        const vehicleGroup = new THREE.Group();
        const frontWheels = [];
        const rearWheels = [];
        
        // Vehicle body - proper shape to make front/back obvious
        const bodyGeometry = new THREE.BoxGeometry(4, 1, 8);
        const bodyMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ffff,
            wireframe: true
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.5;
        vehicleGroup.add(body);
        
        // Add a pointed front to make car direction obvious
        const noseGeometry = new THREE.ConeGeometry(2, 2, 4);
        const noseMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            wireframe: true
        });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        
        // Position the nose at the FRONT of the car (+Z)
        nose.position.set(0, 0.5, 4.5);
        nose.rotation.x = Math.PI / 2; // Rotate to point forward
        vehicleGroup.add(nose);
        
        // Cockpit - positioned toward the front
        const cockpitGeometry = new THREE.BoxGeometry(2, 1, 3);
        const cockpitMaterial = new THREE.MeshBasicMaterial({
            color: 0xff00aa,
            transparent: true,
            opacity: 0.7
        });
        const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
        cockpit.position.set(0, 1.5, 1.5); // Moved forward
        vehicleGroup.add(cockpit);
        
        // Wheels
        const wheelGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.5, 8);
        const wheelMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff });
        
        // Wheel positions - Z+ is forward
        const wheelPositions = [
            // Front wheels (the steering wheels)
            { x: -2, y: 0, z: 3, isFront: true, name: "front-left" },
            { x: 2, y: 0, z: 3, isFront: true, name: "front-right" },
            // Rear wheels (the driving wheels)
            { x: -2, y: 0, z: -3.5, isFront: false, name: "rear-left" },
            { x: 2, y: 0, z: -3.5, isFront: false, name: "rear-right" }
        ];
        
        // Create wheels
        wheelPositions.forEach((pos) => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            
            // Give the wheel a name for identification
            wheel.name = pos.name;
            
            // Set position and initial rotation
            wheel.position.set(pos.x, pos.y, pos.z);
            wheel.rotation.z = Math.PI / 2;  // Rotate to make cylinder into a wheel
            
            // Add to appropriate array
            if (pos.isFront) {
                frontWheels.push(wheel);
            } else {
                rearWheels.push(wheel);
            }
            
            // Add to vehicle group
            vehicleGroup.add(wheel);
        });
        
        // Glow effect
        const glowGeometry = new THREE.BoxGeometry(4.5, 1.5, 8.5);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.y = 0.5;
        vehicleGroup.add(glow);
        
        return { 
            mesh: vehicleGroup, 
            frontWheels: frontWheels, 
            rearWheels: rearWheels 
        };
    }
    
    /**
     * Update camera position to follow vehicle
     */
    updateCamera(vehiclePosition, vehicleDirection, vehicleSpeed, roadCurve) {
        // Convert speed to 0-1 range for camera adjustments
        // Using MAX_SPEED of 200 instead of 80 now
        const normalizedSpeed = Math.min(Math.abs(vehicleSpeed) / 200, 1);
        
        // Camera distance scales with speed - farther back at higher speeds
        const cameraDistance = CAMERA_SETTINGS.baseDistance + normalizedSpeed * 15;
        
        // Revert to a more reasonable camera height that shows the car properly
        const cameraHeight = CAMERA_SETTINGS.baseHeight + 5 + normalizedSpeed * 8;
        
        // Create vector pointing behind the car (opposite of direction)
        const behind = vehicleDirection.clone().multiplyScalar(-cameraDistance);
        
        // Add slight offset vertically to look down on car
        behind.y += cameraHeight;
        
        // Calculate target camera position
        const targetCameraPos = new THREE.Vector3();
        targetCameraPos.copy(vehiclePosition).add(behind);
        
        // Add curve influence to enhance the feeling of curves
        // This shifts the camera to the outside of turns for a more dynamic view
        const rightVec = new THREE.Vector3().crossVectors(vehicleDirection, new THREE.Vector3(0, 1, 0)).normalize();
        targetCameraPos.add(rightVec.multiplyScalar(roadCurve * 5 * normalizedSpeed));
        
        // Smoothly move camera toward target position - faster transitions at higher speeds
        // but not too fast to keep camera stable at high speeds
        const positionLerp = Math.max(0.05, Math.min(0.15, normalizedSpeed * 0.12));
        this.camera.position.lerp(targetCameraPos, positionLerp);
        
        // Make the camera tilt slightly in the direction of turns
        // More pronounced tilt at higher speeds
        const targetTilt = -roadCurve * 0.15 * (1 + normalizedSpeed);
        this.camera.rotation.z = THREE.MathUtils.lerp(
            this.camera.rotation.z,
            targetTilt,
            0.1
        );
        
        // More reasonable look-ahead distance so we can see the car and the road
        const lookAheadDistance = 40 + 80 * normalizedSpeed;
        const ahead = vehicleDirection.clone().multiplyScalar(lookAheadDistance);
        
        // Create a look target that's ahead of the vehicle
        // Add slight vertical offset to keep camera tilted down
        const lookTarget = new THREE.Vector3();
        lookTarget.copy(vehiclePosition).add(ahead);
        lookTarget.y = Math.max(0, vehiclePosition.y - 3); // Look slightly downward
        
        // Make camera look at target point
        this.camera.lookAt(lookTarget);
    }
    
    /**
     * Render the current scene
     */
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * Get the visual effects manager
     */
    getEffects() {
        return this.effects;
    }
}

// Export the renderer class
export { GameRenderer };