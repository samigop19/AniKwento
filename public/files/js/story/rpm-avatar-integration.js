/**
 * ReadyPlayerMe Avatar Integration with ElevenLabs TTS Lip-sync
 * Handles 3D avatar rendering and synchronized lip movements with audio narration
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import GUI from 'lil-gui';

const RPMAvatar = {
    scene: null,
    camera: null,
    renderer: null,
    avatar: null,
    mixer: null,
    clock: null,
    container: null,
    isInitialized: false,
    loadingProgress: 0, // Track loading progress 0-100%
    isFullyLoaded: true, // Default to true - will be set to false when actually loading an avatar
    isSpeaking: false,
    currentAudio: null,
    animationFrameId: null,
    simpleAnimationFrameId: null, // For simple lip-sync animation loop
    headBone: null,
    rightShoulderBone: null,
    leftShoulderBone: null,
    rightArmBone: null,
    leftArmBone: null,
    rightLowerArmBone: null,
    leftLowerArmBone: null,
    rightHandBone: null,
    leftHandBone: null,
    spine: null,
    neckBone: null,
    hips: null,
    rightUpperLeg: null,
    leftUpperLeg: null,
    rightLowerLeg: null,
    leftLowerLeg: null,
    rightFoot: null,
    leftFoot: null,
    skinnedMeshes: [], // Store ALL SkinnedMeshes for skeleton updates
    teachingAnimationActive: false,
    gestureTime: 0,
    basePose: null, // Store base pose values for animation
    gui: null, // lil-gui instance for debugging bone rotations
    enableAnimations: true, // Toggle to disable animations for manual bone control

    // Pose transition system for smooth animations between idle and teaching poses
    poseTransitionActive: false,
    poseTransitionStartTime: 0,
    poseTransitionDuration: 1.8, // 1.8 seconds for ultra-smooth transition (increased from 1.0)
    poseTransitionStartValues: null, // Starting bone rotations
    poseTransitionTargetValues: null, // Target bone rotations

    // Teaching rotation loop variables
    teachingRotationStartTime: 0, // When current teaching rotation started
    teachingRotationDuration: 3.0, // Duration of current rotation cycle (randomized 2-4 seconds)
    teachingRotationProgress: 0, // Current progress (0-1) in the rotation cycle

    // Hand gesture cycle variables for smooth looping animations
    handGestureCycleStartTime: 0, // When current hand gesture cycle started
    handGestureCycleDuration: 4.0, // Duration of one complete hand gesture cycle (4 seconds)
    handGesturePhase: 0, // Current phase of the gesture cycle (0-1)

    // Viseme smoothing and clamping
    previousVisemeWeights: {}, // Store previous viseme weights for smoothing
    visemeSmoothingFactor: 0.28, // Higher = smoother but more lag (0-1) - Optimized for ultra-smooth animation (increased from 0.20)

    // Idle animation cycle system - Alternates between idle poses
    idleAnimationTimer: null, // Timer for switching between idle poses
    idleAnimationIntervalMin: 5000, // Minimum 5 seconds in idle pose before waving
    idleAnimationIntervalMax: 10000, // Maximum 10 seconds in idle pose before waving
    waveAnimationDuration: 2500, // 2.5 seconds of waving motion
    currentIdlePoseIndex: 0, // 0 = setIdlePose, 1 = setIdleWavePose
    isIdleAnimationActive: false, // Track if idle animation cycle is running

    // Wave motion animation system
    isWaving: false, // Track if currently performing wave motion
    waveStartTime: 0, // When the wave motion started
    waveAnimationSpeed: 2.0, // Speed of the waving motion (cycles per second) - slowed down for natural motion
    waveDelayTimer: null, // Timer to delay wave motion by 1 second after pose transition starts

    // Random wave on pause system
    randomWaveTimer: null, // Timer for random wave animations when paused
    isRandomWaveActive: false, // Track if random wave system is active (during pause)
    pausedWaveIntervalMin: 4000, // Minimum 4 seconds between waves when paused
    pausedWaveIntervalMax: 7000, // Maximum 7 seconds between waves when paused
    shouldStartWaveOnIdleComplete: false, // Flag to trigger wave animations after idle transition

    // Animation utilities - Centralized easing and interpolation functions
    easing: {
        // Linear interpolation (no easing)
        linear: (t) => t,

        // Smooth start and end (used for most animations)
        easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
        easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
        easeInOutQuart: (t) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
        easeInOutQuint: (t) => t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2,

        // Smooth end only
        easeOutQuad: (t) => 1 - (1 - t) * (1 - t),
        easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
        easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),

        // Smooth start only
        easeInQuad: (t) => t * t,
        easeInCubic: (t) => t * t * t,
        easeInQuart: (t) => t * t * t * t,

        // Elastic/bounce effects (for special animations)
        easeOutElastic: (t) => {
            const c4 = (2 * Math.PI) / 3;
            return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
        },

        // Back easing (slight overshoot)
        easeInOutBack: (t) => {
            const c1 = 1.70158;
            const c2 = c1 * 1.525;
            return t < 0.5
                ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
                : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
        }
    },

    /**
     * Centralized lerp (linear interpolation) function
     * @param {number} start - Starting value
     * @param {number} end - Ending value
     * @param {number} t - Progress (0-1)
     * @param {function} easingFn - Optional easing function from this.easing
     * @returns {number} Interpolated value
     */
    lerp(start, end, t, easingFn = null) {
        const progress = easingFn ? easingFn(t) : t;
        return start + (end - start) * progress;
    },

    /**
     * Interpolate a 3D rotation (x, y, z) with easing
     * @param {Object} start - Starting rotation {x, y, z}
     * @param {Object} end - Target rotation {x, y, z}
     * @param {number} t - Progress (0-1)
     * @param {function} easingFn - Optional easing function
     * @returns {Object} Interpolated rotation {x, y, z}
     */
    lerpRotation(start, end, t, easingFn = null) {
        return {
            x: this.lerp(start.x, end.x, t, easingFn),
            y: this.lerp(start.y, end.y, t, easingFn),
            z: this.lerp(start.z, end.z, t, easingFn)
        };
    },

    /**
     * Apply interpolated rotation to a bone
     * @param {THREE.Bone} bone - The bone to update
     * @param {Object} start - Starting rotation {x, y, z}
     * @param {Object} end - Target rotation {x, y, z}
     * @param {number} t - Progress (0-1)
     * @param {function} easingFn - Optional easing function
     */
    applyLerpRotation(bone, start, end, t, easingFn = null) {
        if (!bone || !start || !end) return;
        const rotation = this.lerpRotation(start, end, t, easingFn);
        bone.rotation.x = rotation.x;
        bone.rotation.y = rotation.y;
        bone.rotation.z = rotation.z;
    },

    /**
     * Framerate-independent smooth damping (for continuous animations)
     * Similar to Unity's SmoothDamp - useful for idle movements
     * @param {number} current - Current value
     * @param {number} target - Target value
     * @param {number} smoothTime - Approximate time to reach target (in seconds)
     * @param {number} deltaTime - Time since last frame (in seconds)
     * @returns {number} Smoothly interpolated value
     */
    smoothDamp(current, target, smoothTime, deltaTime) {
        // Exponential smoothing that works across different framerates
        const omega = 2.0 / smoothTime;
        const x = omega * deltaTime;
        const exp = 1.0 / (1.0 + x + 0.48 * x * x + 0.235 * x * x * x);
        return current + (target - current) * (1.0 - exp);
    },

    /**
     * Framerate-independent smooth damping for 3D rotations
     * @param {Object} current - Current rotation {x, y, z}
     * @param {Object} target - Target rotation {x, y, z}
     * @param {number} smoothTime - Approximate time to reach target (in seconds)
     * @param {number} deltaTime - Time since last frame (in seconds)
     * @returns {Object} Smoothly interpolated rotation {x, y, z}
     */
    smoothDampRotation(current, target, smoothTime, deltaTime) {
        return {
            x: this.smoothDamp(current.x, target.x, smoothTime, deltaTime),
            y: this.smoothDamp(current.y, target.y, smoothTime, deltaTime),
            z: this.smoothDamp(current.z, target.z, smoothTime, deltaTime)
        };
    },

    /**
     * Create a smooth animation transition from current bone state to target rotation
     * This is a helper function for initiating smooth transitions
     * @param {THREE.Bone} bone - The bone to animate
     * @param {Object} targetRotation - Target rotation {x, y, z}
     * @param {number} duration - Animation duration in seconds (optional, defaults to headAnimationDuration)
     * @returns {Object} Start and target rotation objects for use in animation loop
     */
    createSmoothTransition(bone, targetRotation, duration = null) {
        if (!bone) {
            console.warn('⚠️ createSmoothTransition: bone is null');
            return null;
        }

        // Capture current rotation as starting point
        const startRotation = {
            x: bone.rotation.x,
            y: bone.rotation.y,
            z: bone.rotation.z
        };

        // Return transition data
        return {
            startRotation,
            targetRotation,
            duration: duration || this.headAnimationDuration,
            startTime: this.clock.getElapsedTime()
        };
    },

    /**
     * Randomize teaching rotation duration between 4-6 seconds
     * @returns {number} Random duration in seconds
     */
    randomizeTeachingRotationDuration() {
        // Generate random duration between 4.0 and 6.0 seconds
        return 4.0 + Math.random() * 2.0;
    },

    /**
     * Calculate smooth gesture animation value with ease-in-out and return to base
     * This creates a smooth cycle: base -> gesture -> base
     * @param {number} phase - Current phase (0-1) in the gesture cycle
     * @param {number} amplitude - Maximum offset from base position
     * @param {number} offset - Phase offset for variation between axes
     * @returns {number} Animated offset value
     */
    calculateGestureOffset(phase, amplitude, offset = 0) {
        // Add phase offset for variation
        let adjustedPhase = (phase + offset) % 1.0;

        // Use a smooth ease-in-out curve that returns to 0 at both ends
        // This creates: 0 -> peak -> 0 cycle
        // Using sin for smooth oscillation that naturally returns to base
        const easedValue = Math.sin(adjustedPhase * Math.PI * 2) * amplitude;

        // Apply additional easing for smoother transitions at the peaks
        // This uses easeInOutCubic for the amplitude itself
        const easingT = adjustedPhase < 0.5
            ? 4 * adjustedPhase * adjustedPhase * adjustedPhase
            : 1 - Math.pow(-2 * adjustedPhase + 2, 3) / 2;

        // Blend between sin wave and eased version for ultra-smooth motion
        return easedValue * (0.7 + easingT * 0.3);
    },

    // Vowel-specific smoothing for A, E, I, O, U
    vowelSmoothingFactor: 0.42, // Extra smoothing for vowels (0-1) - Optimized for natural transitions (increased from 0.35)
    vowelVisemes: ['viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U'], // Vowel visemes that need extra smoothing

    // Blinking animation state
    blinkTimer: 0,
    blinkInterval: Math.random() * 4 + 2, // blink every 2–6 seconds
    isBlinking: false,
    blinkEnabled: true, // Toggle automatic blinking
    blinkAnimationFrameId: null,

    // Audio analyzer for bone-based lip sync
    audioAnalyzer: null,
    audioListener: null,
    threeAudio: null,
    jawBone: null,
    useAudioAnalyzer: true, // Toggle between morph target and bone-based lip sync

    // Avatar configuration
    avatarUrl: 'https://models.readyplayer.me/68ef4192e831796787c84586.glb?morphTargets=ARKit,Oculus Visemes', // Default avatar with ARKit and Oculus visemes
    avatarGender: null, // Will be detected from avatar URL ('male' or 'female')

    // Oculus OVR LipSync viseme blend shapes (15 visemes)
    // Reference: https://docs.readyplayer.me/ready-player-me/api-reference/avatars/morph-targets/oculus-ovr-libsync
    oculusVisemes: [
        'viseme_sil',  // Silence
        'viseme_PP',   // p, b, m - lips together
        'viseme_FF',   // f, v - lower lip to upper teeth
        'viseme_TH',   // th - tongue between teeth
        'viseme_DD',   // d, t, n - tongue to roof
        'viseme_kk',   // k, g - back of tongue up
        'viseme_CH',   // ch, j, sh - lips forward
        'viseme_SS',   // s, z - tongue near teeth
        'viseme_nn',   // n, l - tongue to roof
        'viseme_RR',   // r - lips slightly rounded
        'viseme_aa',   // a - open mouth
        'viseme_E',    // e - slightly open
        'viseme_I',    // i - slight smile
        'viseme_O',    // o - rounded lips
        'viseme_U'     // u - tight rounded lips
    ],

    // Additional facial animation blend shapes supported by Ready Player Me
    additionalBlendShapes: {
        'mouthOpen': null,      // General mouth opening
        'mouthSmile': null,     // Smile expression
        'eyesClosed': null,     // Eye blinking/closing
        'eyesLookUp': null,     // Eyes looking up
        'eyesLookDown': null    // Eyes looking down
    },

    // Morph target indices for lip-sync (standard viseme blend shapes)
    visemeMap: {
        'sil': null,     // Silence
        'PP': 'viseme_PP',  // p, b, m
        'FF': 'viseme_FF',  // f, v
        'TH': 'viseme_TH',  // th
        'DD': 'viseme_DD',  // d, t, n
        'kk': 'viseme_kk',  // k, g
        'CH': 'viseme_CH',  // ch, j, sh
        'SS': 'viseme_SS',  // s, z
        'nn': 'viseme_nn',  // n, l
        'RR': 'viseme_RR',  // r
        'aa': 'viseme_aa',  // a
        'E': 'viseme_E',    // e
        'I': 'viseme_I',    // i
        'O': 'viseme_O',    // o
        'U': 'viseme_U'     // u
    },

    morphTargets: {},
    hasLipSyncSupport: false, // Track if avatar has proper lip-sync capabilities
    hasOculusVisemes: false, // Track if avatar has full Oculus OVR LipSync support

    /**
     * Initialize the 3D avatar system with unlimited retries
     */
    async init() {
        console.log('🎭 Initializing ReadyPlayerMe Avatar...');

        // Mark as not loaded while initializing
        this.isFullyLoaded = false;
        this.loadingProgress = 0;

        let attempt = 0;
        const maxRetryDelay = 10000; // Maximum 10 seconds between retries

        while (true) {
            attempt++;
            console.log(`🔄 Avatar initialization attempt #${attempt}...`);

            try {
                this.container = document.getElementById('avatarContainer');
                if (!this.container) {
                    throw new Error('Avatar container not found');
                }

                // Initialize Three.js scene (only on first attempt)
                if (attempt === 1) {
                    this.setupScene();
                }

                // Load the avatar
                await this.loadAvatar(this.avatarUrl);

                // Start rendering loop (only on first successful load)
                if (!this.animationFrameId) {
                    this.animate();
                }

                // Hide loading indicator
                const loadingEl = document.getElementById('avatar-loading-indicator');
                if (loadingEl) {
                    loadingEl.style.display = 'none';
                }

                this.isInitialized = true;
                this.isFullyLoaded = true; // Mark as fully loaded and ready
                this.loadingProgress = 100;
                console.log(`✅ Avatar initialized successfully on attempt #${attempt}`);

                // Dispatch custom event to notify other systems that avatar is ready
                window.dispatchEvent(new CustomEvent('avatarFullyLoaded', {
                    detail: { progress: 100, isReady: true }
                }));

                // Start automatic blinking animation
                this.startAutomaticBlinking();

                break; // Success! Exit the retry loop

            } catch (error) {
                console.error(`❌ Failed to initialize avatar (attempt #${attempt}):`, error);

                // Calculate retry delay with exponential backoff (capped at maxRetryDelay)
                const retryDelay = Math.min(1000 * Math.pow(1.5, attempt - 1), maxRetryDelay);
                console.log(`⏳ Retrying in ${(retryDelay / 1000).toFixed(1)} seconds...`);

                // Update loading indicator to show retry status
                const loadingEl = document.getElementById('avatar-loading-indicator');
                if (loadingEl) {
                    const loadingText = loadingEl.querySelector('p');
                    if (loadingText) {
                        loadingText.textContent = `Loading Avatar... (Attempt ${attempt}, retrying in ${(retryDelay / 1000).toFixed(1)}s)`;
                    }
                }

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, retryDelay));

                // Continue to next iteration (retry)
            }
        }
    },

    /**
     * Setup Three.js scene, camera, and renderer
     */
    setupScene() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = null; // Transparent background

        // Create camera - positioned to focus on upper body and face for seated teaching pose
        this.camera = new THREE.PerspectiveCamera(
            55, // FOV optimized for upper body focus
            this.container.clientWidth / this.container.clientHeight, // Aspect ratio
            0.05, // Near plane
            1000 // Far plane
        );
        // Reset camera to a standard, neutral position
        this.camera.position.set(0, 1.5, 3.5);
        this.camera.lookAt(0, 2, 0);

        // Create renderer with optimizations for smooth animations
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true, // Enable transparency
            powerPreference: 'high-performance', // Use GPU for better performance
            stencil: false, // Disable stencil buffer if not needed (performance boost)
            depth: true // Keep depth buffer for proper rendering
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance

        // Enable shadows only if needed (currently disabled for performance)
        this.renderer.shadowMap.enabled = false;

        this.container.appendChild(this.renderer.domElement);

        // Light to remove dark shadows - increased brightness
        const light = new THREE.DirectionalLight(0xffffff, 2.5);
        light.position.set(0, 5, 5);
        this.scene.add(light);

        const ambient = new THREE.AmbientLight(0xffffff, 1.5);
        this.scene.add(ambient);

        // Initialize clock for animations
        this.clock = new THREE.Clock();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());

        console.log('✅ Three.js scene setup complete');
    },

    /**
     * Load ReadyPlayerMe avatar from URL with unlimited retries
     */
    async loadAvatar(url, retryAttempt = 0) {
        const maxRetryDelay = 10000; // Maximum 10 seconds between retries

        while (true) {
            retryAttempt++;
            console.log(`📦 Loading avatar from: ${url} (Load attempt #${retryAttempt})`);

            try {
                const avatar = await new Promise((resolve, reject) => {
                    const loader = new GLTFLoader();

                    // Set a timeout for the loading process (60 seconds)
                    const loadTimeout = setTimeout(() => {
                        reject(new Error('Avatar loading timeout after 60 seconds'));
                    }, 60000);

                    loader.load(
                        url,
                        (gltf) => {
                            clearTimeout(loadTimeout);
                            this.loadingProgress = 100; // Mark as 100% loaded
                            this.avatar = gltf.scene;

                            // Add to scene
                            this.scene.add(this.avatar);

                            // Position and scale avatar for natural seated pose centered in view
                            // Lower the avatar significantly to simulate seated position (pelvis lowered)
                            // Reset avatar position and scale to default
                            this.avatar.position.set(0, -1.6, 0); // Lowered the avatar to center it in the new camera view
                            this.avatar.scale.set(2.1, 2.1, 2.1); // Increased size for better visibility
                            this.avatar.visible = true;

                            // Stop default animations that might override the pose
                            if (gltf.animations && gltf.animations.length > 0) {
                                this.mixer = new THREE.AnimationMixer(this.avatar);
                                gltf.animations.forEach(clip => {
                                    const action = this.mixer.clipAction(clip);
                                    action.stop(); // important
                                });
                            }


                            // Find and store morph targets for lip-sync
                            this.findMorphTargets();

                            // Find and cache bones for animations - log all bone names
                            this.findBones();

                            // Detect avatar gender from URL
                            this.detectAvatarGender();

                            // Fix left shoulder bone if needed
                            this.fixLeftShoulderBone();

                            // Apply idle pose as the default starting pose
                            this.setIdlePose();

                            // Start the idle animation cycle (alternates between idle and wave every 8 seconds)
                            this.startIdleAnimationCycle();

                            // Setup debug GUI for bone control (DISABLED - See avatar-bone-control.js to enable)
                            // To enable: Load avatar-bone-control.js and call AvatarBoneControl.enable(window.RPMAvatar)
                            // this.setupDebugGUI();

                            console.log(`✅ Avatar loaded successfully on load attempt #${retryAttempt}`);
                            console.log('🎭 Animation system status:');
                            console.log('   - Base pose defined:', !!this.basePose);
                            console.log('   - Lip-sync support:', this.hasLipSyncSupport);
                            console.log('   - Oculus OVR LipSync:', this.hasOculusVisemes ? '✅ FULL SUPPORT (15/15)' : '⚠️ Partial or no support');
                            console.log('   - Audio Analyzer mode:', this.useAudioAnalyzer);
                            console.log('   - Additional blend shapes:', Object.keys(this.additionalBlendShapes).filter(k => this.additionalBlendShapes[k] !== null));
                            console.log('   - Bones found:', {
                                rightArm: !!this.rightArmBone,
                                leftArm: !!this.leftArmBone,
                                rightLowerArm: !!this.rightLowerArmBone,
                                leftLowerArm: !!this.leftLowerArmBone,
                                rightHand: !!this.rightHandBone,
                                leftHand: !!this.leftHandBone,
                                spine: !!this.spine,
                                head: !!this.headBone,
                                jaw: !!this.jawBone,
                                hips: !!this.hips,
                                rightUpperLeg: !!this.rightUpperLeg,
                                leftUpperLeg: !!this.leftUpperLeg,
                                rightLowerLeg: !!this.rightLowerLeg,
                                leftLowerLeg: !!this.leftLowerLeg,
                                rightFoot: !!this.rightFoot,
                                leftFoot: !!this.leftFoot
                            });
                            console.log('   - Animation loop running:', !!this.animationFrameId);
                            resolve(this.avatar);
                        },
                        (progress) => {
                            if (progress.total > 0) {
                                const percent = (progress.loaded / progress.total) * 100;
                                this.loadingProgress = Math.min(95, percent); // Cap at 95% until fully initialized
                                console.log(`📦 Loading avatar: ${percent.toFixed(0)}% (${progress.loaded}/${progress.total} bytes)`);

                                // Update loading indicator with percentage
                                const loadingEl = document.getElementById('avatar-loading-indicator');
                                if (loadingEl) {
                                    const loadingText = loadingEl.querySelector('p');
                                    if (loadingText) {
                                        loadingText.textContent = `Loading Avatar... ${this.loadingProgress.toFixed(0)}%`;
                                    }
                                }
                            } else {
                                console.log(`📦 Loading avatar: ${progress.loaded} bytes loaded...`);
                            }
                        },
                        (error) => {
                            clearTimeout(loadTimeout);
                            console.error('❌ GLTF Loader error:', error);
                            reject(error);
                        }
                    );
                });

                // If we get here, loading was successful
                return avatar;

            } catch (error) {
                console.error(`❌ Failed to load avatar (load attempt #${retryAttempt}):`, error);
                console.error('   Error type:', error.name);
                console.error('   Error message:', error.message);

                // Calculate retry delay with exponential backoff (capped at maxRetryDelay)
                const retryDelay = Math.min(1000 * Math.pow(1.5, retryAttempt - 1), maxRetryDelay);
                console.log(`⏳ Retrying avatar load in ${(retryDelay / 1000).toFixed(1)} seconds...`);

                // Update loading indicator
                const loadingEl = document.getElementById('avatar-loading-indicator');
                if (loadingEl) {
                    const loadingText = loadingEl.querySelector('p');
                    if (loadingText) {
                        loadingText.textContent = `Loading Avatar... (Load attempt ${retryAttempt}, retrying in ${(retryDelay / 1000).toFixed(1)}s)`;
                    }
                }

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, retryDelay));

                // Continue to next iteration (retry)
            }
        }
    },

    /**
     * Find and cache morph targets (blend shapes) for lip-sync
     * Now includes Oculus OVR LipSync viseme detection and additional blend shapes
     */
    findMorphTargets() {
        console.log('🔍 Searching for Oculus OVR LipSync morph targets...');

        let meshesChecked = 0;
        let hasVisemeBlendShapes = false;
        let hasBasicMouthShapes = false;
        let oculusVisemeCount = 0;

        // Store ALL meshes with morph targets (not just one)
        const meshesWithMorphTargets = [];

        this.avatar.traverse((child) => {
            if (child.isMesh) {
                meshesChecked++;
                console.log(`   Checking mesh ${meshesChecked}: ${child.name}`, {
                    hasMorphTargets: !!child.morphTargetDictionary,
                    morphTargetCount: child.morphTargetDictionary ? Object.keys(child.morphTargetDictionary).length : 0
                });

                if (child.morphTargetDictionary) {
                    console.log('📋 Found mesh with morph targets:', child.name);
                    console.log('   Available morph targets:', Object.keys(child.morphTargetDictionary));

                    const morphTargetKeys = Object.keys(child.morphTargetDictionary);

                    // Check for Oculus OVR LipSync visemes (all 15)
                    const foundOculusVisemes = this.oculusVisemes.filter(viseme =>
                        morphTargetKeys.includes(viseme)
                    );

                    console.log(`   🎯 Found ${foundOculusVisemes.length}/15 Oculus OVR LipSync visemes:`, foundOculusVisemes);

                    // Check for additional blend shapes
                    const foundAdditionalShapes = {};
                    Object.keys(this.additionalBlendShapes).forEach(shapeName => {
                        if (morphTargetKeys.includes(shapeName)) {
                            foundAdditionalShapes[shapeName] = child.morphTargetDictionary[shapeName];
                        }
                    });

                    if (Object.keys(foundAdditionalShapes).length > 0) {
                        console.log(`   ✨ Found ${Object.keys(foundAdditionalShapes).length} additional blend shapes:`, Object.keys(foundAdditionalShapes));
                        // Store additional blend shape indices
                        Object.keys(foundAdditionalShapes).forEach(key => {
                            this.additionalBlendShapes[key] = foundAdditionalShapes[key];
                        });
                    }

                    // Check for proper viseme blend shapes
                    const visemeNames = morphTargetKeys.filter(name =>
                        name.toLowerCase().includes('viseme')
                    );
                    console.log(`   ✅ Found ${visemeNames.length} visemes in ${child.name}:`, visemeNames);

                    // Check for basic mouth shapes (mouthOpen/mouthSmile)
                    const hasMouthOpen = morphTargetKeys.includes('mouthOpen');
                    const hasMouthSmile = morphTargetKeys.includes('mouthSmile');
                    const hasBasicMouth = hasMouthOpen || hasMouthSmile;

                    // CRITICAL: Store meshes that have either visemes OR basic mouth shapes
                    // Priority: visemes first, then basic mouth shapes
                    if (visemeNames.length > 0) {
                        const hasFullOculusSet = foundOculusVisemes.length === 15;
                        meshesWithMorphTargets.push({
                            mesh: child,
                            indices: child.morphTargetDictionary,
                            visemeCount: visemeNames.length,
                            hasVisemes: true,
                            hasBasicMouth: hasBasicMouth,
                            hasOculusVisemes: hasFullOculusSet,
                            oculusVisemeCount: foundOculusVisemes.length,
                            additionalShapes: foundAdditionalShapes
                        });
                        hasVisemeBlendShapes = true;
                        oculusVisemeCount = Math.max(oculusVisemeCount, foundOculusVisemes.length);

                        if (hasFullOculusSet) {
                            console.log(`   ✅ ${child.name} - FULL OCULUS OVR LIPSYNC SUPPORT (15/15 visemes)`);
                        } else {
                            console.log(`   ✅ ${child.name} - has ${visemeNames.length} viseme blend shapes (PARTIAL SUPPORT: ${foundOculusVisemes.length}/15 Oculus visemes)`);
                        }
                    } else if (hasBasicMouth) {
                        meshesWithMorphTargets.push({
                            mesh: child,
                            indices: child.morphTargetDictionary,
                            visemeCount: 0,
                            hasVisemes: false,
                            hasBasicMouth: true,
                            hasOculusVisemes: false,
                            oculusVisemeCount: 0,
                            additionalShapes: foundAdditionalShapes
                        });
                        hasBasicMouthShapes = true;
                        console.log(`   ✅ ${child.name} added - has mouthOpen/mouthSmile (LIMITED SUPPORT)`);
                    } else {
                        console.log(`   ⚠️ ${child.name} has morph targets but no mouth/viseme shapes - skipping`);
                    }

                    // Also check for any morph target influences
                    if (child.morphTargetInfluences) {
                        console.log('   Morph target influences array length:', child.morphTargetInfluences.length);
                    }
                }
            }
        });

        console.log(`🔍 Total meshes checked: ${meshesChecked}`);
        console.log(`🔍 Total meshes with VISEME morph targets: ${meshesWithMorphTargets.length}`);
        console.log(`🎯 Oculus OVR LipSync visemes found: ${oculusVisemeCount}/15`);

        // Store all meshes with morph targets
        if (meshesWithMorphTargets.length > 0) {
            // Keep backward compatibility by storing first mesh in old location
            this.morphTargets.mesh = meshesWithMorphTargets[0].mesh;
            this.morphTargets.indices = meshesWithMorphTargets[0].indices;

            // Store ALL meshes for proper lip-sync
            this.morphTargets.allMeshes = meshesWithMorphTargets;

            // Check if we have full Oculus support
            this.hasOculusVisemes = oculusVisemeCount === 15;
        }

        // Validate lip-sync support
        if (!this.morphTargets.mesh) {
            console.warn('❌ No morph targets found - lip-sync will NOT work');
            console.warn('   This avatar does not support facial animations');
            this.hasLipSyncSupport = false;
            this.hasOculusVisemes = false;
        } else if (hasVisemeBlendShapes) {
            if (this.hasOculusVisemes) {
                console.log('✅ ✨ FULL OCULUS OVR LIPSYNC SUPPORT - avatar has all 15 viseme blend shapes');
                console.log('   Additional blend shapes available:', Object.keys(this.additionalBlendShapes).filter(k => this.additionalBlendShapes[k] !== null));
            } else {
                console.log('✅ Full lip-sync support detected - avatar has viseme blend shapes');
                console.log(`   ⚠️ Partial Oculus support: ${oculusVisemeCount}/15 visemes`);
            }
            this.hasLipSyncSupport = true;
        } else if (hasBasicMouthShapes) {
            console.warn('⚠️ LIMITED lip-sync support - avatar only has basic mouth shapes (mouthOpen/mouthSmile)');
            console.warn('   Lip-sync will use fallback animation instead of accurate phoneme-based sync');
            this.hasLipSyncSupport = 'limited';
            this.hasOculusVisemes = false;
        } else {
            console.warn('❌ No lip-sync support - avatar has morph targets but no mouth/viseme shapes');
            console.warn('   Available shapes:', Object.keys(this.morphTargets.indices || {}).join(', '));
            this.hasLipSyncSupport = false;
            this.hasOculusVisemes = false;
        }

        console.log('🎭 Lip-sync capability:', this.hasLipSyncSupport);
        console.log('🎯 Oculus OVR LipSync support:', this.hasOculusVisemes);
    },

    /**
     * Find and cache bone references for body animations
     */
    findBones() {
        console.log('🔍 Searching for bones...');

        // Log all bone names and find ALL SkinnedMeshes
        this.avatar.traverse((obj) => {
            if (obj.isBone) {
                console.log('🦴 Bone found:', obj.name);
            }
            // Find and cache ALL SkinnedMeshes for skeleton updates
            if (obj.isSkinnedMesh) {
                this.skinnedMeshes.push(obj);
                console.log('✅ Found SkinnedMesh:', obj.name);
            }
        });

        console.log(`📦 Total SkinnedMeshes found: ${this.skinnedMeshes.length}`);

        // Find specific bones using common naming conventions
        this.avatar.traverse((child) => {
            if (child.isBone) {
                const boneName = child.name.toLowerCase();

                // Only use "Head" bone, not "HeadTop_End"
                if (boneName === 'head') {
                    this.headBone = child;
                    console.log('✅ Found HEAD bone:', child.name);
                }
                if (boneName.includes('rightshoulder') || boneName.includes('right_shoulder')) {
                    this.rightShoulderBone = child;
                    console.log('✅ Found right shoulder bone:', child.name);
                    console.log('   Initial position:', child.position.x, child.position.y, child.position.z);
                    console.log('   Initial scale:', child.scale.x, child.scale.y, child.scale.z);
                    console.log('   Initial rotation:', child.rotation.x, child.rotation.y, child.rotation.z);
                }
                if (boneName.includes('leftshoulder') || boneName.includes('left_shoulder')) {
                    this.leftShoulderBone = child;
                    console.log('✅ Found left shoulder bone:', child.name);
                    console.log('   Initial position:', child.position.x, child.position.y, child.position.z);
                    console.log('   Initial scale:', child.scale.x, child.scale.y, child.scale.z);
                    console.log('   Initial rotation:', child.rotation.x, child.rotation.y, child.rotation.z);
                }
                if (boneName.includes('rightarm') || boneName.includes('right_arm') || boneName.includes('rightupperarm') ||
                    boneName.includes('arm_r') || boneName.includes('upperarm_r') || boneName.includes('r_arm') ||
                    boneName.includes('r_upperarm')) {
                    this.rightArmBone = child;
                    console.log('✅ Found right upper arm bone:', child.name);
                    console.log('   Initial rotation:', child.rotation.x, child.rotation.y, child.rotation.z);
                    console.log('   Initial quaternion:', child.quaternion.x, child.quaternion.y, child.quaternion.z, child.quaternion.w);
                    console.log('   Scale:', child.scale.x, child.scale.y, child.scale.z);
                    console.log('   Position:', child.position.x, child.position.y, child.position.z);
                }
                if (boneName.includes('leftarm') || boneName.includes('left_arm') || boneName.includes('leftupperarm') ||
                    boneName.includes('arm_l') || boneName.includes('upperarm_l') || boneName.includes('l_arm') ||
                    boneName.includes('l_upperarm')) {
                    this.leftArmBone = child;
                    console.log('✅ Found left upper arm bone:', child.name);
                    console.log('   Initial rotation:', child.rotation.x, child.rotation.y, child.rotation.z);
                    console.log('   Initial quaternion:', child.quaternion.x, child.quaternion.y, child.quaternion.z, child.quaternion.w);
                    console.log('   Scale:', child.scale.x, child.scale.y, child.scale.z);
                    console.log('   Position:', child.position.x, child.position.y, child.position.z);
                }
                if (boneName.includes('rightforearm') || boneName.includes('right_forearm') ||
                    boneName.includes('forearm_r') || boneName.includes('r_forearm') ||
                    boneName.includes('rightlowerarm') || boneName.includes('lowerarm_r')) {
                    this.rightLowerArmBone = child;
                    console.log('✅ Found right forearm bone:', child.name);
                }
                // Only match the main hand bone, not finger bones (RightHand but not RightHandThumb, RightHandIndex, etc.)
                if ((boneName === 'righthand' || boneName === 'right_hand' || boneName === 'hand_r' || boneName === 'r_hand') &&
                    !boneName.includes('thumb') && !boneName.includes('index') && !boneName.includes('middle') &&
                    !boneName.includes('ring') && !boneName.includes('pinky')) {
                    this.rightHandBone = child;
                    console.log('✅ Found right hand bone:', child.name);
                }
                if (boneName.includes('leftforearm') || boneName.includes('left_forearm') ||
                    boneName.includes('forearm_l') || boneName.includes('l_forearm') ||
                    boneName.includes('leftlowerarm') || boneName.includes('lowerarm_l')) {
                    this.leftLowerArmBone = child;
                    console.log('✅ Found left forearm bone:', child.name);
                }
                // Only match the main hand bone, not finger bones (LeftHand but not LeftHandThumb, LeftHandIndex, etc.)
                if ((boneName === 'lefthand' || boneName === 'left_hand' || boneName === 'hand_l' || boneName === 'l_hand') &&
                    !boneName.includes('thumb') && !boneName.includes('index') && !boneName.includes('middle') &&
                    !boneName.includes('ring') && !boneName.includes('pinky')) {
                    this.leftHandBone = child;
                    console.log('✅ Found left hand bone:', child.name);
                }
                if (boneName.includes('spine2') || (boneName.includes('spine') && boneName.includes('2'))) {
                    this.spine = child;
                    console.log('✅ Found spine bone:', child.name);
                }
                // Store neck bone as well for head control
                if (boneName === 'neck') {
                    this.neckBone = child;
                    console.log('✅ Found NECK bone:', child.name);
                }
                // Find leg bones for seated pose
                if (boneName === 'hips' || boneName.includes('pelvis')) {
                    this.hips = child;
                    console.log('✅ Found HIPS bone:', child.name);
                }
                if (boneName.includes('rightupleg') || boneName.includes('right_upleg')) {
                    this.rightUpperLeg = child;
                    console.log('✅ Found right upper leg bone:', child.name);
                }
                if (boneName.includes('leftupleg') || boneName.includes('left_upleg')) {
                    this.leftUpperLeg = child;
                    console.log('✅ Found left upper leg bone:', child.name);
                }
                if (boneName.includes('rightleg') && !boneName.includes('upleg')) {
                    this.rightLowerLeg = child;
                    console.log('✅ Found right lower leg bone:', child.name);
                }
                if (boneName.includes('leftleg') && !boneName.includes('upleg')) {
                    this.leftLowerLeg = child;
                    console.log('✅ Found left lower leg bone:', child.name);
                }
                if (boneName.includes('rightfoot') || boneName === 'right_foot') {
                    this.rightFoot = child;
                    console.log('✅ Found right foot bone:', child.name);
                }
                if (boneName.includes('leftfoot') || boneName === 'left_foot') {
                    this.leftFoot = child;
                    console.log('✅ Found left foot bone:', child.name);
                }
                // Find jaw bone for audio analyzer lip sync
                if (boneName.includes('jaw') || boneName === 'jaw') {
                    this.jawBone = child;
                    console.log('✅ Found JAW bone:', child.name);
                }
            }
        });

        // Try alternative bone finding using getObjectByName for mixamorig and other naming conventions
        if (!this.rightShoulderBone) this.rightShoulderBone = this.avatar.getObjectByName('RightShoulder');
        if (!this.rightShoulderBone) this.rightShoulderBone = this.avatar.getObjectByName('Right_Shoulder');
        if (!this.rightShoulderBone) this.rightShoulderBone = this.avatar.getObjectByName('Shoulder_R');

        if (!this.leftShoulderBone) this.leftShoulderBone = this.avatar.getObjectByName('LeftShoulder');
        if (!this.leftShoulderBone) this.leftShoulderBone = this.avatar.getObjectByName('Left_Shoulder');
        if (!this.leftShoulderBone) this.leftShoulderBone = this.avatar.getObjectByName('Shoulder_L');

        if (!this.rightArmBone) this.rightArmBone = this.avatar.getObjectByName('mixamorigRightArm');
        if (!this.rightArmBone) this.rightArmBone = this.avatar.getObjectByName('RightArm');
        if (!this.rightArmBone) this.rightArmBone = this.avatar.getObjectByName('Right_Arm');
        if (!this.rightArmBone) this.rightArmBone = this.avatar.getObjectByName('Arm_R');
        if (!this.rightArmBone) this.rightArmBone = this.avatar.getObjectByName('UpperArm_R');

        if (!this.leftArmBone) this.leftArmBone = this.avatar.getObjectByName('mixamorigLeftArm');
        if (!this.leftArmBone) this.leftArmBone = this.avatar.getObjectByName('LeftArm');
        if (!this.leftArmBone) this.leftArmBone = this.avatar.getObjectByName('Left_Arm');
        if (!this.leftArmBone) this.leftArmBone = this.avatar.getObjectByName('Arm_L');
        if (!this.leftArmBone) this.leftArmBone = this.avatar.getObjectByName('UpperArm_L');

        if (!this.rightLowerArmBone) this.rightLowerArmBone = this.avatar.getObjectByName('mixamorigRightForeArm');
        if (!this.rightLowerArmBone) this.rightLowerArmBone = this.avatar.getObjectByName('RightForeArm');
        if (!this.rightLowerArmBone) this.rightLowerArmBone = this.avatar.getObjectByName('ForeArm_R');
        if (!this.rightLowerArmBone) this.rightLowerArmBone = this.avatar.getObjectByName('LowerArm_R');

        if (!this.leftLowerArmBone) this.leftLowerArmBone = this.avatar.getObjectByName('mixamorigLeftForeArm');
        if (!this.leftLowerArmBone) this.leftLowerArmBone = this.avatar.getObjectByName('LeftForeArm');
        if (!this.leftLowerArmBone) this.leftLowerArmBone = this.avatar.getObjectByName('ForeArm_L');
        if (!this.leftLowerArmBone) this.leftLowerArmBone = this.avatar.getObjectByName('LowerArm_L');

        if (!this.rightHandBone) this.rightHandBone = this.avatar.getObjectByName('mixamorigRightHand');
        if (!this.rightHandBone) this.rightHandBone = this.avatar.getObjectByName('RightHand');
        if (!this.rightHandBone) this.rightHandBone = this.avatar.getObjectByName('Right_Hand');
        if (!this.rightHandBone) this.rightHandBone = this.avatar.getObjectByName('Hand_R');

        if (!this.leftHandBone) this.leftHandBone = this.avatar.getObjectByName('mixamorigLeftHand');
        if (!this.leftHandBone) this.leftHandBone = this.avatar.getObjectByName('LeftHand');
        if (!this.leftHandBone) this.leftHandBone = this.avatar.getObjectByName('Left_Hand');
        if (!this.leftHandBone) this.leftHandBone = this.avatar.getObjectByName('Hand_L');
        if (!this.spine) this.spine = this.avatar.getObjectByName('mixamorigSpine2');
        if (!this.hips) this.hips = this.avatar.getObjectByName('mixamorigHips');
        if (!this.rightUpperLeg) this.rightUpperLeg = this.avatar.getObjectByName('mixamorigRightUpLeg');
        if (!this.leftUpperLeg) this.leftUpperLeg = this.avatar.getObjectByName('mixamorigLeftUpLeg');
        if (!this.rightLowerLeg) this.rightLowerLeg = this.avatar.getObjectByName('mixamorigRightLeg');
        if (!this.leftLowerLeg) this.leftLowerLeg = this.avatar.getObjectByName('mixamorigLeftLeg');
        if (!this.rightFoot) this.rightFoot = this.avatar.getObjectByName('mixamorigRightFoot');
        if (!this.leftFoot) this.leftFoot = this.avatar.getObjectByName('mixamorigLeftFoot');

        // Try multiple common naming conventions for jaw bone
        if (!this.jawBone) this.jawBone = this.avatar.getObjectByName('mixamorigJaw');
        if (!this.jawBone) this.jawBone = this.avatar.getObjectByName('Jaw');
        if (!this.jawBone) this.jawBone = this.avatar.getObjectByName('jaw');
        if (!this.jawBone) this.jawBone = this.avatar.getObjectByName('JawBone');

        console.log('✅ Bone search complete');
        console.log('🦴 Final bone status:', {
            jaw: !!this.jawBone,
            jawName: this.jawBone?.name || 'NOT FOUND',
            head: !!this.headBone,
            neck: !!this.neckBone,
            rightHand: !!this.rightHandBone,
            rightHandName: this.rightHandBone?.name || 'NOT FOUND',
            leftHand: !!this.leftHandBone,
            leftHandName: this.leftHandBone?.name || 'NOT FOUND',
            rightLowerArm: !!this.rightLowerArmBone,
            leftLowerArm: !!this.leftLowerArmBone
        });

        // Determine lip sync method based on available features
        if (this.jawBone) {
            console.log('✅ Jaw bone found - Audio Analyzer lip sync ENABLED');
            console.log(`   Jaw bone name: "${this.jawBone.name}"`);
            console.log(`   Initial jaw rotation: x=${this.jawBone.rotation.x.toFixed(3)}`);
            this.useAudioAnalyzer = true;
        } else if (this.hasLipSyncSupport) {
            console.log('⚠️ No jaw bone found - Using morph target lip sync');
            console.log('   Audio Analyzer lip sync NOT available for this avatar');
            this.useAudioAnalyzer = false;
        } else {
            console.warn('⚠️ No jaw bone or morph targets - Limited lip sync support');
            this.useAudioAnalyzer = false;
        }
    },

    /**
     * Detect avatar gender based on avatar URL
     * Male avatars: Rod, Aaron, and custom male avatars
     * Female avatars: Amara, Rachel, Lily, and other avatars
     */
    detectAvatarGender() {
        console.log('🔍 Detecting avatar gender from URL...');

        // Known male avatar IDs from ReadyPlayerMe
        const maleAvatarIds = [
            '6900c7a0f2f24d4396aff789', // Rod
            '6900cb7e032c83e9bdece86f', // Aaron
            '6906186befedb00e4532f3dc'  // Custom male avatar
        ];

        // Check if the current avatar URL contains any male avatar ID
        const isMale = maleAvatarIds.some(id => this.avatarUrl.includes(id));

        if (isMale) {
            this.avatarGender = 'male';
            console.log('✅ Detected MALE avatar');
        } else {
            this.avatarGender = 'female';
            console.log('✅ Detected FEMALE avatar (default)');
        }

        console.log('   Avatar URL:', this.avatarUrl);
        console.log('   Detected gender:', this.avatarGender);
    },

    /**
     * Fix left shoulder and arm bone positions/scale if incorrectly set in the avatar model
     * This corrects issues where the left shoulder/arm joints are misaligned or scaled differently
     * Applied immediately after avatar loads to fix alignment before posing
     */
    fixLeftShoulderBone() {
        console.log('🔧 Checking if left shoulder and arm bone alignment needs fixing...');

        // Check if bones are already symmetric (tolerance of 0.01 radians ≈ 0.57°)
        const SYMMETRY_TOLERANCE = 0.01;
        let bonesAlreadySymmetric = true;

        if (this.leftArmBone && this.rightArmBone) {
            const leftRot = this.leftArmBone.rotation;
            const rightRot = this.rightArmBone.rotation;

            // Check if rotations are already mirrored correctly
            const xSymmetric = Math.abs(leftRot.x + rightRot.x) < SYMMETRY_TOLERANCE;
            const ySymmetric = Math.abs(leftRot.y - rightRot.y) < SYMMETRY_TOLERANCE;
            const zSymmetric = Math.abs(leftRot.z + rightRot.z) < SYMMETRY_TOLERANCE;

            if (xSymmetric && ySymmetric && zSymmetric) {
                console.log('✅ Avatar bones are already symmetric - skipping fix');
                console.log('   Left arm rotation:', { x: leftRot.x, y: leftRot.y, z: leftRot.z });
                console.log('   Right arm rotation:', { x: rightRot.x, y: rightRot.y, z: rightRot.z });
                return; // Skip the fix entirely
            }

            bonesAlreadySymmetric = false;
            console.log('⚠️ Avatar bones are asymmetric - applying fix');
        }

        // Fix left shoulder
        if (!this.leftShoulderBone || !this.rightShoulderBone) {
            console.warn('⚠️ Cannot fix left shoulder - shoulder bones not found');
        } else {
            console.log('📊 Before fix:');
            console.log('   Right shoulder position:', {
                x: this.rightShoulderBone.position.x,
                y: this.rightShoulderBone.position.y,
                z: this.rightShoulderBone.position.z
            });
            console.log('   Right shoulder rotation:', {
                x: this.rightShoulderBone.rotation.x,
                y: this.rightShoulderBone.rotation.y,
                z: this.rightShoulderBone.rotation.z
            });
            console.log('   Left shoulder position:', {
                x: this.leftShoulderBone.position.x,
                y: this.leftShoulderBone.position.y,
                z: this.leftShoulderBone.position.z
            });
            console.log('   Left shoulder rotation:', {
                x: this.leftShoulderBone.rotation.x,
                y: this.leftShoulderBone.rotation.y,
                z: this.leftShoulderBone.rotation.z
            });

            // Mirror the right shoulder position to fix left shoulder alignment
            // This ensures both shoulders are symmetrically positioned
            this.leftShoulderBone.position.x = -this.rightShoulderBone.position.x;
            this.leftShoulderBone.position.y = this.rightShoulderBone.position.y;
            this.leftShoulderBone.position.z = this.rightShoulderBone.position.z;

            // Fine-tune left shoulder position (adjust this value slowly)
            this.leftShoulderBone.position.x -= -0.1;  // adjust this value slowly
            this.leftShoulderBone.position.y -= -0.01;

            // Mirror the right shoulder rotation to fix left shoulder alignment
            // For skeletal symmetry, mirror the rotation with appropriate axis adjustments
            this.leftShoulderBone.rotation.x = this.rightShoulderBone.rotation.x;
            this.leftShoulderBone.rotation.y = -this.rightShoulderBone.rotation.y;
            this.leftShoulderBone.rotation.z = this.rightShoulderBone.rotation.z;

            console.log('✅ Left shoulder fixed - final position:', {
                x: this.leftShoulderBone.position.x,
                y: this.leftShoulderBone.position.y,
                z: this.leftShoulderBone.position.z
            });
            console.log('✅ Left shoulder fixed - final rotation:', {
                x: this.leftShoulderBone.rotation.x,
                y: this.leftShoulderBone.rotation.y,
                z: this.leftShoulderBone.rotation.z
            });

            // Ensure scale matches right shoulder
            this.leftShoulderBone.scale.copy(this.rightShoulderBone.scale);
            console.log('✅ Left shoulder scale matched to right shoulder');
        }

        // Fix left arm
        if (!this.leftArmBone || !this.rightArmBone) {
            console.warn('⚠️ Cannot fix left arm - arm bones not found');
        } else {
            console.log('📊 Before fix:');
            console.log('   Right arm position:', {
                x: this.rightArmBone.position.x,
                y: this.rightArmBone.position.y,
                z: this.rightArmBone.position.z
            });
            console.log('   Right arm rotation:', {
                x: this.rightArmBone.rotation.x,
                y: this.rightArmBone.rotation.y,
                z: this.rightArmBone.rotation.z
            });
            console.log('   Left arm position:', {
                x: this.leftArmBone.position.x,
                y: this.leftArmBone.position.y,
                z: this.leftArmBone.position.z
            });
            console.log('   Left arm rotation:', {
                x: this.leftArmBone.rotation.x,
                y: this.leftArmBone.rotation.y,
                z: this.leftArmBone.rotation.z
            });

            // Mirror the right arm position to fix left arm alignment
            // This ensures both arms are symmetrically positioned
            this.leftArmBone.position.x = -this.rightArmBone.position.x;
            this.leftArmBone.position.y = this.rightArmBone.position.y;
            this.leftArmBone.position.z = this.rightArmBone.position.z;

            // Mirror the right arm rotation to fix left arm alignment
            // For skeletal symmetry, mirror the rotation with appropriate axis adjustments
            this.leftArmBone.rotation.x = -this.rightArmBone.rotation.x;
            this.leftArmBone.rotation.y = this.rightArmBone.rotation.y;
            this.leftArmBone.rotation.z = -this.rightArmBone.rotation.z;

            console.log('✅ Left arm fixed - final position:', {
                x: this.leftArmBone.position.x,
                y: this.leftArmBone.position.y,
                z: this.leftArmBone.position.z
            });
            console.log('✅ Left arm fixed - final rotation:', {
                x: this.leftArmBone.rotation.x,
                y: this.leftArmBone.rotation.y,
                z: this.leftArmBone.rotation.z
            });

            // Ensure scale matches right arm
            this.leftArmBone.scale.copy(this.rightArmBone.scale);
            console.log('✅ Left arm scale matched to right arm');
        }

        // Fix left lower arm
        if (!this.leftLowerArmBone || !this.rightLowerArmBone) {
            console.warn('⚠️ Cannot fix left lower arm - lower arm bones not found');
        } else {
            console.log('📊 Left lower arm before fix:');
            console.log('   Right lower arm rotation:', {
                x: this.rightLowerArmBone.rotation.x,
                y: this.rightLowerArmBone.rotation.y,
                z: this.rightLowerArmBone.rotation.z
            });
            console.log('   Left lower arm rotation:', {
                x: this.leftLowerArmBone.rotation.x,
                y: this.leftLowerArmBone.rotation.y,
                z: this.leftLowerArmBone.rotation.z
            });

            // Mirror the right lower arm position and rotation
            this.leftLowerArmBone.position.x = -this.rightLowerArmBone.position.x;
            this.leftLowerArmBone.position.y = this.rightLowerArmBone.position.y;
            this.leftLowerArmBone.position.z = this.rightLowerArmBone.position.z;

            this.leftLowerArmBone.rotation.x = this.rightLowerArmBone.rotation.x;
            this.leftLowerArmBone.rotation.y = -this.rightLowerArmBone.rotation.y;
            this.leftLowerArmBone.rotation.z = -this.rightLowerArmBone.rotation.z;

            this.leftLowerArmBone.scale.copy(this.rightLowerArmBone.scale);

            console.log('✅ Left lower arm fixed - final rotation:', {
                x: this.leftLowerArmBone.rotation.x,
                y: this.leftLowerArmBone.rotation.y,
                z: this.leftLowerArmBone.rotation.z
            });
        }

        // Fix left hand
        if (!this.leftHandBone || !this.rightHandBone) {
            console.warn('⚠️ Cannot fix left hand - hand bones not found');
        } else {
            console.log('📊 Left hand before fix:');
            console.log('   Right hand rotation:', {
                x: this.rightHandBone.rotation.x,
                y: this.rightHandBone.rotation.y,
                z: this.rightHandBone.rotation.z
            });
            console.log('   Left hand rotation:', {
                x: this.leftHandBone.rotation.x,
                y: this.leftHandBone.rotation.y,
                z: this.leftHandBone.rotation.z
            });

            // Mirror the right hand position and rotation
            this.leftHandBone.position.x = -this.rightHandBone.position.x;
            this.leftHandBone.position.y = this.rightHandBone.position.y;
            this.leftHandBone.position.z = this.rightHandBone.position.z;

            // Copy rotation properly to avoid axis-flip on male avatars
            this.leftHandBone.quaternion.copy(this.rightHandBone.quaternion);

            // If the avatar is mirrored, flip X instead (rare cases)
            // this.leftHandBone.quaternion.x = -this.leftHandBone.quaternion.x;

            // Match scale (your logs say this already works)
            this.leftHandBone.scale.copy(this.rightHandBone.scale);

            console.log('✅ Left hand fully synced with right hand (quaternion copy)');
            console.log('   Final rotation:', {
                x: this.leftHandBone.rotation.x,
                y: this.leftHandBone.rotation.y,
                z: this.leftHandBone.rotation.z
            });
        }
    },

    /**
     * Set idle pose - Natural resting position (arms at sides)
     * This is the default pose when not speaking/teaching
     */
    setIdlePose() {
        console.log('Setting idle pose - natural resting position');
        console.log('   Avatar gender:', this.avatarGender);

        // --- RIGHT ARM (Natural resting position) ---
        if (this.rightShoulderBone) {
            this.rightShoulderBone.rotation.set(0.5, 0.66, 0.98);
        }
        if (this.rightArmBone) {
            this.rightArmBone.rotation.set(0.66, 0.0036337503162204516, 1.54);
        }
        if (this.rightLowerArmBone) {
            this.rightLowerArmBone.rotation.set(0.6470049262997372, -0.3, -0.14);
        }
        if (this.rightHandBone) {
            this.rightHandBone.rotation.set(-0.023441552574508664, 1.045482123515815, 0.2621972617993128);
        }

        // --- LEFT ARM (Natural resting position) - Gender-specific ---
        if (this.avatarGender === 'male') {
            // Male avatar left arm rotations
            if (this.leftShoulderBone) {
                this.leftShoulderBone.rotation.set(0.5, -0.66, -0.98);
            }
            if (this.leftArmBone) {
                this.leftArmBone.rotation.set(0.66, -0.0036337503162204516, -1.54);
            }
            if (this.leftLowerArmBone) {
                this.leftLowerArmBone.rotation.set(0.6470049262997372, 0.3, 0.14);
            }
            if (this.leftHandBone) {
                this.leftHandBone.rotation.set(-0.023441552574508664, -1.045482123515815, -0.2621972617993128);
            }
        } else {
            // Female avatar left arm rotations (original values)
            if (this.leftShoulderBone) {
                this.leftShoulderBone.rotation.set(1.78, -0.38, 1.46);
            }
            if (this.leftArmBone) {
                this.leftArmBone.rotation.set(-0.85, 0.42, -2.77);
            }
            if (this.leftLowerArmBone) {
                this.leftLowerArmBone.rotation.set(0.98, 0.74, -0.22);
            }
            if (this.leftHandBone) {
                this.leftHandBone.rotation.set(-0.024648858953330407, 0.25263168725543406, -0.1303135341370885);
            }
        }

        // --- HEAD (Facing forward) ---
        if (this.headBone) {
            this.headBone.rotation.set(0, 0, 0);
        }
        if (this.neckBone) {
            this.neckBone.rotation.set(0.3, 0, 0); // Adjust neck rotation
        }

        // --- SPINE (Neutral) ---
        if (this.spine) {
            this.spine.rotation.set(0, 0, 0);
        }

        // --- HIPS (Neutral) ---
        if (this.hips) {
            this.hips.rotation.set(0, 0, 0); // Idle pose: y = 0
        }

        // Update base pose
        this.updateBasePose();

        console.log('✅ Idle pose applied successfully - arms at sides');
    },

    /**
     * Set idle wave pose - Avatar waves at the viewer with a smile
     * This is triggered every 8 seconds as an alternate idle animation
     */
    setIdleWavePose() {
        console.log('Setting idle wave pose - friendly greeting wave');
        console.log('   Avatar gender:', this.avatarGender);

        // --- RIGHT ARM (Waving position) ---
        if (this.rightShoulderBone) {
            this.rightShoulderBone.rotation.set(0.66, 0.5, 1.14);
        }
        if (this.rightArmBone) {
            this.rightArmBone.rotation.set(0.66, -0.007587620489694234, 1.54);
        }
        if (this.rightLowerArmBone) {
            this.rightLowerArmBone.rotation.set(0.64120463022904, -0.3, -0.14);
        }
        if (this.rightHandBone) {
            this.rightHandBone.rotation.set(-0.016574646970668985, 1.0344479882163393, 0.25630962288184417);
        }

        // --- LEFT ARM (Natural resting position) - Gender-specific ---
        if (this.avatarGender === 'male') {
            // Male avatar left arm rotations (mirrored from right arm idle)
            if (this.leftShoulderBone) {
                this.leftShoulderBone.rotation.set(0.5, -0.66, -0.98);
            }
            if (this.leftArmBone) {
                this.leftArmBone.rotation.set(0.66, 0.007587620489694234, -1.54);
            }
            if (this.leftLowerArmBone) {
                this.leftLowerArmBone.rotation.set(0.64120463022904, 0.3, 0.14);
            }
            if (this.leftHandBone) {
                this.leftHandBone.rotation.set(-0.016574646970668985, -1.0344479882163393, -0.25630962288184417);
            }
        } else {
            // Female avatar left arm rotations (original values)
            if (this.leftShoulderBone) {
                this.leftShoulderBone.rotation.set(1.78, -0.38, 1.46);
            }
            if (this.leftArmBone) {
                this.leftArmBone.rotation.set(-0.85, 0.58, -2.53);
            }
            if (this.leftLowerArmBone) {
                this.leftLowerArmBone.rotation.set(-0.22, -0.93, 1.94);
            }
            if (this.leftHandBone) {
                this.leftHandBone.rotation.set(-0.3, -0.14, 0.02);
            }
        }

        // --- HEAD (Facing forward) ---
        if (this.headBone) {
            this.headBone.rotation.set(0, 0, 0);
        }
        if (this.neckBone) {
            this.neckBone.rotation.set(0.3, 0, 0);
        }

        // --- SPINE (Neutral) ---
        if (this.spine) {
            this.spine.rotation.set(0, 0, 0);
        }

        // --- HIPS (Neutral) ---
        if (this.hips) {
            this.hips.rotation.set(0, 0, 0);
        }

        // Add smile expression during wave
        this.smile(0.6); // 60% smile intensity for friendly greeting

        // Update base pose
        this.updateBasePose();

        console.log('✅ Idle wave pose applied successfully - waving with smile');
    },

    /**
     * Set teaching pose - Animated gesture pose used during speaking
     * This replaces the old idle pose with hand movement
     */
    setTeachingPose() {
        console.log('Setting teaching pose - animated gesture position');
        console.log('   Avatar gender:', this.avatarGender);

        // --- HEAD (Teaching pose) ---
        if (this.headBone) {
            this.headBone.rotation.set(0.3, 0.26, 0.02); // Teaching pose: X=0.3, Y=0.26, Z=0.02
        }
        if (this.neckBone) {
            this.neckBone.rotation.set(0, 0.18, 0); // Teaching pose: X=0, Y=0.18, Z=0
        }

        // --- RIGHT ARM (Teaching gesture position) ---
        if (this.rightShoulderBone) {
            this.rightShoulderBone.rotation.set(0.5, 0.66, 0.98);
        }
        if (this.rightArmBone) {
            this.rightArmBone.rotation.set(0.82, 0.1, 1.62);
        }
        if (this.rightLowerArmBone) {
            this.rightLowerArmBone.rotation.set(0.66, -0.3, -0.3);
        }
        if (this.rightHandBone) {
            this.rightHandBone.rotation.set(-0.06, 1.06, -0.011182760796580577);
        }

        // --- LEFT ARM (Teaching gesture position) - Gender-specific ---
        if (this.avatarGender === 'male') {
            // Male avatar left arm rotations (mirrored from right arm teaching)
            if (this.leftShoulderBone) {
                this.leftShoulderBone.rotation.set(0.5, -0.66, -0.98);
            }
            if (this.leftArmBone) {
                this.leftArmBone.rotation.set(0.82, -0.1, -1.62);
            }
            if (this.leftLowerArmBone) {
                this.leftLowerArmBone.rotation.set(0.66, 0.3, 0.3);
            }
            if (this.leftHandBone) {
                this.leftHandBone.rotation.set(-0.06, -1.06, 0.011182760796580577);
            }
        } else {
            // Female avatar left arm rotations (original values)
            if (this.leftShoulderBone) {
                this.leftShoulderBone.rotation.set(0.82, -0.14, 1.46);
            }
            if (this.leftArmBone) {
                this.leftArmBone.rotation.set(-0.77, 0.42, -3.14);
            }
            if (this.leftLowerArmBone) {
                this.leftLowerArmBone.rotation.set(0.82, -0.46, 0.42);
            }
            if (this.leftHandBone) {
                this.leftHandBone.rotation.set(-0.00683081157725353, -0.01199814381446926, -0.009769531377204627);
            }
        }

        // --- HIPS (Slight rotation for teaching stance) ---
        if (this.hips) {
            this.hips.rotation.set(0, 0.5, 0); // Teaching pose: y = 0.5
        }

        // Update base pose
        this.updateBasePose();

        console.log('✅ Teaching pose applied successfully - head facing forward, ready for gestures');
    },

    /**
     * Transition to teaching pose with smooth animation
     */
    transitionToTeachingPose() {
        // CRITICAL FIX: Only skip if BOTH conditions are true:
        // 1. Currently transitioning AND
        // 2. Teaching animation is already active (meaning we're transitioning TO teaching, not FROM idle)
        // This prevents restart loops while allowing initial transition from idle
        if (this.poseTransitionActive && this.teachingAnimationActive) {
            console.log('⚠️ Already transitioning to teaching pose with teaching active - skipping to avoid restart loop');
            return;
        }

        console.log('🎬 Starting transition to teaching pose');

        // Capture current bone rotations as start values (clone the x, y, z values explicitly)
        this.poseTransitionStartValues = {
            rightShoulder: this.rightShoulderBone ? {
                x: this.rightShoulderBone.rotation.x,
                y: this.rightShoulderBone.rotation.y,
                z: this.rightShoulderBone.rotation.z
            } : null,
            rightArm: this.rightArmBone ? {
                x: this.rightArmBone.rotation.x,
                y: this.rightArmBone.rotation.y,
                z: this.rightArmBone.rotation.z
            } : null,
            rightLowerArm: this.rightLowerArmBone ? {
                x: this.rightLowerArmBone.rotation.x,
                y: this.rightLowerArmBone.rotation.y,
                z: this.rightLowerArmBone.rotation.z
            } : null,
            rightHand: this.rightHandBone ? {
                x: this.rightHandBone.rotation.x,
                y: this.rightHandBone.rotation.y,
                z: this.rightHandBone.rotation.z
            } : null,
            leftShoulder: this.leftShoulderBone ? {
                x: this.leftShoulderBone.rotation.x,
                y: this.leftShoulderBone.rotation.y,
                z: this.leftShoulderBone.rotation.z
            } : null,
            leftArm: this.leftArmBone ? {
                x: this.leftArmBone.rotation.x,
                y: this.leftArmBone.rotation.y,
                z: this.leftArmBone.rotation.z
            } : null,
            leftLowerArm: this.leftLowerArmBone ? {
                x: this.leftLowerArmBone.rotation.x,
                y: this.leftLowerArmBone.rotation.y,
                z: this.leftLowerArmBone.rotation.z
            } : null,
            leftHand: this.leftHandBone ? {
                x: this.leftHandBone.rotation.x,
                y: this.leftHandBone.rotation.y,
                z: this.leftHandBone.rotation.z
            } : null,
            head: this.headBone ? {
                x: this.headBone.rotation.x,
                y: this.headBone.rotation.y,
                z: this.headBone.rotation.z
            } : null,
            neck: this.neckBone ? {
                x: this.neckBone.rotation.x,
                y: this.neckBone.rotation.y,
                z: this.neckBone.rotation.z
            } : null,
            hips: this.hips ? {
                x: this.hips.rotation.x,
                y: this.hips.rotation.y,
                z: this.hips.rotation.z
            } : null
        };

        // Define target values (teaching pose - head looks down at children)
        this.poseTransitionTargetValues = {
            rightShoulder: {x: 0.5, y: 0.66, z: 0.98},
            rightArm: {x: 0.66, y: 0.02, z: 1.54},
            rightLowerArm: {x: 0.66, y: -0.3, z: -0.3},
            rightHand: {x: 0.42, y: -0.03, z: -0.06},
            leftShoulder: {x: 0.82, y: -0.14, z: 1.46},
            leftArm: {x: -0.77, y: 0.42, z: -3.14},
            leftLowerArm: {x: 0.82, y: -0.46, z: 0.42},
            leftHand: {x: -0.00683081157725353, y: -0.01199814381446926, z: -0.009769531377204627},
            head: {x: 0.3, y: 0.26, z: 0.02}, // Teaching pose head position
            neck: {x: 0, y: 0.18, z: 0}, // Teaching pose neck position
            hips: {x: 0, y: 0.5, z: 0} // Teaching pose hips rotation
        };

        // Start transition
        this.poseTransitionActive = true;
        this.poseTransitionStartTime = this.clock.getElapsedTime();

        // Initialize teaching rotation loop with randomized duration
        this.teachingRotationStartTime = this.clock.getElapsedTime();
        this.teachingRotationDuration = this.randomizeTeachingRotationDuration();
        this.teachingRotationProgress = 0;

        // Initialize hand gesture cycle
        this.handGestureCycleStartTime = this.clock.getElapsedTime();
        this.handGesturePhase = 0;

        console.log('✅ Transition to teaching pose started', {
            startValues: this.poseTransitionStartValues,
            targetValues: this.poseTransitionTargetValues,
            initialRotationDuration: this.teachingRotationDuration.toFixed(2) + 's'
        });
    },

    /**
     * Transition to idle pose with smooth animation
     */
    transitionToIdlePose() {
        console.log('🎬 Starting transition to idle pose');

        // Capture current bone rotations as start values (clone the x, y, z values explicitly)
        this.poseTransitionStartValues = {
            rightShoulder: this.rightShoulderBone ? {
                x: this.rightShoulderBone.rotation.x,
                y: this.rightShoulderBone.rotation.y,
                z: this.rightShoulderBone.rotation.z
            } : null,
            rightArm: this.rightArmBone ? {
                x: this.rightArmBone.rotation.x,
                y: this.rightArmBone.rotation.y,
                z: this.rightArmBone.rotation.z
            } : null,
            rightLowerArm: this.rightLowerArmBone ? {
                x: this.rightLowerArmBone.rotation.x,
                y: this.rightLowerArmBone.rotation.y,
                z: this.rightLowerArmBone.rotation.z
            } : null,
            rightHand: this.rightHandBone ? {
                x: this.rightHandBone.rotation.x,
                y: this.rightHandBone.rotation.y,
                z: this.rightHandBone.rotation.z
            } : null,
            leftShoulder: this.leftShoulderBone ? {
                x: this.leftShoulderBone.rotation.x,
                y: this.leftShoulderBone.rotation.y,
                z: this.leftShoulderBone.rotation.z
            } : null,
            leftArm: this.leftArmBone ? {
                x: this.leftArmBone.rotation.x,
                y: this.leftArmBone.rotation.y,
                z: this.leftArmBone.rotation.z
            } : null,
            leftLowerArm: this.leftLowerArmBone ? {
                x: this.leftLowerArmBone.rotation.x,
                y: this.leftLowerArmBone.rotation.y,
                z: this.leftLowerArmBone.rotation.z
            } : null,
            leftHand: this.leftHandBone ? {
                x: this.leftHandBone.rotation.x,
                y: this.leftHandBone.rotation.y,
                z: this.leftHandBone.rotation.z
            } : null,
            head: this.headBone ? {
                x: this.headBone.rotation.x,
                y: this.headBone.rotation.y,
                z: this.headBone.rotation.z
            } : null,
            neck: this.neckBone ? {
                x: this.neckBone.rotation.x,
                y: this.neckBone.rotation.y,
                z: this.neckBone.rotation.z
            } : null,
            hips: this.hips ? {
                x: this.hips.rotation.x,
                y: this.hips.rotation.y,
                z: this.hips.rotation.z
            } : null
        };

        // Define target values (idle pose - reset head and hips to neutral)
        this.poseTransitionTargetValues = {
            rightShoulder: {x: 0.5, y: 0.66, z: 0.98},
            rightArm: {x: 0.66, y: 0.007814109203464563, z: 1.54},
            rightLowerArm: {x: 0.6574085170486437, y: -0.3, z: -0.14},
            rightHand: {x: -0.04314421977097947, y: 1.0472948007780165, z: 0.26},
            leftShoulder: {x: 1.78, y: -0.38, z: 1.46},
            leftArm: {x: -0.85, y: 0.42, z: -2.77},
            leftLowerArm: {x: 0.98, y: 0.74, z: -0.22},
            leftHand: {x: -0.024648858953330407, y: 0.25263168725543406, z: -0.1303135341370885},
            head: {x: 0, y: 0, z: 0}, // Idle pose head position
            neck: {x: 0.3, y: 0, z: 0}, // Idle pose neck position
            hips: {x: 0, y: 0, z: 0} // Idle pose hips position
        };

        // Start transition
        this.poseTransitionActive = true;
        this.poseTransitionStartTime = this.clock.getElapsedTime();

        // Reset smile to neutral
        this.smile(0);

        console.log('✅ Transition to idle pose started', {
            startValues: this.poseTransitionStartValues,
            targetValues: this.poseTransitionTargetValues
        });
    },

    /**
     * Update pose transition - called in animation loop
     * IMPROVED: Uses centralized lerp utilities with easeInOutQuint for ultra-smooth transitions
     */
    updatePoseTransition() {
        if (!this.poseTransitionActive) return;

        const currentTime = this.clock.getElapsedTime();
        const elapsed = currentTime - this.poseTransitionStartTime;
        const progress = Math.min(elapsed / this.poseTransitionDuration, 1.0);

        // Use centralized easing function for consistent ultra-smooth transitions
        const easingFn = this.easing.easeInOutQuint;

        // Update each bone rotation using centralized lerp utilities
        this.applyLerpRotation(
            this.rightShoulderBone,
            this.poseTransitionStartValues.rightShoulder,
            this.poseTransitionTargetValues.rightShoulder,
            progress,
            easingFn
        );

        this.applyLerpRotation(
            this.rightArmBone,
            this.poseTransitionStartValues.rightArm,
            this.poseTransitionTargetValues.rightArm,
            progress,
            easingFn
        );

        this.applyLerpRotation(
            this.rightLowerArmBone,
            this.poseTransitionStartValues.rightLowerArm,
            this.poseTransitionTargetValues.rightLowerArm,
            progress,
            easingFn
        );

        this.applyLerpRotation(
            this.rightHandBone,
            this.poseTransitionStartValues.rightHand,
            this.poseTransitionTargetValues.rightHand,
            progress,
            easingFn
        );

        this.applyLerpRotation(
            this.leftShoulderBone,
            this.poseTransitionStartValues.leftShoulder,
            this.poseTransitionTargetValues.leftShoulder,
            progress,
            easingFn
        );

        this.applyLerpRotation(
            this.leftArmBone,
            this.poseTransitionStartValues.leftArm,
            this.poseTransitionTargetValues.leftArm,
            progress,
            easingFn
        );

        this.applyLerpRotation(
            this.leftLowerArmBone,
            this.poseTransitionStartValues.leftLowerArm,
            this.poseTransitionTargetValues.leftLowerArm,
            progress,
            easingFn
        );

        this.applyLerpRotation(
            this.leftHandBone,
            this.poseTransitionStartValues.leftHand,
            this.poseTransitionTargetValues.leftHand,
            progress,
            easingFn
        );

        // Update head rotation if target is specified (for idle pose transition)
        if (this.headBone && this.poseTransitionStartValues.head && this.poseTransitionTargetValues.head) {
            this.applyLerpRotation(
                this.headBone,
                this.poseTransitionStartValues.head,
                this.poseTransitionTargetValues.head,
                progress,
                easingFn
            );
        }

        // Update neck rotation if target is specified
        this.applyLerpRotation(
            this.neckBone,
            this.poseTransitionStartValues.neck,
            this.poseTransitionTargetValues.neck,
            progress,
            easingFn
        );

        // Update hips rotation if target is specified
        this.applyLerpRotation(
            this.hips,
            this.poseTransitionStartValues.hips,
            this.poseTransitionTargetValues.hips,
            progress,
            easingFn
        );

        // Check if transition is complete
        if (progress >= 1.0) {
            this.poseTransitionActive = false;

            // If transitioning to teaching pose, restart teaching rotation timer
            // This ensures smooth handoff from pose transition to continuous rotation
            if (this.teachingAnimationActive) {
                this.teachingRotationStartTime = this.clock.getElapsedTime();
                this.teachingRotationDuration = this.randomizeTeachingRotationDuration();
                this.teachingRotationProgress = 0;
                console.log(`🔄 Teaching rotation timer reset - duration: ${this.teachingRotationDuration.toFixed(2)}s`);
            }

            // Check if we should start random wave animations after idle transition (from pause)
            if (this.shouldStartWaveOnIdleComplete && !this.teachingAnimationActive && !this.isSpeaking) {
                console.log('👋 Idle pose transition complete - starting random wave animations');
                this.shouldStartWaveOnIdleComplete = false; // Reset flag
                // Delay the first wave slightly to let the idle pose settle
                setTimeout(() => {
                    if (!this.isSpeaking && !this.teachingAnimationActive) {
                        this.startRandomWaveAnimations();
                    }
                }, 1000); // 1 second delay before first wave cycle starts
            }

            // Update base pose to the new target pose
            this.updateBasePose();
            console.log('✅ Pose transition completed');
        }
    },

    /**
     * Set narrating pose - Left arm raised for presenting
     */
    setNarratingPose() {
        console.log('Setting narrating pose - left arm raised');

        // --- RIGHT ARM (Very close to body) ---
        if (this.rightShoulderBone) {
            this.rightShoulderBone.rotation.set(0, 0, 0);  // Neutral shoulder
        }
        if (this.rightArmBone) {
            this.rightArmBone.rotation.set(10, 0, 0.3);  // Minimal outward angle, closer to body
        }
        if (this.rightLowerArmBone) {
            this.rightLowerArmBone.rotation.set(0.2, 0, 0.3);  // Slight bend
        }
        if (this.rightHandBone) {
            this.rightHandBone.rotation.set(0, 0, 0);  // Relaxed hand
        }

        // --- LEFT ARM (Raised like teaching/presenting) ---
        if (this.leftShoulderBone) {
            this.leftShoulderBone.rotation.set(-0.3, 0.2, 0.2);
        }
        if (this.leftArmBone) {
            this.leftArmBone.rotation.set(-0.5, 0.2, 0.4);
        }
        if (this.leftLowerArmBone) {
            this.leftLowerArmBone.rotation.set(-0.8, 0, 0);
        }
        if (this.leftHandBone) {
            this.leftHandBone.rotation.set(-1.0, 0, 0);
        }

        // Update base pose
        this.updateBasePose();
    },

    /**
     * Update base pose values for animation system
     */
    updateBasePose() {
        this.basePose = {
            // Right shoulder
            rightShoulderX: this.rightShoulderBone ? this.rightShoulderBone.rotation.x : 0,
            rightShoulderY: this.rightShoulderBone ? this.rightShoulderBone.rotation.y : 0,
            rightShoulderZ: this.rightShoulderBone ? this.rightShoulderBone.rotation.z : 0,

            // Right arm
            rightArmX: this.rightArmBone ? this.rightArmBone.rotation.x : 0,
            rightArmY: this.rightArmBone ? this.rightArmBone.rotation.y : 0,
            rightArmZ: this.rightArmBone ? this.rightArmBone.rotation.z : 0,
            rightLowerArmX: this.rightLowerArmBone ? this.rightLowerArmBone.rotation.x : 0,
            rightLowerArmY: this.rightLowerArmBone ? this.rightLowerArmBone.rotation.y : 0,
            rightLowerArmZ: this.rightLowerArmBone ? this.rightLowerArmBone.rotation.z : 0,
            rightHandX: this.rightHandBone ? this.rightHandBone.rotation.x : 0,
            rightHandY: this.rightHandBone ? this.rightHandBone.rotation.y : 0,
            rightHandZ: this.rightHandBone ? this.rightHandBone.rotation.z : 0,

            // Left shoulder
            leftShoulderX: this.leftShoulderBone ? this.leftShoulderBone.rotation.x : 0,
            leftShoulderY: this.leftShoulderBone ? this.leftShoulderBone.rotation.y : 0,
            leftShoulderZ: this.leftShoulderBone ? this.leftShoulderBone.rotation.z : 0,

            // Left arm
            leftArmX: this.leftArmBone ? this.leftArmBone.rotation.x : 0,
            leftArmY: this.leftArmBone ? this.leftArmBone.rotation.y : 0,
            leftArmZ: this.leftArmBone ? this.leftArmBone.rotation.z : 0,
            leftLowerArmX: this.leftLowerArmBone ? this.leftLowerArmBone.rotation.x : 0,
            leftLowerArmY: this.leftLowerArmBone ? this.leftLowerArmBone.rotation.y : 0,
            leftLowerArmZ: this.leftLowerArmBone ? this.leftLowerArmBone.rotation.z : 0,
            leftHandX: this.leftHandBone ? this.leftHandBone.rotation.x : 0,
            leftHandY: this.leftHandBone ? this.leftHandBone.rotation.y : 0,
            leftHandZ: this.leftHandBone ? this.leftHandBone.rotation.z : 0,

            // Head
            headY: this.headBone ? this.headBone.rotation.y : 0,
            headX: this.headBone ? this.headBone.rotation.x : 0
        };

        // Force skeleton updates
        if (this.skinnedMeshes.length > 0) {
            this.avatar.updateMatrixWorld(true);
            this.skinnedMeshes.forEach(mesh => {
                // REMOVED: mesh.skeleton.pose() - this was resetting bones to bind pose, preventing shoulder animations
                mesh.skeleton.update();
                mesh.updateMatrixWorld(true);
            });
        }
    },

    /**
     * Setup lil-gui debug interface for bone rotation control
     */
    setupDebugGUI() {
        // Cleanup existing GUI if present
        if (this.gui) {
            this.gui.destroy();
        }

        console.log('🎛️ Setting up debug GUI for bone control...');

        this.gui = new GUI();
        this.gui.title('Avatar Bone Control');

        // Add animation toggle at the top (IMPORTANT!)
        this.gui.add(this, 'enableAnimations').name('🎬 Enable Animations')
            .onChange((value) => {
                if (value) {
                    console.log('✅ Animations ENABLED - bones will animate automatically');
                } else {
                    console.log('⏸️ Animations DISABLED - you can now manually adjust bones');
                }
            });

        // Right Shoulder
        if (this.rightShoulderBone) {
            const rightShoulderFolder = this.gui.addFolder('Right Shoulder');
            rightShoulderFolder.add(this.rightShoulderBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            rightShoulderFolder.add(this.rightShoulderBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            rightShoulderFolder.add(this.rightShoulderBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
            rightShoulderFolder.open();
        }

        // Left Shoulder
        if (this.leftShoulderBone) {
            const leftShoulderFolder = this.gui.addFolder('Left Shoulder');
            leftShoulderFolder.add(this.leftShoulderBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            leftShoulderFolder.add(this.leftShoulderBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            leftShoulderFolder.add(this.leftShoulderBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
            leftShoulderFolder.open();
        }

        // Right Arm
        if (this.rightArmBone) {
            const rightArmFolder = this.gui.addFolder('Right Arm');
            rightArmFolder.add(this.rightArmBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            rightArmFolder.add(this.rightArmBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            rightArmFolder.add(this.rightArmBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        // Left Arm
        if (this.leftArmBone) {
            const leftArmFolder = this.gui.addFolder('Left Arm');
            leftArmFolder.add(this.leftArmBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            leftArmFolder.add(this.leftArmBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            leftArmFolder.add(this.leftArmBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        // Right Lower Arm
        if (this.rightLowerArmBone) {
            const rightLowerArmFolder = this.gui.addFolder('Right Lower Arm');
            rightLowerArmFolder.add(this.rightLowerArmBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            rightLowerArmFolder.add(this.rightLowerArmBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            rightLowerArmFolder.add(this.rightLowerArmBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        // Left Lower Arm
        if (this.leftLowerArmBone) {
            const leftLowerArmFolder = this.gui.addFolder('Left Lower Arm');
            leftLowerArmFolder.add(this.leftLowerArmBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            leftLowerArmFolder.add(this.leftLowerArmBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            leftLowerArmFolder.add(this.leftLowerArmBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        // Right Hand
        if (this.rightHandBone) {
            const rightHandFolder = this.gui.addFolder('Right Hand');
            rightHandFolder.add(this.rightHandBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            rightHandFolder.add(this.rightHandBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            rightHandFolder.add(this.rightHandBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        // Left Hand
        if (this.leftHandBone) {
            const leftHandFolder = this.gui.addFolder('Left Hand');
            leftHandFolder.add(this.leftHandBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            leftHandFolder.add(this.leftHandBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            leftHandFolder.add(this.leftHandBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        // Head
        if (this.headBone) {
            const headFolder = this.gui.addFolder('Head');
            headFolder.add(this.headBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            headFolder.add(this.headBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            headFolder.add(this.headBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        // Neck
        if (this.neckBone) {
            const neckFolder = this.gui.addFolder('Neck');
            neckFolder.add(this.neckBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            neckFolder.add(this.neckBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            neckFolder.add(this.neckBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        // Spine
        if (this.spine) {
            const spineFolder = this.gui.addFolder('Spine');
            spineFolder.add(this.spine.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            spineFolder.add(this.spine.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            spineFolder.add(this.spine.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        // Hips
        if (this.hips) {
            const hipsFolder = this.gui.addFolder('Hips');
            hipsFolder.add(this.hips.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            hipsFolder.add(this.hips.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            hipsFolder.add(this.hips.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        // Add a button to log current values
        const controls = {
            logCurrentValues: () => {
                console.log('📋 Current Bone Rotations:');
                if (this.rightShoulderBone) {
                    console.log('Right Shoulder:', {
                        x: this.rightShoulderBone.rotation.x,
                        y: this.rightShoulderBone.rotation.y,
                        z: this.rightShoulderBone.rotation.z
                    });
                }
                if (this.leftShoulderBone) {
                    console.log('Left Shoulder:', {
                        x: this.leftShoulderBone.rotation.x,
                        y: this.leftShoulderBone.rotation.y,
                        z: this.leftShoulderBone.rotation.z
                    });
                }
                if (this.rightArmBone) {
                    console.log('Right Arm:', {
                        x: this.rightArmBone.rotation.x,
                        y: this.rightArmBone.rotation.y,
                        z: this.rightArmBone.rotation.z
                    });
                }
                if (this.leftArmBone) {
                    console.log('Left Arm:', {
                        x: this.leftArmBone.rotation.x,
                        y: this.leftArmBone.rotation.y,
                        z: this.leftArmBone.rotation.z
                    });
                }
                if (this.rightLowerArmBone) {
                    console.log('Right Lower Arm:', {
                        x: this.rightLowerArmBone.rotation.x,
                        y: this.rightLowerArmBone.rotation.y,
                        z: this.rightLowerArmBone.rotation.z
                    });
                }
                if (this.leftLowerArmBone) {
                    console.log('Left Lower Arm:', {
                        x: this.leftLowerArmBone.rotation.x,
                        y: this.leftLowerArmBone.rotation.y,
                        z: this.leftLowerArmBone.rotation.z
                    });
                }
                if (this.rightHandBone) {
                    console.log('Right Hand:', {
                        x: this.rightHandBone.rotation.x,
                        y: this.rightHandBone.rotation.y,
                        z: this.rightHandBone.rotation.z
                    });
                }
                if (this.leftHandBone) {
                    console.log('Left Hand:', {
                        x: this.leftHandBone.rotation.x,
                        y: this.leftHandBone.rotation.y,
                        z: this.leftHandBone.rotation.z
                    });
                }
                if (this.headBone) {
                    console.log('Head:', {
                        x: this.headBone.rotation.x,
                        y: this.headBone.rotation.y,
                        z: this.headBone.rotation.z
                    });
                }
                if (this.neckBone) {
                    console.log('Neck:', {
                        x: this.neckBone.rotation.x,
                        y: this.neckBone.rotation.y,
                        z: this.neckBone.rotation.z
                    });
                }
                if (this.spine) {
                    console.log('Spine:', {
                        x: this.spine.rotation.x,
                        y: this.spine.rotation.y,
                        z: this.spine.rotation.z
                    });
                }
                if (this.hips) {
                    console.log('Hips:', {
                        x: this.hips.rotation.x,
                        y: this.hips.rotation.y,
                        z: this.hips.rotation.z
                    });
                }
            },
            updateBasePose: () => {
                this.updateBasePose();
                console.log('✅ Base pose updated with current bone rotations');
            }
        };

        this.gui.add(controls, 'logCurrentValues').name('📋 Log Current Values');
        this.gui.add(controls, 'updateBasePose').name('💾 Save as Base Pose');

        console.log('✅ Debug GUI setup complete');
    },

    /**
     * Apply natural teaching pose - Both arms start tucked, left arm raises when narrating
     */
    applyProfessionalPose() {
        console.log('Applying professional narrating pose...');

        // Start with IDLE pose (both arms tucked)
        this.setIdlePose();

        // --- HEAD (Start facing front) ---
        if (this.headBone) {
            // Set initial position (facing front)
            this.headBone.rotation.x = 0;
            this.headBone.rotation.y = 0;
            this.headBone.rotation.z = 0;
        }

        // --- NECK (Start neutral) ---
        if (this.neckBone) {
            this.neckBone.rotation.set(0.3, 0, 0); // Adjust neck rotation
        }

        console.log('✅ Professional pose applied - avatar starts in idle (arms tucked)');
    },

    /**
     * Transition to idle wave pose with smooth animation and immediate waving
     */
    transitionToIdleWavePose() {
        console.log('🎬 Starting transition to idle wave pose with synchronized waving');

        // Capture current bone rotations as start values
        this.poseTransitionStartValues = {
            rightShoulder: this.rightShoulderBone ? {
                x: this.rightShoulderBone.rotation.x,
                y: this.rightShoulderBone.rotation.y,
                z: this.rightShoulderBone.rotation.z
            } : null,
            rightArm: this.rightArmBone ? {
                x: this.rightArmBone.rotation.x,
                y: this.rightArmBone.rotation.y,
                z: this.rightArmBone.rotation.z
            } : null,
            rightLowerArm: this.rightLowerArmBone ? {
                x: this.rightLowerArmBone.rotation.x,
                y: this.rightLowerArmBone.rotation.y,
                z: this.rightLowerArmBone.rotation.z
            } : null,
            rightHand: this.rightHandBone ? {
                x: this.rightHandBone.rotation.x,
                y: this.rightHandBone.rotation.y,
                z: this.rightHandBone.rotation.z
            } : null,
            leftShoulder: this.leftShoulderBone ? {
                x: this.leftShoulderBone.rotation.x,
                y: this.leftShoulderBone.rotation.y,
                z: this.leftShoulderBone.rotation.z
            } : null,
            leftArm: this.leftArmBone ? {
                x: this.leftArmBone.rotation.x,
                y: this.leftArmBone.rotation.y,
                z: this.leftArmBone.rotation.z
            } : null,
            leftLowerArm: this.leftLowerArmBone ? {
                x: this.leftLowerArmBone.rotation.x,
                y: this.leftLowerArmBone.rotation.y,
                z: this.leftLowerArmBone.rotation.z
            } : null,
            leftHand: this.leftHandBone ? {
                x: this.leftHandBone.rotation.x,
                y: this.leftHandBone.rotation.y,
                z: this.leftHandBone.rotation.z
            } : null,
            head: this.headBone ? {
                x: this.headBone.rotation.x,
                y: this.headBone.rotation.y,
                z: this.headBone.rotation.z
            } : null,
            neck: this.neckBone ? {
                x: this.neckBone.rotation.x,
                y: this.neckBone.rotation.y,
                z: this.neckBone.rotation.z
            } : null,
            hips: this.hips ? {
                x: this.hips.rotation.x,
                y: this.hips.rotation.y,
                z: this.hips.rotation.z
            } : null
        };

        // Define target values (idle wave pose)
        this.poseTransitionTargetValues = {
            rightShoulder: {x: 0.66, y: 0.5, z: 1.14},
            rightArm: {x: 0.66, y: -0.007587620489694234, z: 1.54},
            rightLowerArm: {x: 0.64120463022904, y: -0.3, z: -0.14},
            rightHand: {x: -0.016574646970668985, y: 1.0344479882163393, z: 0.25630962288184417},
            leftShoulder: {x: 1.78, y: -0.38, z: 1.46},
            leftArm: {x: -0.85, y: 0.58, z: -2.53},
            leftLowerArm: {x: -0.22, y: -0.93, z: 1.94},
            leftHand: {x: -0.3, y: -0.14, z: 0.02},
            head: {x: 0, y: 0, z: 0},
            neck: {x: 0.3, y: 0, z: 0},
            hips: {x: 0, y: 0, z: 0}
        };

        // Start transition
        this.poseTransitionActive = true;
        this.poseTransitionStartTime = this.clock.getElapsedTime();

        // Add smile during wave
        this.smile(0.6);

        // Start waving animation after 1-second delay
        if (this.waveDelayTimer) {
            clearTimeout(this.waveDelayTimer);
        }
        this.waveDelayTimer = setTimeout(() => {
            this.isWaving = true;
            this.waveStartTime = this.clock.getElapsedTime();
            console.log('👋 Wave motion started (1 second after transition began)');
        }, 1000);

        console.log('✅ Transition to idle wave pose started - waving motion will begin in 1 second');
    },

    /**
     * Generate random idle animation interval between 5-10 seconds
     */
    getRandomIdleInterval() {
        const interval = Math.random() * (this.idleAnimationIntervalMax - this.idleAnimationIntervalMin) + this.idleAnimationIntervalMin;
        return Math.round(interval);
    },

    /**
     * Schedule next idle animation with randomized timing
     */
    scheduleNextIdleAnimation() {
        // Clear existing timer if any
        if (this.idleAnimationTimer) {
            clearTimeout(this.idleAnimationTimer);
        }

        // Get random interval between 5-10 seconds
        const nextInterval = this.getRandomIdleInterval();
        console.log(`⏱️ Next idle animation scheduled in ${(nextInterval / 1000).toFixed(1)} seconds`);

        // Set up timer for next pose change
        this.idleAnimationTimer = setTimeout(() => {
            // CRITICAL FIX: Only trigger if not speaking AND no story is playing AND not transitioning lines
            // Check both local speaking state and global AudioNarration state
            const isAudioNarrationPlaying = window.AudioNarration && window.AudioNarration.isPlaying;
            const isTransitioningLines = window.AudioNarration && window.AudioNarration.isTransitioningLines;
            const isTeachingActive = this.teachingAnimationActive;

            if (!this.isSpeaking && !isAudioNarrationPlaying && !isTransitioningLines && !isTeachingActive) {
                // Alternate between poses
                this.currentIdlePoseIndex = (this.currentIdlePoseIndex + 1) % 2;

                if (this.currentIdlePoseIndex === 0) {
                    console.log('🔄 Switching to default idle pose with smooth transition');
                    this.transitionToIdlePose();
                } else {
                    console.log('👋 Switching to wave idle pose with smile and smooth transition');
                    this.transitionToIdleWavePose();
                }

                // Schedule the next animation
                this.scheduleNextIdleAnimation();
            } else {
                console.log('⏸️ Skipping idle animation - avatar is speaking or story is playing');
                console.log(`   - isSpeaking: ${this.isSpeaking}, AudioNarration.isPlaying: ${isAudioNarrationPlaying}, isTransitioningLines: ${isTransitioningLines}, teachingActive: ${isTeachingActive}`);
                // Reschedule for later if speaking
                this.scheduleNextIdleAnimation();
            }
        }, nextInterval);
    },

    /**
     * Start the idle animation cycle - Alternates between setIdlePose() and setIdleWavePose()
     * Triggers randomly between 5-10 seconds to create variety in idle animations
     */
    startIdleAnimationCycle() {
        // Don't start if already running
        if (this.isIdleAnimationActive) {
            console.log('⚠️ Idle animation cycle already running');
            return;
        }

        // CRITICAL FIX: Don't start if teaching animation is active, audio is playing, or lines are transitioning
        const isAudioNarrationPlaying = window.AudioNarration && window.AudioNarration.isPlaying;
        const isTransitioningLines = window.AudioNarration && window.AudioNarration.isTransitioningLines;
        if (this.teachingAnimationActive || this.isSpeaking || isAudioNarrationPlaying || isTransitioningLines) {
            console.log('⚠️ Cannot start idle animation - teaching/speaking is active');
            console.log(`   - teachingAnimationActive: ${this.teachingAnimationActive}`);
            console.log(`   - isSpeaking: ${this.isSpeaking}`);
            console.log(`   - AudioNarration.isPlaying: ${isAudioNarrationPlaying}`);
            console.log(`   - AudioNarration.isTransitioningLines: ${isTransitioningLines}`);
            return;
        }

        console.log('▶️ Starting idle animation cycle - will alternate poses randomly every 5-10 seconds');

        // Start with the default idle pose
        this.currentIdlePoseIndex = 0;
        this.setIdlePose();

        // Mark as active
        this.isIdleAnimationActive = true;

        // Schedule first animation with random timing
        this.scheduleNextIdleAnimation();

        console.log('✅ Idle animation cycle started successfully');
    },

    /**
     * Stop the idle animation cycle
     */
    stopIdleAnimationCycle() {
        if (this.idleAnimationTimer) {
            clearTimeout(this.idleAnimationTimer);
            this.idleAnimationTimer = null;
            this.isIdleAnimationActive = false;
            this.isWaving = false;
            console.log('⏹️ Idle animation cycle stopped');
        }
        // Clear wave delay timer if active
        if (this.waveDelayTimer) {
            clearTimeout(this.waveDelayTimer);
            this.waveDelayTimer = null;
        }
    },

    /**
     * Animate waving motion - moves left lower arm back and forth
     * Called in the animation loop when isWaving is true
     */
    animateWaveMotion() {
        if (!this.isWaving || !this.leftLowerArmBone) return;

        const currentTime = this.clock.getElapsedTime();
        const elapsed = currentTime - this.waveStartTime;

        // Check if wave duration is complete
        if (elapsed >= this.waveAnimationDuration / 1000) {
            console.log('👋 Wave animation completed - returning to idle pose');
            this.isWaving = false;
            this.transitionToIdlePose();
            return;
        }

        // Animate left lower arm rotation on X axis
        // From -0.22727901358640065 to -0.54 and back
        const minRotation = -0.54;
        const maxRotation = -0.22727901358640065;

        // Use sine wave for smooth back-and-forth motion
        const waveProgress = Math.sin(currentTime * this.waveAnimationSpeed * Math.PI * 2);

        // Map sine wave (-1 to 1) to rotation range
        const rotationX = minRotation + ((waveProgress + 1) / 2) * (maxRotation - minRotation);

        // Apply rotation to left lower arm
        this.leftLowerArmBone.rotation.x = rotationX;
    },

    /**
     * Trigger a random wave animation when paused
     * This will transition to the wave pose and perform a wave animation
     */
    triggerWaveOnPause() {
        console.log('👋 Triggering wave animation on pause...');

        // Don't trigger if avatar is not loaded or already waving
        if (!this.isFullyLoaded || this.isWaving || this.poseTransitionActive) {
            console.log('⏸️ Cannot trigger wave - avatar not ready or already animating');
            return;
        }

        // Don't trigger if currently speaking/teaching
        if (this.isSpeaking || this.teachingAnimationActive) {
            console.log('⏸️ Cannot trigger wave - avatar is speaking/teaching');
            return;
        }

        // Trigger the idle wave pose transition (which includes waving animation)
        this.transitionToIdleWavePose();

        // Start the random wave system after this initial wave completes
        if (!this.isRandomWaveActive) {
            this.startRandomWaveAnimations();
        }
    },

    /**
     * Start random wave animations while paused
     * Avatar will perform waves at random intervals
     */
    startRandomWaveAnimations() {
        console.log('🔄 Starting random wave animation system...');

        this.isRandomWaveActive = true;

        const scheduleNextWave = () => {
            // Clear existing timer
            if (this.randomWaveTimer) {
                clearTimeout(this.randomWaveTimer);
            }

            // Don't schedule if system is no longer active
            if (!this.isRandomWaveActive) {
                console.log('⏸️ Random wave system stopped');
                return;
            }

            // Random interval between min and max
            const interval = Math.random() * (this.pausedWaveIntervalMax - this.pausedWaveIntervalMin) + this.pausedWaveIntervalMin;

            console.log(`⏰ Next wave scheduled in ${(interval / 1000).toFixed(1)} seconds`);

            this.randomWaveTimer = setTimeout(() => {
                // Check if we should still be waving (not speaking, not already waving)
                if (this.isRandomWaveActive && !this.isSpeaking && !this.teachingAnimationActive && !this.isWaving && !this.poseTransitionActive) {
                    console.log('👋 Triggering random wave animation...');
                    this.transitionToIdleWavePose();

                    // Schedule next wave after this one completes (wave duration + transition back)
                    // Total time = 1s delay + 2.5s wave + 1s transition back = ~5s
                    setTimeout(() => {
                        scheduleNextWave();
                    }, 5000);
                } else {
                    // Try again later if conditions not met
                    scheduleNextWave();
                }
            }, interval);
        };

        // Start the cycle
        scheduleNextWave();
    },

    /**
     * Stop random wave animations (called when resuming playback)
     */
    stopRandomWaveAnimations() {
        console.log('⏹️ Stopping random wave animation system');

        this.isRandomWaveActive = false;

        if (this.randomWaveTimer) {
            clearTimeout(this.randomWaveTimer);
            this.randomWaveTimer = null;
        }
    },

    /**
     * Animate a specific viseme (mouth shape) with smoothing and clamping
     * Vowels (A, E, I, O, U) receive extra smoothing for more natural transitions
     */
    setViseme(visemeName, intensity = 1.0) {
        if (!this.morphTargets.mesh || !this.morphTargets.indices) {
            // Only warn once
            if (!this._noMorphTargetsWarned) {
                console.warn('⚠️ Cannot set viseme - no morph targets found');
                this._noMorphTargetsWarned = true;
            }
            return;
        }

        const mesh = this.morphTargets.mesh;
        const index = this.morphTargets.indices[visemeName];

        if (index !== undefined && mesh.morphTargetInfluences) {
            // Clamp intensity to valid range [0, 1]
            const clampedIntensity = Math.max(0, Math.min(1, intensity));

            // Check if this is a vowel viseme that needs extra smoothing
            const isVowel = this.vowelVisemes.includes(visemeName);
            const smoothingFactor = isVowel ? this.vowelSmoothingFactor : this.visemeSmoothingFactor;

            // Apply smoothing to prevent abrupt transitions
            const previousWeight = this.previousVisemeWeights[visemeName] || 0;
            const smoothedIntensity = previousWeight + (clampedIntensity - previousWeight) * smoothingFactor;

            // Store for next frame
            this.previousVisemeWeights[visemeName] = smoothedIntensity;

            // Apply the smoothed and clamped weight
            mesh.morphTargetInfluences[index] = smoothedIntensity;

            // Reduce logging to avoid spam - only log first few times
            if (!this._visemeSetCount) this._visemeSetCount = 0;
            if (this._visemeSetCount < 5) {
                const smoothType = isVowel ? 'VOWEL (extra smooth)' : 'normal';
                console.log(`👄 Setting viseme "${visemeName}" [${smoothType}] (index ${index}) to intensity ${smoothedIntensity.toFixed(2)} (smoothed from ${clampedIntensity.toFixed(2)})`);
                this._visemeSetCount++;
                if (this._visemeSetCount === 5) {
                    console.log('👄 Lip-sync working with vowel smoothing - further viseme logs suppressed');
                }
            }
        } else {
            console.warn(`⚠️ Viseme "${visemeName}" not found in morph targets or no influences array`);
        }
    },

    /**
     * Reset all visemes to neutral position
     */
    resetVisemes() {
        // CRITICAL FIX: Reset visemes on ALL meshes, not just the first one
        if (this.morphTargets.allMeshes && this.morphTargets.allMeshes.length > 0) {
            this.morphTargets.allMeshes.forEach(({mesh}) => {
                if (!mesh.morphTargetInfluences) return;

                // Reset all morph target influences to 0
                const influences = mesh.morphTargetInfluences;
                for (let i = 0; i < influences.length; i++) {
                    influences[i] = 0;
                }

                // Notify Three.js that morph targets have been updated
                if (mesh.geometry) {
                    mesh.geometry.morphAttributesNeedUpdate = true;
                }
            });
        }
        // Fallback to old behavior if allMeshes not available
        else if (this.morphTargets.mesh && this.morphTargets.mesh.morphTargetInfluences) {
            const influences = this.morphTargets.mesh.morphTargetInfluences;
            for (let i = 0; i < influences.length; i++) {
                influences[i] = 0;
            }
        }
    },

    /**
     * Set additional blend shape (mouthOpen, mouthSmile, eyesClosed, etc.)
     * @param {string} shapeName - Name of the blend shape
     * @param {number} intensity - Intensity value (0-1)
     */
    setBlendShape(shapeName, intensity = 1.0) {
        if (!this.morphTargets.allMeshes || this.morphTargets.allMeshes.length === 0) {
            console.warn(`⚠️ Cannot set blend shape "${shapeName}" - no morph targets available`);
            return;
        }

        const clampedIntensity = Math.max(0, Math.min(1, intensity));
        let applied = false;

        this.morphTargets.allMeshes.forEach(({mesh, indices}) => {
            if (!mesh.morphTargetInfluences) return;

            const index = indices[shapeName];
            if (index !== undefined) {
                mesh.morphTargetInfluences[index] = clampedIntensity;
                applied = true;

                // Notify Three.js that morph targets have been updated
                if (mesh.geometry) {
                    mesh.geometry.morphAttributesNeedUpdate = true;
                }
            }
        });

        if (!applied) {
            console.warn(`⚠️ Blend shape "${shapeName}" not found in avatar`);
        }
    },

    /**
     * Blink eyes - smooth fast blink animation using morph targets
     * Ready Player Me avatars have separate eye meshes (EyeLeft, EyeRight)
     */
    playBlink() {
        console.log('👁️ playBlink() called');

        if (!this.avatar) {
            console.warn('⚠️ Blink failed: Avatar not loaded');
            return;
        }

        // CRITICAL: Ready Player Me avatars have separate eye meshes
        // Search for EyeLeft and EyeRight meshes directly
        const eyeLeftMesh = this.avatar.getObjectByName('EyeLeft');
        const eyeRightMesh = this.avatar.getObjectByName('EyeRight');

        console.log('👁️ Searching for eye meshes:', {
            eyeLeftFound: !!eyeLeftMesh,
            eyeRightFound: !!eyeRightMesh
        });

        // Check morph targets on each eye mesh
        let blinkLeftIndex = undefined;
        let blinkRightIndex = undefined;

        if (eyeLeftMesh && eyeLeftMesh.morphTargetDictionary) {
            blinkLeftIndex = eyeLeftMesh.morphTargetDictionary['eyeBlinkLeft'];
            console.log('   EyeLeft morph targets:', Object.keys(eyeLeftMesh.morphTargetDictionary));
            console.log('   Full EyeLeft morphTargetDictionary:', eyeLeftMesh.morphTargetDictionary);
            console.log('   eyeBlinkLeft index:', blinkLeftIndex);
        }

        if (eyeRightMesh && eyeRightMesh.morphTargetDictionary) {
            blinkRightIndex = eyeRightMesh.morphTargetDictionary['eyeBlinkRight'];
            console.log('   EyeRight morph targets:', Object.keys(eyeRightMesh.morphTargetDictionary));
            console.log('   Full EyeRight morphTargetDictionary:', eyeRightMesh.morphTargetDictionary);
            console.log('   eyeBlinkRight index:', blinkRightIndex);
        }

        // Try to find head mesh and check for blink morphs there too
        const headMesh = this.avatar.getObjectByName('Wolf3D_Head') ||
                       this.avatar.getObjectByName('Head') ||
                       this.avatar.getObjectByName('head');

        if (headMesh && headMesh.morphTargetDictionary) {
            console.log('   Head mesh found:', headMesh.name);
            console.log('   Head mesh morph targets:', Object.keys(headMesh.morphTargetDictionary));
            console.log('   Full Head morphTargetDictionary:', headMesh.morphTargetDictionary);

            // Check for eyeBlinkLeft and eyeBlinkRight in head mesh
            const headBlinkLeft = headMesh.morphTargetDictionary['eyeBlinkLeft'];
            const headBlinkRight = headMesh.morphTargetDictionary['eyeBlinkRight'];

            if (headBlinkLeft !== undefined || headBlinkRight !== undefined) {
                console.log('✅ Found eyeBlink morphs in HEAD mesh!');
                console.log('   eyeBlinkLeft index:', headBlinkLeft);
                console.log('   eyeBlinkRight index:', headBlinkRight);

                // Use head mesh blink morphs
                if (headBlinkLeft !== undefined && headBlinkRight !== undefined) {
                    this.playBlinkOnMesh(headMesh, headBlinkLeft, headBlinkRight);
                    return;
                }
            }
        }

        // Validation: ensure we have at least one eye to blink
        if (blinkLeftIndex === undefined && blinkRightIndex === undefined) {
            console.warn('⚠️ Blink failed: No eyeBlinkLeft or eyeBlinkRight morph targets found in eye meshes');
            console.warn('   This avatar may not support eye blinking');

            // Fallback: Try to find blink morphs in head mesh
            console.log('   Attempting fallback: searching head mesh for blink morphs...');

            if (headMesh && headMesh.morphTargetDictionary) {
                const possibleBlinkNames = ['eyesClosed', 'eyeBlink', 'EyesClosed', 'Blink'];

                for (const blinkName of possibleBlinkNames) {
                    if (headMesh.morphTargetDictionary[blinkName] !== undefined) {
                        console.log('✅ Found fallback blink morph:', blinkName, 'in head mesh');
                        this.playBlinkFallback(headMesh, blinkName);
                        return;
                    }
                }
            }

            console.warn('   No fallback blink morphs found - blinking not supported');
            return;
        }

        console.log('✅ Starting dual-eye blink animation');
        console.log('   Left eye index:', blinkLeftIndex);
        console.log('   Right eye index:', blinkRightIndex);

        this.isBlinking = true;

        // Simple manual blink timing - close eyes immediately
        if (blinkLeftIndex !== undefined && eyeLeftMesh.morphTargetInfluences) {
            eyeLeftMesh.morphTargetInfluences[blinkLeftIndex] = 1;
            if (eyeLeftMesh.geometry) {
                eyeLeftMesh.geometry.morphAttributesNeedUpdate = true;
            }
        }

        if (blinkRightIndex !== undefined && eyeRightMesh.morphTargetInfluences) {
            eyeRightMesh.morphTargetInfluences[blinkRightIndex] = 1;
            if (eyeRightMesh.geometry) {
                eyeRightMesh.geometry.morphAttributesNeedUpdate = true;
            }
        }

        // Hold closed for a short moment, then open
        setTimeout(() => {
            // Reset both eyes to open
            if (blinkLeftIndex !== undefined && eyeLeftMesh.morphTargetInfluences) {
                eyeLeftMesh.morphTargetInfluences[blinkLeftIndex] = 0;
                if (eyeLeftMesh.geometry) {
                    eyeLeftMesh.geometry.morphAttributesNeedUpdate = true;
                }
            }
            if (blinkRightIndex !== undefined && eyeRightMesh.morphTargetInfluences) {
                eyeRightMesh.morphTargetInfluences[blinkRightIndex] = 0;
                if (eyeRightMesh.geometry) {
                    eyeRightMesh.geometry.morphAttributesNeedUpdate = true;
                }
            }

            this.isBlinking = false;
            console.log('✅ Blink animation complete - both eyes reset');
        }, 150);  // hold closed for a short moment
    },

    /**
     * Blink animation for head mesh with separate left/right blink morphs
     * @param {THREE.Mesh} mesh - The head mesh with blink morphs
     * @param {number} blinkLeftIndex - Index of eyeBlinkLeft morph
     * @param {number} blinkRightIndex - Index of eyeBlinkRight morph
     */
    playBlinkOnMesh(mesh, blinkLeftIndex, blinkRightIndex) {
        console.log('✅ Starting head mesh dual-eye blink animation');
        console.log('   Mesh:', mesh.name);
        console.log('   Left eye index:', blinkLeftIndex);
        console.log('   Right eye index:', blinkRightIndex);

        this.isBlinking = true;

        const influences = mesh.morphTargetInfluences;
        const blinkDuration = 0.15; // Total blink duration in seconds (down + up)
        const startTime = performance.now();
        const duration = blinkDuration * 1000; // Convert to milliseconds

        const animateBlink = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Smooth blink: ease in-out curve for natural motion
            // First half: close eyes (0 -> 1)
            // Second half: open eyes (1 -> 0)
            let blinkValue;
            if (progress < 0.5) {
                // Closing phase: ease out for quick close
                const t = progress * 2; // 0 to 1 in first half
                blinkValue = t * t; // Quadratic ease out
            } else {
                // Opening phase: ease in for smooth open
                const t = (progress - 0.5) * 2; // 0 to 1 in second half
                blinkValue = 1 - (t * t); // Quadratic ease in
            }

            influences[blinkLeftIndex] = blinkValue;
            influences[blinkRightIndex] = blinkValue;

            if (mesh.geometry) {
                mesh.geometry.morphAttributesNeedUpdate = true;
            }

            if (progress < 1) {
                requestAnimationFrame(animateBlink);
            } else {
                influences[blinkLeftIndex] = 0;
                influences[blinkRightIndex] = 0;
                if (mesh.geometry) {
                    mesh.geometry.morphAttributesNeedUpdate = true;
                }
                this.isBlinking = false;
                console.log('✅ Head mesh blink animation complete - both eyes reset');
            }
        };

        animateBlink();
    },

    /**
     * Fallback blink animation for avatars with single head mesh
     * @param {THREE.Mesh} mesh - The head mesh with blink morphs
     * @param {string} blinkMorphName - Name of the blink morph target
     */
    playBlinkFallback(mesh, blinkMorphName) {
        const blinkIndex = mesh.morphTargetDictionary[blinkMorphName];

        const blinkStrength = 1.0; // Blink strength (0-1)
        const blinkDuration = 0.15; // Blink duration in seconds
        const startTime = performance.now();
        const duration = blinkDuration * 1000; // Convert to milliseconds
        const closeAmount = blinkStrength;

        const animateBlink = () => {
            const elapsed = performance.now() - startTime;
            const progress = elapsed / duration;

            if (progress <= 1) {
                const blinkValue = progress <= 0.5
                    ? progress * 2 * closeAmount
                    : (1 - (progress - 0.5) * 2) * closeAmount;

                mesh.morphTargetInfluences[blinkIndex] = blinkValue;
                if (mesh.geometry) {
                    mesh.geometry.morphAttributesNeedUpdate = true;
                }

                requestAnimationFrame(animateBlink);
            } else {
                mesh.morphTargetInfluences[blinkIndex] = 0;
                if (mesh.geometry) {
                    mesh.geometry.morphAttributesNeedUpdate = true;
                }
                this.isBlinking = false;
                console.log('✅ Fallback blink animation complete');
            }
        };

        this.isBlinking = true;
        animateBlink();
    },

    /**
     * Update blink timer - called from main animation loop
     */
    updateBlink() {
        // Debug logging every 120 frames (~2 seconds at 60fps)
        if (!this._blinkUpdateCount) this._blinkUpdateCount = 0;
        this._blinkUpdateCount++;

        if (this._blinkUpdateCount % 120 === 0) {
            console.log('🔄 updateBlink() status:', {
                blinkEnabled: this.blinkEnabled,
                isBlinking: this.isBlinking,
                hasAvatar: !!this.avatar,
                blinkTimer: this.blinkTimer.toFixed(2),
                blinkInterval: this.blinkInterval.toFixed(2),
                timeUntilNextBlink: (this.blinkInterval - this.blinkTimer).toFixed(2)
            });
        }

        if (!this.blinkEnabled) {
            if (this._blinkUpdateCount === 1) {
                console.warn('⚠️ Blink disabled - blinkEnabled is false');
            }
            return;
        }

        if (this.isBlinking) {
            return; // Already blinking, skip
        }

        if (!this.avatar) {
            if (this._blinkUpdateCount === 1) {
                console.warn('⚠️ Blink disabled - avatar not loaded');
            }
            return;
        }

        this.blinkTimer += this.clock.getDelta();

        if (this.blinkTimer >= this.blinkInterval) {
            console.log('⏰ Blink interval reached! Triggering blink...');
            this.blinkTimer = 0;
            this.blinkInterval = Math.random() * 4 + 2; // Reset to new random interval
            console.log('   Next blink scheduled in:', this.blinkInterval.toFixed(2), 'seconds');
            this.playBlink();
        }
    },

    /**
     * Start automatic blinking animation
     */
    startAutomaticBlinking() {
        console.log('👁️ Starting automatic blinking animation');
        this.blinkEnabled = true;
        this.blinkTimer = 0;
        this.blinkInterval = Math.random() * 4 + 2;
    },

    /**
     * Stop automatic blinking animation
     */
    stopAutomaticBlinking() {
        console.log('👁️ Stopping automatic blinking animation');
        this.blinkEnabled = false;
        this.blinkTimer = 0;

        // Reset eyes to open position - check both eye meshes
        if (this.avatar) {
            const eyeLeftMesh = this.avatar.getObjectByName('EyeLeft');
            const eyeRightMesh = this.avatar.getObjectByName('EyeRight');

            if (eyeLeftMesh && eyeLeftMesh.morphTargetDictionary && eyeLeftMesh.morphTargetInfluences) {
                const blinkLeftIndex = eyeLeftMesh.morphTargetDictionary['eyeBlinkLeft'];
                if (blinkLeftIndex !== undefined) {
                    eyeLeftMesh.morphTargetInfluences[blinkLeftIndex] = 0;
                    if (eyeLeftMesh.geometry) {
                        eyeLeftMesh.geometry.morphAttributesNeedUpdate = true;
                    }
                }
            }

            if (eyeRightMesh && eyeRightMesh.morphTargetDictionary && eyeRightMesh.morphTargetInfluences) {
                const blinkRightIndex = eyeRightMesh.morphTargetDictionary['eyeBlinkRight'];
                if (blinkRightIndex !== undefined) {
                    eyeRightMesh.morphTargetInfluences[blinkRightIndex] = 0;
                    if (eyeRightMesh.geometry) {
                        eyeRightMesh.geometry.morphAttributesNeedUpdate = true;
                    }
                }
            }
        }

        // Fallback: Reset eyes using old method for avatars with different structure
        const possibleBlinkNames = ['eyesClosed', 'eyeBlinkLeft', 'eyeBlinkRight', 'eyeBlink', 'EyesClosed', 'Blink'];

        if (this.morphTargets.allMeshes && this.morphTargets.allMeshes.length > 0) {
            for (const meshData of this.morphTargets.allMeshes) {
                // Try all possible blink morph target names
                for (const blinkName of possibleBlinkNames) {
                    if (meshData.indices[blinkName] !== undefined) {
                        meshData.mesh.morphTargetInfluences[meshData.indices[blinkName]] = 0;
                        if (meshData.mesh.geometry) {
                            meshData.mesh.geometry.morphAttributesNeedUpdate = true;
                        }
                    }
                }
            }
        }
    },

    /**
     * Make avatar smile
     * @param {number} intensity - Smile intensity (0-1)
     */
    smile(intensity = 0.7) {
        this.setBlendShape('mouthSmile', intensity);
    },

    /**
     * Look up or down using eye blend shapes
     * @param {string} direction - 'up' or 'down'
     * @param {number} intensity - Look intensity (0-1)
     */
    lookVertical(direction = 'up', intensity = 0.5) {
        if (direction === 'up') {
            this.setBlendShape('eyesLookUp', intensity);
            this.setBlendShape('eyesLookDown', 0);
        } else if (direction === 'down') {
            this.setBlendShape('eyesLookDown', intensity);
            this.setBlendShape('eyesLookUp', 0);
        }
    },

    /**
     * Reset all additional blend shapes to neutral
     */
    resetBlendShapes() {
        Object.keys(this.additionalBlendShapes).forEach(shapeName => {
            if (this.additionalBlendShapes[shapeName] !== null) {
                this.setBlendShape(shapeName, 0);
            }
        });
    },

    /**
     * Create Three.js Audio Analyzer for real-time audio frequency analysis
     * @param {HTMLAudioElement} audioElement - The HTML audio element to analyze
     * @returns {THREE.AudioAnalyser|null} The audio analyzer or null if creation fails
     */
    createAudioAnalyzer(audioElement) {
        try {
            console.log('🎧 Creating Three.js Audio Analyzer...');

            // CRITICAL FIX: Don't cleanup existing analyzer during line transitions
            // Only cleanup if we're creating a new one for a completely different audio context
            // this.cleanupAudioAnalyzer(); // REMOVED - causes lip sync to restart

            // Create audio listener if not exists
            if (!this.audioListener) {
                this.audioListener = new THREE.AudioListener();
                this.camera.add(this.audioListener);
                console.log('✅ Audio listener created and attached to camera');
            }

            // Get audio context
            const audioContext = this.audioListener.context;

            // CRITICAL FIX: Resume audio context if suspended (required for some browsers)
            // Wait for context to be ready before proceeding
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    console.log('✅ Audio context resumed');
                });
            }

            // CRITICAL FIX: Reuse existing Three.js Audio object if available
            // This maintains continuity across line transitions
            if (!this.threeAudio) {
                this.threeAudio = new THREE.Audio(this.audioListener);
                console.log('🆕 Created new Three.js Audio object');
            } else {
                console.log('🔄 Reusing existing Three.js Audio object for continuity');
            }

            // CRITICAL FIX: Check if this audio element already has a source node
            // If it does, we can't create another one (InvalidStateError)
            let source;
            if (audioElement._audioSource) {
                console.log('🔄 Reusing existing audio source node for this element');
                source = audioElement._audioSource;
            } else {
                console.log('🆕 Creating new MediaElementAudioSource for this element');
                source = audioContext.createMediaElementSource(audioElement);
                // Store reference to prevent duplicate creation
                audioElement._audioSource = source;

                // CRITICAL: Connect source to destination so we can hear the audio
                // Without this, the audio won't play through speakers
                // Only connect once when creating the source node
                source.connect(audioContext.destination);
                console.log('✅ Connected audio source to destination');
            }

            // Update the Three.js Audio with the new source if needed
            if (!this.threeAudio.source || this.threeAudio.source !== source) {
                this.threeAudio.setNodeSource(source);
                console.log('✅ Updated Three.js Audio with source node');
            }

            // CRITICAL FIX: Reuse existing analyzer if available
            // This prevents lip sync animation from restarting
            if (!this.audioAnalyzer) {
                // Create analyzer with 256 frequency bins for better detection
                // FFT size of 512 = 256 frequency bins
                this.audioAnalyzer = new THREE.AudioAnalyser(this.threeAudio, 256);
                console.log('🆕 Created new Audio Analyzer');
            } else {
                console.log('🔄 Reusing existing Audio Analyzer for continuous lip sync');
            }

            console.log('✅ Audio Analyzer setup complete');
            console.log('   - FFT Size:', this.audioAnalyzer.analyser.fftSize);
            console.log('   - Frequency Bin Count:', this.audioAnalyzer.analyser.frequencyBinCount);
            console.log('   - Audio Context State:', audioContext.state);

            return this.audioAnalyzer;

        } catch (error) {
            console.error('❌ Failed to create Audio Analyzer:', error);
            console.error('   Error details:', error.message);

            // If we get "InvalidStateError", the audio element already has a source
            if (error.name === 'InvalidStateError') {
                console.warn('⚠️ Audio element already has a source node - this is expected after first audio');
                console.warn('⚠️ This should not happen with our fixed code - please check');
            }

            return null;
        }
    },

    /**
     * Update mouth/jaw bone based on audio frequency analysis
     * Called every frame during animation loop
     */
    updateMouthFromAnalyzer() {
        if (!this.audioAnalyzer || !this.jawBone || !this.isSpeaking) {
            return;
        }

        try {
            // Get frequency data array
            const frequencyData = this.audioAnalyzer.getFrequencyData();

            // Calculate average volume across all frequencies
            let sum = 0;
            for (let i = 0; i < frequencyData.length; i++) {
                sum += frequencyData[i];
            }
            const averageFrequency = sum / frequencyData.length;

            // Also get average frequency (alternative method for comparison)
            const avgFreq = this.audioAnalyzer.getAverageFrequency();

            // Normalize to 0-1 range (frequency data is 0-255)
            const volume = averageFrequency / 255;

            // Apply non-linear curve to make mouth movement more natural
            // Square root gives more sensitivity to low volumes
            const volumeCurve = Math.sqrt(volume);

            // Apply smoothing to prevent jittery movement - optimized for ultra-smooth motion
            const smoothingFactor = 0.38; // Increased for smoother animation (from 0.3)
            const previousRotation = this.jawBone.rotation.x || 0;

            // Scale the rotation - louder sound = wider mouth
            // Max rotation is 0.4 radians (about 23 degrees) - Reduced for more subtle movement
            const maxRotation = 0.4;
            const targetRotation = volumeCurve * maxRotation;

            // Smooth interpolation (lerp) with optimized factor
            const newRotation = previousRotation + (targetRotation - previousRotation) * smoothingFactor;

            // Apply rotation to jaw bone (positive X rotation = mouth opening downward)
            this.jawBone.rotation.x = newRotation;

            // Update skeleton to reflect bone changes
            if (this.skinnedMeshes.length > 0) {
                this.skinnedMeshes.forEach(mesh => {
                    if (mesh.skeleton) {
                        mesh.skeleton.update();
                    }
                });
            }

            // Optional: Log first few updates to verify it's working
            if (!this._analyzerUpdateCount) this._analyzerUpdateCount = 0;
            if (this._analyzerUpdateCount < 10) {
                console.log(`👄 Audio Analyzer Update #${this._analyzerUpdateCount + 1}:`, {
                    rawFrequency: averageFrequency.toFixed(1),
                    avgFreq: avgFreq.toFixed(1),
                    volume: volume.toFixed(3),
                    volumeCurve: volumeCurve.toFixed(3),
                    targetRotation: targetRotation.toFixed(3),
                    actualRotation: newRotation.toFixed(3),
                    isSpeaking: this.isSpeaking
                });
                this._analyzerUpdateCount++;
                if (this._analyzerUpdateCount === 10) {
                    console.log('✅ Audio Analyzer lip-sync active! Further detailed logs suppressed.');
                }
            }

        } catch (error) {
            console.error('❌ Error updating mouth from analyzer:', error);
            console.error('   Stack:', error.stack);
        }
    },

    /**
     * Sync lip movements with audio using ElevenLabs viseme data or fallback animation
     * Supports viseme data, morph target animation, and bone-based audio analyzer
     */
    async syncWithAudio(audioElement, visemeData = null) {
        console.log('🎤 syncWithAudio CALLED!', {
            hasAudioElement: !!audioElement,
            hasVisemeData: !!visemeData,
            visemeDataLength: visemeData?.length || 0,
            isInitialized: this.isInitialized,
            hasMorphTargets: !!this.morphTargets.mesh,
            hasLipSyncSupport: this.hasLipSyncSupport,
            hasJawBone: !!this.jawBone,
            useAudioAnalyzer: this.useAudioAnalyzer,
            hasExistingAnalyzer: !!this.audioAnalyzer,
            currentAudioSame: this.currentAudio === audioElement
        });

        if (!audioElement) {
            console.warn('⚠️ No audio element provided for lip-sync');
            return;
        }

        // CRITICAL FIX: Check if we're continuing with the same audio context
        // If so, don't recreate the audio analyzer - just update the audio element
        const isContinuation = this.currentAudio && this.audioAnalyzer && this.isSpeaking;

        // CRITICAL FIX: Check if this is a line transition (already in teaching mode)
        const isLineTransition = window.AudioNarration && window.AudioNarration.isTransitioningLines;
        const alreadyInTeachingMode = this.teachingAnimationActive || this.poseTransitionActive;

        this.currentAudio = audioElement;
        this.isSpeaking = true;

        // CRITICAL FIX: Ensure teaching animation stays active during ALL narration
        // It should only stop when user pauses or narration ends
        console.log('🎭 Activating teaching animation for narration');
        this.teachingAnimationActive = true; // Enable teaching gestures - stays on during all narration

        // CRITICAL FIX: ALWAYS ensure we're in teaching pose during narration
        // Only skip transition if we're currently in the middle of transitioning
        if (!this.poseTransitionActive) {
            if (!alreadyInTeachingMode || !isLineTransition) {
                console.log('🎬 Transitioning to teaching pose (ensuring proper animation)');
                this.transitionToTeachingPose();
            } else {
                console.log('🔄 Line transition - maintaining current teaching animation (no new transition)');
            }
        } else {
            console.log('📍 Already transitioning to teaching pose - continuing');
        }

        console.log('🎤 Starting lip-sync with audio and teaching animations');
        console.log('📊 Viseme data available:', !!visemeData);
        console.log('🎭 Lip-sync support level:', this.hasLipSyncSupport);
        console.log('🦴 Jaw bone available:', !!this.jawBone);
        console.log('🔄 Continuation mode:', isContinuation);

        // Priority 1: If we have viseme data and morph targets (any type), use viseme-driven animation
        // Works with both full viseme blend shapes AND basic mouthOpen/mouthSmile
        if (visemeData && Array.isArray(visemeData) && visemeData.length > 0 &&
            (this.hasLipSyncSupport === true || this.hasLipSyncSupport === 'limited')) {
            console.log('✅ PATH 1: Using viseme-driven lip sync (phoneme-based animation)');
            console.log(`   📊 Processing ${visemeData.length} viseme phonemes`);
            console.log(`   🎭 Avatar support level: ${this.hasLipSyncSupport === true ? 'FULL viseme blend shapes' : 'LIMITED (mouthOpen/mouthSmile only)'}`);
            this.syncWithVisemeData(audioElement, visemeData);
        }
        // Priority 2: Use Audio Analyzer with jaw bone (reactive but less accurate - frequency-based)
        else if (this.useAudioAnalyzer && this.jawBone) {
            console.log('✅ PATH 2: Using Audio Analyzer bone-based lip sync (real-time frequency analysis)');
            console.log('   ⚠️ No viseme data available - using generic mouth opening based on volume');

            // CRITICAL FIX: Only create analyzer if we don't have one already
            // This prevents lip sync from restarting when transitioning between lines
            if (!this.audioAnalyzer || !isContinuation) {
                try {
                    this.createAudioAnalyzer(audioElement);
                    console.log('✅ Audio Analyzer initialized - jaw will animate based on audio frequency');
                    // The actual animation happens in the animate() loop via updateMouthFromAnalyzer()
                } catch (error) {
                    console.error('❌ Failed to create Audio Analyzer, falling back to morph targets:', error);
                    // Fall through to morph target methods
                    this.useAudioAnalyzer = false;
                }
            } else {
                console.log('🔄 Reusing existing Audio Analyzer for continuous lip sync');
                // Reset the analyzer update counter for the new line
                this._analyzerUpdateCount = 0;
            }
        }
        // Priority 3: Fallback to simple morph target animation (no viseme data, no jaw bone)
        else if (this.hasLipSyncSupport === true || this.hasLipSyncSupport === 'limited') {
            console.log('⚠️ PATH 3: No viseme data or jaw bone, using simple morph target animation');
            console.log('   - useAudioAnalyzer:', this.useAudioAnalyzer);
            console.log('   - hasLipSyncSupport:', this.hasLipSyncSupport);
            console.log('   - Calling syncWithSimpleAnimation now...');
            this.syncWithSimpleAnimation(audioElement);
        }
        // No lip sync available
        else {
            console.error('❌ PATH 4: LIP-SYNC NOT AVAILABLE - Avatar has no jaw bone or morph targets');
            console.error('   Audio will play but avatar mouth will not move');
        }

        // CRITICAL FIX: Clear any pending end-check timeout from previous audio line
        // This prevents lingering timeouts from previous lines incorrectly deactivating teaching mode
        if (this._endCheckTimeout) {
            clearTimeout(this._endCheckTimeout);
            this._endCheckTimeout = null;
            console.log('🧹 Cleared pending end-check timeout from previous audio');
        }

        // CRITICAL FIX: Remove old event listeners before adding new ones
        // This prevents event listener stacking which causes restarts
        if (this._currentEventHandlers && this._currentAudioElement) {
            this._currentAudioElement.removeEventListener('play', this._currentEventHandlers.play);
            this._currentAudioElement.removeEventListener('pause', this._currentEventHandlers.pause);
            this._currentAudioElement.removeEventListener('ended', this._currentEventHandlers.ended);
            console.log('🧹 Removed old event listeners from previous audio element');
        }

        // Listen for audio events
        const handlePlay = () => {
            // CRITICAL FIX: Check if already transitioning to avoid interrupting
            const isTransitioning = this.poseTransitionActive;

            console.log('▶️ Audio play event - ensuring teaching animation active');
            this.isSpeaking = true;
            this.teachingAnimationActive = true;

            // Stop random wave animations when resuming playback
            if (this.isRandomWaveActive) {
                console.log('🛑 Stopping random wave animations - resuming playback');
                this.stopRandomWaveAnimations();
            }

            // Reset the wave trigger flag
            this.shouldStartWaveOnIdleComplete = false;

            // CRITICAL FIX: STOP the idle animation cycle during narration playback
            // The idle animation cycle should only run when NOT speaking
            // This prevents the avatar from randomly switching to idle/wave poses during narration
            if (this.isIdleAnimationActive) {
                console.log('🛑 Stopping idle animation cycle during narration playback');
                this.stopIdleAnimationCycle();
            }

            // CRITICAL FIX: ALWAYS transition to teaching pose when playing (unless already transitioning)
            // This ensures the avatar is in the correct pose even after pause/resume
            if (!isTransitioning) {
                console.log('🎬 Play event - ensuring teaching pose is active');
                this.transitionToTeachingPose();
            } else {
                console.log('📍 Play event - already transitioning, waiting for completion');
            }
        };

        const handlePause = () => {
            // CRITICAL FIX: Check if this is a line transition or a user pause
            // If it's a line transition, keep the avatar in speaking mode
            const isLineTransition = window.AudioNarration && window.AudioNarration.isTransitioningLines;

            if (isLineTransition) {
                console.log('🔄 Audio paused for line transition - keeping avatar in speaking/teaching mode');
                // Keep speaking state active during transitions
                // The new audio will re-sync the lip sync when it starts
                return;
            }

            // CRITICAL FIX: Check if audio ended naturally (not user-paused)
            // When audio ends naturally, it fires 'pause' event before 'ended' event
            // We need to distinguish between user pause and natural end
            const audioEndedNaturally = audioElement && (audioElement.ended ||
                (audioElement.currentTime >= audioElement.duration - 0.1));

            if (audioEndedNaturally) {
                console.log('🔄 Audio ended naturally (pause event before ended event) - keeping teaching mode');
                // Don't transition to idle - let handleEnd manage the state
                // This prevents the avatar from going idle between narration lines
                return;
            }

            // This is a user-initiated pause
            console.log('⏸️ User paused - transitioning to idle pose');

            // Just pause the speaking state temporarily
            this.isSpeaking = false;
            this.teachingAnimationActive = false;

            // CRITICAL FIX: Stop any wave animation that might be active
            this.isWaving = false;
            if (this.waveDelayTimer) {
                clearTimeout(this.waveDelayTimer);
                this.waveDelayTimer = null;
            }

            // CRITICAL FIX: Stop the idle animation cycle temporarily during pause
            // This prevents wave animation from triggering too quickly
            this.stopIdleAnimationCycle();

            // Smoothly transition to idle pose (arms at sides)
            this.transitionToIdlePose();

            // Set flag to trigger random wave animations after idle transition completes
            this.shouldStartWaveOnIdleComplete = true;
            console.log('⏸️ Audio paused - transitioning to idle, will start random waves after transition');
        };

        const handleEnd = () => {
            // CRITICAL FIX: AGGRESSIVE CHECK - Don't ever stop teaching mode unless this is the LAST line
            // We need to be 100% certain there are no more narration lines before transitioning to idle
            console.log('🎬 RPMAvatar handleEnd fired - performing comprehensive line check');

            // STEP 1: Check transition flag
            const isLineTransition = window.AudioNarration && window.AudioNarration.isTransitioningLines;
            if (isLineTransition) {
                console.log('✅ CHECK 1 PASSED: isTransitioningLines = true - MAINTAINING TEACHING MODE');
                this.teachingAnimationActive = true;
                this.isSpeaking = true;
                return;
            }
            console.log('❌ CHECK 1: isTransitioningLines = false');

            // STEP 2: Check if AudioNarration has more lines queued
            if (window.AudioNarration && window.AudioNarration.scene && window.AudioNarration.scene.narrationLines) {
                const currentLineIndex = window.AudioNarration.currentLineIndex || 0;
                const totalLines = window.AudioNarration.scene.narrationLines.length;
                const hasMoreLines = currentLineIndex < totalLines - 1;

                console.log(`📊 CHECK 2: Line count check - Current: ${currentLineIndex + 1}/${totalLines}`);

                if (hasMoreLines) {
                    console.log(`✅ CHECK 2 PASSED: More lines remaining - MAINTAINING TEACHING MODE`);
                    this.teachingAnimationActive = true;
                    this.isSpeaking = true;
                    return;
                }
                console.log(`❌ CHECK 2: No more lines (${currentLineIndex + 1}/${totalLines})`);
            }

            // STEP 3: Check if AudioNarration is currently playing (might be buffering next line)
            if (window.AudioNarration && window.AudioNarration.isPlaying) {
                console.log('✅ CHECK 3 PASSED: AudioNarration.isPlaying = true - MAINTAINING TEACHING MODE');
                this.teachingAnimationActive = true;
                this.isSpeaking = true;
                return;
            }
            console.log('❌ CHECK 3: AudioNarration.isPlaying = false');

            console.log('⚠️ ALL IMMEDIATE CHECKS FAILED - Scheduling delayed verification (100ms)');

            // IMMEDIATE SAFEGUARD: Keep teaching mode active for now
            this.teachingAnimationActive = true;
            this.isSpeaking = true;

            // DELAYED VERIFICATION: Wait 1 second then verify if narration truly ended
            // This gives AudioNarration plenty of time to start the next line
            this._endCheckTimeout = setTimeout(() => {
                console.log('⏰ DELAYED CHECK (1000ms) - Re-verifying if narration truly ended');

                // STEP 1: Check transition flag again
                const stillTransitioning = window.AudioNarration && window.AudioNarration.isTransitioningLines;
                if (stillTransitioning) {
                    console.log('✅ DELAYED CHECK 1: Still transitioning - MAINTAINING TEACHING MODE');
                    this.teachingAnimationActive = true;
                    this.isSpeaking = true;
                    return;
                }

                // STEP 2: Check if more lines exist
                if (window.AudioNarration && window.AudioNarration.scene) {
                    const currentLineIndex = window.AudioNarration.currentLineIndex || 0;
                    const totalLines = window.AudioNarration.scene.narrationLines?.length || 0;
                    const hasMoreLines = currentLineIndex < totalLines - 1;

                    console.log(`📊 DELAYED CHECK 2: Line status - ${currentLineIndex + 1}/${totalLines}`);

                    if (hasMoreLines) {
                        console.log('✅ DELAYED CHECK 2: More lines exist - MAINTAINING TEACHING MODE');
                        this.teachingAnimationActive = true;
                        this.isSpeaking = true;
                        return;
                    }
                }

                // STEP 3: Check if AudioNarration is playing
                if (window.AudioNarration && window.AudioNarration.isPlaying) {
                    console.log('✅ DELAYED CHECK 3: AudioNarration.isPlaying = true - MAINTAINING TEACHING MODE');
                    this.teachingAnimationActive = true;
                    this.isSpeaking = true;
                    return;
                }

                // STEP 4: Check if current audio is still this audio element (might have switched)
                if (this.currentAudio !== audioElement) {
                    console.log('✅ DELAYED CHECK 4: Audio changed - was a transition - MAINTAINING TEACHING MODE');
                    this.teachingAnimationActive = true;
                    this.isSpeaking = true;
                    return;
                }

                // ALL CHECKS FAILED - This is truly the end
                console.log('❌ ALL DELAYED CHECKS FAILED - Confirmed this is the FINAL line');
                console.log('🎬 TRANSITIONING TO IDLE POSE');

                this.isSpeaking = false;
                this.teachingAnimationActive = false;

                // Reset wave trigger flag (we don't want random waves on natural end, only on user pause)
                this.shouldStartWaveOnIdleComplete = false;

                // Stop any active random wave animations
                if (this.isRandomWaveActive) {
                    this.stopRandomWaveAnimations();
                }

                this.transitionToIdlePose();
                this.resetVisemes();

                // Reset jaw bone to neutral position when audio truly ends
                if (this.jawBone) {
                    this.jawBone.rotation.x = 0;
                }

                // Cleanup audio analyzer only at the very end
                this.cleanupAudioAnalyzer();

                // CRITICAL FIX: Restart idle animation cycle after narration ends
                // This allows the avatar to resume natural idle animations
                // BUT ONLY if AudioNarration is truly done playing (not just between scenes)
                const isAudioNarrationStillPlaying = window.AudioNarration && window.AudioNarration.isPlaying;
                if (!this.isIdleAnimationActive && !isAudioNarrationStillPlaying) {
                    console.log('🔄 Restarting idle animation cycle after narration complete');
                    this.startIdleAnimationCycle();
                } else if (isAudioNarrationStillPlaying) {
                    console.log('⏸️ NOT restarting idle animation - AudioNarration is still playing (different scene)');
                }
            }, 1000); // 1 second delay - gives plenty of time for line transitions
        };

        // Store references to event handlers and audio element for cleanup
        this._currentEventHandlers = {
            play: handlePlay,
            pause: handlePause,
            ended: handleEnd
        };
        this._currentAudioElement = audioElement;

        audioElement.addEventListener('play', handlePlay);
        audioElement.addEventListener('pause', handlePause);
        audioElement.addEventListener('ended', handleEnd);
    },

    /**
     * Cleanup audio analyzer resources
     */
    cleanupAudioAnalyzer() {
        // Clear any pending end check timeouts
        if (this._endCheckTimeout) {
            clearTimeout(this._endCheckTimeout);
            this._endCheckTimeout = null;
        }

        if (this.audioAnalyzer) {
            console.log('🧹 Cleaning up Audio Analyzer');
            this.audioAnalyzer = null;
        }

        if (this.threeAudio) {
            try {
                this.threeAudio.disconnect();
                this.threeAudio = null;
            } catch (error) {
                console.warn('⚠️ Error disconnecting Three.js Audio:', error);
            }
        }

        // Cancel simple lip-sync animation loop if running
        if (this.simpleAnimationFrameId) {
            cancelAnimationFrame(this.simpleAnimationFrameId);
            this.simpleAnimationFrameId = null;
            console.log('🧹 Stopped simple lip-sync animation loop');
        }

        // Reset jaw bone to neutral position
        if (this.jawBone) {
            this.jawBone.rotation.x = 0;

            // Update skeleton immediately
            if (this.skinnedMeshes.length > 0) {
                this.skinnedMeshes.forEach(mesh => {
                    if (mesh.skeleton) {
                        mesh.skeleton.update();
                    }
                });
            }
        }

        // Reset morph targets to neutral
        this.resetVisemes();

        // Reset analyzer update counter for next audio
        this._analyzerUpdateCount = 0;
        this._simpleLipSyncCount = 0; // Reset simple lip-sync counter too

        // Note: We keep the audioListener attached to camera for reuse
        // Note: We keep the _audioSource reference on audio elements for reuse
        console.log('✅ Audio Analyzer cleaned up');
    },

    /**
     * Sync lip movements using ElevenLabs viseme data for accurate phoneme-based animation
     * @param {HTMLAudioElement} audioElement - The audio element playing the speech
     * @param {Array} visemeData - Array of viseme objects with {phoneme, start_time, end_time}
     */
    syncWithVisemeData(audioElement, visemeData) {
        console.log('🎯 Using viseme-based lip sync with available morph targets');
        console.log('📊 Total visemes:', visemeData.length);
        console.log('📊 First few visemes:', visemeData.slice(0, 5));
        console.log('📊 Morph targets available:', !!this.morphTargets.mesh);
        console.log('📊 Total meshes with morph targets:', this.morphTargets.allMeshes?.length || 0);
        console.log('📊 Morph target indices:', this.morphTargets.indices);

        // Check if we have full viseme support or just basic mouth shapes
        const hasFullVisemes = this.morphTargets.allMeshes?.some(m => m.hasVisemes) || false;
        console.log('📊 Avatar has full viseme support:', hasFullVisemes);

        // Map for avatars with full ARKit viseme blend shapes
        const phonemeToVisemeMap = {
            'a': 'viseme_aa', 'e': 'viseme_E', 'i': 'viseme_I', 'o': 'viseme_O', 'u': 'viseme_U',
            'p': 'viseme_PP', 'b': 'viseme_PP', 'm': 'viseme_PP',
            'f': 'viseme_FF', 'v': 'viseme_FF',
            'th': 'viseme_TH', 'd': 'viseme_DD', 't': 'viseme_DD', 'n': 'viseme_nn',
            'k': 'viseme_kk', 'g': 'viseme_kk',
            'ch': 'viseme_CH', 'j': 'viseme_CH', 'sh': 'viseme_CH',
            's': 'viseme_SS', 'z': 'viseme_SS',
            'r': 'viseme_RR', 'l': 'viseme_nn',
            'sil': null
        };

        // Map for avatars with only mouthOpen/mouthSmile (fallback)
        const phonemeToBasicMap = {
            // Vowels - open mouth with different amounts
            'a': { open: 0.8, smile: 0.0 },  // Wide open "ah"
            'e': { open: 0.3, smile: 0.7 },  // Smile with slight open "ee"
            'i': { open: 0.2, smile: 0.9 },  // Big smile "ee"
            'o': { open: 0.7, smile: 0.0 },  // Round open "oh"
            'u': { open: 0.5, smile: 0.0 },  // Pucker "oo"

            // Bilabials - lips together (closed)
            'p': { open: 0.0, smile: 0.0 },
            'b': { open: 0.0, smile: 0.0 },
            'm': { open: 0.0, smile: 0.0 },

            // Labiodentals - slight open with smile
            'f': { open: 0.1, smile: 0.4 },
            'v': { open: 0.1, smile: 0.4 },

            // Dental/alveolar - small to medium open
            'th': { open: 0.2, smile: 0.2 },
            'd': { open: 0.4, smile: 0.0 },
            't': { open: 0.3, smile: 0.0 },
            'n': { open: 0.3, smile: 0.0 },

            // Velars - medium open
            'k': { open: 0.5, smile: 0.0 },
            'g': { open: 0.5, smile: 0.0 },

            // Postalveolar - slight open
            'ch': { open: 0.2, smile: 0.1 },
            'j': { open: 0.2, smile: 0.1 },
            'sh': { open: 0.2, smile: 0.3 },

            // Sibilants - smile with slight open
            's': { open: 0.1, smile: 0.7 },
            'z': { open: 0.1, smile: 0.7 },

            // Liquids
            'r': { open: 0.4, smile: 0.0 },
            'l': { open: 0.3, smile: 0.2 },

            // Silence
            'sil': null
        };

        let currentVisemeIndex = 0;
        let animationFrameId = null;

        const updateLipSync = () => {
            // CRITICAL FIX: Don't stop animation just because audio is paused
            // Audio might be buffering or about to start
            if (!this.isSpeaking || !this.currentAudio || this.currentAudio.ended) {
                this.resetVisemes();
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                }
                return;
            }

            // CRITICAL FIX: Use audio.currentTime to drive the viseme frame update
            // This ensures the viseme is always synchronized with the actual audio playback
            const currentTime = this.currentAudio.currentTime;

            // DEBUG: Log every 60 frames (~1 second)
            if (!this._lipSyncFrameCount) this._lipSyncFrameCount = 0;
            this._lipSyncFrameCount++;
            if (this._lipSyncFrameCount % 60 === 0) {
                console.log(`🔄 Lip-sync loop active - frame ${this._lipSyncFrameCount}, time: ${currentTime.toFixed(2)}s, visemeIndex: ${currentVisemeIndex}/${visemeData.length}`);
            }

            // CRITICAL FIX: Find the current viseme based on audio.currentTime
            // This ensures visemes are always in sync with the actual audio playback
            // Add a small lookahead to compensate for processing delay
            const lookahead = 0.18; // 180ms lookahead - increased to compensate for slow lerp and stay in sync
            const adjustedTime = currentTime + lookahead;

            while (currentVisemeIndex < visemeData.length) {
                const viseme = visemeData[currentVisemeIndex];

                // Check if we're within this viseme's time range (with lookahead)
                if (adjustedTime >= viseme.start_time && adjustedTime <= viseme.end_time) {
                    // Apply this viseme
                    const phoneme = viseme.phoneme.toLowerCase();

                    // Calculate intensity based on position within the viseme
                    const visemeDuration = viseme.end_time - viseme.start_time;
                    const progress = (adjustedTime - viseme.start_time) / visemeDuration;

                    // Use a smooth curve for intensity (fade in and out)
                    // This creates natural-looking transitions between visemes
                    let intensity = 1.0;
                    if (progress < 0.4) {
                        intensity = progress / 0.4;  // Very slow fade in (40% of duration)
                    } else if (progress > 0.6) {
                        intensity = (1.0 - progress) / 0.4;  // Very slow fade out (40% of duration)
                    }

                    // Clamp intensity to prevent extreme values
                    intensity = Math.max(0.0, Math.min(0.8, intensity)); // Cap at 80% for more visible yet still natural mouth movements

                    // CRITICAL: Apply based on avatar capabilities
                    if (this.morphTargets.allMeshes && this.morphTargets.allMeshes.length > 0) {
                        let appliedCount = 0;

                        if (hasFullVisemes) {
                            // PATH 1: Avatar has full viseme blend shapes
                            const visemeName = phonemeToVisemeMap[phoneme] || null;

                            if (visemeName) {
                                // Apply the current viseme to all meshes with smooth interpolation
                                this.morphTargets.allMeshes.forEach(({mesh, indices}) => {
                                    if (!mesh.morphTargetInfluences) return;

                                    // Vowel boost configuration
                                    const boost = {
                                        'viseme_PP': 1.0,
                                        'viseme_aa': 1.2,  // A
                                        'viseme_E': 1.2,   // E
                                        'viseme_IH': 1.2,  // IH
                                        'viseme_oh': 1.3,  // oh
                                        'viseme_ou': 1.3   // ou
                                    };

                                    // Smoothly interpolate all visemes toward their target values
                                    Object.keys(indices).forEach(key => {
                                        if (key.startsWith('viseme_')) {
                                            const currentValue = mesh.morphTargetInfluences[indices[key]] || 0;
                                            let targetValue = (key === visemeName) ? intensity : 0;

                                            // Apply boost for vowels and specific phonemes
                                            if (boost[key] && key === visemeName) {
                                                targetValue *= boost[key];
                                            }

                                            // Clamp and smooth the result
                                            targetValue = Math.min(Math.max(targetValue, 0), 1);

                                            // Extra smooth interpolation for vowels (A, E, I, O, U)
                                            const isThisVowel = this.vowelVisemes.includes(key);
                                            const lerpFactor = isThisVowel ? 0.12 : 0.16; // Optimized for ultra-smooth transitions (increased from 0.08/0.12)
                                            const newValue = currentValue + (targetValue - currentValue) * lerpFactor;

                                            mesh.morphTargetInfluences[indices[key]] = newValue;
                                        }
                                    });

                                    if (indices[visemeName] !== undefined) {
                                        appliedCount++;
                                        if (mesh.geometry) {
                                            mesh.geometry.morphAttributesNeedUpdate = true;
                                        }
                                    }
                                });

                                // Log first few applications
                                if (!this._visemeApplyCount) this._visemeApplyCount = 0;
                                if (this._visemeApplyCount < 5) {
                                    const isVowel = this.vowelVisemes.includes(visemeName);
                                    const smoothType = isVowel ? ' (VOWEL - extra smooth)' : '';
                                    console.log(`👄 Phoneme "${phoneme}" → ${visemeName}${smoothType}: intensity=${intensity.toFixed(2)}, applied to ${appliedCount} meshes`);
                                    this._visemeApplyCount++;
                                    if (this._visemeApplyCount === 5) {
                                        console.log('✅ Full viseme-based lip-sync working with enhanced vowel smoothing!');
                                    }
                                }
                            } else {
                                this.resetVisemes();
                            }
                        } else {
                            // PATH 2: Avatar only has mouthOpen/mouthSmile - use basic mapping
                            const basicShape = phonemeToBasicMap[phoneme] || null;

                            if (basicShape) {
                                // Apply mouthOpen and mouthSmile to all meshes with smooth interpolation
                                this.morphTargets.allMeshes.forEach(({mesh, indices}) => {
                                    if (!mesh.morphTargetInfluences) return;

                                    // Smooth interpolation for mouthOpen (prevents machine gun mouth)
                                    if (indices['mouthOpen'] !== undefined) {
                                        const currentValue = mesh.morphTargetInfluences[indices['mouthOpen']] || 0;
                                        const targetValue = basicShape.open * intensity;
                                        const lerpFactor = 0.14; // Optimized for ultra-smooth motion (increased from 0.10)

                                        mesh.morphTargetInfluences[indices['mouthOpen']] =
                                            currentValue + (targetValue - currentValue) * lerpFactor;
                                        appliedCount++;
                                    }

                                    // Smooth interpolation for mouthSmile
                                    if (indices['mouthSmile'] !== undefined) {
                                        const currentValue = mesh.morphTargetInfluences[indices['mouthSmile']] || 0;
                                        const targetValue = basicShape.smile * intensity;
                                        const lerpFactor = 0.14; // Optimized for ultra-smooth motion (increased from 0.10)

                                        mesh.morphTargetInfluences[indices['mouthSmile']] =
                                            currentValue + (targetValue - currentValue) * lerpFactor;
                                    }

                                    if (mesh.geometry) {
                                        mesh.geometry.morphAttributesNeedUpdate = true;
                                    }
                                });

                                // Log first few applications
                                if (!this._visemeApplyCount) this._visemeApplyCount = 0;
                                if (this._visemeApplyCount < 5) {
                                    console.log(`👄 Phoneme "${phoneme}": mouthOpen=${(basicShape.open * intensity).toFixed(2)}, mouthSmile=${(basicShape.smile * intensity).toFixed(2)}, applied to ${appliedCount} meshes`);
                                    this._visemeApplyCount++;
                                    if (this._visemeApplyCount === 5) {
                                        console.log('✅ Basic viseme-driven lip-sync working (using mouthOpen/mouthSmile)!');
                                    }
                                }
                            } else {
                                this.resetVisemes();
                            }
                        }
                    }
                    break;
                } else if (adjustedTime > viseme.end_time) {
                    // Move to next viseme
                    currentVisemeIndex++;
                } else {
                    // We're before this viseme - reset to neutral
                    this.resetVisemes();
                    break;
                }
            }

            // Reset to beginning if audio loops or resets
            if (adjustedTime < 0.1 && currentVisemeIndex > 0) {
                currentVisemeIndex = 0;
            }

            animationFrameId = requestAnimationFrame(updateLipSync);
        };

        // CRITICAL FIX: Wait for audio to actually start playing before starting lip sync
        // This ensures visemes are synchronized with the actual audio playback
        const startLipSyncWhenReady = () => {
            // Only start lip sync when audio actually starts playing
            const onAudioPlay = () => {
                console.log('✅ Audio playback started - starting viseme-based lip sync animation synchronized with audio');
                updateLipSync();
            };

            if (!audioElement.paused && audioElement.currentTime > 0) {
                // Audio is already playing, start immediately
                console.log('✅ Audio already playing - starting viseme-based lip sync animation');
                updateLipSync();
            } else {
                // Wait for audio play event to ensure perfect sync
                console.log('⏳ Waiting for audio to start playing before starting lip sync...');
                audioElement.addEventListener('play', onAudioPlay, { once: true });
            }
        };

        // Start the lip sync animation when audio is ready
        startLipSyncWhenReady();
    },

    /**
     * Simple fallback animation when viseme data is not available
     * @param {HTMLAudioElement} audioElement - The audio element playing the speech
     */
    syncWithSimpleAnimation(audioElement) {
        console.log('🎵 Using simple fallback lip sync animation with mouthOpen/mouthSmile');
        console.log('   - Audio element provided:', !!audioElement);
        console.log('   - Morph targets mesh:', !!this.morphTargets.mesh);
        console.log('   - Total meshes with morph targets:', this.morphTargets.allMeshes?.length || 0);
        console.log('   - Morph target indices:', this.morphTargets.indices);

        // Cancel any existing simple animation loop
        if (this.simpleAnimationFrameId) {
            cancelAnimationFrame(this.simpleAnimationFrameId);
            this.simpleAnimationFrameId = null;
        }

        const animate = () => {
            // CRITICAL FIX: Only stop if speaking state is false AND audio has actually ended
            // Don't stop just because audio is paused (it might be buffering or about to start)
            const shouldStop = !this.isSpeaking || !audioElement || audioElement.ended;

            if (shouldStop) {
                // Only log stop if we were actually animating
                if (this.simpleAnimationFrameId) {
                    console.log('🛑 Stopping simple lip-sync animation', {
                        isSpeaking: this.isSpeaking,
                        hasAudio: !!audioElement,
                        audioPaused: audioElement?.paused,
                        audioEnded: audioElement?.ended
                    });
                }
                this.resetVisemes();
                if (this.simpleAnimationFrameId) {
                    cancelAnimationFrame(this.simpleAnimationFrameId);
                    this.simpleAnimationFrameId = null;
                }
                return;
            }

            if (!this.morphTargets.allMeshes || this.morphTargets.allMeshes.length === 0) {
                this.simpleAnimationFrameId = requestAnimationFrame(animate);
                return;
            }

            // CRITICAL FIX: Use audio.currentTime for animation timing to stay in sync
            // Fall back to performance.now() if audio isn't playing yet
            let time;
            if (audioElement && !audioElement.paused && audioElement.currentTime > 0) {
                time = audioElement.currentTime; // Use audio time for sync
            } else {
                time = performance.now() / 1000; // Fall back to performance time
            }

            const frequency = 4; // Reduced frequency for more natural, slower mouth movement

            // Cycle through different mouth shapes using sin waves
            const openCycle = (Math.sin(time * frequency) + 1) / 2; // 0 to 1
            const smileCycle = (Math.sin(time * frequency * 0.7 + 1) + 1) / 2; // 0 to 1, slightly different phase

            // CRITICAL FIX: Apply morph targets to ALL meshes, not just one
            let appliedToMeshCount = 0;
            this.morphTargets.allMeshes.forEach(({mesh, indices}) => {
                if (!mesh.morphTargetInfluences) return;

                // Apply the animated values - balanced for natural lip-sync
                if (indices['mouthOpen'] !== undefined) {
                    mesh.morphTargetInfluences[indices['mouthOpen']] = openCycle * 0.5; // Reduced to 50% max for more subtle movement
                    appliedToMeshCount++;
                }
                if (indices['mouthSmile'] !== undefined) {
                    mesh.morphTargetInfluences[indices['mouthSmile']] = smileCycle * 0.3; // Reduced to 30% max for more subtle expression
                }

                // CRITICAL FIX: Notify Three.js that morph targets have been updated
                // This ensures the GPU receives the updated morph target values
                if (mesh.geometry) {
                    mesh.geometry.morphAttributesNeedUpdate = true;
                }
            });

            // Log first few times to confirm it's working
            if (!this._simpleLipSyncCount) this._simpleLipSyncCount = 0;
            if (this._simpleLipSyncCount < 10) { // Increased to 10 for better debugging
                console.log(`👄 Simple lip-sync: mouthOpen=${(openCycle * 0.7).toFixed(2)}, mouthSmile=${(smileCycle * 0.45).toFixed(2)}`);
                console.log(`   - Animation time: ${time.toFixed(2)}s, isSpeaking: ${this.isSpeaking}, audio paused: ${audioElement.paused}`);
                console.log(`   - Applied to ${appliedToMeshCount} meshes:`, this.morphTargets.allMeshes.map(m => m.mesh.name).join(', '));
                this._simpleLipSyncCount++;
                if (this._simpleLipSyncCount === 10) {
                    console.log('✅ Simple lip-sync working with natural movement! Further logs suppressed.');
                }
            }

            this.simpleAnimationFrameId = requestAnimationFrame(animate);
        };

        // Start animation immediately
        console.log('🎬 Starting simple lip-sync animation loop');
        animate();
    },

    /**
     * Make avatar look at the blackboard
     */
    lookAtBlackboard() {
        if (!this.avatar) return;

        // Find the head bone and rotate it slightly toward the board
        this.avatar.traverse((child) => {
            if (child.isBone && child.name.toLowerCase().includes('head')) {
                child.rotation.y = Math.PI * 0.15; // Turn head slightly right
            }
        });
    },

    /**
     * Animation loop
     */
    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());

        // Only animate if avatar is loaded and bones are found
        if (!this.avatar || !this.basePose) {
            this.renderer.render(this.scene, this.camera);
            return;
        }

        // Update blinking animation (works both when speaking and idle)
        if (!this._animateLoopCount) {
            this._animateLoopCount = 0;
            console.log('✅ Animation loop started - updateBlink() will be called every frame');
        }
        this._animateLoopCount++;

        this.updateBlink();

        // CRITICAL: Update mouth animation from audio analyzer (if active)
        // This runs every frame (~60fps) to keep the jaw synchronized with audio
        if (this.useAudioAnalyzer && this.isSpeaking && this.audioAnalyzer && this.jawBone) {
            this.updateMouthFromAnalyzer();
        }

        // CRITICAL SAFEGUARD: Ensure teaching animation stays active when narration is playing
        // CRITICAL FIX: Check EVERY FRAME (not every 60 frames) to prevent brief idle pose flashes
        // This ensures the avatar never switches to idle during line transitions
        const audioNarrationPlaying = window.AudioNarration && window.AudioNarration.isPlaying;
        const isTransitioningLines = window.AudioNarration && window.AudioNarration.isTransitioningLines;

        // ENHANCED: Keep teaching active during narration OR line transitions
        if ((audioNarrationPlaying || isTransitioningLines) && !this.teachingAnimationActive) {
            // Only log every 60 frames to avoid console spam
            if (this._animateLoopCount % 60 === 0) {
                console.warn('⚠️ SAFEGUARD TRIGGERED: Audio/transition active but teaching animation inactive - forcing activation');
            }
            this.teachingAnimationActive = true;
            this.isSpeaking = true;
            // Ensure we transition to teaching pose if not already there
            if (!this.poseTransitionActive) {
                this.transitionToTeachingPose();
            }
        }

        // CRITICAL: Prevent idle animation from starting during narration
        if ((audioNarrationPlaying || isTransitioningLines) && this.isIdleAnimationActive) {
            // Only log every 60 frames to avoid console spam
            if (this._animateLoopCount % 60 === 0) {
                console.warn('⚠️ SAFEGUARD: Stopping idle animation - narration is active');
            }
            this.stopIdleAnimationCycle();
        }

        // Skip all automatic animations if enableAnimations is false (for manual control)
        if (!this.enableAnimations) {
            // Debug log every 120 frames to confirm animations are disabled
            if (this._animateLoopCount % 120 === 0) {
                console.log('⏸️ Animations DISABLED - manual bone control active');
            }
            // Still render the scene, but don't update bone rotations
            this.renderer.render(this.scene, this.camera);
            return;
        }

        // Update pose transition (from idle to teaching or vice versa)
        // This takes priority over regular arm gestures
        if (this.poseTransitionActive) {
            this.updatePoseTransition();
        }

        // Update waving animation (takes priority over idle arm movements)
        if (this.isWaving) {
            this.animateWaveMotion();
        }

        // Natural teaching gestures and idle movements (REVERSED ARMS)
        // Only apply these when head animation is NOT active AND pose transition is NOT active
        const time = this.clock.getElapsedTime();

        // ARM GESTURES (always animate arms, regardless of head state, but only if not transitioning)
        // Reduced frequencies and amplitudes for ultra-smooth, natural motion
        // CRITICAL FIX: Ensure teaching animation continues throughout all narration lines
        if (this.teachingAnimationActive && !this.poseTransitionActive) {
            // Debug log every 180 frames (~3 seconds) to verify teaching animation is active
            if (this._animateLoopCount % 180 === 0) {
                console.log('✅ Teaching animation active - animating arms and gestures');
            }
            // RIGHT SHOULDER: Minimal breathing/natural movement (keep right side still)
            if (this.rightShoulderBone) {
                if (this.basePose.rightShoulderX !== undefined) {
                    this.rightShoulderBone.rotation.x = this.basePose.rightShoulderX + Math.sin(time * 0.35) * 0.02;
                }
                if (this.basePose.rightShoulderY !== undefined) {
                    this.rightShoulderBone.rotation.y = this.basePose.rightShoulderY + Math.sin(time * 0.42 + 0.2) * 0.018;
                }
                if (this.basePose.rightShoulderZ !== undefined) {
                    this.rightShoulderBone.rotation.z = this.basePose.rightShoulderZ + Math.sin(time * 0.28 + 0.5) * 0.015;
                }
            }

            // RIGHT ARM: Very minimal movement (almost still)
            if (this.rightArmBone && this.basePose.rightArmX !== undefined) {
                this.rightArmBone.rotation.x = this.basePose.rightArmX + Math.sin(time * 0.42) * 0.015;
            }
            if (this.rightLowerArmBone && this.basePose.rightLowerArmX !== undefined) {
                this.rightLowerArmBone.rotation.x = this.basePose.rightLowerArmX + Math.sin(time * 0.48 + 0.3) * 0.018;
            }

            // RIGHT HAND: Keep completely still during teaching (no animation)
            if (this.rightHandBone) {
                if (this.basePose.rightHandX !== undefined) {
                    this.rightHandBone.rotation.x = this.basePose.rightHandX;
                }
                if (this.basePose.rightHandY !== undefined) {
                    this.rightHandBone.rotation.y = this.basePose.rightHandY;
                }
                if (this.basePose.rightHandZ !== undefined) {
                    this.rightHandBone.rotation.z = this.basePose.rightHandZ;
                }
            }

            // LEFT SHOULDER: Visible movement (raised arm shoulder) - smoother and gentler
            if (this.leftShoulderBone) {
                if (this.basePose.leftShoulderX !== undefined) {
                    this.leftShoulderBone.rotation.x = this.basePose.leftShoulderX + Math.sin(time * 0.5) * 0.12;
                }
                if (this.basePose.leftShoulderY !== undefined) {
                    this.leftShoulderBone.rotation.y = this.basePose.leftShoulderY + Math.sin(time * 0.55 + 0.3) * 0.10;
                }
                if (this.basePose.leftShoulderZ !== undefined) {
                    this.leftShoulderBone.rotation.z = this.basePose.leftShoulderZ + Math.sin(time * 0.42 + 0.6) * 0.08;
                }
            }

            // LEFT ARM: Subtle motion (raised arm) - gentler movements
            if (this.leftLowerArmBone && this.basePose.leftLowerArmX !== undefined) {
                this.leftLowerArmBone.rotation.x = this.basePose.leftLowerArmX + Math.sin(time * 0.8) * 0.03;
            }

            // LEFT HAND: Add expressive hand movement with smooth cycling back to base pose
            if (this.leftHandBone) {
                // Calculate current phase in the gesture cycle (0-1)
                const elapsed = time - this.handGestureCycleStartTime;
                this.handGesturePhase = (elapsed % this.handGestureCycleDuration) / this.handGestureCycleDuration;

                // Debug logging every 120 frames (~2 seconds at 60fps)
                if (this._animateLoopCount % 120 === 0) {
                    console.log('🖐️ Animating left hand (smooth cycle):', {
                        phase: this.handGesturePhase.toFixed(3),
                        baseX: this.basePose.leftHandX,
                        baseY: this.basePose.leftHandY,
                        baseZ: this.basePose.leftHandZ,
                        currentX: this.leftHandBone.rotation.x,
                        currentY: this.leftHandBone.rotation.y,
                        currentZ: this.leftHandBone.rotation.z
                    });
                }

                // Apply smooth gesture offsets that return to base position
                if (this.basePose.leftHandX !== undefined) {
                    const offsetX = this.calculateGestureOffset(this.handGesturePhase, 0.22, 0);
                    this.leftHandBone.rotation.x = this.basePose.leftHandX + offsetX;
                }
                if (this.basePose.leftHandY !== undefined) {
                    const offsetY = this.calculateGestureOffset(this.handGesturePhase, 0.18, 0.25);
                    this.leftHandBone.rotation.y = this.basePose.leftHandY + offsetY;
                }
                if (this.basePose.leftHandZ !== undefined) {
                    const offsetZ = this.calculateGestureOffset(this.handGesturePhase, 0.15, 0.58);
                    this.leftHandBone.rotation.z = this.basePose.leftHandZ + offsetZ;
                }
            } else if (this._animateLoopCount % 120 === 0) {
                console.warn('⚠️ leftHandBone is null - cannot animate hand');
            }
        } else if (!this.poseTransitionActive) {
            // Idle arm movements - ultra-minimal for both arms (only if not transitioning)
            // Slower frequencies for smoother, more natural breathing
            if (this.rightArmBone && this.basePose.rightArmY !== undefined) {
                this.rightArmBone.rotation.y = this.basePose.rightArmY + Math.sin(time * 0.22) * 0.015;
            }
            if (this.rightLowerArmBone && this.basePose.rightLowerArmX !== undefined) {
                this.rightLowerArmBone.rotation.x = this.basePose.rightLowerArmX + Math.sin(time * 0.28) * 0.012;
            }

            // Calculate idle gesture phase (slower cycle for idle - 6 seconds)
            const idleGestureDuration = 6.0;
            const idlePhase = (time % idleGestureDuration) / idleGestureDuration;

            // RIGHT HAND: Minimal idle movement with smooth cycling
            if (this.rightHandBone) {
                if (this.basePose.rightHandX !== undefined) {
                    const offsetX = this.calculateGestureOffset(idlePhase, 0.015, 0);
                    this.rightHandBone.rotation.x = this.basePose.rightHandX + offsetX;
                }
                if (this.basePose.rightHandY !== undefined) {
                    const offsetY = this.calculateGestureOffset(idlePhase, 0.012, 0.3);
                    this.rightHandBone.rotation.y = this.basePose.rightHandY + offsetY;
                }
                if (this.basePose.rightHandZ !== undefined) {
                    const offsetZ = this.calculateGestureOffset(idlePhase, 0.01, 0.5);
                    this.rightHandBone.rotation.z = this.basePose.rightHandZ + offsetZ;
                }
            }

            // Only animate left lower arm if not currently waving
            if (this.leftLowerArmBone && this.basePose.leftLowerArmX !== undefined && !this.isWaving) {
                this.leftLowerArmBone.rotation.x = this.basePose.leftLowerArmX + Math.sin(time * 0.35 + 0.3) * 0.012;
            }

            // LEFT HAND: Minimal idle movement with smooth cycling
            if (this.leftHandBone) {
                if (this.basePose.leftHandX !== undefined) {
                    const offsetX = this.calculateGestureOffset(idlePhase, 0.012, 0.2);
                    this.leftHandBone.rotation.x = this.basePose.leftHandX + offsetX;
                }
                if (this.basePose.leftHandY !== undefined) {
                    const offsetY = this.calculateGestureOffset(idlePhase, 0.01, 0);
                    this.leftHandBone.rotation.y = this.basePose.leftHandY + offsetY;
                }
                if (this.basePose.leftHandZ !== undefined) {
                    const offsetZ = this.calculateGestureOffset(idlePhase, 0.008, 0.4);
                    this.leftHandBone.rotation.z = this.basePose.leftHandZ + offsetZ;
                }
            }
        }

        // HEAD MOVEMENTS - Teaching pose has special animation
        // Only animate head/neck when NOT doing pose transition
        if (!this.poseTransitionActive && this.headBone) {
            if (this.teachingAnimationActive) {
                // TEACHING HEAD/NECK ROTATION LOOP with randomized timing (4-6 seconds)
                // Smoothly rotates between two poses:
                // Pose A (Base): Head(0.3, 0.26, 0.02) / Neck(0, 0.18, 0)
                // Pose B (Rotated): Head(0.26, -0.54, 0.1) / Neck(0.18, 0.1, 0)

                const currentTime = this.clock.getElapsedTime();
                const elapsed = currentTime - this.teachingRotationStartTime;

                // Calculate progress (0 to 1) through current rotation cycle
                this.teachingRotationProgress = Math.min(elapsed / this.teachingRotationDuration, 1.0);

                // Use sine wave to create smooth back-and-forth motion (0 -> 1 -> 0)
                // This makes it go from Pose A -> Pose B -> Pose A smoothly
                const sineProgress = Math.sin(this.teachingRotationProgress * Math.PI);

                // Apply gentler easing for slower, more natural back-and-forth movement
                const easedProgress = this.easing.easeInOutQuad(sineProgress);

                // Define the two poses
                // Pose A (Base teaching pose)
                const headPoseA = { x: 0.3, y: 0.26, z: 0.02 };
                const neckPoseA = { x: 0, y: 0.18, z: 0 };

                // Pose B (Rotated teaching pose)
                const headPoseB = { x: 0.26, y: -0.54, z: 0.1 };
                const neckPoseB = { x: 0.18, y: 0.1, z: 0 };

                // Interpolate HEAD between Pose A and Pose B
                this.headBone.rotation.x = headPoseA.x + (headPoseB.x - headPoseA.x) * easedProgress;
                this.headBone.rotation.y = headPoseA.y + (headPoseB.y - headPoseA.y) * easedProgress;
                this.headBone.rotation.z = headPoseA.z + (headPoseB.z - headPoseA.z) * easedProgress;

                // Interpolate NECK between Pose A and Pose B
                if (this.neckBone) {
                    this.neckBone.rotation.x = neckPoseA.x + (neckPoseB.x - neckPoseA.x) * easedProgress;
                    this.neckBone.rotation.y = neckPoseA.y + (neckPoseB.y - neckPoseA.y) * easedProgress;
                    this.neckBone.rotation.z = neckPoseA.z + (neckPoseB.z - neckPoseA.z) * easedProgress;
                }

                // When cycle completes, randomize new duration and restart
                if (this.teachingRotationProgress >= 1.0) {
                    this.teachingRotationStartTime = currentTime;
                    this.teachingRotationDuration = this.randomizeTeachingRotationDuration();
                    this.teachingRotationProgress = 0;
                    console.log(`🔄 Teaching rotation cycle complete - next cycle: ${this.teachingRotationDuration.toFixed(2)}s`);
                }
            } else {
                // Extremely subtle idle head movements - barely noticeable
                // Idle pose head values: X=0, Y=0, Z=0
                this.headBone.rotation.x = 0 + Math.sin(time * 0.18) * 0.005;
                this.headBone.rotation.y = 0 + Math.sin(time * 0.15) * 0.008;
                this.headBone.rotation.z = 0;
            }
        }

        // Update skeleton for all skinned meshes
        if (this.skinnedMeshes.length > 0) {
            this.avatar.updateMatrixWorld(true);
        }

        // Render scene
        this.renderer.render(this.scene, this.camera);
    },


    /**
     * Handle window resize
     */
    onWindowResize() {
        if (!this.container || !this.camera || !this.renderer) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    },

    /**
     * Show fallback SVG avatar if 3D fails - DISABLED (no fallback, will retry indefinitely)
     */
    showFallbackAvatar() {
        console.warn('⚠️ Fallback avatar disabled - will continue retrying until avatar loads successfully');
        // No fallback - the system will keep retrying indefinitely
    },

    /**
     * Change avatar to a different ReadyPlayerMe URL
     */
    async changeAvatar(newAvatarUrl) {
        // Ensure avatar URL has lip sync support
        newAvatarUrl = ensureLipSyncSupport(newAvatarUrl);
        console.log('🔄 Changing avatar to:', newAvatarUrl);

        // Remove old avatar
        if (this.avatar) {
            this.scene.remove(this.avatar);
            this.avatar = null;
        }

        // Load new avatar
        try {
            await this.loadAvatar(newAvatarUrl);
            this.avatarUrl = newAvatarUrl;
            console.log('✅ Avatar changed successfully');
        } catch (error) {
            console.error('❌ Failed to change avatar:', error);
            // Reload previous avatar
            await this.loadAvatar(this.avatarUrl);
        }
    },

    /**
     * Cleanup and dispose resources
     */
    dispose() {
        console.log('🧹 Disposing avatar resources...');

        // Stop automatic blinking
        this.stopAutomaticBlinking();

        // Stop idle animation cycle
        this.stopIdleAnimationCycle();

        // Stop animation loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        // Cleanup audio analyzer
        this.cleanupAudioAnalyzer();

        // Cleanup debug GUI
        if (this.gui) {
            this.gui.destroy();
            this.gui = null;
            console.log('✅ Debug GUI destroyed');
        }

        // Remove audio listener from camera
        if (this.audioListener) {
            this.camera.remove(this.audioListener);
            this.audioListener = null;
        }

        // Remove avatar from scene
        if (this.avatar) {
            this.scene.remove(this.avatar);
        }

        // Dispose renderer
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }

        this.isInitialized = false;
        console.log('✅ Avatar resources disposed');
    }
};

// Make available globally
window.RPMAvatar = RPMAvatar;

/**
 * Ensure avatar URL has lip sync support morphTargets
 */
function ensureLipSyncSupport(avatarUrl) {
    if (!avatarUrl) return avatarUrl;

    // Check if it's a ReadyPlayerMe URL
    if (!avatarUrl.includes('readyplayer.me')) {
        return avatarUrl;
    }

    // Check if morphTargets parameter already exists
    if (avatarUrl.includes('morphTargets')) {
        return avatarUrl;
    }

    // Add morphTargets parameter for lip sync support
    const separator = avatarUrl.includes('?') ? '&' : '?';
    const enhancedUrl = avatarUrl + separator + 'morphTargets=ARKit,Oculus Visemes';

    console.log('✅ Added lip sync support to avatar URL');
    return enhancedUrl;
}

// Initialize avatar when page loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎬 DOM loaded, checking avatar configuration...');

    // CRITICAL: Wait for user settings to load before checking for avatar
    console.log('⏳ Waiting for user settings to load...');
    if (typeof window.loadUserSettings === 'function') {
        await window.loadUserSettings();
        console.log('✅ User settings loaded for avatar configuration');
    } else {
        // Wait up to 2 seconds for settings to populate
        const maxWaitTime = 2000;
        const startTime = Date.now();
        while (!window.userSettings && (Date.now() - startTime) < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    // Check if there's a story with a specific avatar URL
    let storyAvatarUrl = null;

    // Try to load story data from storage to get avatarUrl
    try {
        // PRIORITY 1: Try sessionStorage FIRST (used when playing from dashboard)
        try {
            const sessionStoryJson = sessionStorage.getItem('currentStory');
            if (sessionStoryJson) {
                const storyData = JSON.parse(sessionStoryJson);
                if (storyData && storyData.avatarUrl) {
                    storyAvatarUrl = storyData.avatarUrl;
                    console.log('🎭 Found avatar URL from sessionStorage (dashboard playback):', storyAvatarUrl);
                }
            }
        } catch (sessionError) {
            console.warn('⚠️ sessionStorage load failed:', sessionError);
        }

        // PRIORITY 2: Try IndexedDB
        if (!storyAvatarUrl && typeof loadStoryFromIndexedDB === 'function') {
            const storyData = await loadStoryFromIndexedDB();
            if (storyData && storyData.avatarUrl) {
                storyAvatarUrl = storyData.avatarUrl;
                console.log('🎭 Found avatar URL from IndexedDB:', storyAvatarUrl);
            }
        }

        // PRIORITY 3: Try localStorage
        if (!storyAvatarUrl) {
            const storyDataJson = localStorage.getItem('generatedStoryData');
            if (storyDataJson) {
                const storyData = JSON.parse(storyDataJson);
                if (storyData && storyData.avatarUrl) {
                    storyAvatarUrl = storyData.avatarUrl;
                    console.log('🎭 Found avatar URL from localStorage:', storyAvatarUrl);
                }
            }
        }

        // PRIORITY 4: Check user settings for default custom avatar
        if (!storyAvatarUrl && window.userSettings && window.userSettings.custom_avatar_url) {
            storyAvatarUrl = window.userSettings.custom_avatar_url;
            console.log('🎭 Using custom avatar from user settings:', storyAvatarUrl);
        }
    } catch (error) {
        console.warn('⚠️ Could not load story data for avatar:', error);
    }

    // Only initialize avatar if a specific avatar URL was found
    if (storyAvatarUrl) {
        // Ensure avatar URL has lip sync support
        storyAvatarUrl = ensureLipSyncSupport(storyAvatarUrl);
        RPMAvatar.avatarUrl = storyAvatarUrl;
        console.log('✅ Using storyteller-specific avatar:', storyAvatarUrl);

        RPMAvatar.init().catch(err => {
            console.error('❌ Failed to initialize avatar on load:', err);
        });
    } else {
        console.log('ℹ️ No avatar URL found - skipping avatar initialization (no voice selected)');

        // CRITICAL: Clear the default avatarUrl so play button won't be blocked
        RPMAvatar.avatarUrl = '';
        RPMAvatar.isFullyLoaded = true; // Mark as "loaded" since there's nothing to load
        console.log('✅ Avatar URL cleared - play button will not be blocked');

        // Hide the avatar container and loading indicator since no avatar will be loaded
        const avatarContainer = document.getElementById('avatarContainer');
        const loadingIndicator = document.getElementById('avatar-loading-indicator');

        if (avatarContainer) {
            avatarContainer.style.display = 'none';
            console.log('✅ Avatar container hidden (no voice selected)');
        }

        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }
});
