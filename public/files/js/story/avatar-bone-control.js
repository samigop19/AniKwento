/**
 * Avatar Bone Control Debug GUI
 *
 * This module provides a debug GUI for manually controlling avatar bone rotations.
 * It's disabled by default but can be enabled for testing and development purposes.
 *
 * To enable:
 * 1. Import this file in your HTML: <script src="avatar-bone-control.js"></script>
 * 2. Call AvatarBoneControl.enable() after avatar is loaded
 *
 * Note: Requires lil-gui library (https://lil-gui.georgealways.com/)
 */

const AvatarBoneControl = {
    gui: null,
    avatarInstance: null,

    /**
     * Enable the bone control GUI for an avatar instance
     * @param {Object} avatarInstance - The RPMAvatar instance
     */
    enable(avatarInstance) {
        if (!avatarInstance) {
            console.error('❌ Cannot enable bone control: No avatar instance provided');
            return;
        }

        if (typeof GUI === 'undefined') {
            console.error('❌ Cannot enable bone control: lil-gui library not loaded');
            console.log('   Add to HTML: <script src="https://cdn.jsdelivr.net/npm/lil-gui@0.19"></script>');
            return;
        }

        this.avatarInstance = avatarInstance;
        this.setupDebugGUI();
    },

    /**
     * Disable and cleanup the bone control GUI
     */
    disable() {
        if (this.gui) {
            this.gui.destroy();
            this.gui = null;
            console.log('🎛️ Bone control GUI disabled');
        }
    },

    /**
     * Setup the debug GUI for bone control
     */
    setupDebugGUI() {
        const avatar = this.avatarInstance;

        // Cleanup existing GUI if present
        if (this.gui) {
            this.gui.destroy();
        }

        console.log('🎛️ Setting up debug GUI for bone control...');

        this.gui = new GUI();
        this.gui.title('Avatar Bone Control');

        // Add animation toggle at the top (IMPORTANT!)
        this.gui.add(avatar, 'enableAnimations').name('🎬 Enable Animations')
            .onChange((value) => {
                if (value) {
                    console.log('✅ Animations ENABLED - bones will animate automatically');
                } else {
                    console.log('⏸️ Animations DISABLED - you can now manually adjust bones');
                }
            });

        // Right Shoulder
        if (avatar.rightShoulderBone) {
            const rightShoulderFolder = this.gui.addFolder('Right Shoulder');
            rightShoulderFolder.add(avatar.rightShoulderBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            rightShoulderFolder.add(avatar.rightShoulderBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            rightShoulderFolder.add(avatar.rightShoulderBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
            rightShoulderFolder.open();
        }

        // Left Shoulder
        if (avatar.leftShoulderBone) {
            const leftShoulderFolder = this.gui.addFolder('Left Shoulder');
            leftShoulderFolder.add(avatar.leftShoulderBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            leftShoulderFolder.add(avatar.leftShoulderBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            leftShoulderFolder.add(avatar.leftShoulderBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
            leftShoulderFolder.open();
        }

        // Right Arm
        if (avatar.rightArmBone) {
            const rightArmFolder = this.gui.addFolder('Right Arm');
            rightArmFolder.add(avatar.rightArmBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            rightArmFolder.add(avatar.rightArmBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            rightArmFolder.add(avatar.rightArmBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        // Left Arm
        if (avatar.leftArmBone) {
            const leftArmFolder = this.gui.addFolder('Left Arm');
            leftArmFolder.add(avatar.leftArmBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            leftArmFolder.add(avatar.leftArmBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            leftArmFolder.add(avatar.leftArmBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        // Right Lower Arm
        if (avatar.rightLowerArmBone) {
            const rightLowerArmFolder = this.gui.addFolder('Right Lower Arm');
            rightLowerArmFolder.add(avatar.rightLowerArmBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            rightLowerArmFolder.add(avatar.rightLowerArmBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            rightLowerArmFolder.add(avatar.rightLowerArmBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        // Left Lower Arm
        if (avatar.leftLowerArmBone) {
            const leftLowerArmFolder = this.gui.addFolder('Left Lower Arm');
            leftLowerArmFolder.add(avatar.leftLowerArmBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            leftLowerArmFolder.add(avatar.leftLowerArmBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            leftLowerArmFolder.add(avatar.leftLowerArmBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        // Right Hand
        if (avatar.rightHandBone) {
            const rightHandFolder = this.gui.addFolder('Right Hand');
            rightHandFolder.add(avatar.rightHandBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            rightHandFolder.add(avatar.rightHandBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            rightHandFolder.add(avatar.rightHandBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        // Left Hand
        if (avatar.leftHandBone) {
            const leftHandFolder = this.gui.addFolder('Left Hand');
            leftHandFolder.add(avatar.leftHandBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            leftHandFolder.add(avatar.leftHandBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            leftHandFolder.add(avatar.leftHandBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        // Head
        if (avatar.headBone) {
            const headFolder = this.gui.addFolder('Head');
            headFolder.add(avatar.headBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            headFolder.add(avatar.headBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            headFolder.add(avatar.headBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        // Neck
        if (avatar.neckBone) {
            const neckFolder = this.gui.addFolder('Neck');
            neckFolder.add(avatar.neckBone.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            neckFolder.add(avatar.neckBone.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            neckFolder.add(avatar.neckBone.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        // Spine
        if (avatar.spine) {
            const spineFolder = this.gui.addFolder('Spine');
            spineFolder.add(avatar.spine.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            spineFolder.add(avatar.spine.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            spineFolder.add(avatar.spine.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        // Hips
        if (avatar.hips) {
            const hipsFolder = this.gui.addFolder('Hips');
            hipsFolder.add(avatar.hips.rotation, 'x', -Math.PI, Math.PI, 0.01).name('X Rotation').listen();
            hipsFolder.add(avatar.hips.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Y Rotation').listen();
            hipsFolder.add(avatar.hips.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Z Rotation').listen();
        }

        // Add utility buttons
        const controls = {
            logCurrentValues: () => {
                console.log('📋 Current Bone Rotations:');
                if (avatar.rightShoulderBone) {
                    console.log('Right Shoulder:', {
                        x: avatar.rightShoulderBone.rotation.x,
                        y: avatar.rightShoulderBone.rotation.y,
                        z: avatar.rightShoulderBone.rotation.z
                    });
                }
                if (avatar.leftShoulderBone) {
                    console.log('Left Shoulder:', {
                        x: avatar.leftShoulderBone.rotation.x,
                        y: avatar.leftShoulderBone.rotation.y,
                        z: avatar.leftShoulderBone.rotation.z
                    });
                }
                if (avatar.rightArmBone) {
                    console.log('Right Arm:', {
                        x: avatar.rightArmBone.rotation.x,
                        y: avatar.rightArmBone.rotation.y,
                        z: avatar.rightArmBone.rotation.z
                    });
                }
                if (avatar.leftArmBone) {
                    console.log('Left Arm:', {
                        x: avatar.leftArmBone.rotation.x,
                        y: avatar.leftArmBone.rotation.y,
                        z: avatar.leftArmBone.rotation.z
                    });
                }
                if (avatar.rightLowerArmBone) {
                    console.log('Right Lower Arm:', {
                        x: avatar.rightLowerArmBone.rotation.x,
                        y: avatar.rightLowerArmBone.rotation.y,
                        z: avatar.rightLowerArmBone.rotation.z
                    });
                }
                if (avatar.leftLowerArmBone) {
                    console.log('Left Lower Arm:', {
                        x: avatar.leftLowerArmBone.rotation.x,
                        y: avatar.leftLowerArmBone.rotation.y,
                        z: avatar.leftLowerArmBone.rotation.z
                    });
                }
                if (avatar.rightHandBone) {
                    console.log('Right Hand:', {
                        x: avatar.rightHandBone.rotation.x,
                        y: avatar.rightHandBone.rotation.y,
                        z: avatar.rightHandBone.rotation.z
                    });
                }
                if (avatar.leftHandBone) {
                    console.log('Left Hand:', {
                        x: avatar.leftHandBone.rotation.x,
                        y: avatar.leftHandBone.rotation.y,
                        z: avatar.leftHandBone.rotation.z
                    });
                }
                if (avatar.headBone) {
                    console.log('Head:', {
                        x: avatar.headBone.rotation.x,
                        y: avatar.headBone.rotation.y,
                        z: avatar.headBone.rotation.z
                    });
                }
                if (avatar.neckBone) {
                    console.log('Neck:', {
                        x: avatar.neckBone.rotation.x,
                        y: avatar.neckBone.rotation.y,
                        z: avatar.neckBone.rotation.z
                    });
                }
                if (avatar.spine) {
                    console.log('Spine:', {
                        x: avatar.spine.rotation.x,
                        y: avatar.spine.rotation.y,
                        z: avatar.spine.rotation.z
                    });
                }
                if (avatar.hips) {
                    console.log('Hips:', {
                        x: avatar.hips.rotation.x,
                        y: avatar.hips.rotation.y,
                        z: avatar.hips.rotation.z
                    });
                }
            },
            updateBasePose: () => {
                if (avatar.updateBasePose) {
                    avatar.updateBasePose();
                    console.log('✅ Base pose updated with current bone rotations');
                } else {
                    console.warn('⚠️ updateBasePose method not available on avatar instance');
                }
            }
        };

        this.gui.add(controls, 'logCurrentValues').name('📋 Log Current Values');
        this.gui.add(controls, 'updateBasePose').name('💾 Save as Base Pose');

        console.log('✅ Bone control GUI setup complete');
        console.log('   To disable: AvatarBoneControl.disable()');
    }
};

// Make available globally
window.AvatarBoneControl = AvatarBoneControl;

// Example usage (commented out):
// After avatar loads, enable bone control:
// AvatarBoneControl.enable(window.RPMAvatar);
//
// To disable:
// AvatarBoneControl.disable();
