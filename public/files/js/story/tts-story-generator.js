

const TTSStoryGenerator = {
    
    settings: {
        model: 'eleven_flash_v2_5',
        speed: 0.80,
        stability: 0.33,
        similarityBoost: 1.0,
        style: 0.0,
        speakerBoost: true
    },

    
    async generateAllStoryAudio(storyData, selectedVoice = 'Rachel', progressCallback = null) {
        console.log('🎤 Starting comprehensive TTS generation...');
        console.log(`📊 Voice: ${selectedVoice}`);
        console.log(`📊 Total scenes: ${storyData.scenes?.length || 0}`);

        try {
            
            const scenesWithAudio = await this.generateScenesAudio(
                storyData.scenes,
                selectedVoice,
                progressCallback
            );

            
            
            console.log('ℹ️ Skipping TTS generation for quiz questions (narration only mode)');

            
            return {
                ...storyData,
                scenes: scenesWithAudio,
                gamification: storyData.gamification, 
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

        
        const maxScenes = 10; 
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

                
                if (scene.narrationLines && Array.isArray(scene.narrationLines)) {
                    const audioUrls = [];
                    const visemeDataArray = []; 

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
                            const audioUrl = result.audioUrl; 
                            const visemeData = result.visemeData; 

                            
                            try {
                                const validation = await TTSIntegration.validateAudioDuration(audioUrl, 15);
                                if (!validation.isValid) {
                                    console.warn(`   ⚠️ Audio duration (${validation.duration.toFixed(2)}s) exceeds 15 seconds limit`);
                                    
                                }
                            } catch (validationError) {
                                console.warn(`   ⚠️ Could not validate audio duration:`, validationError.message);
                            }

                            audioUrls.push(audioUrl);
                            visemeDataArray.push(visemeData); 
                            console.log(`   ✅ Line ${j + 1}/${scene.narrationLines.length} generated`);
                            console.log(`   🔗 Audio URL type: ${typeof audioUrl}, length: ${audioUrl?.length || 0}, preview: ${audioUrl?.substring(0, 100)}...`);
                            console.log(`   🎭 Viseme data: ${visemeData ? visemeData.length + ' phonemes' : 'not available'}`);

                            
                            await this.delay(300);

                        } catch (error) {
                            console.error(`   ❌ Failed to generate audio for line ${j + 1}:`, error);
                            audioUrls.push(null); 
                            visemeDataArray.push(null); 
                        }
                    }

                    scenesWithAudio.push({
                        ...scene,
                        audioUrls: audioUrls,
                        visemeDataArray: visemeDataArray 
                    });

                    console.log(`   ✅ Scene ${i + 1} complete: ${audioUrls.filter(url => url !== null).length}/${audioUrls.length} audio URLs generated`);
                    console.log(`   🎭 Viseme data: ${visemeDataArray.filter(v => v !== null).length}/${visemeDataArray.length} viseme arrays stored`);

                } else if (scene.narration) {
                    
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
                        const audioUrl = result.audioUrl; 
                        const visemeData = result.visemeData; 

                        
                        try {
                            const validation = await TTSIntegration.validateAudioDuration(audioUrl, 15);
                            if (!validation.isValid) {
                                console.warn(`   ⚠️ Audio duration (${validation.duration.toFixed(2)}s) exceeds 15 seconds limit`);
                                
                            }
                        } catch (validationError) {
                            console.warn(`   ⚠️ Could not validate audio duration:`, validationError.message);
                        }

                        scenesWithAudio.push({
                            ...scene,
                            audioUrls: [audioUrl],
                            visemeDataArray: [visemeData] 
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
                
                console.log(`\n⚠️ Scene ${i + 1} - SKIPPING (beyond maxScenes limit: ${maxScenes})`);
                scenesWithAudio.push({
                    ...scene,
                    audioUrls: [], 
                    visemeDataArray: [] 
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

    
    async generateQuizAudio(gamification, voice, progressCallback) {
        if (!gamification) return null;

        console.log('\n🎯 Processing gamification questions...');

        const enhancedGamification = { ...gamification };

        
        if (gamification.questionTiming === 'during' || gamification.questionTiming === 'both') {
            console.log('   📝 Generating audio for during-story questions...');
            enhancedGamification.duringQuestions = await this.generateDuringQuizAudio(
                gamification.duringQuestions,
                voice,
                progressCallback
            );
        }

        
        

        return enhancedGamification;
    },

    
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

                
                const result = await TTSIntegration.generateSpeech(question.question, voice);
                const questionAudioUrl = result.audioUrl; 

                
                try {
                    const validation = await TTSIntegration.validateAudioDuration(questionAudioUrl, 15);
                    if (!validation.isValid) {
                        console.warn(`      ⚠️ Quiz audio duration (${validation.duration.toFixed(2)}s) exceeds 15 seconds limit`);
                        
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

    
    delay(ms) {
        
        if (window.timerManager && typeof window.timerManager.delay === 'function') {
            return window.timerManager.delay(ms);
        }
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    
    extractNarrationLines(storyText, sceneNumber) {
        const lines = [];
        const scenePattern = new RegExp(
            `Scene ${sceneNumber}[\\s\\S]*?Narration:([\\s\\S]*?)(?:Characters in Scene:|Scene ${sceneNumber + 1}|$)`,
            'i'
        );

        const match = storyText.match(scenePattern);
        if (match && match[1]) {
            const narrationText = match[1].trim();
            
            const lineMatches = narrationText.match(/\d+\.\s*([^\n]+)/g);

            if (lineMatches) {
                lineMatches.forEach(line => {
                    const cleanedLine = line.replace(/^\d+\.\s*/, '').trim();
                    
                    const finalLine = cleanedLine.replace(/\(→\s*Transition:.*?\)/, '').trim();
                    if (finalLine) {
                        lines.push(finalLine);
                    }
                });
            }
        }

        return lines;
    },

    
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


window.TTSStoryGenerator = TTSStoryGenerator;

console.log('✅ TTS Story Generator module loaded');
