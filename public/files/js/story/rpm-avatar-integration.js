

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
    loadingProgress: 0, 
    isFullyLoaded: true, 
    isSpeaking: false,
    currentAudio: null,
    animationFrameId: null,
    simpleAnimationFrameId: null, 
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
    skinnedMeshes: [], 
    teachingAnimationActive: false,
    gestureTime: 0,
    basePose: null, 
    gui: null, 
    enableAnimations: true, 

    
    poseTransitionActive: false,
    poseTransitionStartTime: 0,
    poseTransitionDuration: 1.8, 
    poseTransitionStartValues: null, 
    poseTransitionTargetValues: null, 

    
    teachingRotationStartTime: 0, 
    teachingRotationDuration: 3.0, 
    teachingRotationProgress: 0, 

    
    handGestureCycleStartTime: 0, 
    handGestureCycleDuration: 4.0, 
    handGesturePhase: 0, 

    
    previousVisemeWeights: {}, 
    visemeSmoothingFactor: 0.28, 

    
    idleAnimationTimer: null, 
    idleAnimationIntervalMin: 5000, 
    idleAnimationIntervalMax: 10000, 
    waveAnimationDuration: 2500, 
    currentIdlePoseIndex: 0, 
    isIdleAnimationActive: false, 

    
    isWaving: false, 
    waveStartTime: 0, 
    waveAnimationSpeed: 2.0, 
    waveDelayTimer: null, 

    
    randomWaveTimer: null, 
    isRandomWaveActive: false, 
    pausedWaveIntervalMin: 4000, 
    pausedWaveIntervalMax: 7000, 
    shouldStartWaveOnIdleComplete: false, 

    
    easing: {
        
        linear: (t) => t,

        
        easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
        easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
        easeInOutQuart: (t) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
        easeInOutQuint: (t) => t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2,

        
        easeOutQuad: (t) => 1 - (1 - t) * (1 - t),
        easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
        easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),

        
        easeInQuad: (t) => t * t,
        easeInCubic: (t) => t * t * t,
        easeInQuart: (t) => t * t * t * t,

        
        easeOutElastic: (t) => {
            const c4 = (2 * Math.PI) / 3;
            return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
        },

        
        easeInOutBack: (t) => {
            const c1 = 1.70158;
            const c2 = c1 * 1.525;
            return t < 0.5
                ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
                : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
        }
    },

    
    lerp(start, end, t, easingFn = null) {
        const progress = easingFn ? easingFn(t) : t;
        return start + (end - start) * progress;
    },

    
    lerpRotation(start, end, t, easingFn = null) {
        return {
            x: this.lerp(start.x, end.x, t, easingFn),
            y: this.lerp(start.y, end.y, t, easingFn),
            z: this.lerp(start.z, end.z, t, easingFn)
        };
    },

    
    applyLerpRotation(bone, start, end, t, easingFn = null) {
        if (!bone || !start || !end) return;
        const rotation = this.lerpRotation(start, end, t, easingFn);
        bone.rotation.x = rotation.x;
        bone.rotation.y = rotation.y;
        bone.rotation.z = rotation.z;
    },

    
    smoothDamp(current, target, smoothTime, deltaTime) {
        
        const omega = 2.0 / smoothTime;
        const x = omega * deltaTime;
        const exp = 1.0 / (1.0 + x + 0.48 * x * x + 0.235 * x * x * x);
        return current + (target - current) * (1.0 - exp);
    },

    
    smoothDampRotation(current, target, smoothTime, deltaTime) {
        return {
            x: this.smoothDamp(current.x, target.x, smoothTime, deltaTime),
            y: this.smoothDamp(current.y, target.y, smoothTime, deltaTime),
            z: this.smoothDamp(current.z, target.z, smoothTime, deltaTime)
        };
    },

    
    createSmoothTransition(bone, targetRotation, duration = null) {
        if (!bone) {
            console.warn('⚠️ createSmoothTransition: bone is null');
            return null;
        }

        
        const startRotation = {
            x: bone.rotation.x,
            y: bone.rotation.y,
            z: bone.rotation.z
        };

        
        return {
            startRotation,
            targetRotation,
            duration: duration || this.headAnimationDuration,
            startTime: this.clock.getElapsedTime()
        };
    },

    
    randomizeTeachingRotationDuration() {
        
        return 4.0 + Math.random() * 2.0;
    },

    
    calculateGestureOffset(phase, amplitude, offset = 0) {
        
        let adjustedPhase = (phase + offset) % 1.0;

        
        
        
        const easedValue = Math.sin(adjustedPhase * Math.PI * 2) * amplitude;

        
        
        const easingT = adjustedPhase < 0.5
            ? 4 * adjustedPhase * adjustedPhase * adjustedPhase
            : 1 - Math.pow(-2 * adjustedPhase + 2, 3) / 2;

        
        return easedValue * (0.7 + easingT * 0.3);
    },

    
    vowelSmoothingFactor: 0.42, 
    vowelVisemes: ['viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U'], 

    
    blinkTimer: 0,
    blinkInterval: Math.random() * 4 + 2, 
    isBlinking: false,
    blinkEnabled: true, 
    blinkAnimationFrameId: null,

    
    audioAnalyzer: null,
    audioListener: null,
    threeAudio: null,
    jawBone: null,
    useAudioAnalyzer: true, 

    
    avatarUrl: 'https:
    avatarGender: null, 

    
    
    oculusVisemes: [
        'viseme_sil',  
        'viseme_PP',   
        'viseme_FF',   
        'viseme_TH',   
        'viseme_DD',   
        'viseme_kk',   
        'viseme_CH',   
        'viseme_SS',   
        'viseme_nn',   
        'viseme_RR',   
        'viseme_aa',   
        'viseme_E',    
        'viseme_I',    
        'viseme_O',    
        'viseme_U'     
    ],

    
    additionalBlendShapes: {
        'mouthOpen': null,      
        'mouthSmile': null,     
        'eyesClosed': null,     
        'eyesLookUp': null,     
        'eyesLookDown': null    
    },

    
    visemeMap: {
        'sil': null,     
        'PP': 'viseme_PP',  
        'FF': 'viseme_FF',  
        'TH': 'viseme_TH',  
        'DD': 'viseme_DD',  
        'kk': 'viseme_kk',  
        'CH': 'viseme_CH',  
        'SS': 'viseme_SS',  
        'nn': 'viseme_nn',  
        'RR': 'viseme_RR',  
        'aa': 'viseme_aa',  
        'E': 'viseme_E',    
        'I': 'viseme_I',    
        'O': 'viseme_O',    
        'U': 'viseme_U'     
    },

    morphTargets: {},
    hasLipSyncSupport: false, 
    hasOculusVisemes: false, 

    
    async init() {
        console.log('🎭 Initializing ReadyPlayerMe Avatar...');

        
        this.isFullyLoaded = false;
        this.loadingProgress = 0;

        let attempt = 0;
        const maxRetryDelay = 10000; 

        while (true) {
            attempt++;
            console.log(`🔄 Avatar initialization attempt #${attempt}...`);

            try {
                this.container = document.getElementById('avatarContainer');
                if (!this.container) {
                    throw new Error('Avatar container not found');
                }

                
                if (attempt === 1) {
                    this.setupScene();
                }

                
                await this.loadAvatar(this.avatarUrl);

                
                if (!this.animationFrameId) {
                    this.animate();
                }

                
                const loadingEl = document.getElementById('avatar-loading-indicator');
                if (loadingEl) {
                    loadingEl.style.display = 'none';
                }

                this.isInitialized = true;
                this.isFullyLoaded = true; 
                this.loadingProgress = 100;
                console.log(`✅ Avatar initialized successfully on attempt #${attempt}`);

                
                window.dispatchEvent(new CustomEvent('avatarFullyLoaded', {
                    detail: { progress: 100, isReady: true }
                }));

                
                this.startAutomaticBlinking();

                break; 

            } catch (error) {
                console.error(`❌ Failed to initialize avatar (attempt #${attempt}):`, error);

                
                const retryDelay = Math.min(1000 * Math.pow(1.5, attempt - 1), maxRetryDelay);
                console.log(`⏳ Retrying in ${(retryDelay / 1000).toFixed(1)} seconds...`);

                
                const loadingEl = document.getElementById('avatar-loading-indicator');
                if (loadingEl) {
                    const loadingText = loadingEl.querySelector('p');
                    if (loadingText) {
                        loadingText.textContent = `Loading Avatar... (Attempt ${attempt}, retrying in ${(retryDelay / 1000).toFixed(1)}s)`;
                    }
                }

                
                await new Promise(resolve => setTimeout(resolve, retryDelay));

                
            }
        }
    },

    
    setupScene() {
        
        this.scene = new THREE.Scene();
        this.scene.background = null; 

        
        this.camera = new THREE.PerspectiveCamera(
            55, 
            this.container.clientWidth / this.container.clientHeight, 
            0.05, 
            1000 
        );
        
        this.camera.position.set(0, 1.5, 3.5);
        this.camera.lookAt(0, 2, 0);

        
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true, 
            powerPreference: 'high-performance', 
            stencil: false, 
            depth: true 
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 

        
        this.renderer.shadowMap.enabled = false;

        this.container.appendChild(this.renderer.domElement);

        
        const light = new THREE.DirectionalLight(0xffffff, 2.5);
        light.position.set(0, 5, 5);
        this.scene.add(light);

        const ambient = new THREE.AmbientLight(0xffffff, 1.5);
        this.scene.add(ambient);

        
        this.clock = new THREE.Clock();

        
        window.addEventListener('resize', () => this.onWindowResize());

        console.log('✅ Three.js scene setup complete');
    },

    
    async loadAvatar(url, retryAttempt = 0) {
        const maxRetryDelay = 10000;

        while (true) {
            retryAttempt++;
            console.log(`📦 Loading avatar from: ${url} (Load attempt #${retryAttempt})`);


            const loadingEl = document.getElementById('avatar-loading-indicator');
            if (loadingEl) {
                const loadingText = loadingEl.querySelector('p');
                if (loadingText) {
                    loadingText.textContent = `Loading Avatar... 0%`;
                }
            }

            try {
                const avatar = await new Promise((resolve, reject) => {
                    const loader = new GLTFLoader();


                    const loadTimeout = setTimeout(() => {
                        reject(new Error('Avatar loading timeout after 60 seconds'));
                    }, 60000);

                    loader.load(
                        url,
                        (gltf) => {
                            clearTimeout(loadTimeout);
                            this.loadingProgress = 100; 
                            this.avatar = gltf.scene;

                            
                            this.scene.add(this.avatar);

                            
                            
                            
                            this.avatar.position.set(0, -1.6, 0); 
                            this.avatar.scale.set(2.1, 2.1, 2.1); 
                            this.avatar.visible = true;

                            
                            if (gltf.animations && gltf.animations.length > 0) {
                                this.mixer = new THREE.AnimationMixer(this.avatar);
                                gltf.animations.forEach(clip => {
                                    const action = this.mixer.clipAction(clip);
                                    action.stop(); 
                                });
                            }


                            
                            this.findMorphTargets();

                            
                            this.findBones();

                            
                            this.detectAvatarGender();

                            
                            this.fixLeftShoulderBone();

                            
                            this.setIdlePose();

                            
                            this.startIdleAnimationCycle();

                            
                            
                            

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
                                this.loadingProgress = Math.min(95, percent);
                                console.log(`📦 Loading avatar: ${percent.toFixed(0)}% (${progress.loaded}/${progress.total} bytes)`);

                                const loadingEl = document.getElementById('avatar-loading-indicator');
                                if (loadingEl) {
                                    const loadingText = loadingEl.querySelector('p');
                                    if (loadingText) {
                                        loadingText.textContent = `Loading Avatar... ${this.loadingProgress.toFixed(0)}%`;
                                    }
                                }
                            } else {
                                console.log(`📦 Loading avatar: ${progress.loaded} bytes loaded...`);

                                const loadingEl = document.getElementById('avatar-loading-indicator');
                                if (loadingEl) {
                                    const loadingText = loadingEl.querySelector('p');
                                    if (loadingText) {
                                        const kb = (progress.loaded / 1024).toFixed(0);
                                        loadingText.textContent = `Loading Avatar... ${kb}KB loaded`;
                                    }
                                }
                            }
                        },
                        (error) => {
                            clearTimeout(loadTimeout);
                            console.error('❌ GLTF Loader error:', error);
                            reject(error);
                        }
                    );
                });

                
                return avatar;

            } catch (error) {
                console.error(`❌ Failed to load avatar (load attempt #${retryAttempt}):`, error);
                console.error('   Error type:', error.name);
                console.error('   Error message:', error.message);

                
                const retryDelay = Math.min(1000 * Math.pow(1.5, retryAttempt - 1), maxRetryDelay);
                console.log(`⏳ Retrying avatar load in ${(retryDelay / 1000).toFixed(1)} seconds...`);

                
                const loadingEl = document.getElementById('avatar-loading-indicator');
                if (loadingEl) {
                    const loadingText = loadingEl.querySelector('p');
                    if (loadingText) {
                        loadingText.textContent = `Loading Avatar... (Load attempt ${retryAttempt}, retrying in ${(retryDelay / 1000).toFixed(1)}s)`;
                    }
                }

                
                await new Promise(resolve => setTimeout(resolve, retryDelay));

                
            }
        }
    },

    
    findMorphTargets() {
        console.log('🔍 Searching for Oculus OVR LipSync morph targets...');

        let meshesChecked = 0;
        let hasVisemeBlendShapes = false;
        let hasBasicMouthShapes = false;
        let oculusVisemeCount = 0;

        
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

                    
                    const foundOculusVisemes = this.oculusVisemes.filter(viseme =>
                        morphTargetKeys.includes(viseme)
                    );

                    console.log(`   🎯 Found ${foundOculusVisemes.length}/15 Oculus OVR LipSync visemes:`, foundOculusVisemes);

                    
                    const foundAdditionalShapes = {};
                    Object.keys(this.additionalBlendShapes).forEach(shapeName => {
                        if (morphTargetKeys.includes(shapeName)) {
                            foundAdditionalShapes[shapeName] = child.morphTargetDictionary[shapeName];
                        }
                    });

                    if (Object.keys(foundAdditionalShapes).length > 0) {
                        console.log(`   ✨ Found ${Object.keys(foundAdditionalShapes).length} additional blend shapes:`, Object.keys(foundAdditionalShapes));
                        
                        Object.keys(foundAdditionalShapes).forEach(key => {
                            this.additionalBlendShapes[key] = foundAdditionalShapes[key];
                        });
                    }

                    
                    const visemeNames = morphTargetKeys.filter(name =>
                        name.toLowerCase().includes('viseme')
                    );
                    console.log(`   ✅ Found ${visemeNames.length} visemes in ${child.name}:`, visemeNames);

                    
                    const hasMouthOpen = morphTargetKeys.includes('mouthOpen');
                    const hasMouthSmile = morphTargetKeys.includes('mouthSmile');
                    const hasBasicMouth = hasMouthOpen || hasMouthSmile;

                    
                    
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

                    
                    if (child.morphTargetInfluences) {
                        console.log('   Morph target influences array length:', child.morphTargetInfluences.length);
                    }
                }
            }
        });

        console.log(`🔍 Total meshes checked: ${meshesChecked}`);
        console.log(`🔍 Total meshes with VISEME morph targets: ${meshesWithMorphTargets.length}`);
        console.log(`🎯 Oculus OVR LipSync visemes found: ${oculusVisemeCount}/15`);

        
        if (meshesWithMorphTargets.length > 0) {
            
            this.morphTargets.mesh = meshesWithMorphTargets[0].mesh;
            this.morphTargets.indices = meshesWithMorphTargets[0].indices;

            
            this.morphTargets.allMeshes = meshesWithMorphTargets;

            
            this.hasOculusVisemes = oculusVisemeCount === 15;
        }

        
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

    
    findBones() {
        console.log('🔍 Searching for bones...');

        
        this.avatar.traverse((obj) => {
            if (obj.isBone) {
                console.log('🦴 Bone found:', obj.name);
            }
            
            if (obj.isSkinnedMesh) {
                this.skinnedMeshes.push(obj);
                console.log('✅ Found SkinnedMesh:', obj.name);
            }
        });

        console.log(`📦 Total SkinnedMeshes found: ${this.skinnedMeshes.length}`);

        
        this.avatar.traverse((child) => {
            if (child.isBone) {
                const boneName = child.name.toLowerCase();

                
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
                
                if (boneName === 'neck') {
                    this.neckBone = child;
                    console.log('✅ Found NECK bone:', child.name);
                }
                
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
                
                if (boneName.includes('jaw') || boneName === 'jaw') {
                    this.jawBone = child;
                    console.log('✅ Found JAW bone:', child.name);
                }
            }
        });

        
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

    
    detectAvatarGender() {
        console.log('🔍 Detecting avatar gender from URL...');

        
        const maleAvatarIds = [
            '6900c7a0f2f24d4396aff789', 
            '6900cb7e032c83e9bdece86f', 
            '6906186befedb00e4532f3dc'  
        ];

        
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

    
    fixLeftShoulderBone() {
        console.log('🔧 Checking if left shoulder and arm bone alignment needs fixing...');

        
        const SYMMETRY_TOLERANCE = 0.01;
        let bonesAlreadySymmetric = true;

        if (this.leftArmBone && this.rightArmBone) {
            const leftRot = this.leftArmBone.rotation;
            const rightRot = this.rightArmBone.rotation;

            
            const xSymmetric = Math.abs(leftRot.x + rightRot.x) < SYMMETRY_TOLERANCE;
            const ySymmetric = Math.abs(leftRot.y - rightRot.y) < SYMMETRY_TOLERANCE;
            const zSymmetric = Math.abs(leftRot.z + rightRot.z) < SYMMETRY_TOLERANCE;

            if (xSymmetric && ySymmetric && zSymmetric) {
                console.log('✅ Avatar bones are already symmetric - skipping fix');
                console.log('   Left arm rotation:', { x: leftRot.x, y: leftRot.y, z: leftRot.z });
                console.log('   Right arm rotation:', { x: rightRot.x, y: rightRot.y, z: rightRot.z });
                return; 
            }

            bonesAlreadySymmetric = false;
            console.log('⚠️ Avatar bones are asymmetric - applying fix');
        }

        
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

            
            
            this.leftShoulderBone.position.x = -this.rightShoulderBone.position.x;
            this.leftShoulderBone.position.y = this.rightShoulderBone.position.y;
            this.leftShoulderBone.position.z = this.rightShoulderBone.position.z;

            
            this.leftShoulderBone.position.x -= -0.1;  
            this.leftShoulderBone.position.y -= -0.01;

            
            
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

            
            this.leftShoulderBone.scale.copy(this.rightShoulderBone.scale);
            console.log('✅ Left shoulder scale matched to right shoulder');
        }

        
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

            
            
            this.leftArmBone.position.x = -this.rightArmBone.position.x;
            this.leftArmBone.position.y = this.rightArmBone.position.y;
            this.leftArmBone.position.z = this.rightArmBone.position.z;

            
            
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

            
            this.leftArmBone.scale.copy(this.rightArmBone.scale);
            console.log('✅ Left arm scale matched to right arm');
        }

        
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

            
            this.leftHandBone.position.x = -this.rightHandBone.position.x;
            this.leftHandBone.position.y = this.rightHandBone.position.y;
            this.leftHandBone.position.z = this.rightHandBone.position.z;

            
            this.leftHandBone.quaternion.copy(this.rightHandBone.quaternion);

            
            

            
            this.leftHandBone.scale.copy(this.rightHandBone.scale);

            console.log('✅ Left hand fully synced with right hand (quaternion copy)');
            console.log('   Final rotation:', {
                x: this.leftHandBone.rotation.x,
                y: this.leftHandBone.rotation.y,
                z: this.leftHandBone.rotation.z
            });
        }
    },

    
    setIdlePose() {
        console.log('Setting idle pose - natural resting position');
        console.log('   Avatar gender:', this.avatarGender);

        
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

        
        if (this.avatarGender === 'male') {
            
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

        
        if (this.headBone) {
            this.headBone.rotation.set(0, 0, 0);
        }
        if (this.neckBone) {
            this.neckBone.rotation.set(0.3, 0, 0); 
        }

        
        if (this.spine) {
            this.spine.rotation.set(0, 0, 0);
        }

        
        if (this.hips) {
            this.hips.rotation.set(0, 0, 0); 
        }

        
        this.updateBasePose();

        console.log('✅ Idle pose applied successfully - arms at sides');
    },

    
    setIdleWavePose() {
        console.log('Setting idle wave pose - friendly greeting wave');
        console.log('   Avatar gender:', this.avatarGender);

        
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

        
        if (this.avatarGender === 'male') {
            
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

        
        if (this.headBone) {
            this.headBone.rotation.set(0, 0, 0);
        }
        if (this.neckBone) {
            this.neckBone.rotation.set(0.3, 0, 0);
        }

        
        if (this.spine) {
            this.spine.rotation.set(0, 0, 0);
        }

        
        if (this.hips) {
            this.hips.rotation.set(0, 0, 0);
        }

        
        this.smile(0.6); 

        
        this.updateBasePose();

        console.log('✅ Idle wave pose applied successfully - waving with smile');
    },

    
    setTeachingPose() {
        console.log('Setting teaching pose - animated gesture position');
        console.log('   Avatar gender:', this.avatarGender);

        
        if (this.headBone) {
            this.headBone.rotation.set(0.3, 0.26, 0.02); 
        }
        if (this.neckBone) {
            this.neckBone.rotation.set(0, 0.18, 0); 
        }

        
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

        
        if (this.avatarGender === 'male') {
            
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

        
        if (this.hips) {
            this.hips.rotation.set(0, 0.5, 0); 
        }

        
        this.updateBasePose();

        console.log('✅ Teaching pose applied successfully - head facing forward, ready for gestures');
    },

    
    transitionToTeachingPose() {
        
        
        
        
        if (this.poseTransitionActive && this.teachingAnimationActive) {
            console.log('⚠️ Already transitioning to teaching pose with teaching active - skipping to avoid restart loop');
            return;
        }

        console.log('🎬 Starting transition to teaching pose');

        
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

        
        this.poseTransitionTargetValues = {
            rightShoulder: {x: 0.5, y: 0.66, z: 0.98},
            rightArm: {x: 0.66, y: 0.02, z: 1.54},
            rightLowerArm: {x: 0.66, y: -0.3, z: -0.3},
            rightHand: {x: 0.42, y: -0.03, z: -0.06},
            leftShoulder: {x: 0.82, y: -0.14, z: 1.46},
            leftArm: {x: -0.77, y: 0.42, z: -3.14},
            leftLowerArm: {x: 0.82, y: -0.46, z: 0.42},
            leftHand: {x: -0.00683081157725353, y: -0.01199814381446926, z: -0.009769531377204627},
            head: {x: 0.3, y: 0.26, z: 0.02}, 
            neck: {x: 0, y: 0.18, z: 0}, 
            hips: {x: 0, y: 0.5, z: 0} 
        };

        
        this.poseTransitionActive = true;
        this.poseTransitionStartTime = this.clock.getElapsedTime();

        
        this.teachingRotationStartTime = this.clock.getElapsedTime();
        this.teachingRotationDuration = this.randomizeTeachingRotationDuration();
        this.teachingRotationProgress = 0;

        
        this.handGestureCycleStartTime = this.clock.getElapsedTime();
        this.handGesturePhase = 0;

        console.log('✅ Transition to teaching pose started', {
            startValues: this.poseTransitionStartValues,
            targetValues: this.poseTransitionTargetValues,
            initialRotationDuration: this.teachingRotationDuration.toFixed(2) + 's'
        });
    },

    
    transitionToIdlePose() {
        console.log('🎬 Starting transition to idle pose');

        
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

        
        this.poseTransitionTargetValues = {
            rightShoulder: {x: 0.5, y: 0.66, z: 0.98},
            rightArm: {x: 0.66, y: 0.007814109203464563, z: 1.54},
            rightLowerArm: {x: 0.6574085170486437, y: -0.3, z: -0.14},
            rightHand: {x: -0.04314421977097947, y: 1.0472948007780165, z: 0.26},
            leftShoulder: {x: 1.78, y: -0.38, z: 1.46},
            leftArm: {x: -0.85, y: 0.42, z: -2.77},
            leftLowerArm: {x: 0.98, y: 0.74, z: -0.22},
            leftHand: {x: -0.024648858953330407, y: 0.25263168725543406, z: -0.1303135341370885},
            head: {x: 0, y: 0, z: 0}, 
            neck: {x: 0.3, y: 0, z: 0}, 
            hips: {x: 0, y: 0, z: 0} 
        };

        
        this.poseTransitionActive = true;
        this.poseTransitionStartTime = this.clock.getElapsedTime();

        
        this.smile(0);

        console.log('✅ Transition to idle pose started', {
            startValues: this.poseTransitionStartValues,
            targetValues: this.poseTransitionTargetValues
        });
    },

    
    updatePoseTransition() {
        if (!this.poseTransitionActive) return;

        const currentTime = this.clock.getElapsedTime();
        const elapsed = currentTime - this.poseTransitionStartTime;
        const progress = Math.min(elapsed / this.poseTransitionDuration, 1.0);

        
        const easingFn = this.easing.easeInOutQuint;

        
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

        
        if (this.headBone && this.poseTransitionStartValues.head && this.poseTransitionTargetValues.head) {
            this.applyLerpRotation(
                this.headBone,
                this.poseTransitionStartValues.head,
                this.poseTransitionTargetValues.head,
                progress,
                easingFn
            );
        }

        
        this.applyLerpRotation(
            this.neckBone,
            this.poseTransitionStartValues.neck,
            this.poseTransitionTargetValues.neck,
            progress,
            easingFn
        );

        
        this.applyLerpRotation(
            this.hips,
            this.poseTransitionStartValues.hips,
            this.poseTransitionTargetValues.hips,
            progress,
            easingFn
        );

        
        if (progress >= 1.0) {
            this.poseTransitionActive = false;

            
            
            if (this.teachingAnimationActive) {
                this.teachingRotationStartTime = this.clock.getElapsedTime();
                this.teachingRotationDuration = this.randomizeTeachingRotationDuration();
                this.teachingRotationProgress = 0;
                console.log(`🔄 Teaching rotation timer reset - duration: ${this.teachingRotationDuration.toFixed(2)}s`);
            }

            
            if (this.shouldStartWaveOnIdleComplete && !this.teachingAnimationActive && !this.isSpeaking) {
                console.log('👋 Idle pose transition complete - starting random wave animations');
                this.shouldStartWaveOnIdleComplete = false; 
                
                setTimeout(() => {
                    if (!this.isSpeaking && !this.teachingAnimationActive) {
                        this.startRandomWaveAnimations();
                    }
                }, 1000); 
            }

            
            this.updateBasePose();
            console.log('✅ Pose transition completed');
        }
    },

    
    setNarratingPose() {
        console.log('Setting narrating pose - left arm raised');

        
        if (this.rightShoulderBone) {
            this.rightShoulderBone.rotation.set(0, 0, 0);  
        }
        if (this.rightArmBone) {
            this.rightArmBone.rotation.set(10, 0, 0.3);  
        }
        if (this.rightLowerArmBone) {
            this.rightLowerArmBone.rotation.set(0.2, 0, 0.3);  
        }
        if (this.rightHandBone) {
            this.rightHandBone.rotation.set(0, 0, 0);  
        }

        
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

        
        this.updateBasePose();
    },

    
    updateBasePose() {
        this.basePose = {
            
            rightShoulderX: this.rightShoulderBone ? this.rightShoulderBone.rotation.x : 0,
            rightShoulderY: this.rightShoulderBone ? this.rightShoulderBone.rotation.y : 0,
            rightShoulderZ: this.rightShoulderBone ? this.rightShoulderBone.rotation.z : 0,

            
            rightArmX: this.rightArmBone ? this.rightArmBone.rotation.x : 0,
            rightArmY: this.rightArmBone ? this.rightArmBone.rotation.y : 0,
            rightArmZ: this.rightArmBone ? this.rightArmBone.rotation.z : 0,
            rightLowerArmX: this.rightLowerArmBone ? this.rightLowerArmBone.rotation.x : 0,
            rightLowerArmY: this.rightLowerArmBone ? this.rightLowerArmBone.rotation.y : 0,
            rightLowerArmZ: this.rightLowerArmBone ? this.rightLowerArmBone.rotation.z : 0,
            rightHandX: this.rightHandBone ? this.rightHandBone.rotation.x : 0,
            rightHandY: this.rightHandBone ? this.rightHandBone.rotation.y : 0,
            rightHandZ: this.rightHandBone ? this.rightHandBone.rotation.z : 0,

            
            leftShoulderX: this.leftShoulderBone ? this.leftShoulderBone.rotation.x : 0,
            leftShoulderY: this.leftShoulderBone ? this.leftShoulderBone.rotation.y : 0,
            leftShoulderZ: this.leftShoulderBone ? this.leftShoulderBone.rotation.z : 0,

            
            leftArmX: this.leftArmBone ? this.leftArmBone.rotation.x : 0,
            leftArmY: this.leftArmBone ? this.leftArmBone.rotation.y : 0,
            leftArmZ: this.leftArmBone ? this.leftArmBone.rotation.z : 0,
            leftLowerArmX: this.leftLowerArmBone ? this.leftLowerArmBone.rotation.x : 0,
            leftLowerArmY: this.leftLowerArmBone ? this.leftLowerArmBone.rotation.y : 0,
            leftLowerArmZ: this.leftLowerArmBone ? this.leftLowerArmBone.rotation.z : 0,
            leftHandX: this.leftHandBone ? this.leftHandBone.rotation.x : 0,
            leftHandY: this.leftHandBone ? this.leftHandBone.rotation.y : 0,
            leftHandZ: this.leftHandBone ? this.leftHandBone.rotation.z : 0,

            
            headY: this.headBone ? this.headBone.rotation.y : 0,
            headX: this.headBone ? this.headBone.rotation.x : 0
        };

        
        if (this.skinnedMeshes.length > 0) {
            this.avatar.updateMatrixWorld(true);
            this.skinnedMeshes.forEach(mesh => {
                
                mesh.skeleton.update();
                mesh.updateMatrixWorld(true);
            });
        }
    },

    
    setupDebugGUI() {
        
        if (this.gui) {
            this.gui.destroy();
        }

        console.log('🎛️ Setting up debug GUI for bone control...');

        this.gui = new GUI();
        this.gui.title('Avatar Bone Control');

        
        this.gui.add(this, 'enableAnimations').name('🎬 Enable Animations')
            .onChange((value) => {
                if (value) {
                    console.log('✅ Animations ENABLED - bones will animate automatically');
                } else {
                    console.log('⏸️ Animations DISABLED - you can now manually adjust bones');
                }
            });

        
        if (this.rightShoulderBone) {
            const rightShoulderFolder = this.gui.addFolder('Right Shoulder');
            rightShoulderFolder.add(this.rightShoulderBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            rightShoulderFolder.add(this.rightShoulderBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            rightShoulderFolder.add(this.rightShoulderBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
            rightShoulderFolder.open();
        }

        
        if (this.leftShoulderBone) {
            const leftShoulderFolder = this.gui.addFolder('Left Shoulder');
            leftShoulderFolder.add(this.leftShoulderBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            leftShoulderFolder.add(this.leftShoulderBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            leftShoulderFolder.add(this.leftShoulderBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
            leftShoulderFolder.open();
        }

        
        if (this.rightArmBone) {
            const rightArmFolder = this.gui.addFolder('Right Arm');
            rightArmFolder.add(this.rightArmBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            rightArmFolder.add(this.rightArmBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            rightArmFolder.add(this.rightArmBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        
        if (this.leftArmBone) {
            const leftArmFolder = this.gui.addFolder('Left Arm');
            leftArmFolder.add(this.leftArmBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            leftArmFolder.add(this.leftArmBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            leftArmFolder.add(this.leftArmBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        
        if (this.rightLowerArmBone) {
            const rightLowerArmFolder = this.gui.addFolder('Right Lower Arm');
            rightLowerArmFolder.add(this.rightLowerArmBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            rightLowerArmFolder.add(this.rightLowerArmBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            rightLowerArmFolder.add(this.rightLowerArmBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        
        if (this.leftLowerArmBone) {
            const leftLowerArmFolder = this.gui.addFolder('Left Lower Arm');
            leftLowerArmFolder.add(this.leftLowerArmBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            leftLowerArmFolder.add(this.leftLowerArmBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            leftLowerArmFolder.add(this.leftLowerArmBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        
        if (this.rightHandBone) {
            const rightHandFolder = this.gui.addFolder('Right Hand');
            rightHandFolder.add(this.rightHandBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            rightHandFolder.add(this.rightHandBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            rightHandFolder.add(this.rightHandBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        
        if (this.leftHandBone) {
            const leftHandFolder = this.gui.addFolder('Left Hand');
            leftHandFolder.add(this.leftHandBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            leftHandFolder.add(this.leftHandBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            leftHandFolder.add(this.leftHandBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        
        if (this.headBone) {
            const headFolder = this.gui.addFolder('Head');
            headFolder.add(this.headBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            headFolder.add(this.headBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            headFolder.add(this.headBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        
        if (this.neckBone) {
            const neckFolder = this.gui.addFolder('Neck');
            neckFolder.add(this.neckBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            neckFolder.add(this.neckBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            neckFolder.add(this.neckBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        
        if (this.spine) {
            const spineFolder = this.gui.addFolder('Spine');
            spineFolder.add(this.spine.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            spineFolder.add(this.spine.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            spineFolder.add(this.spine.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        
        if (this.hips) {
            const hipsFolder = this.gui.addFolder('Hips');
            hipsFolder.add(this.hips.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            hipsFolder.add(this.hips.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            hipsFolder.add(this.hips.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        
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

    
    applyProfessionalPose() {
        console.log('Applying professional narrating pose...');

        
        this.setIdlePose();

        
        if (this.headBone) {
            
            this.headBone.rotation.x = 0;
            this.headBone.rotation.y = 0;
            this.headBone.rotation.z = 0;
        }

        
        if (this.neckBone) {
            this.neckBone.rotation.set(0.3, 0, 0); 
        }

        console.log('✅ Professional pose applied - avatar starts in idle (arms tucked)');
    },

    
    transitionToIdleWavePose() {
        console.log('🎬 Starting transition to idle wave pose with synchronized waving');

        
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

        
        this.poseTransitionActive = true;
        this.poseTransitionStartTime = this.clock.getElapsedTime();

        
        this.smile(0.6);

        
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

    
    getRandomIdleInterval() {
        const interval = Math.random() * (this.idleAnimationIntervalMax - this.idleAnimationIntervalMin) + this.idleAnimationIntervalMin;
        return Math.round(interval);
    },

    
    scheduleNextIdleAnimation() {
        
        if (this.idleAnimationTimer) {
            clearTimeout(this.idleAnimationTimer);
        }

        
        const nextInterval = this.getRandomIdleInterval();
        console.log(`⏱️ Next idle animation scheduled in ${(nextInterval / 1000).toFixed(1)} seconds`);

        
        this.idleAnimationTimer = setTimeout(() => {
            
            
            const isAudioNarrationPlaying = window.AudioNarration && window.AudioNarration.isPlaying;
            const isTransitioningLines = window.AudioNarration && window.AudioNarration.isTransitioningLines;
            const isTeachingActive = this.teachingAnimationActive;

            if (!this.isSpeaking && !isAudioNarrationPlaying && !isTransitioningLines && !isTeachingActive) {
                
                this.currentIdlePoseIndex = (this.currentIdlePoseIndex + 1) % 2;

                if (this.currentIdlePoseIndex === 0) {
                    console.log('🔄 Switching to default idle pose with smooth transition');
                    this.transitionToIdlePose();
                } else {
                    console.log('👋 Switching to wave idle pose with smile and smooth transition');
                    this.transitionToIdleWavePose();
                }

                
                this.scheduleNextIdleAnimation();
            } else {
                console.log('⏸️ Skipping idle animation - avatar is speaking or story is playing');
                console.log(`   - isSpeaking: ${this.isSpeaking}, AudioNarration.isPlaying: ${isAudioNarrationPlaying}, isTransitioningLines: ${isTransitioningLines}, teachingActive: ${isTeachingActive}`);
                
                this.scheduleNextIdleAnimation();
            }
        }, nextInterval);
    },

    
    startIdleAnimationCycle() {
        
        if (this.isIdleAnimationActive) {
            console.log('⚠️ Idle animation cycle already running');
            return;
        }

        
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

        
        this.currentIdlePoseIndex = 0;
        this.setIdlePose();

        
        this.isIdleAnimationActive = true;

        
        this.scheduleNextIdleAnimation();

        console.log('✅ Idle animation cycle started successfully');
    },

    
    stopIdleAnimationCycle() {
        if (this.idleAnimationTimer) {
            clearTimeout(this.idleAnimationTimer);
            this.idleAnimationTimer = null;
            this.isIdleAnimationActive = false;
            this.isWaving = false;
            console.log('⏹️ Idle animation cycle stopped');
        }
        
        if (this.waveDelayTimer) {
            clearTimeout(this.waveDelayTimer);
            this.waveDelayTimer = null;
        }
    },

    
    animateWaveMotion() {
        if (!this.isWaving || !this.leftLowerArmBone) return;

        const currentTime = this.clock.getElapsedTime();
        const elapsed = currentTime - this.waveStartTime;

        
        if (elapsed >= this.waveAnimationDuration / 1000) {
            console.log('👋 Wave animation completed - returning to idle pose');
            this.isWaving = false;
            this.transitionToIdlePose();
            return;
        }

        
        
        const minRotation = -0.54;
        const maxRotation = -0.22727901358640065;

        
        const waveProgress = Math.sin(currentTime * this.waveAnimationSpeed * Math.PI * 2);

        
        const rotationX = minRotation + ((waveProgress + 1) / 2) * (maxRotation - minRotation);

        
        this.leftLowerArmBone.rotation.x = rotationX;
    },

    
    triggerWaveOnPause() {
        console.log('👋 Triggering wave animation on pause...');

        
        if (!this.isFullyLoaded || this.isWaving || this.poseTransitionActive) {
            console.log('⏸️ Cannot trigger wave - avatar not ready or already animating');
            return;
        }

        
        if (this.isSpeaking || this.teachingAnimationActive) {
            console.log('⏸️ Cannot trigger wave - avatar is speaking/teaching');
            return;
        }

        
        this.transitionToIdleWavePose();

        
        if (!this.isRandomWaveActive) {
            this.startRandomWaveAnimations();
        }
    },

    
    startRandomWaveAnimations() {
        console.log('🔄 Starting random wave animation system...');

        this.isRandomWaveActive = true;

        const scheduleNextWave = () => {
            
            if (this.randomWaveTimer) {
                clearTimeout(this.randomWaveTimer);
            }

            
            if (!this.isRandomWaveActive) {
                console.log('⏸️ Random wave system stopped');
                return;
            }

            
            const interval = Math.random() * (this.pausedWaveIntervalMax - this.pausedWaveIntervalMin) + this.pausedWaveIntervalMin;

            console.log(`⏰ Next wave scheduled in ${(interval / 1000).toFixed(1)} seconds`);

            this.randomWaveTimer = setTimeout(() => {
                
                if (this.isRandomWaveActive && !this.isSpeaking && !this.teachingAnimationActive && !this.isWaving && !this.poseTransitionActive) {
                    console.log('👋 Triggering random wave animation...');
                    this.transitionToIdleWavePose();

                    
                    
                    setTimeout(() => {
                        scheduleNextWave();
                    }, 5000);
                } else {
                    
                    scheduleNextWave();
                }
            }, interval);
        };

        
        scheduleNextWave();
    },

    
    stopRandomWaveAnimations() {
        console.log('⏹️ Stopping random wave animation system');

        this.isRandomWaveActive = false;

        if (this.randomWaveTimer) {
            clearTimeout(this.randomWaveTimer);
            this.randomWaveTimer = null;
        }
    },

    
    setViseme(visemeName, intensity = 1.0) {
        if (!this.morphTargets.mesh || !this.morphTargets.indices) {
            
            if (!this._noMorphTargetsWarned) {
                console.warn('⚠️ Cannot set viseme - no morph targets found');
                this._noMorphTargetsWarned = true;
            }
            return;
        }

        const mesh = this.morphTargets.mesh;
        const index = this.morphTargets.indices[visemeName];

        if (index !== undefined && mesh.morphTargetInfluences) {
            
            const clampedIntensity = Math.max(0, Math.min(1, intensity));

            
            const isVowel = this.vowelVisemes.includes(visemeName);
            const smoothingFactor = isVowel ? this.vowelSmoothingFactor : this.visemeSmoothingFactor;

            
            const previousWeight = this.previousVisemeWeights[visemeName] || 0;
            const smoothedIntensity = previousWeight + (clampedIntensity - previousWeight) * smoothingFactor;

            
            this.previousVisemeWeights[visemeName] = smoothedIntensity;

            
            mesh.morphTargetInfluences[index] = smoothedIntensity;

            
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

    
    resetVisemes() {
        
        if (this.morphTargets.allMeshes && this.morphTargets.allMeshes.length > 0) {
            this.morphTargets.allMeshes.forEach(({mesh}) => {
                if (!mesh.morphTargetInfluences) return;

                
                const influences = mesh.morphTargetInfluences;
                for (let i = 0; i < influences.length; i++) {
                    influences[i] = 0;
                }

                
                if (mesh.geometry) {
                    mesh.geometry.morphAttributesNeedUpdate = true;
                }
            });
        }
        
        else if (this.morphTargets.mesh && this.morphTargets.mesh.morphTargetInfluences) {
            const influences = this.morphTargets.mesh.morphTargetInfluences;
            for (let i = 0; i < influences.length; i++) {
                influences[i] = 0;
            }
        }
    },

    
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

                
                if (mesh.geometry) {
                    mesh.geometry.morphAttributesNeedUpdate = true;
                }
            }
        });

        if (!applied) {
            console.warn(`⚠️ Blend shape "${shapeName}" not found in avatar`);
        }
    },

    
    playBlink() {
        console.log('👁️ playBlink() called');

        if (!this.avatar) {
            console.warn('⚠️ Blink failed: Avatar not loaded');
            return;
        }

        
        
        const eyeLeftMesh = this.avatar.getObjectByName('EyeLeft');
        const eyeRightMesh = this.avatar.getObjectByName('EyeRight');

        console.log('👁️ Searching for eye meshes:', {
            eyeLeftFound: !!eyeLeftMesh,
            eyeRightFound: !!eyeRightMesh
        });

        
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

        
        const headMesh = this.avatar.getObjectByName('Wolf3D_Head') ||
                       this.avatar.getObjectByName('Head') ||
                       this.avatar.getObjectByName('head');

        if (headMesh && headMesh.morphTargetDictionary) {
            console.log('   Head mesh found:', headMesh.name);
            console.log('   Head mesh morph targets:', Object.keys(headMesh.morphTargetDictionary));
            console.log('   Full Head morphTargetDictionary:', headMesh.morphTargetDictionary);

            
            const headBlinkLeft = headMesh.morphTargetDictionary['eyeBlinkLeft'];
            const headBlinkRight = headMesh.morphTargetDictionary['eyeBlinkRight'];

            if (headBlinkLeft !== undefined || headBlinkRight !== undefined) {
                console.log('✅ Found eyeBlink morphs in HEAD mesh!');
                console.log('   eyeBlinkLeft index:', headBlinkLeft);
                console.log('   eyeBlinkRight index:', headBlinkRight);

                
                if (headBlinkLeft !== undefined && headBlinkRight !== undefined) {
                    this.playBlinkOnMesh(headMesh, headBlinkLeft, headBlinkRight);
                    return;
                }
            }
        }

        
        if (blinkLeftIndex === undefined && blinkRightIndex === undefined) {
            console.warn('⚠️ Blink failed: No eyeBlinkLeft or eyeBlinkRight morph targets found in eye meshes');
            console.warn('   This avatar may not support eye blinking');

            
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

        
        setTimeout(() => {
            
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
        }, 150);  
    },

    
    playBlinkOnMesh(mesh, blinkLeftIndex, blinkRightIndex) {
        console.log('✅ Starting head mesh dual-eye blink animation');
        console.log('   Mesh:', mesh.name);
        console.log('   Left eye index:', blinkLeftIndex);
        console.log('   Right eye index:', blinkRightIndex);

        this.isBlinking = true;

        const influences = mesh.morphTargetInfluences;
        const blinkDuration = 0.15; 
        const startTime = performance.now();
        const duration = blinkDuration * 1000; 

        const animateBlink = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            
            
            
            let blinkValue;
            if (progress < 0.5) {
                
                const t = progress * 2; 
                blinkValue = t * t; 
            } else {
                
                const t = (progress - 0.5) * 2; 
                blinkValue = 1 - (t * t); 
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

    
    playBlinkFallback(mesh, blinkMorphName) {
        const blinkIndex = mesh.morphTargetDictionary[blinkMorphName];

        const blinkStrength = 1.0; 
        const blinkDuration = 0.15; 
        const startTime = performance.now();
        const duration = blinkDuration * 1000; 
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

    
    updateBlink() {
        
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
            return; 
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
            this.blinkInterval = Math.random() * 4 + 2; 
            console.log('   Next blink scheduled in:', this.blinkInterval.toFixed(2), 'seconds');
            this.playBlink();
        }
    },

    
    startAutomaticBlinking() {
        console.log('👁️ Starting automatic blinking animation');
        this.blinkEnabled = true;
        this.blinkTimer = 0;
        this.blinkInterval = Math.random() * 4 + 2;
    },

    
    stopAutomaticBlinking() {
        console.log('👁️ Stopping automatic blinking animation');
        this.blinkEnabled = false;
        this.blinkTimer = 0;

        
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

        
        const possibleBlinkNames = ['eyesClosed', 'eyeBlinkLeft', 'eyeBlinkRight', 'eyeBlink', 'EyesClosed', 'Blink'];

        if (this.morphTargets.allMeshes && this.morphTargets.allMeshes.length > 0) {
            for (const meshData of this.morphTargets.allMeshes) {
                
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

    
    smile(intensity = 0.7) {
        this.setBlendShape('mouthSmile', intensity);
    },

    
    lookVertical(direction = 'up', intensity = 0.5) {
        if (direction === 'up') {
            this.setBlendShape('eyesLookUp', intensity);
            this.setBlendShape('eyesLookDown', 0);
        } else if (direction === 'down') {
            this.setBlendShape('eyesLookDown', intensity);
            this.setBlendShape('eyesLookUp', 0);
        }
    },

    
    resetBlendShapes() {
        Object.keys(this.additionalBlendShapes).forEach(shapeName => {
            if (this.additionalBlendShapes[shapeName] !== null) {
                this.setBlendShape(shapeName, 0);
            }
        });
    },

    
    createAudioAnalyzer(audioElement) {
        try {
            console.log('🎧 Creating Three.js Audio Analyzer...');

            
            
            

            
            if (!this.audioListener) {
                this.audioListener = new THREE.AudioListener();
                this.camera.add(this.audioListener);
                console.log('✅ Audio listener created and attached to camera');
            }

            
            const audioContext = this.audioListener.context;

            
            
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    console.log('✅ Audio context resumed');
                });
            }

            
            
            if (!this.threeAudio) {
                this.threeAudio = new THREE.Audio(this.audioListener);
                console.log('🆕 Created new Three.js Audio object');
            } else {
                console.log('🔄 Reusing existing Three.js Audio object for continuity');
            }

            
            
            let source;
            if (audioElement._audioSource) {
                console.log('🔄 Reusing existing audio source node for this element');
                source = audioElement._audioSource;
            } else {
                console.log('🆕 Creating new MediaElementAudioSource for this element');
                source = audioContext.createMediaElementSource(audioElement);
                
                audioElement._audioSource = source;

                
                
                
                source.connect(audioContext.destination);
                console.log('✅ Connected audio source to destination');
            }

            
            if (!this.threeAudio.source || this.threeAudio.source !== source) {
                this.threeAudio.setNodeSource(source);
                console.log('✅ Updated Three.js Audio with source node');
            }

            
            
            if (!this.audioAnalyzer) {
                
                
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

            
            if (error.name === 'InvalidStateError') {
                console.warn('⚠️ Audio element already has a source node - this is expected after first audio');
                console.warn('⚠️ This should not happen with our fixed code - please check');
            }

            return null;
        }
    },

    
    updateMouthFromAnalyzer() {
        if (!this.audioAnalyzer || !this.jawBone || !this.isSpeaking) {
            return;
        }

        try {
            
            const frequencyData = this.audioAnalyzer.getFrequencyData();

            
            let sum = 0;
            for (let i = 0; i < frequencyData.length; i++) {
                sum += frequencyData[i];
            }
            const averageFrequency = sum / frequencyData.length;

            
            const avgFreq = this.audioAnalyzer.getAverageFrequency();

            
            const volume = averageFrequency / 255;

            
            
            const volumeCurve = Math.sqrt(volume);

            
            const smoothingFactor = 0.38; 
            const previousRotation = this.jawBone.rotation.x || 0;

            
            
            const maxRotation = 0.4;
            const targetRotation = volumeCurve * maxRotation;

            
            const newRotation = previousRotation + (targetRotation - previousRotation) * smoothingFactor;

            
            this.jawBone.rotation.x = newRotation;

            
            if (this.skinnedMeshes.length > 0) {
                this.skinnedMeshes.forEach(mesh => {
                    if (mesh.skeleton) {
                        mesh.skeleton.update();
                    }
                });
            }

            
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

        
        
        const isContinuation = this.currentAudio && this.audioAnalyzer && this.isSpeaking;

        
        const isLineTransition = window.AudioNarration && window.AudioNarration.isTransitioningLines;
        const alreadyInTeachingMode = this.teachingAnimationActive || this.poseTransitionActive;

        this.currentAudio = audioElement;
        this.isSpeaking = true;

        
        
        console.log('🎭 Activating teaching animation for narration');
        this.teachingAnimationActive = true; 

        
        
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

        
        
        if (visemeData && Array.isArray(visemeData) && visemeData.length > 0 &&
            (this.hasLipSyncSupport === true || this.hasLipSyncSupport === 'limited')) {
            console.log('✅ PATH 1: Using viseme-driven lip sync (phoneme-based animation)');
            console.log(`   📊 Processing ${visemeData.length} viseme phonemes`);
            console.log(`   🎭 Avatar support level: ${this.hasLipSyncSupport === true ? 'FULL viseme blend shapes' : 'LIMITED (mouthOpen/mouthSmile only)'}`);
            this.syncWithVisemeData(audioElement, visemeData);
        }
        
        else if (this.useAudioAnalyzer && this.jawBone) {
            console.log('✅ PATH 2: Using Audio Analyzer bone-based lip sync (real-time frequency analysis)');
            console.log('   ⚠️ No viseme data available - using generic mouth opening based on volume');

            
            
            if (!this.audioAnalyzer || !isContinuation) {
                try {
                    this.createAudioAnalyzer(audioElement);
                    console.log('✅ Audio Analyzer initialized - jaw will animate based on audio frequency');
                    
                } catch (error) {
                    console.error('❌ Failed to create Audio Analyzer, falling back to morph targets:', error);
                    
                    this.useAudioAnalyzer = false;
                }
            } else {
                console.log('🔄 Reusing existing Audio Analyzer for continuous lip sync');
                
                this._analyzerUpdateCount = 0;
            }
        }
        
        else if (this.hasLipSyncSupport === true || this.hasLipSyncSupport === 'limited') {
            console.log('⚠️ PATH 3: No viseme data or jaw bone, using simple morph target animation');
            console.log('   - useAudioAnalyzer:', this.useAudioAnalyzer);
            console.log('   - hasLipSyncSupport:', this.hasLipSyncSupport);
            console.log('   - Calling syncWithSimpleAnimation now...');
            this.syncWithSimpleAnimation(audioElement);
        }
        
        else {
            console.error('❌ PATH 4: LIP-SYNC NOT AVAILABLE - Avatar has no jaw bone or morph targets');
            console.error('   Audio will play but avatar mouth will not move');
        }

        
        
        if (this._endCheckTimeout) {
            clearTimeout(this._endCheckTimeout);
            this._endCheckTimeout = null;
            console.log('🧹 Cleared pending end-check timeout from previous audio');
        }

        
        
        if (this._currentEventHandlers && this._currentAudioElement) {
            this._currentAudioElement.removeEventListener('play', this._currentEventHandlers.play);
            this._currentAudioElement.removeEventListener('pause', this._currentEventHandlers.pause);
            this._currentAudioElement.removeEventListener('ended', this._currentEventHandlers.ended);
            console.log('🧹 Removed old event listeners from previous audio element');
        }

        
        const handlePlay = () => {
            
            const isTransitioning = this.poseTransitionActive;

            console.log('▶️ Audio play event - ensuring teaching animation active');
            this.isSpeaking = true;
            this.teachingAnimationActive = true;

            
            if (this.isRandomWaveActive) {
                console.log('🛑 Stopping random wave animations - resuming playback');
                this.stopRandomWaveAnimations();
            }

            
            this.shouldStartWaveOnIdleComplete = false;

            
            
            
            if (this.isIdleAnimationActive) {
                console.log('🛑 Stopping idle animation cycle during narration playback');
                this.stopIdleAnimationCycle();
            }

            
            
            if (!isTransitioning) {
                console.log('🎬 Play event - ensuring teaching pose is active');
                this.transitionToTeachingPose();
            } else {
                console.log('📍 Play event - already transitioning, waiting for completion');
            }
        };

        const handlePause = () => {
            
            
            const isLineTransition = window.AudioNarration && window.AudioNarration.isTransitioningLines;

            if (isLineTransition) {
                console.log('🔄 Audio paused for line transition - keeping avatar in speaking/teaching mode');
                
                
                return;
            }

            
            
            
            const audioEndedNaturally = audioElement && (audioElement.ended ||
                (audioElement.currentTime >= audioElement.duration - 0.1));

            if (audioEndedNaturally) {
                console.log('🔄 Audio ended naturally (pause event before ended event) - keeping teaching mode');
                
                
                return;
            }

            
            console.log('⏸️ User paused - transitioning to idle pose');

            
            this.isSpeaking = false;
            this.teachingAnimationActive = false;

            
            this.isWaving = false;
            if (this.waveDelayTimer) {
                clearTimeout(this.waveDelayTimer);
                this.waveDelayTimer = null;
            }

            
            
            this.stopIdleAnimationCycle();

            
            this.transitionToIdlePose();

            
            this.shouldStartWaveOnIdleComplete = true;
            console.log('⏸️ Audio paused - transitioning to idle, will start random waves after transition');
        };

        const handleEnd = () => {
            
            
            console.log('🎬 RPMAvatar handleEnd fired - performing comprehensive line check');

            
            const isLineTransition = window.AudioNarration && window.AudioNarration.isTransitioningLines;
            if (isLineTransition) {
                console.log('✅ CHECK 1 PASSED: isTransitioningLines = true - MAINTAINING TEACHING MODE');
                this.teachingAnimationActive = true;
                this.isSpeaking = true;
                return;
            }
            console.log('❌ CHECK 1: isTransitioningLines = false');

            
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

            
            if (window.AudioNarration && window.AudioNarration.isPlaying) {
                console.log('✅ CHECK 3 PASSED: AudioNarration.isPlaying = true - MAINTAINING TEACHING MODE');
                this.teachingAnimationActive = true;
                this.isSpeaking = true;
                return;
            }
            console.log('❌ CHECK 3: AudioNarration.isPlaying = false');

            console.log('⚠️ ALL IMMEDIATE CHECKS FAILED - Scheduling delayed verification (100ms)');

            
            this.teachingAnimationActive = true;
            this.isSpeaking = true;

            
            
            this._endCheckTimeout = setTimeout(() => {
                console.log('⏰ DELAYED CHECK (1000ms) - Re-verifying if narration truly ended');

                
                const stillTransitioning = window.AudioNarration && window.AudioNarration.isTransitioningLines;
                if (stillTransitioning) {
                    console.log('✅ DELAYED CHECK 1: Still transitioning - MAINTAINING TEACHING MODE');
                    this.teachingAnimationActive = true;
                    this.isSpeaking = true;
                    return;
                }

                
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

                
                if (window.AudioNarration && window.AudioNarration.isPlaying) {
                    console.log('✅ DELAYED CHECK 3: AudioNarration.isPlaying = true - MAINTAINING TEACHING MODE');
                    this.teachingAnimationActive = true;
                    this.isSpeaking = true;
                    return;
                }

                
                if (this.currentAudio !== audioElement) {
                    console.log('✅ DELAYED CHECK 4: Audio changed - was a transition - MAINTAINING TEACHING MODE');
                    this.teachingAnimationActive = true;
                    this.isSpeaking = true;
                    return;
                }

                
                console.log('❌ ALL DELAYED CHECKS FAILED - Confirmed this is the FINAL line');
                console.log('🎬 TRANSITIONING TO IDLE POSE');

                this.isSpeaking = false;
                this.teachingAnimationActive = false;

                
                this.shouldStartWaveOnIdleComplete = false;

                
                if (this.isRandomWaveActive) {
                    this.stopRandomWaveAnimations();
                }

                this.transitionToIdlePose();
                this.resetVisemes();

                
                if (this.jawBone) {
                    this.jawBone.rotation.x = 0;
                }

                
                this.cleanupAudioAnalyzer();

                
                
                
                const isAudioNarrationStillPlaying = window.AudioNarration && window.AudioNarration.isPlaying;
                if (!this.isIdleAnimationActive && !isAudioNarrationStillPlaying) {
                    console.log('🔄 Restarting idle animation cycle after narration complete');
                    this.startIdleAnimationCycle();
                } else if (isAudioNarrationStillPlaying) {
                    console.log('⏸️ NOT restarting idle animation - AudioNarration is still playing (different scene)');
                }
            }, 1000); 
        };

        
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

    
    cleanupAudioAnalyzer() {
        
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

        
        if (this.simpleAnimationFrameId) {
            cancelAnimationFrame(this.simpleAnimationFrameId);
            this.simpleAnimationFrameId = null;
            console.log('🧹 Stopped simple lip-sync animation loop');
        }

        
        if (this.jawBone) {
            this.jawBone.rotation.x = 0;

            
            if (this.skinnedMeshes.length > 0) {
                this.skinnedMeshes.forEach(mesh => {
                    if (mesh.skeleton) {
                        mesh.skeleton.update();
                    }
                });
            }
        }

        
        this.resetVisemes();

        
        this._analyzerUpdateCount = 0;
        this._simpleLipSyncCount = 0; 

        
        
        console.log('✅ Audio Analyzer cleaned up');
    },

    
    syncWithVisemeData(audioElement, visemeData) {
        console.log('🎯 Using viseme-based lip sync with available morph targets');
        console.log('📊 Total visemes:', visemeData.length);
        console.log('📊 First few visemes:', visemeData.slice(0, 5));
        console.log('📊 Morph targets available:', !!this.morphTargets.mesh);
        console.log('📊 Total meshes with morph targets:', this.morphTargets.allMeshes?.length || 0);
        console.log('📊 Morph target indices:', this.morphTargets.indices);

        
        const hasFullVisemes = this.morphTargets.allMeshes?.some(m => m.hasVisemes) || false;
        console.log('📊 Avatar has full viseme support:', hasFullVisemes);

        
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

        
        const phonemeToBasicMap = {
            
            'a': { open: 0.8, smile: 0.0 },  
            'e': { open: 0.3, smile: 0.7 },  
            'i': { open: 0.2, smile: 0.9 },  
            'o': { open: 0.7, smile: 0.0 },  
            'u': { open: 0.5, smile: 0.0 },  

            
            'p': { open: 0.0, smile: 0.0 },
            'b': { open: 0.0, smile: 0.0 },
            'm': { open: 0.0, smile: 0.0 },

            
            'f': { open: 0.1, smile: 0.4 },
            'v': { open: 0.1, smile: 0.4 },

            
            'th': { open: 0.2, smile: 0.2 },
            'd': { open: 0.4, smile: 0.0 },
            't': { open: 0.3, smile: 0.0 },
            'n': { open: 0.3, smile: 0.0 },

            
            'k': { open: 0.5, smile: 0.0 },
            'g': { open: 0.5, smile: 0.0 },

            
            'ch': { open: 0.2, smile: 0.1 },
            'j': { open: 0.2, smile: 0.1 },
            'sh': { open: 0.2, smile: 0.3 },

            
            's': { open: 0.1, smile: 0.7 },
            'z': { open: 0.1, smile: 0.7 },

            
            'r': { open: 0.4, smile: 0.0 },
            'l': { open: 0.3, smile: 0.2 },

            
            'sil': null
        };

        let currentVisemeIndex = 0;
        let animationFrameId = null;

        const updateLipSync = () => {
            
            
            if (!this.isSpeaking || !this.currentAudio || this.currentAudio.ended) {
                this.resetVisemes();
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                }
                return;
            }

            
            
            const currentTime = this.currentAudio.currentTime;

            
            if (!this._lipSyncFrameCount) this._lipSyncFrameCount = 0;
            this._lipSyncFrameCount++;
            if (this._lipSyncFrameCount % 60 === 0) {
                console.log(`🔄 Lip-sync loop active - frame ${this._lipSyncFrameCount}, time: ${currentTime.toFixed(2)}s, visemeIndex: ${currentVisemeIndex}/${visemeData.length}`);
            }

            
            
            
            const lookahead = 0.18; 
            const adjustedTime = currentTime + lookahead;

            while (currentVisemeIndex < visemeData.length) {
                const viseme = visemeData[currentVisemeIndex];

                
                if (adjustedTime >= viseme.start_time && adjustedTime <= viseme.end_time) {
                    
                    const phoneme = viseme.phoneme.toLowerCase();

                    
                    const visemeDuration = viseme.end_time - viseme.start_time;
                    const progress = (adjustedTime - viseme.start_time) / visemeDuration;

                    
                    
                    let intensity = 1.0;
                    if (progress < 0.4) {
                        intensity = progress / 0.4;  
                    } else if (progress > 0.6) {
                        intensity = (1.0 - progress) / 0.4;  
                    }

                    
                    intensity = Math.max(0.0, Math.min(0.8, intensity)); 

                    
                    if (this.morphTargets.allMeshes && this.morphTargets.allMeshes.length > 0) {
                        let appliedCount = 0;

                        if (hasFullVisemes) {
                            
                            const visemeName = phonemeToVisemeMap[phoneme] || null;

                            if (visemeName) {
                                
                                this.morphTargets.allMeshes.forEach(({mesh, indices}) => {
                                    if (!mesh.morphTargetInfluences) return;

                                    
                                    const boost = {
                                        'viseme_PP': 1.0,
                                        'viseme_aa': 1.2,  
                                        'viseme_E': 1.2,   
                                        'viseme_IH': 1.2,  
                                        'viseme_oh': 1.3,  
                                        'viseme_ou': 1.3   
                                    };

                                    
                                    Object.keys(indices).forEach(key => {
                                        if (key.startsWith('viseme_')) {
                                            const currentValue = mesh.morphTargetInfluences[indices[key]] || 0;
                                            let targetValue = (key === visemeName) ? intensity : 0;

                                            
                                            if (boost[key] && key === visemeName) {
                                                targetValue *= boost[key];
                                            }

                                            
                                            targetValue = Math.min(Math.max(targetValue, 0), 1);

                                            
                                            const isThisVowel = this.vowelVisemes.includes(key);
                                            const lerpFactor = isThisVowel ? 0.12 : 0.16; 
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
                            
                            const basicShape = phonemeToBasicMap[phoneme] || null;

                            if (basicShape) {
                                
                                this.morphTargets.allMeshes.forEach(({mesh, indices}) => {
                                    if (!mesh.morphTargetInfluences) return;

                                    
                                    if (indices['mouthOpen'] !== undefined) {
                                        const currentValue = mesh.morphTargetInfluences[indices['mouthOpen']] || 0;
                                        const targetValue = basicShape.open * intensity;
                                        const lerpFactor = 0.14; 

                                        mesh.morphTargetInfluences[indices['mouthOpen']] =
                                            currentValue + (targetValue - currentValue) * lerpFactor;
                                        appliedCount++;
                                    }

                                    
                                    if (indices['mouthSmile'] !== undefined) {
                                        const currentValue = mesh.morphTargetInfluences[indices['mouthSmile']] || 0;
                                        const targetValue = basicShape.smile * intensity;
                                        const lerpFactor = 0.14; 

                                        mesh.morphTargetInfluences[indices['mouthSmile']] =
                                            currentValue + (targetValue - currentValue) * lerpFactor;
                                    }

                                    if (mesh.geometry) {
                                        mesh.geometry.morphAttributesNeedUpdate = true;
                                    }
                                });

                                
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
                    
                    currentVisemeIndex++;
                } else {
                    
                    this.resetVisemes();
                    break;
                }
            }

            
            if (adjustedTime < 0.1 && currentVisemeIndex > 0) {
                currentVisemeIndex = 0;
            }

            animationFrameId = requestAnimationFrame(updateLipSync);
        };

        
        
        const startLipSyncWhenReady = () => {
            
            const onAudioPlay = () => {
                console.log('✅ Audio playback started - starting viseme-based lip sync animation synchronized with audio');
                updateLipSync();
            };

            if (!audioElement.paused && audioElement.currentTime > 0) {
                
                console.log('✅ Audio already playing - starting viseme-based lip sync animation');
                updateLipSync();
            } else {
                
                console.log('⏳ Waiting for audio to start playing before starting lip sync...');
                audioElement.addEventListener('play', onAudioPlay, { once: true });
            }
        };

        
        startLipSyncWhenReady();
    },

    
    syncWithSimpleAnimation(audioElement) {
        console.log('🎵 Using simple fallback lip sync animation with mouthOpen/mouthSmile');
        console.log('   - Audio element provided:', !!audioElement);
        console.log('   - Morph targets mesh:', !!this.morphTargets.mesh);
        console.log('   - Total meshes with morph targets:', this.morphTargets.allMeshes?.length || 0);
        console.log('   - Morph target indices:', this.morphTargets.indices);

        
        if (this.simpleAnimationFrameId) {
            cancelAnimationFrame(this.simpleAnimationFrameId);
            this.simpleAnimationFrameId = null;
        }

        const animate = () => {
            
            
            const shouldStop = !this.isSpeaking || !audioElement || audioElement.ended;

            if (shouldStop) {
                
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

            
            
            let time;
            if (audioElement && !audioElement.paused && audioElement.currentTime > 0) {
                time = audioElement.currentTime; 
            } else {
                time = performance.now() / 1000; 
            }

            const frequency = 4; 

            
            const openCycle = (Math.sin(time * frequency) + 1) / 2; 
            const smileCycle = (Math.sin(time * frequency * 0.7 + 1) + 1) / 2; 

            
            let appliedToMeshCount = 0;
            this.morphTargets.allMeshes.forEach(({mesh, indices}) => {
                if (!mesh.morphTargetInfluences) return;

                
                if (indices['mouthOpen'] !== undefined) {
                    mesh.morphTargetInfluences[indices['mouthOpen']] = openCycle * 0.5; 
                    appliedToMeshCount++;
                }
                if (indices['mouthSmile'] !== undefined) {
                    mesh.morphTargetInfluences[indices['mouthSmile']] = smileCycle * 0.3; 
                }

                
                
                if (mesh.geometry) {
                    mesh.geometry.morphAttributesNeedUpdate = true;
                }
            });

            
            if (!this._simpleLipSyncCount) this._simpleLipSyncCount = 0;
            if (this._simpleLipSyncCount < 10) { 
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

        
        console.log('🎬 Starting simple lip-sync animation loop');
        animate();
    },

    
    lookAtBlackboard() {
        if (!this.avatar) return;

        
        this.avatar.traverse((child) => {
            if (child.isBone && child.name.toLowerCase().includes('head')) {
                child.rotation.y = Math.PI * 0.15; 
            }
        });
    },

    
    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());

        
        if (!this.avatar || !this.basePose) {
            this.renderer.render(this.scene, this.camera);
            return;
        }

        
        if (!this._animateLoopCount) {
            this._animateLoopCount = 0;
            console.log('✅ Animation loop started - updateBlink() will be called every frame');
        }
        this._animateLoopCount++;

        this.updateBlink();

        
        
        if (this.useAudioAnalyzer && this.isSpeaking && this.audioAnalyzer && this.jawBone) {
            this.updateMouthFromAnalyzer();
        }

        
        
        
        const audioNarrationPlaying = window.AudioNarration && window.AudioNarration.isPlaying;
        const isTransitioningLines = window.AudioNarration && window.AudioNarration.isTransitioningLines;

        
        if ((audioNarrationPlaying || isTransitioningLines) && !this.teachingAnimationActive) {
            
            if (this._animateLoopCount % 60 === 0) {
                console.warn('⚠️ SAFEGUARD TRIGGERED: Audio/transition active but teaching animation inactive - forcing activation');
            }
            this.teachingAnimationActive = true;
            this.isSpeaking = true;
            
            if (!this.poseTransitionActive) {
                this.transitionToTeachingPose();
            }
        }

        
        if ((audioNarrationPlaying || isTransitioningLines) && this.isIdleAnimationActive) {
            
            if (this._animateLoopCount % 60 === 0) {
                console.warn('⚠️ SAFEGUARD: Stopping idle animation - narration is active');
            }
            this.stopIdleAnimationCycle();
        }

        
        if (!this.enableAnimations) {
            
            if (this._animateLoopCount % 120 === 0) {
                console.log('⏸️ Animations DISABLED - manual bone control active');
            }
            
            this.renderer.render(this.scene, this.camera);
            return;
        }

        
        
        if (this.poseTransitionActive) {
            this.updatePoseTransition();
        }

        
        if (this.isWaving) {
            this.animateWaveMotion();
        }

        
        
        const time = this.clock.getElapsedTime();

        
        
        
        if (this.teachingAnimationActive && !this.poseTransitionActive) {
            
            if (this._animateLoopCount % 180 === 0) {
                console.log('✅ Teaching animation active - animating arms and gestures');
            }
            
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

            
            if (this.rightArmBone && this.basePose.rightArmX !== undefined) {
                this.rightArmBone.rotation.x = this.basePose.rightArmX + Math.sin(time * 0.42) * 0.015;
            }
            if (this.rightLowerArmBone && this.basePose.rightLowerArmX !== undefined) {
                this.rightLowerArmBone.rotation.x = this.basePose.rightLowerArmX + Math.sin(time * 0.48 + 0.3) * 0.018;
            }

            
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

            
            if (this.leftLowerArmBone && this.basePose.leftLowerArmX !== undefined) {
                this.leftLowerArmBone.rotation.x = this.basePose.leftLowerArmX + Math.sin(time * 0.8) * 0.03;
            }

            
            if (this.leftHandBone) {
                
                const elapsed = time - this.handGestureCycleStartTime;
                this.handGesturePhase = (elapsed % this.handGestureCycleDuration) / this.handGestureCycleDuration;

                
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
            
            
            if (this.rightArmBone && this.basePose.rightArmY !== undefined) {
                this.rightArmBone.rotation.y = this.basePose.rightArmY + Math.sin(time * 0.22) * 0.015;
            }
            if (this.rightLowerArmBone && this.basePose.rightLowerArmX !== undefined) {
                this.rightLowerArmBone.rotation.x = this.basePose.rightLowerArmX + Math.sin(time * 0.28) * 0.012;
            }

            
            const idleGestureDuration = 6.0;
            const idlePhase = (time % idleGestureDuration) / idleGestureDuration;

            
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

            
            if (this.leftLowerArmBone && this.basePose.leftLowerArmX !== undefined && !this.isWaving) {
                this.leftLowerArmBone.rotation.x = this.basePose.leftLowerArmX + Math.sin(time * 0.35 + 0.3) * 0.012;
            }

            
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

        
        
        if (!this.poseTransitionActive && this.headBone) {
            if (this.teachingAnimationActive) {
                
                
                
                

                const currentTime = this.clock.getElapsedTime();
                const elapsed = currentTime - this.teachingRotationStartTime;

                
                this.teachingRotationProgress = Math.min(elapsed / this.teachingRotationDuration, 1.0);

                
                
                const sineProgress = Math.sin(this.teachingRotationProgress * Math.PI);

                
                const easedProgress = this.easing.easeInOutQuad(sineProgress);

                
                
                const headPoseA = { x: 0.3, y: 0.26, z: 0.02 };
                const neckPoseA = { x: 0, y: 0.18, z: 0 };

                
                const headPoseB = { x: 0.26, y: -0.54, z: 0.1 };
                const neckPoseB = { x: 0.18, y: 0.1, z: 0 };

                
                this.headBone.rotation.x = headPoseA.x + (headPoseB.x - headPoseA.x) * easedProgress;
                this.headBone.rotation.y = headPoseA.y + (headPoseB.y - headPoseA.y) * easedProgress;
                this.headBone.rotation.z = headPoseA.z + (headPoseB.z - headPoseA.z) * easedProgress;

                
                if (this.neckBone) {
                    this.neckBone.rotation.x = neckPoseA.x + (neckPoseB.x - neckPoseA.x) * easedProgress;
                    this.neckBone.rotation.y = neckPoseA.y + (neckPoseB.y - neckPoseA.y) * easedProgress;
                    this.neckBone.rotation.z = neckPoseA.z + (neckPoseB.z - neckPoseA.z) * easedProgress;
                }

                
                if (this.teachingRotationProgress >= 1.0) {
                    this.teachingRotationStartTime = currentTime;
                    this.teachingRotationDuration = this.randomizeTeachingRotationDuration();
                    this.teachingRotationProgress = 0;
                    console.log(`🔄 Teaching rotation cycle complete - next cycle: ${this.teachingRotationDuration.toFixed(2)}s`);
                }
            } else {
                
                
                this.headBone.rotation.x = 0 + Math.sin(time * 0.18) * 0.005;
                this.headBone.rotation.y = 0 + Math.sin(time * 0.15) * 0.008;
                this.headBone.rotation.z = 0;
            }
        }

        
        if (this.skinnedMeshes.length > 0) {
            this.avatar.updateMatrixWorld(true);
        }

        
        this.renderer.render(this.scene, this.camera);
    },


    
    onWindowResize() {
        if (!this.container || !this.camera || !this.renderer) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    },

    
    showFallbackAvatar() {
        console.warn('⚠️ Fallback avatar disabled - will continue retrying until avatar loads successfully');
        
    },

    
    async changeAvatar(newAvatarUrl) {
        
        newAvatarUrl = ensureLipSyncSupport(newAvatarUrl);
        console.log('🔄 Changing avatar to:', newAvatarUrl);

        
        if (this.avatar) {
            this.scene.remove(this.avatar);
            this.avatar = null;
        }

        
        try {
            await this.loadAvatar(newAvatarUrl);
            this.avatarUrl = newAvatarUrl;
            console.log('✅ Avatar changed successfully');
        } catch (error) {
            console.error('❌ Failed to change avatar:', error);
            
            await this.loadAvatar(this.avatarUrl);
        }
    },

    
    dispose() {
        console.log('🧹 Disposing avatar resources...');

        
        this.stopAutomaticBlinking();

        
        this.stopIdleAnimationCycle();

        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        
        this.cleanupAudioAnalyzer();

        
        if (this.gui) {
            this.gui.destroy();
            this.gui = null;
            console.log('✅ Debug GUI destroyed');
        }

        
        if (this.audioListener) {
            this.camera.remove(this.audioListener);
            this.audioListener = null;
        }

        
        if (this.avatar) {
            this.scene.remove(this.avatar);
        }

        
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


window.RPMAvatar = RPMAvatar;


function ensureLipSyncSupport(avatarUrl) {
    if (!avatarUrl) return avatarUrl;

    
    if (!avatarUrl.includes('readyplayer.me')) {
        return avatarUrl;
    }

    
    if (avatarUrl.includes('morphTargets')) {
        return avatarUrl;
    }

    
    const separator = avatarUrl.includes('?') ? '&' : '?';
    const enhancedUrl = avatarUrl + separator + 'morphTargets=ARKit,Oculus Visemes';

    console.log('✅ Added lip sync support to avatar URL');
    return enhancedUrl;
}


document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎬 DOM loaded, checking avatar configuration...');

    
    console.log('⏳ Waiting for user settings to load...');
    if (typeof window.loadUserSettings === 'function') {
        await window.loadUserSettings();
        console.log('✅ User settings loaded for avatar configuration');
    } else {
        
        const maxWaitTime = 2000;
        const startTime = Date.now();
        while (!window.userSettings && (Date.now() - startTime) < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    
    let storyAvatarUrl = null;

    
    try {
        
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

        
        if (!storyAvatarUrl && typeof loadStoryFromIndexedDB === 'function') {
            const storyData = await loadStoryFromIndexedDB();
            if (storyData && storyData.avatarUrl) {
                storyAvatarUrl = storyData.avatarUrl;
                console.log('🎭 Found avatar URL from IndexedDB:', storyAvatarUrl);
            }
        }

        
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

        
        if (!storyAvatarUrl && window.userSettings && window.userSettings.custom_avatar_url) {
            storyAvatarUrl = window.userSettings.custom_avatar_url;
            console.log('🎭 Using custom avatar from user settings:', storyAvatarUrl);
        }
    } catch (error) {
        console.warn('⚠️ Could not load story data for avatar:', error);
    }

    
    if (storyAvatarUrl) {
        
        storyAvatarUrl = ensureLipSyncSupport(storyAvatarUrl);
        RPMAvatar.avatarUrl = storyAvatarUrl;
        console.log('✅ Using storyteller-specific avatar:', storyAvatarUrl);

        RPMAvatar.init().catch(err => {
            console.error('❌ Failed to initialize avatar on load:', err);
        });
    } else {
        console.log('ℹ️ No avatar URL found - skipping avatar initialization (no voice selected)');

        
        RPMAvatar.avatarUrl = '';
        RPMAvatar.isFullyLoaded = true; 
        console.log('✅ Avatar URL cleared - play button will not be blocked');

        
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
