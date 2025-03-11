/**
 * World Module for Neon Drift Protocol
 * 
 * Handles all environment aspects including:
 * - Road generation and movement
 * - Obstacles and collectibles
 * - Decorative elements
 * - World events and collision detection
 */
//Note: This needs massive refactoring, there is a ton of un-used or non working stuff here. 

// World constants
const ROAD_SEGMENTS = 200; // DOUBLED: More segments for smoother curves
const ROAD_LENGTH = 2000;
const SEGMENT_LENGTH = ROAD_LENGTH / ROAD_SEGMENTS;
const LANE_WIDTH = 10;

// Road states
const ROAD_STATE = {
    STRAIGHT: 'straight',         // Road is in a steady state (straight OR curved)
    TURNING_LEFT: 'turning_left', // Road is curving to the left
    TURNING_RIGHT: 'turning_right' // Road is curving to the right
};

// Event System
class EventSystem {
    constructor() {
        this.callbacks = {};
    }
    
    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }
    
    off(event, callback) {
        if (!this.callbacks[event]) return;
        this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
    }
    
    trigger(event, data) {
        if (!this.callbacks[event]) return;
        this.callbacks[event].forEach(callback => callback(data));
    }
}

// World class
class GameWorld {
    constructor(scene) {
        // References and state
        this.scene = scene;
        this.events = new EventSystem();
        
        // Road state
        this.road = new THREE.Object3D();
        this.roadSegments = [];
        this.roadOffset = 0;
        
        // New road curve state machine
        this.roadState = ROAD_STATE.STRAIGHT;
        this.roadCurve = 0;                // Current curve amount
        this.targetRoadCurve = 0;          // Target curve we're transitioning to
        this.curveTransitionProgress = 0;  // How far through the transition we are (0-1)
        this.curveTransitionSpeed = 0.03;  // INCREASED 6x: Very fast transitions to make curves obvious
        this.straightSegmentCounter = 0;   // Counts straight segments to determine when to curve
        this.minStraightSegments = 50;     // Minimum straight segments before a turn can occur
        this.currentTurnDirection = 0;     // Current turn direction (negative=left, positive=right)
        
        // Road path control points (for smooth curves)
        this.roadPath = [];           // Array of control points for the road
        this.roadPathDistance = 200;  // Distance between control points
        
        // Objects
        this.obstacles = [];
        this.collectibles = [];
        this.decorations = [];
        
        // Timing
        this.lastObstacleTime = 0;
        this.lastCollectibleTime = 0;
        this.nextTurnTime = 5;        // Time until next turn (seconds)
        
        // New properties to manage obstacles better
        this.lastObstaclePositions = []; // Track recent obstacle positions to prevent clustering
        this.maxObstacleCount = 6;       // Maximum number of obstacles allowed at once
        
        // Performance tracking
        this.lastRecycleFrame = 0;
        this.updateCount = 0;
        this.firstRunComplete = false;
    }
    
    /**
     * Initialize the world
     */
    init() {
        
        // Create basic elements
        this.createRoad();
        this.createTerrain();
        // Skybox is now handled by the renderer in a separate module
        this.createDecorations();
        
        // Add main container to scene
        this.scene.add(this.road);
        
        // Set a longer timer for the first turn to give player time to adjust
        this.nextTurnTime = 5.0;
        
        // Initialize player position for reference
        this.playerZPosition = 0;
        
    }
    
