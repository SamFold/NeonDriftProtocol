# Neon Drift Protocol - Physics System Documentation

This document outlines the physics system powering the Neon Drift Protocol racing game, including recent improvements, design decisions, and future enhancement possibilities.

## Core Physics Constants

```javascript
const MAX_SPEED = 5000;                // Maximum speed (units/second)
const ACCELERATION = 2000;             // Base acceleration rate (units/second²)
const DECELERATION = 800;              // Braking rate (units/second²)
const ENGINE_BRAKING = 1.0;            // Passive deceleration when not accelerating
const DRAG_COEFFICIENT = 0.00015;      // Air resistance factor
const OFF_ROAD_FRICTION = 0.03;        // Friction multiplier when off road
```

## Recent Improvements

### 1. Braking & Reverse System (v1.2)

We implemented a dual-brake system with true reverse functionality:

- **Spacebar Emergency Brake**: Applies 6x deceleration force (4800 units/s²)
- **Down Arrow/S**: Serves as both normal brake and reverse
  - First acts as brake with 2x deceleration
  - When stopped, provides reverse acceleration at 40% of forward rate
- **Brake Priority**: When braking, acceleration input is completely ignored

#### Design Reasoning
- Arcade racers benefit from a clear "go/stop" control model
- Emergency brake provides dramatic stopping power for tight corners
- Two-stage reverse (brake→reverse) is intuitive for casual players

### 2. Mario Kart-Style Acceleration Curve (v1.3)

Implemented a non-linear acceleration curve for better feel:

```javascript
const speedRatio = Math.max(0, Math.min(1, this.speed / MAX_SPEED));
const accelerationMultiplier = 1.8 * Math.pow(1 - speedRatio, 1.5) + 0.2;
```

- **Standing Start**: 2.0× base acceleration
- **Mid-Range (50%)**: ~1.26× base acceleration
- **Top End (100%)**: 0.2× base acceleration

#### Design Reasoning
- Creates a satisfying launch feeling from standstill
- Provides good mid-range acceleration for passing
- Tapers naturally at high speeds, simulating air resistance
- Better matches player expectations from arcade racers

### 3. High-Speed Steering Stability (v1.4)

Modified high-speed handling to prevent unwanted spinouts while maintaining fun:

#### Improved Steering Reduction
```javascript
const speedFactor = Math.max(0.15, 1.0 - Math.pow(this.speed / MAX_SPEED, 0.7) * 0.85);
```
- Steering effectiveness reduces to 15% at max speed
- Non-linear reduction curve for natural feel

#### Non-Linear Angular Acceleration
```javascript
totalAngularAcceleration = directionFactor * steeringFactor * 
    Math.sqrt(Math.abs(this.speed) * 20) * speedFactor;
```
- Square root relationship prevents extreme turning at high speeds
- Maintains responsive handling at all speeds

#### Drift Threshold & Damping
- Increased drift threshold to 60% of max speed
- Added speed-based dampening to prevent excessive drift
- Traction loss calculation now more forgiving at high speeds

#### Design Reasoning
- Allows for tighter track designs with sharper turns
- Maintains arcade feel while reducing frustrating spinouts
- Better balance between control and challenge
- More consistent with F-Zero/Ridge Racer handling model

## Future Enhancement Ideas

### 1. Drifting System

```javascript
if (input.brake && input.accelerate && (input.turnLeft || input.turnRight)) {
    this.isDrifting = true;
    // Apply specialized drift physics
}
```

- **Visual Indicators**: Tire smoke, sparks, or neon trail effects
- **Drift Boost**: Mario Kart-style mini-boost after successful drift
- **Drift Counter**: Track and reward consecutive or extended drifts

### 2. Surface-Based Handling

- **Different Road Types**: Ice, wet roads, dirt sections with unique physics
- **Jump Physics**: Improved air control and landing impact
- **Banking**: Track sections with banked turns for higher-speed cornering

### 3. Handling Customization

- **Vehicle Classes**: Light (agile), Medium (balanced), Heavy (stable)
- **Stat Tradeoffs**: Speed vs. Acceleration vs. Handling vs. Grip
- **Unlockable Upgrades**: Engine boost, better brakes, improved tires

### 4. Advanced Physics Refinements

- **Progressive Grip Model**: More realistic grip that builds/fades gradually
- **Weight Transfer**: Simulated weight shift during acceleration/braking
- **Suspension Improvements**: More realistic bounce and body roll
- **Collision Improvements**: Better bounce-off physics for wall collisions

## Implementation Notes

The physics system uses Three.js for vector mathematics and runs at variable frame rates with delta-time adjustment. All physics constants were determined through extensive playtesting to prioritize fun over simulation accuracy, consistent with the game's vaporwave arcade aesthetic.

## Physics-Based Game Mechanics

Future gameplay elements could include:
- Slip-stream/drafting mechanic for speed boosts
- Speed-based score multipliers
- High-speed obstacle course segments
- Track segments requiring emergency braking
- Specialized drift-only shortcuts

