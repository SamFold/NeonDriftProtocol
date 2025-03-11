/**
 * Main Game Module for Neon Drift Protocol
 * 
 * Coordinates all game systems and runs the main game loop.
 */

import { Vehicle, MAX_SPEED } from './modules/physics.js';
import { GameWorld, ROAD_LENGTH, LANE_WIDTH } from './modules/world.js';
import { GameRenderer } from './modules/renderer.js';
import { AudioSystem } from './modules/audio.js';
import { InputHandler } from './modules/input.js';

// Main game class
class Game {
    constructor() {
        // Game state
        this.score = 0;
        this.clock = new THREE.Clock();
        this.gameActive = false;
        this.debugMode = true;  // Enable debug mode by default for troubleshooting
        
        // Core systems
        this.input = new InputHandler();
        this.renderer = new GameRenderer();
        this.audio = new AudioSystem();
        
        // Game objects
        this.vehicle = null;
        this.world = null;
        
    }
    
    /**
     * Initialize the game
     */
    init() {
        
        // Initialize renderer first to create scene
        const { scene, camera, renderer } = this.renderer.init();
        this.scene = scene;
        
        // Initialize other systems
        this.input.init();
        this.audio.init();
        
        // Create game world with reference to scene
        this.world = new GameWorld(scene);
        this.world.init();
        
        // CRITICAL FIX: Ensure road is initialized properly by forcing a position check
        // This fixes the "falling off the end of the road" issue at first game start
        if (this.world.roadSegments.length > 0) {

            
            // Force road position check to make sure the road extends far enough
            this.world.recycleRoadSegments(0);
        } else {
        }
        
        // Create vehicle
        this.createVehicle();
        
        // Set up event handlers
        this.setupEventHandlers();
        
        // Start animation loop
        this.animate();
        
        return this;
    }
    
    /**
     * Create the player vehicle
     */
    createVehicle() {
        // Create physics object
        this.vehicle = new Vehicle();
        
        // Create vehicle mesh
        const { mesh, frontWheels, rearWheels } = this.renderer.createVehicleMesh();
        
        // Connect physics to mesh
        this.vehicle.setMesh(mesh, frontWheels, rearWheels);
        
        // Position the vehicle at the starting point
        // Slightly elevated to account for suspension settling
        this.vehicle.position.set(0, 1.0, 0);
        
        // Set initial wheel positions
        this.vehicle.updateVehicleVectors();
        
        // Add to scene
        this.scene.add(mesh);
    }
    
    /**
     * Setup event handlers for game events
     */
    setupEventHandlers() {
        // Handle game start
        this.input.on('gameStart', () => {
            this.startGame();
        });
        
        // Handle debug mode toggle
        this.input.on('debugToggle', (enabled) => {
            this.debugMode = enabled;
            this.toggleDebugVisuals(enabled);
        });
        
        // Handle turn notifications from world
        this.world.events.on('turnNotification', (direction) => {
            this.renderer.getEffects().showTurnNotification(direction);
        });
    }
    
    /**
     * Toggle debug visualization elements
     */
    toggleDebugVisuals(enabled) {
        if (!this.vehicle || !this.vehicle.mesh) return;
        
        // Find all debug indicators and toggle their visibility
        this.vehicle.mesh.traverse(object => {
            if (object.name === "debugIndicator") {
                object.visible = enabled;
            }
        });
    }
    
    /**
     * Start the game
     */
    startGame() {
        if (this.gameActive) return;
        
        this.gameActive = true;
        this.clock.start();
        
        // Resume audio context (must be done after user interaction)
        this.audio.resume().then(() => {
            // Play startup sound
            this.audio.playStartupSound();
            
            // Start background music
            this.audio.startBackgroundMusic();
        });
        
        // console.log('Game started!');
    }
    
    /**
     * Stop the game
     */
    stopGame() {
        this.gameActive = false;
        this.clock.stop();
        this.audio.stopAll();
    }
    
