/**
 * TTS Story Generation Module
 * Generates all TTS audio URLs during story creation
 * Handles both scene narration (6 lines per scene) and quiz questions
 */

const TTSStoryGenerator = {
    /**
     * Voice settings matching ElevenLabs configuration
     * Model: Eleven Flash v2.5
     */
    settings: {
        model: 'eleven_flash_v2_5',
        speed: 0.80,
        stability: 0.33,
        similarityBoost: 1.0,
        style: 0.0,
        speakerBoost: true
    },

    /**
     * Generate all TTS audio for a complete story
     * @param {Object} storyData - Story data with scenes and optional gamification
     * @param {string} selectedVoice - Voice name (Rachel, Amara, Lily)
     * @param {Function} progressCallback - Progress callback function
     * @returns {Promise<Object>} - Story data with audio URLs added
     */
    async generateAllStoryAudio(storyData, selectedVoice = 'Rachel', progressCallback = null) {
        console.log('🎤 Starting comprehensive TTS generation...');
        console.log(`📊 Voice: ${selectedVoice}`);
        console.log(`📊 Total scenes: ${storyData.scenes?.length || 0}`);

        try {
            // Generate audio for all scenes
            const scenesWithAudio = await this.generateScenesAudio(
                storyData.scenes,
                selectedVoice,
                progressCallback
            );

            // SKIP audio generation for quiz questions - only generate TTS for scene narration
            // Quiz questions will be displayed as text only without audio narration
            console.log('ℹ️ Skipping TTS generation for quiz questions (narration only mode)');

            // Return enhanced story data
            return {
                ...storyData,
                scenes: scenesWithAudio,
                gamification: storyData.gamification, // Keep gamification data without audio
                voice: {
                    name: selectedVoice,
                    voiceId: this.getVoiceId(selectedVoice),
                    settings: this.settings
                }
            };

        } catch (error) {
            console.error('❌ TTS generation failed:', error);
            throw error;
        }
    },

    /**
     * Generate TTS audio for all scenes
     * Each scene has 6 narration lines that need audio URLs
     * Generates audio for scenes 1-10 (60 audio files total)
     */
    async generateScenesAudio(scenes, voice, progressCallback) {
        console.log('\n🎬 ========== TTS SCENE AUDIO GENERATION ==========');
        console.log('   Input validation:');
        console.log('   - Scenes provided:', !!scenes);
        console.log('   - Scenes is array:', Array.isArray(scenes));
        console.log('   - Scenes length:', scenes?.length || 0);
        console.log('   - Voice:', voice);
        console.log('   - Progress callback:', typeof progressCallback);

        if (!scenes || scenes.length === 0) {
            console.error('❌ No scenes to process - aborting TTS generation');
            return [];
        }

        if (!voice) {
            console.error('❌ No voice provided - aborting TTS generation');
            return [];
        }

        // CRITICAL: Generate audio for SCENE 1-10 (60 audio files total - 6 per scene)
        const maxScenes = 10; // Generate audio for all 10 scenes
        const scenesToProcess = Math.min(scenes.length, maxScenes);

        console.log(`\n   🎯 FULL MODE: Generating audio for SCENES 1-10 (${scenesToProcess} scenes)`);
        console.log(`   📊 Total scenes received: ${scenes.length}`);
        console.log(`   ✅ Scenes to process: ${scenesToProcess}`);
        console.log(`   🎙️ Voice: ${voice}`);
        console.log(`   💰 Expected API calls: ${scenesToProcess * 6} (${scenesToProcess} scenes × 6 lines)`);
        console.log('==================================================\n');

        const scenesWithAudio = [];

        for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];

            // CRITICAL: Generate audio for scenes 1-10
            if (i < scenesToProcess) {
                console.log(`\n📖 Processing Scene ${i + 1}/${scenesToProcess}...`);
                console.log(`   🔍 Scene has narrationLines:`, !!scene.narrationLines);
                console.log(`   🔍 narrationLines is Array:`, Array.isArray(scene.narrationLines));
                console.log(`   🔍 narrationLines length:`, scene.narrationLines?.length || 0);
                if (scene.narrationLines && scene.narrationLines.length > 0) {
                    console.log(`   🔍 All narration lines:`, scene.narrationLines);
                    console.log(`   🔍 First line:`, scene.narrationLines[0]?.substring(0, 50) + '...');
                } else {
                    console.warn(`   ⚠️ Scene ${i + 1} has NO narrationLines! Checking scene.narration:`, scene.narration?.substring(0, 100));
                }

                // Each scene should have narrationLines array (6 lines)
                if (scene.narrationLines && Array.isArray(scene.narrationLines)) {
                    const audioUrls = [];
                    const visemeDataArray = []; // Store viseme data for lip sync

                    console.log(`   📝 Generating audio for ${scene.narrationLines.length} narration lines...`);

                    for (let j = 0; j < scene.narrationLines.length; j++) {
                        const narrationText = scene.narrationLines[j];

                        try {
                            if (progressCallback) {
                                progressCallback({
                                    type: 'narration',
                                    scene: i + 1,
                                    line: j + 1,
                                    total: scenesToProcess,
                                    text: narrationText.substring(0, 50) + '...'
                                });
                            }

                            const result = await TTSIntegration.generateSpeech(narrationText, voice);
                            const audioUrl = result.audioUrl; // Extract audioUrl from result object
                            const visemeData = result.visemeData; // Extract viseme data for lip sync

                            // Validate audio duration (max 15 seconds)
                            try {
                                const validation = await TTSIntegration.validateAudioDuration(audioUrl, 15);
                                if (!validation.isValid) {
                                    console.warn(`   ⚠️ Audio duration (${validation.duration.toFixed(2)}s) exceeds 15 seconds limit`);
                                    // Still accept the audio but log the warning
                                }
                            } catch (validationError) {
                                console.warn(`   ⚠️ Could not validate audio duration:`, validationError.message);
                            }

                            audioUrls.push(audioUrl);
                            visemeDataArray.push(visemeData); // Store viseme data
                            console.log(`   ✅ Line ${j + 1}/${scene.narrationLines.length} generated`);
                            console.log(`   🔗 Audio URL type: ${typeof audioUrl}, length: ${audioUrl?.length || 0}, preview: ${audioUrl?.substring(0, 100)}...`);
                            console.log(`   🎭 Viseme data: ${visemeData ? visemeData.length + ' phonemes' : 'not available'}`);

                            // Small delay to avoid rate limiting
                            await this.delay(300);

                        } catch (error) {
                            console.error(`   ❌ Failed to generate audio for line ${j + 1}:`, error);
                            audioUrls.push(null); // Add null for failed generation
                            visemeDataArray.push(null); // Add null for failed viseme data
                        }
                    }

                    scenesWithAudio.push({
                        ...scene,
                        audioUrls: audioUrls,
                        visemeDataArray: visemeDataArray // Add viseme data to scene
                    });

                    console.log(`   ✅ Scene ${i + 1} complete: ${audioUrls.filter(url => url !== null).length}/${audioUrls.length} audio URLs generated`);
                    console.log(`   🎭 Viseme data: ${visemeDataArray.filter(v => v !== null).length}/${visemeDataArray.length} viseme arrays stored`);

                } else if (scene.narration) {
                    // Fallback: If narration is a single string, generate one audio URL
                    try {
                        if (progressCallback) {
                            progressCallback({
                                type: 'narration',
                                scene: i + 1,
                                line: 1,
                                total: scenesToProcess,
                                text: scene.narration.substring(0, 50) + '...'
                            });
                        }

                        const result = await TTSIntegration.generateSpeech(scene.narration, voice);
                        const audioUrl = result.audioUrl; // Extract audioUrl from result object
                        const visemeData = result.visemeData; // Extract viseme data for lip sync

                        // Validate audio duration (max 15 seconds)
                        try {
                            const validation = await TTSIntegration.validateAudioDuration(audioUrl, 15);
                            if (!validation.isValid) {
                                console.warn(`   ⚠️ Audio duration (${validation.duration.toFixed(2)}s) exceeds 15 seconds limit`);
                                // Still accept the audio but log the warning
                            }
                        } catch (validationError) {
                            console.warn(`   ⚠️ Could not validate audio duration:`, validationError.message);
                        }

                        scenesWithAudio.push({
                            ...scene,
                            audioUrls: [audioUrl],
                            visemeDataArray: [visemeData] // Add viseme data to scene
                        });
                        console.log(`   ✅ Scene ${i + 1} (single narration) complete`);
                        console.log(`   🎭 Viseme data: ${visemeData ? visemeData.length + ' phonemes' : 'not available'}`);

                        await this.delay(300);

                    } catch (error) {
                        console.error(`   ❌ Failed to generate audio for scene ${i + 1}:`, error);
                        scenesWithAudio.push({
                            ...scene,
                            audioUrls: [null],
                            visemeDataArray: [null]
                        });
                    }
                } else {
                    console.warn(`   ⚠️ Scene ${i + 1} has no narration, skipping audio generation`);
                    scenesWithAudio.push(scene);
                }
            } else {
                // Scenes beyond maxScenes (if story has more than 10 scenes)
                console.log(`\n⚠️ Scene ${i + 1} - SKIPPING (beyond maxScenes limit: ${maxScenes})`);
                scenesWithAudio.push({
                    ...scene,
                    audioUrls: [], // Empty array for scenes without audio
                    visemeDataArray: [] // Empty array for scenes without viseme data
                });
            }
        }

        const successCount = scenesWithAudio.reduce((count, scene) => {
            return count + (scene.audioUrls?.filter(url => url !== null).length || 0);
        }, 0);

        console.log(`\n🎵 ============================================`);
        console.log(`🎵 TTS GENERATION COMPLETE SUMMARY`);
        console.log(`🎵 ============================================`);
        console.log(`✅ Scenes processed: ${scenesToProcess}`);
        console.log(`✅ Audio files generated: ${successCount}`);
        console.log(`💰 Total API calls made: ${successCount}`);
        console.log(`🎵 ============================================\n`);

        return scenesWithAudio;
    },

    /**
     * Generate TTS audio for quiz questions
     * Only generates audio for "during" mode questions (not "after" mode)
     */
    async generateQuizAudio(gamification, voice, progressCallback) {
        if (!gamification) return null;

        console.log('\n🎯 Processing gamification questions...');

        const enhancedGamification = { ...gamification };

        // Generate audio for "during" story questions
        if (gamification.questionTiming === 'during' || gamification.questionTiming === 'both') {
            console.log('   📝 Generating audio for during-story questions...');
            enhancedGamification.duringQuestions = await this.generateDuringQuizAudio(
                gamification.duringQuestions,
                voice,
                progressCallback
            );
        }

        // Note: We don't generate audio for "after" story questions
        // as those appear after the story is complete

        return enhancedGamification;
    },

    /**
     * Generate audio for "during story" quiz questions
     * These are the questions that appear between scenes
     */
    async generateDuringQuizAudio(duringQuestions, voice, progressCallback) {
        if (!duringQuestions || duringQuestions.length === 0) {
            console.log('   ℹ️ No during-story questions to process');
            return [];
        }

        console.log(`   🎯 Generating audio for ${duringQuestions.length} during-story questions...`);
        const questionsWithAudio = [];

        for (let i = 0; i < duringQuestions.length; i++) {
            const question = duringQuestions[i];

            try {
                if (progressCallback) {
                    progressCallback({
                        type: 'quiz',
                        question: i + 1,
                        total: duringQuestions.length,
                        text: question.question
                    });
                }

                // Generate audio for the question text
                const result = await TTSIntegration.generateSpeech(question.question, voice);
                const questionAudioUrl = result.audioUrl; // Extract audioUrl from result object

                // Validate audio duration (max 15 seconds)
                try {
                    const validation = await TTSIntegration.validateAudioDuration(questionAudioUrl, 15);
                    if (!validation.isValid) {
                        console.warn(`      ⚠️ Quiz audio duration (${validation.duration.toFixed(2)}s) exceeds 15 seconds limit`);
                        // Still accept the audio but log the warning
                    }
                } catch (validationError) {
                    console.warn(`      ⚠️ Could not validate quiz audio duration:`, validationError.message);
                }

                questionsWithAudio.push({
                    ...question,
                    audioUrl: questionAudioUrl
                });

                console.log(`      ✅ Question ${i + 1}/${duringQuestions.length} audio generated`);
                await this.delay(300);

            } catch (error) {
                console.error(`      ❌ Failed to generate audio for question ${i + 1}:`, error);
                questionsWithAudio.push({
                    ...question,
                    audioUrl: null
                });
            }
        }

        const successCount = questionsWithAudio.filter(q => q.audioUrl !== null).length;
        console.log(`   ✅ Quiz audio complete: ${successCount}/${duringQuestions.length} generated`);

        return questionsWithAudio;
    },

    /**
     * Get voice ID mapping
     */
    getVoiceId(voiceName) {
        const voiceIds = {
            'Rachel': '21m00Tcm4TlvDq8ikWAM',
            'Amara': 'GEcKlrQ1MWkJKoc7UTJd',
            'Lily': 'qBDvhofpxp92JgXJxDjB',
            'Rod': 'yXCvTL13fpQ4Uuqriplz',
            'Aaron': 'BVirrGoC94ipnqfb5ewn'
        };
        return voiceIds[voiceName] || voiceIds['Rachel'];
    },

    /**
     * Utility delay function - Uses worker-based timing to prevent tab throttling
     */
    delay(ms) {
        // Use timerManager if available (prevents throttling), otherwise fall back to setTimeout
        if (window.timerManager && typeof window.timerManager.delay === 'function') {
            return window.timerManager.delay(ms);
        }
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Extract narration lines from story text
     * Parses story format to extract 6 narration lines per scene
     */
    extractNarrationLines(storyText, sceneNumber) {
        const lines = [];
        const scenePattern = new RegExp(
            `Scene ${sceneNumber}[\\s\\S]*?Narration:([\\s\\S]*?)(?:Characters in Scene:|Scene ${sceneNumber + 1}|$)`,
            'i'
        );

        const match = storyText.match(scenePattern);
        if (match && match[1]) {
            const narrationText = match[1].trim();
            // Extract numbered lines (1. ... 2. ... 3. ...)
            const lineMatches = narrationText.match(/\d+\.\s*([^\n]+)/g);

            if (lineMatches) {
                lineMatches.forEach(line => {
                    const cleanedLine = line.replace(/^\d+\.\s*/, '').trim();
                    // Remove transition markers
                    const finalLine = cleanedLine.replace(/\(→\s*Transition:.*?\)/, '').trim();
                    if (finalLine) {
                        lines.push(finalLine);
                    }
                });
            }
        }

        return lines;
    },

    /**
     * Parse story data and extract all narration lines for all scenes
     * Useful for converting old format stories to new format with narrationLines
     */
    parseStoryNarrationLines(storyText, sceneCount = 10) {
        const allSceneLines = [];

        for (let i = 1; i <= sceneCount; i++) {
            const lines = this.extractNarrationLines(storyText, i);
            allSceneLines.push({
                scene: i,
                narrationLines: lines
            });
        }

        return allSceneLines;
    }
};

// Make available globally
window.TTSStoryGenerator = TTSStoryGenerator;

console.log('✅ TTS Story Generator module loaded');
