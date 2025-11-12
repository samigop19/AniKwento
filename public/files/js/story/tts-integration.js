

const TTSIntegration = {
    apiEndpoint: '/source/handlers/elevenlabs_tts.php',
    audioCache: new Map(), 
    visemeCache: new Map(), 

    
    async generateSpeech(text, voice = 'Rachel') {
        
        if (!text || text.trim() === '') {
            console.error('❌ TTS Error: Empty text provided');
            throw new Error('Cannot generate TTS for empty text');
        }

        if (!voice) {
            console.error('❌ TTS Error: No voice specified, defaulting to Rachel');
            voice = 'Rachel';
        }

        
        const cacheKey = `${voice}_${text}`;

        
        if (this.audioCache.has(cacheKey)) {
            console.log('🎵 Using cached audio for:', text.substring(0, 50) + '...');
            return {
                audioUrl: this.audioCache.get(cacheKey),
                visemeData: this.visemeCache.get(cacheKey) || null
            };
        }

        console.log(`\n🎤 ============ TTS GENERATION REQUEST ============`);
        console.log(`   📝 Text: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
        console.log(`   🎙️ Voice: ${voice}`);
        console.log(`   📍 Endpoint: ${this.apiEndpoint}`);
        console.log(`   🌐 Full URL: ${window.location.origin}${window.location.pathname.replace(/[^/]*$/, '')}${this.apiEndpoint}`);
        console.log(`=================================================\n`);

        try {
            console.log('   🚀 Sending fetch request...');
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    voice: voice
                })
            });

            console.log(`   📥 Response status: ${response.status} ${response.statusText}`);
            console.log(`   📥 Response headers:`, {
                contentType: response.headers.get('content-type'),
                contentLength: response.headers.get('content-length')
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`   ❌ Error response body:`, errorText);

                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    errorData = { error: errorText };
                }

                throw new Error(errorData.error || `TTS generation failed with status ${response.status}`);
            }

            const responseText = await response.text();
            console.log(`   📦 Raw response (first 200 chars):`, responseText.substring(0, 200));

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error(`   ❌ Failed to parse JSON response:`, e);
                throw new Error('Invalid JSON response from TTS API');
            }

            console.log('   📊 Parsed response:', {
                success: data.success,
                hasAudio: !!data.audio,
                audioLength: data.audio?.length || 0,
                hasVisemeData: data.has_viseme_data || false,
                visemeCount: data.viseme_data?.length || 0
            });

            if (!data.success) {
                throw new Error('TTS API returned success=false');
            }

            if (!data.audio) {
                throw new Error('No audio data in TTS API response');
            }

            
            const audioDataUrl = `data:audio/mpeg;base64,${data.audio}`;

            
            const visemeData = data.viseme_data || null;

            
            this.audioCache.set(cacheKey, audioDataUrl);
            if (visemeData) {
                this.visemeCache.set(cacheKey, visemeData);
                console.log('   ✅ Cached viseme data with', visemeData.length, 'phonemes');
            }

            console.log(`   ✅ TTS generated successfully!`);
            console.log(`   🎵 Audio data URL length: ${audioDataUrl.length} characters`);
            console.log(`=================================================\n`);

            return {
                audioUrl: audioDataUrl,
                visemeData: visemeData
            };

        } catch (error) {
            console.error(`\n❌ ========== TTS GENERATION FAILED ==========`);
            console.error(`   Error type: ${error.constructor.name}`);
            console.error(`   Error message: ${error.message}`);
            console.error(`   Error stack:`, error.stack);
            console.error(`==============================================\n`);
            throw error;
        }
    },

    
    async generateMultipleSpeech(narrationLines, voice = 'Rachel', progressCallback = null) {
        const audioUrls = [];
        const visemeDataArray = [];
        const total = narrationLines.length;

        for (let i = 0; i < narrationLines.length; i++) {
            const text = narrationLines[i];

            try {
                const result = await this.generateSpeech(text, voice);
                audioUrls.push(result.audioUrl);
                visemeDataArray.push(result.visemeData);

                if (progressCallback) {
                    progressCallback(i + 1, total);
                }

                
                if (i < narrationLines.length - 1) {
                    await this.delay(300);
                }

            } catch (error) {
                console.error(`❌ Failed to generate audio for line ${i + 1}:`, error);
                
                audioUrls.push(null);
                visemeDataArray.push(null);
            }
        }

        return {
            audioUrls,
            visemeDataArray
        };
    },

    
    async generateStoryAudio(scenes, voice = 'Rachel', progressCallback = null) {
        const totalLines = scenes.reduce((sum, scene) => {
            return sum + (scene.narrationLines?.length || 0);
        }, 0);

        let processedLines = 0;
        let successCount = 0;
        let failCount = 0;
        const scenesWithAudio = [];

        for (const scene of scenes) {
            const sceneWithAudio = { ...scene };

            if (scene.narrationLines && scene.narrationLines.length > 0) {
                sceneWithAudio.audioUrls = [];
                sceneWithAudio.visemeDataArray = [];

                for (const line of scene.narrationLines) {
                    try {
                        const result = await this.generateSpeech(line, voice);
                        sceneWithAudio.audioUrls.push(result.audioUrl);
                        sceneWithAudio.visemeDataArray.push(result.visemeData);
                        successCount++;

                        processedLines++;
                        if (progressCallback) {
                            progressCallback(processedLines, totalLines);
                        }

                        
                        await this.delay(300);

                    } catch (error) {
                        console.error('❌ Failed to generate audio for narration line:', error);
                        sceneWithAudio.audioUrls.push(null);
                        sceneWithAudio.visemeDataArray.push(null);
                        failCount++;
                        processedLines++;

                        
                        if (progressCallback) {
                            progressCallback(processedLines, totalLines);
                        }
                    }
                }
            }

            scenesWithAudio.push(sceneWithAudio);
        }

        console.log(`🎵 TTS Generation Complete: ${successCount} success, ${failCount} failed out of ${totalLines} total`);
        return scenesWithAudio;
    },

    
    async validateAudioDuration(audioDataUrl, maxDuration = 15) {
        return new Promise((resolve, reject) => {
            if (!audioDataUrl) {
                reject(new Error('No audio URL provided for validation'));
                return;
            }

            const audio = new Audio();
            let timeoutId;

            
            timeoutId = setTimeout(() => {
                console.warn(`   ⚠️ Audio validation timeout - skipping duration check`);
                resolve({
                    isValid: true, 
                    duration: 0
                });
            }, 5000);

            audio.addEventListener('loadedmetadata', () => {
                clearTimeout(timeoutId);
                const duration = audio.duration;
                const isValid = duration <= maxDuration;

                console.log(`   ⏱️ Audio duration: ${duration.toFixed(2)}s (Max: ${maxDuration}s) - ${isValid ? '✅ Valid' : '❌ Exceeds limit'}`);

                resolve({
                    isValid,
                    duration
                });
            }, { once: true });

            audio.addEventListener('error', (e) => {
                clearTimeout(timeoutId);
                console.warn(`   ⚠️ Audio validation error - skipping duration check`);
                resolve({
                    isValid: true, 
                    duration: 0
                });
            }, { once: true });

            audio.src = audioDataUrl;
            
            audio.load();
        });
    },

    
    async preloadAudio(audioDataUrl) {
        return new Promise((resolve, reject) => {
            if (!audioDataUrl) {
                reject(new Error('No audio URL provided'));
                return;
            }

            const audio = new Audio();
            audio.preload = 'auto';

            audio.addEventListener('canplaythrough', () => {
                resolve(audio);
            }, { once: true });

            audio.addEventListener('error', (e) => {
                reject(new Error('Failed to load audio'));
            }, { once: true });

            audio.src = audioDataUrl;
        });
    },

    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    
    clearCache() {
        this.audioCache.clear();
        console.log('🗑️ TTS audio cache cleared');
    }
};


window.TTSIntegration = TTSIntegration;
