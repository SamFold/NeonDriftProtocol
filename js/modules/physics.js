/**
 * Vehicle Physics Module for Neon Drift Protocol
 * 
 * Handles all vehicle physics simulation including:
 * - Car movement and acceleration
 * - Steering and handling
 * - Collision detection and response
 * - Surface interaction (road vs off-road)
 */

// Physics constants
const MAX_SPEED = 5000;                   // Maximum speed in units/second (increased by 33%)
const ACCELERATION = 2000;                // Acceleration rate in units/second² (increased by 30%)
const DECELERATION = 800;                // Braking rate in units/second² (significantly increased)
const ENGINE_BRAKING = 1.0;              // Deceleration when not accelerating (increased for better natural slowdown)
const DRAG_COEFFICIENT = 0.00015;         // Air resistance factor (reduced by 50%)
const OFF_ROAD_FRICTION = 0.03;          // Friction multiplier when off road (reduced further)
const OFF_ROAD_DAMAGE = 10;              // Instant speed reduction when hitting edge

// Vehicle physics parameters
const GRAVITY = 9.8;                     // For suspension calculations
const MAX_STEERING_ANGLE = Math.PI / 4;  // Maximum steering angle (45 degrees)
const STEERING_SPEED = 2.5;              // How quickly steering changes (radians/second)
const STEERING_RETURN_SPEED = 5.0;       // How quickly steering returns to center (radians/second)
const WHEEL_BASE = 6;                    // Distance between front and rear axles
const WHEEL_TRACK = 4;                   // Distance between left and right wheels
const SUSPENSION_STIFFNESS = 50;         // Suspension spring stiffness
const SUSPENSION_DAMPING = 4;            // Suspension damping coefficient
const SUSPENSION_TRAVEL = 0.5;           // Maximum suspension compression/extension
const WHEEL_RADIUS = 0.8;                // Wheel radius for ground contact calculation
const WHEEL_MASS = 20;                   // Mass of each wheel
const CHASSIS_MASS = 400;                // Mass of the vehicle chassis
const TOTAL_MASS = CHASSIS_MASS + WHEEL_MASS * 4; // Total vehicle mass