    /**
     * Create road segments and markings
     */
    createRoad() {
        // Road material with neon lines
        const roadMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.8
        });
        
        // Create a reasonable number of initial road segments
        // We need enough for a continuous track but not so many that it causes performance issues
        const initialSegments = ROAD_SEGMENTS * 5; // 1000 segments is plenty
        
        
        // Create road segments spanning a reasonable distance
        for (let i = 0; i < initialSegments; i++) {
            const segmentGeometry = new THREE.PlaneGeometry(LANE_WIDTH * 3, SEGMENT_LENGTH);
            const segment = new THREE.Mesh(segmentGeometry, roadMaterial);
            segment.rotation.x = -Math.PI / 2;
            segment.position.z = i * SEGMENT_LENGTH;
            
            // Add metadata for proper positioning and looping
            segment.userData = {
                isRoadSegment: true,
                originalZ: i * SEGMENT_LENGTH,
                index: i
            };
            
            // Explicitly set the X position according to track layout
            // Calculate track pattern position
            const patternPosition = (i * SEGMENT_LENGTH % ROAD_LENGTH) / ROAD_LENGTH;
            
            // Use the track definition from positionRoadSegment
            const trackPoints = [
                { pos: 0.0,  turn: 0 },    // Start straight
                { pos: 0.15, turn: -1.0 }, // Hard left turn
                { pos: 0.3,  turn: 0 },    // Back to straight
                { pos: 0.35, turn: 0 },    // Still straight
                { pos: 0.5,  turn: 1.0 },  // Hard right turn
                { pos: 0.65, turn: 0 },    // Back to straight
                { pos: 0.7,  turn: 0 },    // Still straight
                { pos: 0.85, turn: -0.6 }, // Medium left turn
                { pos: 1.0,  turn: 0 }     // Back to straight
            ];
            
            // Find the two control points we're between
            let p1 = trackPoints[0];
            let p2 = trackPoints[trackPoints.length - 1];
            
            for (let j = 0; j < trackPoints.length - 1; j++) {
                if (patternPosition >= trackPoints[j].pos && patternPosition < trackPoints[j+1].pos) {
                    p1 = trackPoints[j];
                    p2 = trackPoints[j+1];
                    break;
                }
            }
            
            // Calculate turn value
            const segmentProgress = (patternPosition - p1.pos) / (p2.pos - p1.pos);
            const easeSegmentProgress = this.cubicEase(segmentProgress);
            const turnValue = p1.turn + (p2.turn - p1.turn) * easeSegmentProgress;
            
            // Apply X offset directly based on turn value
            const xOffset = turnValue * LANE_WIDTH * 5.0;
            segment.position.x = xOffset;
            
            this.road.add(segment);
            this.roadSegments.push(segment);
            
            // Add road markings
            this.addRoadMarkings(segment, i);
            

        }
        
        
        // Store initial road range
        this.roadZMin = 0;
        this.roadZMax = initialSegments * SEGMENT_LENGTH;
    }
    
    /**
     * Add neon markings to a road segment
     */
    addRoadMarkings(segment, index) {
        // Left edge line
        const leftLineGeometry = new THREE.BoxGeometry(0.5, 0.1, SEGMENT_LENGTH);
        const leftLineMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff });
        const leftLine = new THREE.Mesh(leftLineGeometry, leftLineMaterial);
        leftLine.position.set(-LANE_WIDTH * 1.5, 0.05, 0);
        segment.add(leftLine);
        
        // Right edge line
        const rightLineGeometry = new THREE.BoxGeometry(0.5, 0.1, SEGMENT_LENGTH);
        const rightLineMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff });
        const rightLine = new THREE.Mesh(rightLineGeometry, rightLineMaterial);
        rightLine.position.set(LANE_WIDTH * 1.5, 0.05, 0);
        segment.add(rightLine);
        
        // Center dashed line
        if (index % 2 === 0) {
            const centerLineGeometry = new THREE.BoxGeometry(0.5, 0.1, SEGMENT_LENGTH * 0.5);
            const centerLineMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
            const centerLine = new THREE.Mesh(centerLineGeometry, centerLineMaterial);
            centerLine.position.set(0, 0.05, 0);
            segment.add(centerLine);
        }
    }
    
    /**
     * Create the neon grid terrain
     */
    createTerrain() {
        // Grid material with glow effect
        const gridMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            wireframe: true,
            transparent: true,
            opacity: 0.6
        });
        
        // Create grid ground
        const terrainGeometry = new THREE.PlaneGeometry(1000, 2000, 50, 100);
        this.terrainMesh = new THREE.Mesh(terrainGeometry, gridMaterial);
        this.terrainMesh.rotation.x = -Math.PI / 2;
        this.terrainMesh.position.z = 500;
        this.scene.add(this.terrainMesh);
        
        // Store for animation
        this.gridMaterial = gridMaterial;
        
        // Mountains removed - now handled by the skybox module
    }
    
    
    /**
     * Add decorative elements to the scene
     */
    createDecorations() {
        // Add some palm trees
        for (let i = 0; i < 20; i++) {
            const side = Math.random() > 0.5 ? 1 : -1;
            const x = side * (30 + Math.random() * 50);
            const z = 50 + i * 100;
            
            this.createPalmTree(x, z);
        }
        
        // Add some floating objects
        for (let i = 0; i < 10; i++) {
            const size = 5 + Math.random() * 10;
            const x = -100 + Math.random() * 200;
            const y = 20 + Math.random() * 40;
            const z = 100 + i * 150;
            
            if (Math.random() > 0.5) {
                this.createFloatingHead(x, y, z, size);
            } else {
                this.createFloatingStatue(x, y, z, size);
            }
        }
        
        // Add some neon signs
        for (let i = 0; i < 15; i++) {
            const side = Math.random() > 0.5 ? 1 : -1;
            const x = side * (50 + Math.random() * 30);
            const y = 10 + Math.random() * 20;
            const z = 100 + i * 120;
            
            this.createNeonSign(x, y, z);
        }
        
        // Add roadside poles/markers
        for (let i = 0; i < 50; i++) {
            const side = Math.random() > 0.5 ? 1 : -1;
            const x = side * (LANE_WIDTH * 2 + 2); // Just outside road edge
            const z = i * 40; // Evenly spaced
            
            this.createRoadMarker(x, z);
        }
    }
    
    /**
     * Create a stylized palm tree
     */
    createPalmTree(x, z) {
        // Create a group for the palm tree
        const palmTree = new THREE.Group();
        
        // Trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 1, 15, 5);
        const trunkMaterial = new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            wireframe: true
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 7.5;
        palmTree.add(trunk);
        
        // Leaves
        const leafGeometry = new THREE.ConeGeometry(8, 5, 4);
        const leafMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffaa,
            wireframe: true
        });
        const leaves = new THREE.Mesh(leafGeometry, leafMaterial);
        leaves.position.y = 15; // Relative to palm tree position
        leaves.rotation.x = Math.PI / 6;
        palmTree.add(leaves);
        
        // Position the entire palm tree
        palmTree.position.set(x, 0, z);
        
        // Add metadata for animation
        palmTree.userData = { 
            isDecoration: true,
            originalZ: z
        };
        
        // Add to scene
        this.scene.add(palmTree);
        this.decorations.push(palmTree);
    }
    
    /**
     * Create a floating head decoration
     */
    createFloatingHead(x, y, z, size) {
        // Create a group for the floating head
        const headGroup = new THREE.Group();
        
        // Head sphere
        const headGeometry = new THREE.SphereGeometry(size, 8, 8);
        const headMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            wireframe: true
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        headGroup.add(head);
        
        // Add sunglasses
        const glassesGeometry = new THREE.BoxGeometry(size * 1.2, size * 0.4, size * 0.1);
        const glassesMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000
        });
        const glasses = new THREE.Mesh(glassesGeometry, glassesMaterial);
        glasses.position.set(0, size * 0.1, size * 0.9);
        head.add(glasses);
        
        // Position the entire head group
        headGroup.position.set(x, y, z);
        
        // Add metadata for animation
        headGroup.userData = { 
            isDecoration: true,
            originalZ: z
        };
        
        // Add to scene
        this.scene.add(headGroup);
        this.decorations.push(headGroup);
    }
    
    /**
     * Create a floating statue decoration
     */
    createFloatingStatue(x, y, z, size) {
        // Create a group for the statue
        const statueGroup = new THREE.Group();
        
        // Main statue body
        const statueGeometry = new THREE.CylinderGeometry(size/3, size/2, size*2, 6);
        const statueMaterial = new THREE.MeshBasicMaterial({
            color: 0xffaaff,
            wireframe: true
        });
        const statue = new THREE.Mesh(statueGeometry, statueMaterial);
        statueGroup.add(statue);
        
        // Add a bust top
        const bustGeometry = new THREE.SphereGeometry(size/2, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const bust = new THREE.Mesh(bustGeometry, statueMaterial);
        bust.position.set(0, size, 0);
        statue.add(bust);
        
        // Position the entire statue group
        statueGroup.position.set(x, y, z);
        
        // Add metadata for animation
        statueGroup.userData = { 
            isDecoration: true,
            originalZ: z
        };
        
        // Add to scene
        this.scene.add(statueGroup);
        this.decorations.push(statueGroup);
    }
    
    /**
     * Create a neon sign
     */
    createNeonSign(x, y, z) {
        // Create a group for the sign
        const signGroup = new THREE.Group();
        
        // Create sign plane
        const signGeometry = new THREE.PlaneGeometry(20, 10);
        const colors = [0xff00ff, 0x00ffff, 0xffff00];
        const signMaterial = new THREE.MeshBasicMaterial({
            color: colors[Math.floor(Math.random() * colors.length)],
            wireframe: true
        });
        const sign = new THREE.Mesh(signGeometry, signMaterial);
        sign.rotation.y = Math.PI / 2;
        signGroup.add(sign);
        
        // Position the entire sign group
        signGroup.position.set(x, y, z);
        
        // Add metadata for animation
        signGroup.userData = { 
            isDecoration: true,
            originalZ: z
        };
        
        // Add to scene
        this.scene.add(signGroup);
        this.decorations.push(signGroup);
    }
    
    /**
     * Create roadside marker pole
     */
    createRoadMarker(x, z) {
        // Create a group for the marker
        const markerGroup = new THREE.Group();
        
        // Create the pole
        const poleGeometry = new THREE.CylinderGeometry(0.3, 0.3, 5, 6);
        const poleMaterial = new THREE.MeshBasicMaterial({
            color: 0xff00ff // Bright neon color
        });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.y = 2.5; // Half height
        markerGroup.add(pole);
        
        // Add a glowing top
        const topGeometry = new THREE.SphereGeometry(0.6, 8, 8);
        const topMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff, // Contrasting color
            transparent: true,
            opacity: 0.8
        });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.y = 5.2; // At the top of pole
        markerGroup.add(top);
        
        // Position the entire marker
        markerGroup.position.set(x, 0, z);
        
        // Add metadata for animation
        markerGroup.userData = { 
            isDecoration: true,
            originalZ: z
        };
        
        // Add to scene
        this.scene.add(markerGroup);
        this.decorations.push(markerGroup);
    }
    
    /**
     * Create and add an obstacle
     * @param {Number} zPosition - Optional Z position for the obstacle
     * @param {Number} trackX - X position of the track at this Z coordinate
     */
    addObstacle(zPosition, trackX) {
        // Avoid center lane more often to make game more playable
        // This creates a higher chance of obstacles on side lanes (-1 or 1) than center (0)
        let lanePosition;
        const laneRandom = Math.random();
        
        if (laneRandom < 0.4) {
            lanePosition = -1; // Left lane
        } else if (laneRandom < 0.8) {
            lanePosition = 1;  // Right lane
        } else {
            lanePosition = 0;  // Center lane (only 20% chance)
        }
        
        // Create a group for the obstacle
        const obstacleGroup = new THREE.Group();
        
        // Make obstacles slightly smaller and easier to avoid
        const obstacleGeometry = new THREE.BoxGeometry(6, 4, 4); // Reduced width from 8 to 6
        const obstacleMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            wireframe: true
        });
        
        const obstacleBody = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
        obstacleGroup.add(obstacleBody);
        
        // Set metadata
        obstacleGroup.userData = {
            type: 'obstacle',
            lane: lanePosition
        };
        
        // Use provided Z position or default to road length ahead
        const obstacleZ = zPosition !== undefined ? zPosition : ROAD_LENGTH;
        
        // Calculate final X position based on track curvature and lane offset
        // If trackX is provided, use that as the base track position, otherwise default to 0
        const baseX = trackX !== undefined ? trackX : 0;
        
        // Position the obstacle
        obstacleGroup.position.set(
            baseX + (-lanePosition * LANE_WIDTH), // Combine track offset with lane position
            2,
            obstacleZ
        );
        
        // Add error message popup
        const errorTexture = this.createErrorTexture();
        const errorGeometry = new THREE.PlaneGeometry(10, 5);
        const errorMaterial = new THREE.MeshBasicMaterial({
            map: errorTexture,
            transparent: true,
            side: THREE.DoubleSide // Show the texture on both sides
        });
        
        const errorPopup = new THREE.Mesh(errorGeometry, errorMaterial);
        errorPopup.position.y = 8;
        errorPopup.rotation.y = Math.PI; // Rotate to face forwards (toward player)
        obstacleGroup.add(errorPopup);
        
        // Add to scene
        this.road.add(obstacleGroup);
        this.obstacles.push(obstacleGroup);
        
        return obstacleGroup;
    }
    
    /**
     * Create a Windows-style error message texture
     */
    createErrorTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const context = canvas.getContext('2d');
        
        // Draw error dialog background
        context.fillStyle = '#c0c0c0';
        context.fillRect(0, 0, 512, 256);
        
        // Draw title bar
        context.fillStyle = '#000080';
        context.fillRect(0, 0, 512, 30);
        
        // Draw title text
        context.fillStyle = 'white';
        context.font = '18px Arial';
        context.fillText('ERROR', 10, 22);
        
        // Draw close button
        context.fillStyle = '#c0c0c0';
        context.fillRect(482, 5, 20, 20);
        context.strokeStyle = 'black';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(485, 8);
        context.lineTo(499, 22);
        context.moveTo(499, 8);
        context.lineTo(485, 22);
        context.stroke();
        
        // Draw error icon
        context.beginPath();
        context.arc(50, 100, 30, 0, Math.PI * 2);
        context.fillStyle = 'red';
        context.fill();
        
        context.font = '40px Arial';
        context.fillStyle = 'white';
        context.fillText('X', 40, 115);
        
        // Draw error message
        context.fillStyle = 'black';
        context.font = '20px Arial';
        
        const messages = [
            'SYSTEM ERROR',
            'DATA CORRUPTED',
            'SEGMENTATION FAULT',
            'BUFFER OVERFLOW'
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        context.fillText(randomMessage, 100, 100);
        
        // Draw OK button
        context.fillStyle = '#c0c0c0';
        context.fillRect(200, 180, 100, 30);
        context.strokeStyle = 'black';
        context.strokeRect(200, 180, 100, 30);
        
        context.fillStyle = 'black';
        context.fillText('OK', 235, 203);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }
    
    /**
     * Create and add a collectible
     * @param {Number} zPosition - Optional Z position for the collectible
     * @param {Number} trackX - X position of the track at this Z coordinate
     */
    addCollectible(zPosition, trackX) {
        const lanePosition = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
        
        // Create a floppy disk collectible
        const collectibleGroup = new THREE.Group();
        
        // Floppy disk body
        const diskGeometry = new THREE.BoxGeometry(3, 0.5, 3);
        const diskMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff
        });
        const disk = new THREE.Mesh(diskGeometry, diskMaterial);
        collectibleGroup.add(disk);
        
        // Floppy disk label
        const labelGeometry = new THREE.BoxGeometry(2.5, 0.1, 2);
        const labelMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff
        });
        const label = new THREE.Mesh(labelGeometry, labelMaterial);
        label.position.y = 0.3;
        collectibleGroup.add(label);
        
        // Metal slider
        const sliderGeometry = new THREE.BoxGeometry(2, 0.1, 0.5);
        const sliderMaterial = new THREE.MeshBasicMaterial({
            color: 0x888888
        });
        const slider = new THREE.Mesh(sliderGeometry, sliderMaterial);
        slider.position.set(0, 0.3, -1.4);
        collectibleGroup.add(slider);
        
        // Use provided Z position or default to road length ahead
        const collectibleZ = zPosition !== undefined ? zPosition : ROAD_LENGTH;
        
        // Add animation metadata
        collectibleGroup.userData = {
            type: 'collectible',
            lane: lanePosition,
            rotationSpeed: 0.03,
            floatSpeed: 0.5,
            floatHeight: 0,
            maxFloatHeight: 1
        };
        
        // Calculate final X position based on track curvature and lane offset
        // If trackX is provided, use that as the base track position, otherwise default to 0
        const baseX = trackX !== undefined ? trackX : 0;
        
        // Position and add to the scene
        collectibleGroup.position.set(
            baseX + (-lanePosition * LANE_WIDTH), // Combine track offset with lane position
            2,
            collectibleZ
        );
        collectibleGroup.rotation.y = Math.PI / 4;
        
        // Add to scene
        this.road.add(collectibleGroup);
        this.collectibles.push(collectibleGroup);
        
        return collectibleGroup;
    }
    
    /**
     * Update all world elements
     */
    update(deltaTime, playerSpeed, playerPosition, gameTime) {
        // Track update count for performance optimization
        if (!this.updateCount) {
            this.updateCount = 0;
        }
        this.updateCount++;
        
        // First-frame special handling occurs only once
        if (this.updateCount === 1) {
            
            // Set initial player position reference
            if (playerPosition) {
                this.playerZPosition = playerPosition.z;
            }
        }
        
        // Only check road status occasionally in early game
        const earlyGameCheck = this.updateCount < 100;
        if (earlyGameCheck && playerPosition && this.updateCount % 20 === 0) {
            // Only check critical cases
            const roadAheadDistance = this.roadZMax - playerPosition.z;
            
            if (roadAheadDistance < 2000) {
                this.recycleRoadSegments(playerPosition.z);
            }
        }
        
        // Update road position and curve
        this.updateRoad(deltaTime, playerSpeed, playerPosition, gameTime);
        
        // Update obstacles
        this.updateObstacles(deltaTime, playerSpeed, playerPosition);
        
        // Update collectibles
        this.updateCollectibles(deltaTime, playerSpeed, gameTime, playerPosition);
        
        // Update decorations (trees, statues, etc.)
        this.updateDecorations(deltaTime, playerSpeed, playerPosition);
        
        // Spawn new objects
        this.spawnObjects(gameTime, playerSpeed, playerPosition);
        
        // Update visual effects
        this.updateVisualEffects(gameTime);
    }
    
    /**
     * Update road position and provide turn notifications
     */
    updateRoad(deltaTime, playerSpeed, playerPosition, currentTime) {
        if (!playerPosition) return;
        
        // Store current player position for reference
        const playerZ = playerPosition.z;
        this.playerZPosition = playerZ;
        
        // Road safety check only when needed to save performance
        const distanceToRoadEnd = this.roadZMax - playerZ;
        
        // Only do expensive operation if we're getting close to the end
        if (distanceToRoadEnd < 500) {
            // Emergency road extension
            this.recycleRoadSegments(playerZ);
        }
        
        // Recycle road segments, but not every frame
        if (playerSpeed > 0 && this.updateCount % 3 === 0) {
            this.recycleRoadSegments(playerZ);
        }
    }
    
    /**
     * Optimized road segment recycling that's easier on CPU
     */
    recycleRoadSegments(playerZ) {
        // PERFORMANCE OPTIMIZATION: Only run full recycling every few frames
        if (!this.lastRecycleFrame) {
            this.lastRecycleFrame = 0;
        }
        
        // Use a counter for efficient tracking of when to perform full recycling
        this.lastRecycleFrame++;
        const shouldRecycle = this.lastRecycleFrame >= 10;
        
        // Reset counter when we do recycle
        if (shouldRecycle) {
            this.lastRecycleFrame = 0;
        } else if (!this.roadZMax) {
            // Force calculation if we don't have road bounds yet
        } else {
            // Only do a quick check to see if we need emergency extension
            const quickAheadDistance = this.roadZMax - playerZ;
            if (quickAheadDistance < 500) {
                // Emergency extension - extend the road if we're about to run out
                let maxZ = this.roadZMax;
                
                // Find segments that are far behind to recycle
                for (let i = 0; i < 50; i++) {
                    // Use a simple algorithm: just take the first segments in the array
                    if (i < this.roadSegments.length && playerZ - this.roadSegments[i].position.z > 500) {
                        const segment = this.roadSegments[i];
                        const newZ = maxZ + SEGMENT_LENGTH;
                        segment.position.z = newZ;
                        this.positionRoadSegment(segment, playerZ, newZ);
                        maxZ = newZ;
                    }
                }
                
                // Update max tracker
                this.roadZMax = maxZ;
            }
            return; // Skip full processing for most frames
        }
        
        // CRITICAL SAFETY: Check if road segments exist
        if (!this.roadSegments || this.roadSegments.length === 0) {
            return;
        }
        
        // Get current road extents more efficiently
        // Use cached values and update only occasionally
        if (!this.initialBoundsCalculated || shouldRecycle) {
            // Sample road segments instead of checking all of them
            let maxZ = this.roadZMax || -Infinity;
            let minZ = this.roadZMin || Infinity;
            
            // Sample every 4th segment for performance
            const sampleInterval = 4;
            for (let i = 0; i < this.roadSegments.length; i += sampleInterval) {
                const segment = this.roadSegments[i];
                const segmentZ = segment.position.z;
                
                // Track min/max Z positions
                maxZ = Math.max(maxZ, segmentZ);
                minZ = Math.min(minZ, segmentZ);
            }
            
            // Store road extents for reference
            this.roadZMin = minZ;
            this.roadZMax = maxZ;
            this.initialBoundsCalculated = true;
        }
        
        // Calculate road distances relative to player
        const roadAheadDistance = this.roadZMax - playerZ;
        
        // Only recycle if needed to extend road ahead
        const minimumAheadDistance = 3000;
        
        if (roadAheadDistance < minimumAheadDistance) {
            // Find segments that are far behind the player and move them to the front
            let recycledForward = 0;
            const safeRecycleDistance = 1000;
            let maxZ = this.roadZMax;
            
            // Only process a limited number of segments for performance
            const maxSegmentsToProcess = 50;
            
            // Recycle segments efficiently
            for (let i = 0; i < this.roadSegments.length && recycledForward < maxSegmentsToProcess; i++) {
                const segment = this.roadSegments[i];
                const segmentZ = segment.position.z;
                
                if (playerZ - segmentZ > safeRecycleDistance) {
                    // Position this segment ahead of the current furthest segment
                    const newZ = maxZ + SEGMENT_LENGTH;
                    segment.position.z = newZ;
                    
                    // Position according to the track pattern
                    this.positionRoadSegment(segment, playerZ, newZ);
                    
                    // Update max position tracker
                    maxZ = newZ;
                    recycledForward++;
                }
                
                // Break early if we've extended the road enough
                if (maxZ - playerZ > minimumAheadDistance) {
                    break;
                }
            }
            
            // Update road max if we recycled segments
            if (recycledForward > 0) {
                this.roadZMax = maxZ;
            }
        }
    }
    
    /**
     * Position a road segment using a completely new approach with proper racing turns
     * This creates realistic racing curves that require actual driving to navigate
     */
    positionRoadSegment(segment, playerZ, segmentZ) {
        // Reset all rotations to default position
        segment.rotation.x = -Math.PI / 2; // Road is flat on ground
        segment.rotation.y = 0;            // Reset yaw rotation
        segment.rotation.z = 0;            // Reset roll rotation
        
        // SPLINE-BASED APPROACH for positioning segments
        // Current position along the track (z-coordinate)
        const trackPosition = segmentZ;
        
        // Calculate position along the repeating track pattern (0 to 1)
        const patternPosition = (trackPosition % ROAD_LENGTH) / ROAD_LENGTH;
        
        // Track definition
        const trackPoints = [
            { pos: 0.0,  turn: 0 },    // Start straight
            { pos: 0.15, turn: -1.0 }, // Hard left turn
            { pos: 0.3,  turn: 0 },    // Back to straight
            { pos: 0.35, turn: 0 },    // Still straight
            { pos: 0.5,  turn: 1.0 },  // Hard right turn
            { pos: 0.65, turn: 0 },    // Back to straight
            { pos: 0.7,  turn: 0 },    // Still straight
            { pos: 0.85, turn: -0.6 }, // Medium left turn
            { pos: 1.0,  turn: 0 }     // Back to straight
        ];
        
        // Find the two control points we're between
        let p1 = trackPoints[0];
        let p2 = trackPoints[trackPoints.length - 1];
        
        for (let i = 0; i < trackPoints.length - 1; i++) {
            if (patternPosition >= trackPoints[i].pos && patternPosition < trackPoints[i+1].pos) {
                p1 = trackPoints[i];
                p2 = trackPoints[i+1];
                break;
            }
        }
        
        // Calculate how far we are between these two points (0 to 1)
        const segmentProgress = (patternPosition - p1.pos) / (p2.pos - p1.pos);
        
        // Use cubic easing for more realistic turn entry/exit
        const easeSegmentProgress = this.cubicEase(segmentProgress);
        
        // Interpolate between the two control points to get the exact turn value
        const turnValue = p1.turn + (p2.turn - p1.turn) * easeSegmentProgress;
        
        // Apply a lateral offset based on turn value
        const xOffset = turnValue * LANE_WIDTH * 5.0;
        
        // Apply the lateral offset to make the turn
        segment.position.x = xOffset;
    }
    
    /**
     * Cubic easing function for smoother transitions
     */
    cubicEase(t) {
        return t * t * (3 - 2 * t);
    }
    
    /**
     * Force update ALL road segments at once - only used in emergency situations
     */
    forceUpdateAllRoadSegments() {
        if (!this.playerZPosition) return;
        
        const playerZ = this.playerZPosition;
        
        // Only update segments ahead of the player for performance
        for (let i = 0; i < this.roadSegments.length; i++) {
            const segment = this.roadSegments[i];
            if (segment.position.z > playerZ - 30) {
                this.positionRoadSegment(segment, playerZ, segment.position.z);
            }
        }
    }
    
    /**
     * Update obstacles positions
     */
    updateObstacles(deltaTime, playerSpeed, playerPosition) {
        // Check if player has moved and we need to manage obstacles
        if (playerPosition) {
            const playerZ = playerPosition.z;
            
            // Remove obstacles that are too far behind the player
            for (let i = this.obstacles.length - 1; i >= 0; i--) {
                const obstacle = this.obstacles[i];
                
                // Calculate distance between obstacle and player
                const distanceBehind = playerZ - obstacle.position.z;
                
                // If obstacle is too far behind, remove it
                if (distanceBehind > 150) {
                    this.road.remove(obstacle);
                    this.obstacles.splice(i, 1);
                }
            }
        }
    }
    
    /**
     * Update collectibles positions and animations
     */
    updateCollectibles(deltaTime, playerSpeed, gameTime, playerPosition) {
        // Update existing collectibles animation
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const collectible = this.collectibles[i];
            
            // Animate rotation
            collectible.rotation.y += collectible.userData.rotationSpeed;
            
            // Floating animation
            collectible.userData.floatHeight += collectible.userData.floatSpeed * deltaTime;
            collectible.position.y = 2 + Math.sin(collectible.userData.floatHeight) * collectible.userData.maxFloatHeight;
            
            // Check if player has moved and remove distant collectibles
            if (playerPosition) {
                const playerZ = playerPosition.z;
                const distanceBehind = playerZ - collectible.position.z;
                
                // If collectible is too far behind, remove it
                if (distanceBehind > 150) {
                    this.road.remove(collectible);
                    this.collectibles.splice(i, 1);
                }
            }
        }
    }
    
    /**
     * Update decoration positions
     */
    updateDecorations(deltaTime, playerSpeed, playerPosition) {
        // In the new model, decorations stay in place
        // and we only recycle them when they're far behind the player
        
        if (playerPosition) {
            const playerZ = playerPosition.z;
            
            // Only update decorations every few frames for performance
            if (this.updateCount % 5 !== 0) return;
            
            this.decorations.forEach(decoration => {
                // Calculate distance from decoration to player
                const distanceBehind = playerZ - decoration.position.z;
                
                // If decoration is too far behind the player, move it ahead
                if (distanceBehind > 200) {
                    // Find the farthest forward decoration
                    let maxZ = -Infinity;
                    this.decorations.forEach(otherDeco => {
                        maxZ = Math.max(maxZ, otherDeco.position.z);
                    });
                    
                    // Move this decoration ahead of the farthest one
                    decoration.position.z = maxZ + 50 + Math.random() * 50;
                    
                    // Randomize X position for variety
                    if (decoration.userData.isDecoration) {
                        // For decorations that should be placed off to the sides
                        const side = Math.random() > 0.5 ? 1 : -1;
                        decoration.position.x = side * (30 + Math.random() * 50);
                    }
                }
            });
        }
    }
    
    /**
     * Spawn new obstacles and collectibles
     */
    spawnObjects(gameTime, playerSpeed, playerPosition) {
        // Only spawn objects if the player is moving
        if (playerSpeed <= 0 || !playerPosition) return;
        
        // Get the player's current position
        const playerZ = playerPosition.z;
        
        // Spawn obstacles ahead of the player periodically
        // Reduced frequency from 2 seconds to 4 seconds between obstacles
        if (gameTime - this.lastObstacleTime > 4) {
            // Only spawn if we're below the maximum obstacle count
            if (this.obstacles.length < this.maxObstacleCount) {
                // Create obstacle at a fixed distance ahead of the player
                // Increased minimum distance to give player more reaction time
                const obstacleZ = playerZ + 150 + Math.random() * 50;
                
                // Check if this position is too close to recently placed obstacles
                let tooClose = false;
                for (const lastPos of this.lastObstaclePositions) {
                    if (Math.abs(obstacleZ - lastPos) < 50) { // Require at least 50 units between obstacles
                        tooClose = true;
                        break;
                    }
                }
                
                // Only proceed if not too close to other obstacles
                if (!tooClose) {
                    // Get the proper X-position based on track curvature
                    const trackX = this.getTrackXPositionAtZ(obstacleZ);
                    
                    // Only spawn an obstacle 70% of the time
                    if (Math.random() < 0.7) {
                        // Add obstacle at this position with proper track-aligned X position
                        const obstacle = this.addObstacle(obstacleZ, trackX);
                        
                        // Track this position to avoid clustering
                        this.lastObstaclePositions.push(obstacleZ);
                        
                        // Keep only the last 10 positions
                        if (this.lastObstaclePositions.length > 10) {
                            this.lastObstaclePositions.shift();
                        }
                    }
                }
            }
            
            this.lastObstacleTime = gameTime;
        }
        
        // Spawn collectibles ahead of the player more frequently
        if (gameTime - this.lastCollectibleTime > 1) {
            // Create collectible at a fixed distance ahead of the player
            const collectibleZ = playerZ + 80 + Math.random() * 40;
            
            // IMPORTANT: Get the proper X-position based on track curvature
            const trackX = this.getTrackXPositionAtZ(collectibleZ);
            
            // Add collectible at this position with proper track-aligned X position
            const collectible = this.addCollectible(collectibleZ, trackX);
            this.lastCollectibleTime = gameTime;
        }
        
        // If we have no decorations, add some
        if (this.decorations.length < 10 && this.updateCount % 30 === 0) {
            for (let i = 0; i < 10; i++) {
                const z = playerZ + 50 + i * 40 + Math.random() * 20;
                const side = Math.random() > 0.5 ? 1 : -1;
                
                // Use track position for decoration placement relative to track
                const trackX = this.getTrackXPositionAtZ(z);
                const x = trackX + (side * (30 + Math.random() * 50));
                
                // Create decoration with track-aware positioning
                this.createFloatingHead(x, 20 + Math.random() * 20, z, 5 + Math.random() * 5);
            }
        }
    }
    
    /**
     * Get the track's X position at a given Z position
     * This aligns objects with the track's curvature
     */
    getTrackXPositionAtZ(zPosition) {
        // Calculate position along the repeating track pattern (0 to 1)
        const patternPosition = (zPosition % ROAD_LENGTH) / ROAD_LENGTH;
        
        // Use the same track definition as in positionRoadSegment()
        const trackPoints = [
            { pos: 0.0,  turn: 0 },    // Start straight
            { pos: 0.15, turn: -1.0 }, // Hard left turn
            { pos: 0.3,  turn: 0 },    // Back to straight
            { pos: 0.35, turn: 0 },    // Still straight
            { pos: 0.5,  turn: 1.0 },  // Hard right turn
            { pos: 0.65, turn: 0 },    // Back to straight
            { pos: 0.7,  turn: 0 },    // Still straight
            { pos: 0.85, turn: -0.6 }, // Medium left turn
            { pos: 1.0,  turn: 0 }     // Back to straight
        ];
        
        // Find the two control points we're between
        let p1 = trackPoints[0];
        let p2 = trackPoints[trackPoints.length - 1];
        
        for (let i = 0; i < trackPoints.length - 1; i++) {
            if (patternPosition >= trackPoints[i].pos && patternPosition < trackPoints[i+1].pos) {
                p1 = trackPoints[i];
                p2 = trackPoints[i+1];
                break;
            }
        }
        
        // Calculate how far we are between these two points (0 to 1)
        const segmentProgress = (patternPosition - p1.pos) / (p2.pos - p1.pos);
        
        // Use cubic easing for more realistic turn entry/exit
        const easeSegmentProgress = this.cubicEase(segmentProgress);
        
        // Interpolate between the two control points to get the exact turn value
        const turnValue = p1.turn + (p2.turn - p1.turn) * easeSegmentProgress;
        
        // Calculate X offset for this position - same formula as in positionRoadSegment
        const xOffset = turnValue * LANE_WIDTH * 5.0;
        
        return xOffset;
    }
    
    /**
     * Update visual effects (grid color, etc.)
     */
    updateVisualEffects(gameTime) {
        // Only update visual effects every few frames for performance
        if (this.updateCount % 3 !== 0) return;
        
        // Animate grid material
        if (this.gridMaterial) {
            const gridColor = new THREE.Color(
                0.5 + 0.5 * Math.sin(gameTime * 0.5),
                0.5 + 0.5 * Math.sin(gameTime * 0.3),
                0.5 + 0.5 * Math.sin(gameTime * 0.7)
            );
            this.gridMaterial.color = gridColor;
        }
    }
    
    /**
     * Check for collision between a player and obstacles/collectibles
     */
    checkCollisions(playerBox) {
        const collisions = {
            obstacles: [],
            collectibles: []
        };
        
        // Get world position to adjust for relative positioning
        const roadWorldPosition = new THREE.Vector3();
        this.road.getWorldPosition(roadWorldPosition);
        
        // Check obstacle collisions
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            const obstacleBoundingBox = new THREE.Box3().setFromObject(obstacle);
            
            // Adjust obstacle bounding box to account for road's position
            obstacleBoundingBox.min.add(roadWorldPosition);
            obstacleBoundingBox.max.add(roadWorldPosition);
            
            if (playerBox.intersectsBox(obstacleBoundingBox)) {
                collisions.obstacles.push(obstacle);
                
                // Remove the obstacle
                this.road.remove(obstacle);
                this.obstacles.splice(i, 1);
            }
        }
        
        // Check collectible collisions
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const collectible = this.collectibles[i];
            const collectibleBoundingBox = new THREE.Box3().setFromObject(collectible);
            
            // Adjust collectible bounding box to account for road's position
            collectibleBoundingBox.min.add(roadWorldPosition);
            collectibleBoundingBox.max.add(roadWorldPosition);
            
            if (playerBox.intersectsBox(collectibleBoundingBox)) {
                collisions.collectibles.push(collectible);
                
                // Remove the collectible
                this.road.remove(collectible);
                this.collectibles.splice(i, 1);
            }
        }
        
        return collisions;
    }
    
    /**
     * Get current road curve for physics calculations
     */
    getCurrentRoadCurve() {
        return this.roadCurve;
    }
    
    /**
     * Get world state for external use
     */
    getWorldState() {
        return {
            roadCurve: this.roadCurve,
            targetRoadCurve: this.targetRoadCurve,
            roadOffset: this.roadOffset
        };
    }
}

// Export the world class
export { GameWorld, ROAD_LENGTH, LANE_WIDTH };