    /**
     * Main update loop
     */
    update(deltaTime) {
        if (!this.gameActive) return;
        
        // Get current game time
        const gameTime = this.clock.getElapsedTime();
        
        // Track update count for initial game stability
        if (!this.updateCount) {
            this.updateCount = 0;
        }
        this.updateCount++;
        
        // CRITICAL: First-frame road safety check to prevent initial road end issue
        if (this.updateCount === 1) {
            // console.log("GAME FIRST UPDATE - Ensuring road is ready");
            
            // Sanity check: ensure road exists and extends far enough
            if (this.world.roadSegments.length > 0) {
                const roadAheadDistance = this.world.roadZMax;
                
                // Force position check with player at position 0
                if (roadAheadDistance < 10000) {
                    this.world.recycleRoadSegments(0);
                }
            } else {
            }
        }
        
        // Get current input state
        const inputState = this.input.getInputState();
        
        // Get world state for physics calculations
        const worldState = this.world.getWorldState();
        
        // Add world state to input state so vehicle can access road information
        inputState.world = worldState;
        // IMPORTANT: Also provide access to road segments for proper collision detection
        inputState.world.roadSegments = this.world.roadSegments;
        
        // Update vehicle physics
        this.vehicle.update(inputState, deltaTime, worldState);
        
        // Only check this occasionally during the first minute to improve performance
        const isFirstMinute = gameTime < 60;
        if (isFirstMinute && this.vehicle.position && this.updateCount % 30 === 0) {
            const roadAheadDistance = this.world.roadZMax - this.vehicle.position.z;
            
            // Emergency fix only if road is actually running out
            if (roadAheadDistance < 500) {
                // Force road regeneration but only once
                this.world.recycleRoadSegments(this.vehicle.position.z);
            }
        }
        
        // Update vehicle visual effects (with time for bouncing)
        this.vehicle.updateVisuals(deltaTime, gameTime);
        
        // Update vehicle mesh transform
        this.vehicle.updateMeshTransform();
        
        // Update world with vehicle data
        this.world.update(
            deltaTime, 
            this.vehicle.speed, 
            this.vehicle.position,
            gameTime // This will be passed as currentTime to updateRoad
        );
        
        // IMPORTANT: Make sure the vehicle has access to the latest world state
        // This fixes the synchronization issue between road curves and physics
        this.vehicle.input.world = this.world.getWorldState();
        
        // Update camera to follow vehicle
        this.renderer.updateCamera(
            this.vehicle.position, 
            this.vehicle.direction, 
            this.vehicle.speed,
            worldState.roadCurve
        );
        
        // Update visual effects
        this.renderer.getEffects().setOffRoadEffect(this.vehicle.isOffRoad);
        
        // Update audio based on game state
        this.audio.updateBeat(this.vehicle.speed, MAX_SPEED);
        
        // Update UI elements
        this.renderer.getEffects().updateUI(this.score, this.vehicle.speed);
        
        // Check for collisions
        this.checkCollisions();
    }
    
    /**
     * Check for collisions
     */
    checkCollisions() {
        // Get vehicle bounding box
        const vehicleBox = this.vehicle.getBoundingBox();
        if (!vehicleBox) return;
        
        // Check collisions with world objects
        const collisions = this.world.checkCollisions(vehicleBox);
        
        // Handle obstacle collisions
        if (collisions.obstacles.length > 0) {
            const result = this.vehicle.collideWithObstacle();
            
            // Play sound effect
            this.audio.playErrorSound();
            
            // Apply visual effects
            this.renderer.getEffects().applyGlitchEffect(true);
            
            // Flash the screen
            document.body.style.backgroundColor = '#ff0000';
            setTimeout(() => {
                document.body.style.backgroundColor = '#000000';
            }, 100);
            
            // Reduce score
            this.score = Math.max(this.score - 50, 0);
        }
        
        // Handle collectible collisions
        if (collisions.collectibles.length > 0) {
            // Play collect sound
            this.audio.playCollectSound();
            
            // Apply visual effects
            this.renderer.getEffects().applyGlitchEffect(false);
            
            // Increase score
            this.score += 100;
            
            // Speed boost
            this.vehicle.speed = Math.min(this.vehicle.speed + 2, MAX_SPEED);
        }
    }
    
    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        const deltaTime = this.clock.getDelta();
        
        try {
            this.update(deltaTime);
            
            // Render the scene
            this.renderer.render();
            
            // Apply random VHS glitch effect
            if (this.gameActive && Math.random() < 0.01) {
                this.renderer.getEffects().applyGlitchEffect();
            }
        } catch (e) {
            // Catch any errors to prevent game from breaking completely
            console.error("Game error:", e);
        }
    }
}

// Create and initialize game when page loads
window.addEventListener('load', () => {
    // Create and initialize game
    window.game = new Game().init();
});