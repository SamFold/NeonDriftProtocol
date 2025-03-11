/**
 * Renderer Module for Neon Drift Protocol
 * 
 * Handles all visual aspects including:
 * - Scene setup and camera management
 * - Lighting and visual effects
 * - Vehicle model creation
 * - UI element updates
 */

// Import Skybox module
import { Skybox } from './skybox.js';

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
        this.skybox = null;
    }
    
    /**
     * Initialize the renderer and scene
     */
    init() {
        this.createScene();
        this.createLights();
        this.createSkybox();
        this.setupEventListeners();
        
        return { scene: this.scene, camera: this.camera, renderer: this.renderer };
    }
    
    /**
     * Create the Three.js scene
     */
    createScene() {
        // Create scene
        this.scene = new THREE.Scene();
        
        // Enhanced fog for better depth perception and skybox integration
        // Use a purple fog that gradually transitions to the horizon colors
        // Reduced density for greater view distance and better visibility of distant elements
        this.scene.fog = new THREE.FogExp2(0x330066, 0.0007); // Much less dense fog to match larger skybox scale
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            CAMERA_SETTINGS.fov, 
            window.innerWidth / window.innerHeight, 
            CAMERA_SETTINGS.near, 
            CAMERA_SETTINGS.far
        );
        this.camera.position.set(0, CAMERA_SETTINGS.baseHeight, -CAMERA_SETTINGS.baseDistance);
        this.camera.lookAt(0, 1, 30);
        
        // Create renderer with enhanced settings
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true  // Enable alpha for better blending effects
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000011); // Deep blue-black background
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);
    }
    
    /**
     * Create enhanced lighting for the scene that complements the skybox
     */
    createLights() {
        // Stronger ambient light with purple/blue tint for vaporwave atmosphere
        const ambientLight = new THREE.AmbientLight(0x443366, 0.7);
        this.scene.add(ambientLight);
        
        // Main directional light (enhanced sunset effect)
        const sunLight = new THREE.DirectionalLight(0xff66aa, 1.2);
        sunLight.position.set(0, 40, -100); // Align with skybox sun position
        sunLight.castShadow = true;
        
        // Improved shadow quality
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 500;
        sunLight.shadow.bias = -0.0005;
        
        this.scene.add(sunLight);
        
        // Add enhanced point lights for neon effect
        // Magenta light (stronger now)
        const purpleLight = new THREE.PointLight(0xff33ff, 1.2, 120);
        purpleLight.position.set(0, 15, 60);
        this.scene.add(purpleLight);
        
        // Blue light with wider radius
        const blueLight = new THREE.PointLight(0x3333ff, 1, 150);
        blueLight.position.set(-25, 8, 20);
        this.scene.add(blueLight);
        
        // Cyan light with wider radius
        const cyanLight = new THREE.PointLight(0x00ffff, 1, 150);
        cyanLight.position.set(25, 8, 20);
        this.scene.add(cyanLight);
        
        // Add an extra pulsing light for dynamic atmosphere
        this.pulsingLight = new THREE.PointLight(0xff00aa, 0.8, 100);
        this.pulsingLight.position.set(0, 20, -40);
        this.scene.add(this.pulsingLight);
        
        // Store the time of creation for animations
        this.lightsCreatedTime = Date.now();
    }
    
    /**
     * Create skybox using the Skybox module
     */
    createSkybox() {
        // Create skybox instance and initialize it
        this.skybox = new Skybox(this.camera, this.scene);
        this.skybox.create();
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
     * Render the current scene with enhanced lighting effects
     */
    render() {
        // Update skybox with enhanced effects
        if (this.skybox) {
            this.skybox.update();
        }
        
        // Animate the pulsing light
        if (this.pulsingLight) {
            const timeDiff = (Date.now() - this.lightsCreatedTime) * 0.001; // Convert to seconds
            
            // Create a pulsing effect
            const pulseIntensity = 0.7 + Math.sin(timeDiff * 1.5) * 0.3;
            this.pulsingLight.intensity = pulseIntensity;
            
            // Subtly change color over time for dynamic feel
            const hue = (timeDiff * 0.05) % 1;
            const color = new THREE.Color().setHSL(hue, 1, 0.5);
            this.pulsingLight.color = color;
        }
        
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