// Vehicle state
class Vehicle {
    constructor() {
        // Position and movement (world space)
        this.position = new THREE.Vector3(0, 0.8, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.acceleration = new THREE.Vector3(0, 0, 0);
        this.direction = new THREE.Vector3(0, 0, 1);    // Forward is +Z
        this.right = new THREE.Vector3(1, 0, 0);        // Right is +X
        this.up = new THREE.Vector3(0, 1, 0);           // Up is +Y
        this.rotation = new THREE.Euler(0, 0, 0);
        this.angularVelocity = 0;                       // Rotation around Y axis
        
        // Physics state
        this.speed = 0;                  // Current forward speed (positive for forward, negative for reverse)
        this.wheelSpeed = 0;             // Wheel rotation speed (for visual effects)
        this.steeringAngle = 0;          // Current steering wheel angle
        this.throttle = 0;               // Current throttle input (0-1)
        this.brake = 0;                  // Current brake input (0-1)
        this.reverse = 0;                // Current reverse input (0-1)
        this.isGrounded = true;          // Whether the vehicle is on the ground
        this.isOffRoad = false;          // Whether the vehicle is off the road
        this.wasOffRoad = false;         // Whether the vehicle was off road last frame
        
        // Suspension state (for each wheel: front-left, front-right, rear-left, rear-right)
        this.wheels = [
            { 
                position: new THREE.Vector3(-WHEEL_TRACK/2, 0, WHEEL_BASE/2),   // Front left
                contactPoint: new THREE.Vector3(),
                suspensionForce: 0,
                compression: 0,
                onGround: true,
                isFront: true
            },
            { 
                position: new THREE.Vector3(WHEEL_TRACK/2, 0, WHEEL_BASE/2),    // Front right
                contactPoint: new THREE.Vector3(),
                suspensionForce: 0,
                compression: 0,
                onGround: true,
                isFront: true
            },
            { 
                position: new THREE.Vector3(-WHEEL_TRACK/2, 0, -WHEEL_BASE/2),  // Rear left
                contactPoint: new THREE.Vector3(),
                suspensionForce: 0,
                compression: 0,
                onGround: true,
                isFront: false
            },
            { 
                position: new THREE.Vector3(WHEEL_TRACK/2, 0, -WHEEL_BASE/2),   // Rear right
                contactPoint: new THREE.Vector3(),
                suspensionForce: 0,
                compression: 0,
                onGround: true,
                isFront: false
            }
        ];
        
        // Visual elements
        this.mesh = null;
        this.frontWheels = [];
        this.rearWheels = [];
        this.input = null;
        
        // Debug
        this.debug = {
            forces: {},
            suspension: {}
        };
    }

    /**
     * Update physics based on input and delta time
     * @param {Object} input - Keyboard input state
     * @param {Number} deltaTime - Time since last frame in seconds
     * @param {Object} world - World state for collision detection
     */
    update(input, deltaTime, world) {
        // Store input for other methods
        this.input = input;
        
        // Store previous state for comparison
        const previousPosition = this.position.clone();
        this.wasOffRoad = this.isOffRoad;
        
        // Cap delta time to prevent large jumps
        const dt = Math.min(deltaTime, 0.1);
        
        // TEMPORARY HACK - Apply a small initial speed to get things moving
        // This is useful for debugging - will be removed once proper physics work
        if (this.speed < 0.1 && input.accelerate) {
            this.speed = 30.0;  // Give a small initial boost when player starts
            this.velocity.set(0, 0, this.speed);  // Set initial velocity in Z direction
        }
        
        // Update vehicle controls from input
        this.updateControls(input, dt);
        
        // Update suspension for each wheel
        this.updateSuspension(dt, world);
        
        // Calculate forces on the vehicle
        this.calculateForces(dt);
        
        // Integrate physics (apply forces to update velocity and position)
        this.integrate(dt);
        
        // Check for road surface interaction
        this.checkSurfaceInteraction(world, dt);
        
        // Rotate wheels based on speed and steering
        this.updateWheelRotation(dt);
        
        // Update vehicle direction vectors after movement
        this.updateVehicleVectors();
        
        // Return true if any significant state changed
        return !previousPosition.equals(this.position) || 
               this.wasOffRoad !== this.isOffRoad ||
               this.speed > 0.1;
    }
    
    /**
     * Update vehicle controls based on input
     */
    updateControls(input, dt) {
        // Debug input
        
        // Update throttle, brake and reverse
        // OPTION A: Brake cancels acceleration - if brake is pressed, throttle is ignored
        this.brake = input.brake ? 1.0 : 0.0;
        this.reverse = input.reverse ? 1.0 : 0.0;
        
        // Only allow throttle if brake is not being applied
        this.throttle = (input.accelerate && !input.brake) ? 1.0 : 0.0;
        
        // Future enhancement: Here we could detect brake+accelerate+turn for drift mechanics
        // Example drift detection (commented out for future implementation):
        /*
        this.isDrifting = false; // Default state
        if (input.brake && input.accelerate && (input.turnLeft || input.turnRight)) {
            // Drift conditions met - would set drift state and apply specialized physics
            this.isDrifting = true;
        }
        */
        
        // Debug throttle/brake
        if (this.throttle > 0 || this.brake > 0) {
        }
        
        // Update steering with rate limiting
        if (input.turnLeft) {
            this.steeringAngle = Math.min(
                this.steeringAngle + STEERING_SPEED * dt,
                MAX_STEERING_ANGLE
            );
        } else if (input.turnRight) {
            this.steeringAngle = Math.max(
                this.steeringAngle - STEERING_SPEED * dt,
                -MAX_STEERING_ANGLE
            );
        } else {
            // Return steering to center
            if (Math.abs(this.steeringAngle) < STEERING_RETURN_SPEED * dt) {
                this.steeringAngle = 0;
            } else {
                this.steeringAngle -= Math.sign(this.steeringAngle) * STEERING_RETURN_SPEED * dt;
            }
        }
        
        // Steering becomes significantly less effective at high speeds (arcade handling model)
        // More aggressive reduction - at max speed, steering is only 15% effective
        const speedFactor = Math.max(0.15, 1.0 - Math.pow(this.speed / MAX_SPEED, 0.7) * 0.85);
        const effectiveSteeringAngle = this.steeringAngle * speedFactor;
        
        // Apply steering angle to front wheels for visual effect
        if (this.frontWheels.length > 0) {
            this.frontWheels.forEach(wheel => {
                wheel.rotation.y = effectiveSteeringAngle;
            });
        }
    }
    
    /**
     * Update suspension for each wheel
     */
    updateSuspension(dt, world) {
        // Gravity acting on the vehicle
        const gravity = GRAVITY;
        
        // Check wheel contact with ground
        this.wheels.forEach((wheel, index) => {
            // Calculate wheel position in world space
            const wheelPos = this.getWheelWorldPosition(wheel);
            
            // Distance from wheel to ground (simplified, assumes flat ground at y=0)
            // In a more complex implementation, we would raycast to find ground height
            const restLength = WHEEL_RADIUS + SUSPENSION_TRAVEL;
            const groundHeight = 0; // Flat ground
            
            // Calculate suspension compression
            const compressionDistance = Math.max(0, restLength - (wheelPos.y - groundHeight));
            wheel.compression = compressionDistance / restLength;
            
            // Check if wheel is on ground
            wheel.onGround = compressionDistance > 0;
            
            // Calculate suspension force (spring and damper)
            if (wheel.onGround) {
                // Spring force (Hooke's law: F = k * x)
                const springForce = compressionDistance * SUSPENSION_STIFFNESS;
                
                // Damping force (F = c * v) - dampens suspension movement
                const suspensionVelocity = this.velocity.y; // Simplified, just look at vertical velocity
                const dampingForce = suspensionVelocity * SUSPENSION_DAMPING;
                
                // Total suspension force
                wheel.suspensionForce = springForce - dampingForce;
                
                // Store contact point
                wheel.contactPoint.copy(wheelPos);
                wheel.contactPoint.y = groundHeight;
            } else {
                wheel.suspensionForce = 0;
            }
            
            // Store debug info
            this.debug.suspension[index] = {
                compression: wheel.compression,
                force: wheel.suspensionForce,
                onGround: wheel.onGround
            };
        });
        
        // Track if any wheel is on ground
        this.isGrounded = this.wheels.some(wheel => wheel.onGround);
    }
    
    /**
     * Calculate forces acting on the vehicle
     */
    calculateForces(dt) {
        // Reset acceleration
        this.acceleration.set(0, 0, 0);
        
        // Apply gravity if not fully supported by suspension
        if (!this.isGrounded) {
            this.acceleration.y -= GRAVITY;
        }
        
        // Calculate tractive force (from engine, through wheels)
        let tractiveForce = 0;
        
        if (this.isGrounded) {
            if (this.throttle > 0 && this.speed >= -1) {  // Only allow acceleration if not moving fast in reverse
                // Mario Kart-style acceleration curve: stronger at low speeds, tapering as speed increases
                const speedRatio = Math.max(0, Math.min(1, this.speed / MAX_SPEED));
                
                // This curve provides:
                // - At 0% speed: 2x acceleration (strong launch)
                // - At 50% speed: ~1.26x acceleration (good mid-range)
                // - At 100% speed: 0.2x acceleration (still some push at top end)
                const accelerationMultiplier = 1.8 * Math.pow(1 - speedRatio, 1.5) + 0.2;
                
                // Apply the acceleration with the dynamic multiplier
                tractiveForce = ACCELERATION * accelerationMultiplier * this.throttle;
                
            } else if (this.brake > 0) {
                // Dedicated emergency braking with spacebar (dramatically powerful arcade-style brake)
                tractiveForce = -Math.sign(this.speed) * DECELERATION * 6.0 * this.brake;  // 6x stronger braking (arcade-style emergency stop)
            } else if (this.reverse > 0) {
                if (this.speed > 5) {
                    // If moving forward fast, first act as a brake
                    tractiveForce = -DECELERATION * 2.0 * this.reverse;  // 2x stronger than regular braking
                } else if (this.speed > 0) {
                    // If moving forward slowly, stronger braking to stop quickly
                    tractiveForce = -DECELERATION * 2.5 * this.reverse;
                } else {
                    // If stopped or moving backward, accelerate in reverse (at 40% of forward acceleration)
                    tractiveForce = -ACCELERATION * 0.4 * this.reverse;
                }
            } else {
                // Engine braking when no throttle, brake or reverse applied
                tractiveForce = -Math.sign(this.speed) * ENGINE_BRAKING;
            }
        }
        
        // Calculate drag force (increases with speed squared)
        const dragForce = -Math.sign(this.speed) * DRAG_COEFFICIENT * this.speed * this.speed;
        
        // Apply rolling resistance if on ground
        let rollingResistance = 0;
        if (this.isGrounded) {
            // Rolling resistance is higher off-road
            const resistanceFactor = this.isOffRoad ? OFF_ROAD_FRICTION : 0.001; // Reduced on-road resistance by 50%
            rollingResistance = -Math.sign(this.speed) * resistanceFactor * Math.abs(this.speed);
        }
        
        // Sum longitudinal forces
        const totalLongitudinalForce = tractiveForce + dragForce + rollingResistance;
        
        // Convert force to acceleration (F = ma)
        const forwardAcceleration = totalLongitudinalForce / TOTAL_MASS;
        
        // Apply longitudinal acceleration in the vehicle's forward direction
        const forwardAccelerationVector = this.direction.clone().multiplyScalar(forwardAcceleration);
        this.acceleration.add(forwardAccelerationVector);
        
        // Calculate cornering forces and resulting angular acceleration
        let totalAngularAcceleration = 0;
        
        if (this.isGrounded && Math.abs(this.speed) > 0.5) {
            // We only apply steering forces when the vehicle is moving
            // Calculate yaw rate based on steering angle, speed, and wheelbase
            // This is an Ackermann steering approximation for low speeds
            const steeringFactor = this.steeringAngle / (WHEEL_BASE * 0.5);
            
            // Adjust angular acceleration based on speed
            // At higher speeds, the steering becomes more gradually responsive
            const speedFactor = Math.max(0.2, Math.min(1.0, Math.abs(this.speed) / 30.0));
            
            // Reverse steering when in reverse (multiply by -1)
            const directionFactor = this.speed < 0 ? -1 : 1;
            
            // Use square root of speed to reduce extreme turning at high speeds
            // This creates a more arcade-like feel with better stability
            totalAngularAcceleration = directionFactor * steeringFactor * Math.sqrt(Math.abs(this.speed) * 20) * speedFactor;
            
            // Apply lateral forces (for drifting at high speeds and steering angles)
            // Raised threshold for drift onset to 60% of max speed and requires more steering
            if (Math.abs(this.steeringAngle) > 0.25 && Math.abs(this.speed) > MAX_SPEED * 0.6) {
                // Calculate lateral traction loss with more gradual onset
                // The 1.5 divisor makes traction loss more manageable at high speeds
                const tractionLoss = Math.min(0.7, (Math.abs(this.steeringAngle) * Math.abs(this.speed)) / 
                                        (MAX_STEERING_ANGLE * MAX_SPEED * 1.5));
                
                // Calculate drift force with speed-based dampening (prevents excessive spin-outs)
                // The higher the speed, the more we dampen lateral forces
                const speedDampening = 1.0 / (1.0 + Math.abs(this.speed) / 2000);
                const driftAcceleration = Math.abs(this.speed) * tractionLoss * 0.4 * speedDampening;
                const steeringSign = Math.sign(this.steeringAngle);
                const directionMultiplier = this.speed < 0 ? -1 : 1;
                
                const lateralAccelerationVector = this.right.clone().multiplyScalar(
                    steeringSign * directionMultiplier * driftAcceleration
                );
                
                // Add lateral acceleration
                this.acceleration.add(lateralAccelerationVector);
            }
        }
        
        // Store the angular acceleration for later use in integration
        this.angularAcceleration = totalAngularAcceleration;
        
        // Store debug info
        this.debug.forces = {
            tractiveForce,
            dragForce,
            rollingResistance,
            totalLongitudinalForce,
            angularAcceleration: totalAngularAcceleration
        };
    }
    
    /**
     * Integrate forces to update velocity and position
     */
    integrate(dt) {        
        // CRITICAL FIX: We need to re-align the velocity with the vehicle's direction
        // This ensures that when the car turns, the velocity vector turns with it
        // First, get the magnitude of forward velocity (speed in the direction the car is facing)
        const forwardSpeed = this.velocity.dot(this.direction);
        
        // Get the vertical component (for jumps/bounces)
        const verticalVelocity = this.velocity.y;
        
        // Apply acceleration to calculate new forward speed
        const forwardAccel = this.acceleration.dot(this.direction);
        const newForwardSpeed = forwardSpeed + forwardAccel * dt;
        
        // Keep lateral velocity component for drifting feel, but reduce it for more control
        const lateralVelocity = this.velocity.clone().sub(this.direction.clone().multiplyScalar(forwardSpeed));
        lateralVelocity.multiplyScalar(0.98); // Further reduced lateral drag for better drifting and speed
        
        // Reconstruct velocity from forward and lateral components
        this.velocity = this.direction.clone().multiplyScalar(newForwardSpeed).add(lateralVelocity);
        this.velocity.y = verticalVelocity + this.acceleration.y * dt; // Add vertical acceleration
        
        // Update speed value
        this.speed = newForwardSpeed;
        
        // Apply angular acceleration to angular velocity
        this.angularVelocity += this.angularAcceleration * dt;
        
        // Apply angular velocity to rotation
        this.rotation.y += this.angularVelocity * dt;
        
        // Update position based on velocity
        this.position.add(this.velocity.clone().multiplyScalar(dt));
        
        // GROUND CHECK: Make sure vehicle doesn't fall below ground level
        if (this.position.y < 0.5) {
            this.position.y = 0.5; // Reset to slightly above ground
            
            // If we're moving downward, stop vertical movement
            if (this.velocity.y < 0) {
                this.velocity.y = 0;
            }
        }
        
        // Apply damping to angular velocity (simulates friction in the steering system)
        this.angularVelocity *= 0.97; // Reduced angular velocity damping for smoother turning
        
    }
    
    /**
     * Check if vehicle is on or off road
     */
    checkSurfaceInteraction(world, dt) {
        // Check road boundaries
        const ROAD_HALF_WIDTH = 15; // Based on LANE_WIDTH * 1.5
        
        // IMPORTANT: Save previous off-road state for transition effects
        const wasOffRoad = this.isOffRoad;
        
        // Find the closest road segment to determine if we're on or off road
        let isOffRoad = true;
        let closestSegmentX = 0;
        let closestDistance = Infinity;
        
        if (world && world.roadSegments) {
            // Find the closest road segment to the vehicle
            let closestSegment = null;
            let closestZDistance = Infinity;
            
            // First, find the closest segment in Z-direction
            for (const segment of world.roadSegments) {
                // Get segment position in world space
                const segmentPos = new THREE.Vector3();
                segment.getWorldPosition(segmentPos);
                
                // Calculate Z-distance (distance along the road)
                const zDistance = Math.abs(segmentPos.z - this.position.z);
                
                // Find the segment we're currently on or closest to
                if (zDistance < closestZDistance) {
                    closestZDistance = zDistance;
                    closestSegment = segment;
                }
            }
            
            // If we found a close segment, check if we're on it
            if (closestSegment && closestZDistance < 30) {
                const segmentPos = new THREE.Vector3();
                closestSegment.getWorldPosition(segmentPos);
                
                // Calculate local coordinates relative to the segment
                // This takes into account the segment's rotation and position
                const localPoint = this.position.clone().sub(segmentPos);
                
                // Apply inverse segment rotation to get vehicle position in segment space
                if (closestSegment.rotation.y !== 0) {
                    const inverseRotation = new THREE.Matrix4().makeRotationY(-closestSegment.rotation.y);
                    localPoint.applyMatrix4(inverseRotation);
                }
                
                // Determine distance from center of road
                const distanceFromCenter = Math.abs(localPoint.x);
                
                // Check if we're on this segment of road
                isOffRoad = distanceFromCenter > ROAD_HALF_WIDTH;
                
                // Store for recovery forces
                closestSegmentX = localPoint.x;
                closestDistance = distanceFromCenter - ROAD_HALF_WIDTH;
            }
        } else {
            // Fallback to simple method if segments not available
            isOffRoad = Math.abs(this.position.x) > ROAD_HALF_WIDTH;
            closestSegmentX = this.position.x;
        }
        
        // Update off-road state
        this.isOffRoad = isOffRoad;
        
        // Apply off-road effects
        if (this.isOffRoad) {
            // Apply gradual speed reduction when off-road (gentler than before)
            this.speed *= 0.9998; // Virtually no speed reduction off-road
            
            // Only apply recovery forces if we're not deliberately steering
            if (!this.input.turnLeft && !this.input.turnRight) {
                // Very gentle force to guide back toward road (not force)
                const roadForce = -Math.sign(closestSegmentX) * 0.0005 * dt * Math.min(5, this.speed);
                
                // Apply as a subtle steering suggestion
                this.steeringAngle = THREE.MathUtils.lerp(this.steeringAngle, roadForce, 0.01);
            }
            
            // Only trigger the collision event once when transitioning to off-road
            if (!wasOffRoad && Math.abs(this.speed) > 20) {
                // Apply virtually no speed reduction when hitting edge at high speed
                const speedReduction = Math.min(Math.abs(this.speed) * 0.005, OFF_ROAD_DAMAGE/4);  // Further reduced to almost nothing
                this.speed *= (Math.abs(this.speed) - speedReduction) / Math.abs(this.speed);
                
                // Add a small vertical bounce for effect
                this.velocity.y += 0.3;
                
                // Trigger collision event for audio/visual feedback
                if (world && world.events) {
                    world.events.trigger('offRoadCollision');
                }
            }
        }
        
        // Update previous state for next frame
        this.wasOffRoad = this.isOffRoad;
    }
    
    /**
     * Update wheel rotation based on vehicle speed
     */
    updateWheelRotation(dt) {
        // Update wheel rotation speed based on vehicle speed
        this.wheelSpeed = this.speed / WHEEL_RADIUS;
        
        // Rotate all wheels for visual effect (each wheel rotates around its local X axis)
        // Note: Sign is important for correct rotation direction in forward vs reverse
        const rotationAmount = this.wheelSpeed * dt;
        
        if (this.frontWheels.length > 0) {
            this.frontWheels.forEach(wheel => {
                wheel.rotation.x -= rotationAmount;
            });
        }
        
        if (this.rearWheels.length > 0) {
            this.rearWheels.forEach(wheel => {
                wheel.rotation.x -= rotationAmount;
            });
        }
    }
    
    /**
     * Update vehicle direction vectors after movement
     */
    updateVehicleVectors() {
        // Update direction vector based on current rotation
        this.direction.set(0, 0, 1);
        this.right.set(1, 0, 0);
        this.up.set(0, 1, 0);
        
        // Create rotation matrix
        const rotationMatrix = new THREE.Matrix4().makeRotationY(this.rotation.y);
        
        // Apply rotation to direction vectors
        this.direction.applyMatrix4(rotationMatrix);
        this.right.applyMatrix4(rotationMatrix);
        
        // Ensure vectors are normalized
        this.direction.normalize();
        this.right.normalize();
        this.up.normalize();
    }
    
    /**
     * Calculate wheel position in world space
     */
    getWheelWorldPosition(wheel) {
        // Start with local wheel position
        const wheelPos = wheel.position.clone();
        
        // Create rotation matrix based on vehicle rotation
        const rotationMatrix = new THREE.Matrix4().makeRotationY(this.rotation.y);
        
        // Apply rotation to wheel position
        wheelPos.applyMatrix4(rotationMatrix);
        
        // Add vehicle position to get world position
        wheelPos.add(this.position);
        
        return wheelPos;
    }
    
    /**
     * Update visual aspects of the vehicle (tilting, bouncing)
     */
    updateVisuals(dt, time) {
        if (!this.mesh) return;
        
        // Calculate chassis tilt based on suspension compression
        let rollAngle = 0;
        let pitchAngle = 0;
        
        if (this.isGrounded) {
            // Calculate roll (tilt left/right) based on left/right suspension difference
            const leftSide = (this.wheels[0].compression + this.wheels[2].compression) / 2;
            const rightSide = (this.wheels[1].compression + this.wheels[3].compression) / 2;
            rollAngle = (rightSide - leftSide) * 0.5; // Tilts toward more compressed side
            
            // Calculate pitch (tilt forward/back) based on front/rear suspension difference
            const frontSide = (this.wheels[0].compression + this.wheels[1].compression) / 2;
            const rearSide = (this.wheels[2].compression + this.wheels[3].compression) / 2;
            pitchAngle = (frontSide - rearSide) * 0.5; // Tilts toward more compressed side
        }
        
        // Add dynamic tilt effects from steering and acceleration
        const steeringLean = this.steeringAngle * 0.2; // Tilt from steering angle
        const accelerationPitch = this.throttle > 0 ? -0.05 : (this.brake > 0 ? 0.1 : 0);
        
        // Add G-force effects during turning
        const gForceLean = this.angularVelocity * 0.3;
        
        // Apply combined tilt with smooth transition
        this.mesh.rotation.z = THREE.MathUtils.lerp(
            this.mesh.rotation.z || 0, 
            rollAngle + steeringLean + gForceLean, 
            0.15
        );
        
        this.mesh.rotation.x = THREE.MathUtils.lerp(
            this.mesh.rotation.x || 0,
            pitchAngle + accelerationPitch,
            0.15
        );
        
        // Add suspension bob based on wheel position
        if (time !== undefined) {
            const bounceHeight = this.isOffRoad 
                ? 0.15 * Math.sin(time * 20) // More intense bounce off-road
                : 0.05 * (this.speed / MAX_SPEED) * Math.sin(time * 10); // Normal bounce
                
            // Apply bounce height to mesh
            this.mesh.position.y = bounceHeight;
        }
    }
    
    /**
     * Set the 3D mesh for this vehicle
     */
    setMesh(mesh, frontWheels, rearWheels) {
        this.mesh = mesh;
        this.frontWheels = frontWheels || [];
        this.rearWheels = rearWheels || [];
    }
    
    /**
     * Apply vehicle's position and rotation to its mesh
     */
    updateMeshTransform() {
        if (!this.mesh) return;
        
        // Update mesh position from physics state
        this.mesh.position.copy(this.position);
        
        // Update mesh rotation (y-rotation only - roll/pitch handled in updateVisuals)
        this.mesh.rotation.y = this.rotation.y;
    }
    
    /**
     * Handle collision with an obstacle
     */
    collideWithObstacle() {
        // Reduce speed based on current speed (harder hit at higher speeds)
        const speedReduction = Math.min(Math.abs(this.speed), 60);
        const oldSpeed = this.speed;
        
        // Apply speed reduction in current direction
        this.speed = Math.sign(this.speed) * Math.max(0, Math.abs(this.speed) - speedReduction);
        
        // Apply a bounce in the opposite direction
        this.velocity.multiplyScalar(this.speed / oldSpeed);
        
        // Add a vertical bounce that's less dramatic
        this.velocity.y = 0.5;  // Smaller upward velocity
        
        // Add some random rotation for effect
        this.angularVelocity += (Math.random() - 0.5) * 0.2;
        
        // IMPORTANT: Ensure position doesn't go below ground
        // This fixes the sinking issue
        if (this.position.y < 0.5) {
            this.position.y = 0.5;  // Reset to slightly above ground
        }
        
        
        return {
            speedReduction,
            effects: ['heavyGlitch', 'screenShake', 'flashRed']
        };
    }
    
    /**
     * Get world-aligned bounding box for collision detection
     */
    getBoundingBox() {
        if (!this.mesh) return null;
        
        // Instead of using the entire mesh, create a custom bounding box
        // that more closely matches the car's actual body
        // The car body is 4x1x8 (from renderer.js line 295)
        
        // Create a custom bounding box slightly smaller than the car's visual body
        // to allow for more forgiving collision detection
        const halfWidth = 1.7; // Slightly smaller than car width (4 units / 2)
        const halfHeight = 0.5; // Car height (1 unit / 2) 
        const halfLength = 3.5; // Slightly smaller than car length (8 units / 2)
        
        // Use the car's position and rotation to position the hitbox
        const position = this.position.clone();
        
        // Create vectors for the corners of the box
        const frontVector = this.direction.clone().multiplyScalar(halfLength);
        const rightVector = this.right.clone().multiplyScalar(halfWidth);
        const upVector = this.up.clone().multiplyScalar(halfHeight);
        
        // Calculate min point (back-left-bottom corner)
        const min = position.clone()
            .sub(frontVector)
            .sub(rightVector)
            .sub(upVector);
            
        // Calculate max point (front-right-top corner)
        const max = position.clone()
            .add(frontVector)
            .add(rightVector)
            .add(upVector);
        
        return new THREE.Box3(min, max);
    }
}

// Export the vehicle class and constants
export { Vehicle, MAX_SPEED, ACCELERATION };