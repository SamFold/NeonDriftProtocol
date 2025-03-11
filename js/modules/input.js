/**
 * Input Module for Neon Drift Protocol
 * 
 * Handles all user input including:
 * - Keyboard controls
 * - Game control state
 * - Debug mode toggling
 */

// Default key bindings
const KEY_BINDINGS = {
    ACCELERATE: ['ArrowUp', 'w', 'W'],
    BRAKE: [' '], // Spacebar is now the dedicated brake
    REVERSE: ['ArrowDown', 's', 'S'], // Down arrow now controls reverse
    TURN_LEFT: ['ArrowLeft', 'a', 'A'],
    TURN_RIGHT: ['ArrowRight', 'd', 'D'],
    DEBUG_TOGGLE: ['d', 'D']
};

// Input handler class
class InputHandler {
    constructor() {
        this.keysPressed = {};
        this.debugMode = false;
        this.gameActive = false;
        this.eventHandlers = {};
        
        // Initialize key state
        this.inputState = {
            accelerate: false,
            brake: false,
            reverse: false, // Added reverse state
            turnLeft: false,
            turnRight: false
        };
    }
    
    /**
     * Initialize input handler
     */
    init() {
        this.setupEventListeners();
        return this;
    }
    
    /**
     * Setup keyboard event listeners
     */
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Start game when start button is clicked
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.addEventListener('click', this.startGame.bind(this));
        }
    }
    
    /**
     * Handle key down events
     */
    handleKeyDown(event) {
        this.keysPressed[event.key] = true;
        
        // Update input state based on pressed keys
        this.updateInputState();
        
        // Check for debug mode toggle
        if (KEY_BINDINGS.DEBUG_TOGGLE.includes(event.key)) {
            this.toggleDebugMode();
        }
    }
    
    /**
     * Handle key up events
     */
    handleKeyUp(event) {
        this.keysPressed[event.key] = false;
        
        // Update input state based on released keys
        this.updateInputState();
    }
    
    /**
     * Update the input state based on pressed keys
     */
    updateInputState() {
        // Store previous state to detect changes
        const prevState = { ...this.inputState };
        
        // Check acceleration keys
        this.inputState.accelerate = KEY_BINDINGS.ACCELERATE.some(key => this.keysPressed[key]);
        
        // Check brake keys (spacebar)
        this.inputState.brake = KEY_BINDINGS.BRAKE.some(key => this.keysPressed[key]);
        
        // Check reverse keys (down arrow/S)
        this.inputState.reverse = KEY_BINDINGS.REVERSE.some(key => this.keysPressed[key]);
        
        // Check turn left keys
        this.inputState.turnLeft = KEY_BINDINGS.TURN_LEFT.some(key => this.keysPressed[key]);
        
        // Check turn right keys
        this.inputState.turnRight = KEY_BINDINGS.TURN_RIGHT.some(key => this.keysPressed[key]);
        
        // Debug log if state changes
        if (JSON.stringify(prevState) !== JSON.stringify(this.inputState)) {

        }
    }
    
    /**
     * Toggle debug mode
     */
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        
        // Trigger debug mode event
        this.triggerEvent('debugToggle', this.debugMode);
        
    }
    
    /**
     * Start the game
     */
    startGame() {
        if (this.gameActive) return;
        
        this.gameActive = true;
        
        // Hide intro screen
        const introScreen = document.getElementById('intro');
        if (introScreen) {
            introScreen.style.display = 'none';
        }
        
        // Trigger game start event
        this.triggerEvent('gameStart');
    }
    
    /**
     * Get the current input state
     */
    getInputState() {
        return { ...this.inputState };
    }
    
    /**
     * Check if a specific input is active
     */
    isInputActive(inputName) {
        return this.inputState[inputName] || false;
    }
    
    /**
     * Get raw key state
     */
    isKeyPressed(key) {
        return !!this.keysPressed[key];
    }
    
    /**
     * Check if the game is active
     */
    isGameActive() {
        return this.gameActive;
    }
    
    /**
     * Check if debug mode is enabled
     */
    isDebugMode() {
        return this.debugMode;
    }
    
    /**
     * Register an event handler
     */
    on(event, callback) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        this.eventHandlers[event].push(callback);
    }
    
    /**
     * Unregister an event handler
     */
    off(event, callback) {
        if (!this.eventHandlers[event]) return;
        this.eventHandlers[event] = this.eventHandlers[event].filter(cb => cb !== callback);
    }
    
    /**
     * Trigger an event
     */
    triggerEvent(event, data) {
        if (!this.eventHandlers[event]) return;
        this.eventHandlers[event].forEach(callback => callback(data));
    }
}

// Export the input handler class
export { InputHandler };