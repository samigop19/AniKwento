class StoryboardGenerator {
    constructor() {
        this.apiKey = null;
        this.apiProvider = 'openai'; // 'openai' or 'google'
        this.currentStory = null;
        this.characters = [];
        this.scenes = [];
        this.generatedImages = [];
        this.themes = [
            'Friendship Forever',
            'Magical Adventures', 
            'Brave Little Heroes',
            'Animal Pals',
            'Exploring New Places',
            'Kindness Wins',
            'Family Fun'
        ];
        this.usedCharacterNames = new Set();
    }

    setApiKey(apiKey, provider = 'openai') {
        this.apiKey = apiKey;
        this.apiProvider = provider;
    }

    async generateStory() {
        if (!this.apiKey) {
            throw new Error('API key not configured');
        }

        const randomTheme = this.themes[Math.floor(Math.random() * this.themes.length)];
        
        const storyPrompt = `Write a 5-minute story suitable for a 2D storyboard, following these requirements:
- Divide the story into 45–60 scenes.
- Each scene should consist of only 1–2 sentences of narration or dialogue (sufficient for 5–8 seconds of spoken audio).
- Center the story on the theme: ${randomTheme}
- Begin with an ordinary situation and escalate to a surprising, emotional, or powerful conclusion.
- For each character: use a unique first name that is not repeated elsewhere in the story.
- Each scene should name all involved characters (using full names or IDs).
- The tone should be emotional, cinematic, and perfectly suited for visual storytelling.
- Do not write full paragraphs—keep each scene's narration extremely succinct, as if captioning storyboard frames.

Output Format:
- Title of the story
- A numbered list where for each scene, you include:
    - The scene number
    - Narration or dialogue (1–2 sentences max)
    - Character(s) in the scene (full names or unique IDs)

Important constraints:
- Do not exceed two sentences per scene.
- Verify all character names are unique throughout.
- Ensure scenes logically escalate from ordinary to powerful emotion or surprise.

When reasoning, first decide on the theme, story structure, and character names. Then, compose each scene in order, escalating tension or emotion. Only after all scenes are mapped, write out the final structured list as specified above.

Example output (short excerpt for demonstration; actual story should be longer and follow the pattern):

Title: Magical Seeds of Hope

1. Scene 1
   - "On a quiet morning, Riley watched dandelions sway beneath the window."  
   - Characters: Riley
2. Scene 2
   - "Eli knocked at the door, holding a mysterious blue pouch."  
   - Characters: Riley, Eli
3. Scene 3
   - "'Want to see something magic?' Eli whispered, eyes wide."  
   - Characters: Riley, Eli

(Real story should continue for 45-60 scenes, following the exact output structure.)

Reminder:  
- Create 45–60 micro-scenes, each with 1–2 sentences and unique character names.
- Output must be a structured list as shown, not full paragraphs.
- Theme, structure, and unique names must be determined before storywriting; escalate the situation for emotional or cinematic impact.`;

        return await this.makeAPIRequestWithRetry(storyPrompt, 'story generation');
    }

    async makeAPIRequestWithRetry(prompt, operation, maxRetries = 3) {
        if (this.apiProvider === 'openai') {
            return await this.makeOpenAIRequest(prompt, operation, maxRetries);
        } else {
            return await this.makeGoogleAIRequest(prompt, operation, maxRetries);
        }
    }

    async makeOpenAIRequest(prompt, operation, maxRetries = 3) {
        const models = ['gpt-4o-mini', 'gpt-3.5-turbo'];
        
        for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
            const model = models[modelIndex];
            
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    console.log(`${operation} - Attempt ${attempt}/${maxRetries} with model ${model}`);
                    
                    const response = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.apiKey}`
                        },
                        body: JSON.stringify({
                            model: model,
                            messages: [
                                {
                                    role: 'user',
                                    content: prompt
                                }
                            ],
                            max_tokens: 4000,
                            temperature: 0.7
                        })
                    });

                    console.log(`Response status: ${response.status}`);
                    
                    if (response.status === 503) {
                        console.log(`OpenAI API is overloaded, waiting before retry...`);
                        if (attempt < maxRetries) {
                            await this.delay(2000 * attempt);
                            continue;
                        } else if (modelIndex < models.length - 1) {
                            console.log(`Trying fallback model: ${models[modelIndex + 1]}`);
                            break;
                        }
                    }
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('API Error Response:', errorText);
                        
                        if (response.status === 429) {
                            console.log('Rate limited, waiting before retry...');
                            if (attempt < maxRetries) {
                                await this.delay(5000 * attempt);
                                continue;
                            }
                        }
                        
                        throw new Error(`API Error ${response.status}: ${errorText}`);
                    }

                    const data = await response.json();
                    console.log('API Response received');
                    
                    if (data.error) {
                        throw new Error(`OpenAI API Error: ${data.error.message}`);
                    }
                    
                    if (data.choices && data.choices[0] && data.choices[0].message) {
                        const text = data.choices[0].message.content;
                        console.log(`${operation} successful with model ${model}`);
                        
                        if (operation === 'story generation') {
                            this.currentStory = this.parseStoryResponse(text);
                            return this.currentStory;
                        } else {
                            return text.trim();
                        }
                    } else {
                        console.error('Unexpected API response structure:', data);
                        throw new Error(`Invalid response from OpenAI API. Response: ${JSON.stringify(data)}`);
                    }
                    
                } catch (error) {
                    console.error(`${operation} attempt ${attempt} failed:`, error);
                    
                    if (attempt === maxRetries && modelIndex === models.length - 1) {
                        throw error;
                    }
                    
                    if (attempt < maxRetries) {
                        await this.delay(1000 * attempt);
                    }
                }
            }
        }
        
        throw new Error(`All retry attempts failed for ${operation}`);
    }

    async makeGoogleAIRequest(prompt, operation, maxRetries = 3) {
        const models = ['gemini-1.5-flash', 'gemini-pro'];
        
        for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
            const model = models[modelIndex];
            
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    console.log(`${operation} - Attempt ${attempt}/${maxRetries} with model ${model}`);
                    
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            contents: [{
                                parts: [{
                                    text: prompt
                                }]
                            }]
                        })
                    });

                    console.log(`Response status: ${response.status}`);
                    
                    if (response.status === 503) {
                        console.log(`Model ${model} is overloaded, waiting before retry...`);
                        if (attempt < maxRetries) {
                            await this.delay(2000 * attempt);
                            continue;
                        } else if (modelIndex < models.length - 1) {
                            console.log(`Trying fallback model: ${models[modelIndex + 1]}`);
                            break;
                        }
                    }
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('API Error Response:', errorText);
                        
                        if (response.status === 429) {
                            console.log('Rate limited, waiting before retry...');
                            if (attempt < maxRetries) {
                                await this.delay(5000 * attempt);
                                continue;
                            }
                        }
                        
                        throw new Error(`API Error ${response.status}: ${errorText}`);
                    }

                    const data = await response.json();
                    console.log('API Response received');
                    
                    if (data.error) {
                        throw new Error(`Google AI API Error: ${data.error.message}`);
                    }
                    
                    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                        const text = data.candidates[0].content.parts[0].text;
                        console.log(`${operation} successful with model ${model}`);
                        
                        if (operation === 'story generation') {
                            this.currentStory = this.parseStoryResponse(text);
                            return this.currentStory;
                        } else {
                            return text.trim();
                        }
                    } else {
                        console.error('Unexpected API response structure:', data);
                        throw new Error(`Invalid response from Google AI API. Response: ${JSON.stringify(data)}`);
                    }
                    
                } catch (error) {
                    console.error(`${operation} attempt ${attempt} failed:`, error);
                    
                    if (attempt === maxRetries && modelIndex === models.length - 1) {
                        throw error;
                    }
                    
                    if (attempt < maxRetries) {
                        await this.delay(1000 * attempt);
                    }
                }
            }
        }
        
        throw new Error(`All retry attempts failed for ${operation}`);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    parseStoryResponse(storyText) {
        console.log('=== RAW STORY TEXT ===');
        console.log(storyText);
        console.log('=== END RAW TEXT ===');
        
        const lines = storyText.split('\n').filter(line => line.trim());
        console.log('=== PARSED LINES ===');
        lines.forEach((line, index) => {
            console.log(`Line ${index}: "${line}"`);
        });
        console.log('=== END LINES ===');
        
        const story = {
            title: '',
            scenes: [],
            totalDuration: 0
        };

        let titleFound = false;
        let i = 0;

        // First, find and extract the title
        while (i < lines.length && !titleFound) {
            const line = lines[i].trim();
            
            // Look for title patterns
            if (line.toLowerCase().includes('title:')) {
                story.title = line.replace(/title:/i, '').replace(/[*#]/g, '').trim();
                titleFound = true;
            } else if (!line.match(/^\d+\./) && !line.includes('Scene') && line.length > 5 && i < 3) {
                // If it's in the first few lines, not numbered, and substantial, likely a title
                story.title = line.replace(/[*#]/g, '').trim();
                titleFound = true;
            }
            i++;
        }

        // Reset index to parse scenes from the beginning
        i = 0;
        
        while (i < lines.length) {
            const line = lines[i].trim();
            
            // Look for numbered scenes (1., 2., etc.)
            const sceneMatch = line.match(/^(\d+)\./);
            if (sceneMatch) {
                const sceneNumber = parseInt(sceneMatch[1]);
                let narration = '';
                let characters = [];
                
                // Try different parsing strategies for the current line and following lines
                
                // Strategy 1: All content in one line after the number
                const singleLineContent = line.replace(/^\d+\.\s*/, '').trim();
                if (singleLineContent && !singleLineContent.match(/^Scene\s*\d*$/i)) {
                    // Extract narration (everything before " - Characters:" or just everything)
                    const parts = singleLineContent.split(/\s*-\s*Characters?:\s*/i);
                    narration = parts[0].replace(/^["']|["']$/g, '').trim();
                    
                    if (parts[1]) {
                        const charactersStr = parts[1].trim();
                        if (charactersStr.toLowerCase() !== 'none') {
                            characters = charactersStr
                                .split(',')
                                .map(char => char.trim())  
                                .filter(char => char && char.toLowerCase() !== 'none')
                                .map(char => char.split(' ')[0]); // Take first name only
                        }
                    }
                }
                
                // Strategy 2: Multi-line format - look at next lines
                if (!narration) {
                    let j = i + 1;
                    
                    // Look for narration in next lines
                    while (j < lines.length) {
                        const nextLine = lines[j].trim();
                        
                        // Stop if we hit another numbered scene
                        if (nextLine.match(/^\d+\./)) {
                            break;
                        }
                        
                        // If line contains narration indicators
                        if (nextLine.match(/^[-•"']/) || 
                            (nextLine.includes('"') && !nextLine.toLowerCase().includes('characters:'))) {
                            narration = nextLine.replace(/^[-•"']\s*/, '').replace(/["']$/, '').trim();
                        }
                        // If line mentions characters
                        else if (nextLine.toLowerCase().includes('characters:')) {
                            const charactersMatch = nextLine.match(/characters?:\s*(.+)/i);
                            if (charactersMatch) {
                                const charactersStr = charactersMatch[1].trim();
                                if (charactersStr.toLowerCase() !== 'none') {
                                    characters = charactersStr
                                        .split(',')
                                        .map(char => char.trim())
                                        .filter(char => char && char.toLowerCase() !== 'none')
                                        .map(char => char.split(' ')[0]);
                                }
                            }
                        }
                        // If it's just plain text and we don't have narration yet
                        else if (!narration && nextLine.length > 10 && !nextLine.toLowerCase().includes('scene')) {
                            narration = nextLine.trim();
                        }
                        
                        j++;
                    }
                    
                    // Skip to the processed lines
                    i = j - 1;
                }
                
                // Strategy 3: Extract characters from narration if not found explicitly
                if (characters.length === 0 && narration) {
                    characters = this.extractCharactersFromScene(narration);
                }
                
                // Create scene if we have valid narration
                if (narration && narration.length > 0) {
                    const sceneData = {
                        number: sceneNumber,
                        duration: this.getRandomDuration(),
                        narration: narration,
                        characters: characters
                    };
                    
                    story.scenes.push(sceneData);
                    story.totalDuration += sceneData.duration;
                    
                    // Track character names
                    sceneData.characters.forEach(char => {
                        this.usedCharacterNames.add(char.toLowerCase());
                    });
                    
                    console.log(`Parsed Scene ${sceneNumber}: "${narration}" with characters: [${characters.join(', ')}]`);
                } else {
                    console.log(`Failed to parse Scene ${sceneNumber}: No valid narration found`);
                }
            }
            
            i++;
        }

        // Fallback parsing if no scenes found
        if (story.scenes.length === 0) {
            console.log('No scenes found with primary parser, trying alternative format...');
            this.parseAlternativeFormat(storyText, story);
        }

        console.log(`=== PARSING COMPLETE ===`);
        console.log(`Title: "${story.title}"`);
        console.log(`Scenes found: ${story.scenes.length}`);
        console.log(`Total duration: ${story.totalDuration}s`);

        this.scenes = story.scenes;
        return story;
    }

    parseAlternativeFormat(storyText, story) {
        console.log('=== ALTERNATIVE PARSING ===');
        const lines = storyText.split('\n').filter(line => line.trim());
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Look for any numbered content
            const sceneMatch = line.match(/^(\d+)\.\s*(.+)/);
            if (sceneMatch) {
                const sceneNumber = parseInt(sceneMatch[1]);
                let narration = sceneMatch[2].trim();
                
                // Clean up common patterns
                narration = narration
                    .replace(/^Scene\s*\d*[-:]*\s*/i, '')  // Remove "Scene X:" prefixes
                    .replace(/^["']|["']$/g, '')           // Remove surrounding quotes
                    .trim();
                
                // Skip if narration is empty or just "Scene"
                if (narration && narration.length > 3 && !narration.match(/^Scene\s*$/i)) {
                    const characters = this.extractCharactersFromScene(narration);
                    
                    const sceneData = {
                        number: sceneNumber,
                        duration: this.getRandomDuration(),
                        narration: narration,
                        characters: characters
                    };
                    
                    story.scenes.push(sceneData);
                    story.totalDuration += sceneData.duration;
                    
                    sceneData.characters.forEach(char => {
                        this.usedCharacterNames.add(char.toLowerCase());
                    });
                    
                    console.log(`Alternative parser - Scene ${sceneNumber}: "${narration}"`);
                }
            }
        }
        
        console.log(`Alternative parser found ${story.scenes.length} scenes`);
    }

    getRandomDuration() {
        // Generate random duration between 3-8 seconds with weighted distribution
        const weights = [1, 2, 3, 3, 2, 1]; // 3s=1, 4s=2, 5s=3, 6s=3, 7s=2, 8s=1
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return i + 3; // 3-8 seconds
            }
        }
        return 5; // fallback
    }

    extractCharactersFromScene(sceneText) {
        const characters = [];
        const namePattern = /\b[A-Z][a-z]+\b/g;
        const matches = sceneText.match(namePattern);
        
        if (matches) {
            matches.forEach(match => {
                if (!['The', 'A', 'An', 'In', 'On', 'At', 'By', 'For', 'With', 'From', 'To'].includes(match)) {
                    if (!characters.includes(match)) {
                        characters.push(match);
                    }
                }
            });
        }
        
        return characters;
    }

    async generateCharacterDescriptions() {
        if (!this.currentStory || !this.apiKey) {
            throw new Error('Story not generated or API key not set');
        }

        const allCharacters = new Set();
        this.scenes.forEach(scene => {
            scene.characters.forEach(char => allCharacters.add(char));
        });

        this.characters = [];

        for (const characterName of allCharacters) {
            const characterPrompt = `I need a character description for ${characterName}. Please describe their:

- Facial features
- Body type
- Face shape
- Hair style
- Age
- Skin tone
- Typical clothing
- Possible facial expressions or emotional states
- Any outfit or visual variations across scenes

Make this suitable for AI image generation (Pollinations AI). Keep it detailed but concise.`;

            try {
                console.log(`Generating description for character: ${characterName}`);
                const description = await this.makeAPIRequestWithRetry(characterPrompt, `character description for ${characterName}`);
                
                this.characters.push({
                    name: characterName,
                    description: description
                });
                console.log(`Generated description for ${characterName}`);
                
            } catch (error) {
                console.error(`Error generating description for ${characterName}:`, error);
                // Continue with other characters even if one fails
            }
        }

        return this.characters;
    }

    async generateCharacterImagePrompt(characterName) {
        const character = this.characters.find(char => char.name === characterName);
        if (!character || !this.apiKey) {
            return null;
        }

        const promptGenerationText = `Create a single AI image prompt that can be used to generate an image of ${characterName} using Pollinations AI model. Include:

- Physical appearance
- Outfit
- Mood or expression
- Camera framing (e.g., portrait, waist-up, full body)
- Scene lighting (if applicable)

Return only the prompt. Do not generate the image or include any narrative.

Character description: ${character.description}`;

        try {
            return await this.makeAPIRequestWithRetry(promptGenerationText, `character image prompt for ${characterName}`);
        } catch (error) {
            console.error(`Error generating image prompt for ${characterName}:`, error);
            return null;
        }
    }

    async generateSceneImagePrompt(sceneNumber) {
        const scene = this.scenes.find(s => s.number === sceneNumber);
        if (!scene || !this.apiKey) {
            return null;
        }

        let characterDescriptions = '';
        scene.characters.forEach(charName => {
            const character = this.characters.find(char => char.name === charName);
            if (character) {
                characterDescriptions += `- ${charName}: ${character.description.substring(0, 150)}...\n`;
            }
        });

        const scenePromptText = `Create a visual prompt for Scene ${sceneNumber} using this format:

Scene: ${scene.narration}

Characters in scene:
${characterDescriptions}

Location: [Derived from narration if available]
Mood: [Emotion or tension level in the scene]

Format it as a Pollination prompt. Include visual setting, characters, facial expressions, poses, and lighting. Aim for a cinematic 2D illustration.

Example:
"A cozy diner at sunrise. Joe (elderly white male, short gray hair, apron, frustrated expression) argues with Marcus (Black male, early 40s, military jacket, calm and serious). Warm lighting, tension in the air, vintage booth in the background."`;

        try {
            console.log(`Generating scene prompt for scene ${sceneNumber}`);
            return await this.makeAPIRequestWithRetry(scenePromptText, `scene image prompt for scene ${sceneNumber}`);
        } catch (error) {
            console.error(`Error generating scene prompt for scene ${sceneNumber}:`, error);
            return null;
        }
    }

    async generateSceneImage(sceneNumber) {
        const imagePrompt = await this.generateSceneImagePrompt(sceneNumber);
        if (!imagePrompt) {
            throw new Error(`Could not generate image prompt for scene ${sceneNumber}`);
        }

        const imageUrl = await this.generateImageWithFallback(imagePrompt, sceneNumber);
        
        return {
            sceneNumber: sceneNumber,
            prompt: imagePrompt,
            imageUrl: imageUrl
        };
    }

    async generateImageWithFallback(prompt, sceneNumber, maxRetries = 5) {
        const fallbackStrategies = [
            prompt, // Original prompt
            prompt + ' storybook illustration', // Add context
            prompt + ' children story art', // Different context
            prompt + ' cartoon style', // Style modifier
            prompt + ' simple illustration', // Simpler approach
            `Scene ${sceneNumber} illustration: ${prompt.substring(0, 100)}`, // Truncated with context
            `storybook scene number ${sceneNumber}`, // Basic fallback
        ];
        
        for (let attempt = 0; attempt < maxRetries && attempt < fallbackStrategies.length; attempt++) {
            try {
                const currentPrompt = fallbackStrategies[attempt];
                const encodedPrompt = encodeURIComponent(currentPrompt);
                const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1920&height=1024&nologo=true`;
                
                // Test if the image loads properly with extended timeout
                const isValid = await this.testImageLoad(imageUrl, `Scene ${sceneNumber} attempt ${attempt + 1}`, 15000);
                
                if (isValid) {
                    console.log(`✅ Scene ${sceneNumber} image generated successfully on attempt ${attempt + 1} with prompt: "${currentPrompt}"`);
                    return imageUrl;
                }
                
                console.log(`⚠️ Scene ${sceneNumber} attempt ${attempt + 1} failed, trying next strategy...`);
                await this.delay(3000); // Longer wait between attempts
                
            } catch (error) {
                console.error(`❌ Scene ${sceneNumber} error on attempt ${attempt + 1}:`, error);
                if (attempt < maxRetries - 1) {
                    await this.delay(3000);
                }
            }
        }
        
        // Final fallback - return a basic URL that should always work
        console.warn(`⚠️ Scene ${sceneNumber} all ${maxRetries} attempts failed, using basic fallback`);
        const basicPrompt = `storybook illustration scene ${sceneNumber}`;
        const encodedBasic = encodeURIComponent(basicPrompt);
        return `https://image.pollinations.ai/prompt/${encodedBasic}?width=1920&height=1024&nologo=true`;
    }

    async testImageLoad(imageUrl, description, timeoutMs = 15000) {
        return new Promise((resolve) => {
            const img = new Image();
            const timeout = setTimeout(() => {
                console.warn(`⏰ Image load timeout for ${description} after ${timeoutMs}ms`);
                resolve(false);
            }, timeoutMs);
            
            img.onload = function() {
                clearTimeout(timeout);
                // Additional validation - check if image has actual content
                if (this.naturalWidth > 0 && this.naturalHeight > 0) {
                    console.log(`✅ Image successfully loaded for ${description} (${this.naturalWidth}x${this.naturalHeight})`);
                    resolve(true);
                } else {
                    console.warn(`⚠️ Image loaded but has no dimensions for ${description}`);
                    resolve(false);
                }
            };
            
            img.onerror = function() {
                clearTimeout(timeout);
                console.warn(`❌ Image failed to load for ${description}`);
                resolve(false);
            };
            
            // Set crossOrigin to handle CORS issues
            img.crossOrigin = 'anonymous';
            img.src = imageUrl;
        });
    }

    async generateAllSceneImages(progressCallback) {
        this.generatedImages = [];
        const totalScenes = this.scenes.length;
        const maxScenesToGenerate = 10; // FULL MODE: Generate images for scenes 1-10
        const scenesToProcess = Math.min(totalScenes, maxScenesToGenerate);
        const maxRetries = 5; // Maximum retries per scene

        console.log(`🎬 FULL MODE: Generating images for Scenes 1-10 (${scenesToProcess} scenes out of ${totalScenes} total scenes)...`);

        for (let i = 0; i < scenesToProcess; i++) {
            const scene = this.scenes[i];
            let imageData = null;
            let retryCount = 0;
            
            // Keep trying until we get a successful image or exhaust retries
            while (!imageData && retryCount < maxRetries) {
                try {
                    console.log(`🎨 Generating image for scene ${scene.number} (attempt ${retryCount + 1}/${maxRetries})`);
                    imageData = await this.generateSceneImage(scene.number);
                    
                    if (imageData && imageData.imageUrl) {
                        console.log(`✅ Scene ${scene.number} image generated successfully`);
                        this.generatedImages.push(imageData);
                        break;
                    } else {
                        throw new Error('Invalid image data received');
                    }
                } catch (error) {
                    retryCount++;
                    console.error(`❌ Scene ${scene.number} attempt ${retryCount} failed:`, error);
                    
                    if (retryCount < maxRetries) {
                        const waitTime = Math.min(2000 * retryCount, 10000); // Progressive backoff, max 10s
                        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
                        await this.delay(waitTime);
                    } else {
                        // Last resort: create fallback image data
                        console.warn(`⚠️ Scene ${scene.number} failed all ${maxRetries} attempts. Using fallback.`);
                        const fallbackImageData = {
                            sceneNumber: scene.number,
                            prompt: `Fallback prompt for scene ${scene.number}: ${scene.narration}`,
                            imageUrl: `https://image.pollinations.ai/prompt/storybook%20scene%20${scene.number}%20${encodeURIComponent(scene.narration.substring(0, 50))}?width=1920&height=1024&nologo=true`
                        };
                        this.generatedImages.push(fallbackImageData);
                    }
                }
            }
            
            // Update progress callback
            if (progressCallback) {
                progressCallback(i + 1, scenesToProcess);
            }

            // Small delay between scenes to avoid overwhelming the API
            await this.delay(1500);
        }

        console.log(`🎬 Image generation complete! Generated ${this.generatedImages.length}/${scenesToProcess} images (Scenes 1-10)`);
        return this.generatedImages;
    }

    getStoryData() {
        return {
            story: this.currentStory,
            characters: this.characters,
            scenes: this.scenes,
            images: this.generatedImages
        };
    }

    reset() {
        this.currentStory = null;
        this.characters = [];
        this.scenes = [];
        this.generatedImages = [];
        this.usedCharacterNames.clear();
    }
}

// Global variables for image generation (based on StoryGenerate script.js)
let characterImageUrls = [];
let sceneImageUrls = [];
let characterImagePrompts = {};
let pollinationsApiKey = '0JO6IwVdIwIG14_V'; // Updated from StoryGen

// Generate images function - main entry point called from HTML button
async function generateImages() {
    console.log('🎨 Starting image generation process...');
    
    // Check if we have the necessary data
    if (!window.storyGenerator || !window.storyGenerator.characters || window.storyGenerator.characters.length === 0) {
        alert('❌ No story data found. Please generate a story first.');
        return;
    }

    // Use the built-in API key (Updated from StoryGen)
    if (!pollinationsApiKey) {
        pollinationsApiKey = '0JO6IwVdIwIG14_V'; // StoryGen API key
    }

    try {
        // Show progress elements
        const progressBar = document.getElementById('image-progress');
        const loadingDiv = document.getElementById('image-loading');
        const generateButton = document.getElementById('generate-images-btn');
        
        if (progressBar) progressBar.style.display = 'block';
        if (loadingDiv) loadingDiv.style.display = 'block';
        if (generateButton) generateButton.disabled = true;

        // Step 1: Generate character images
        console.log('🎭 Step 1: Generating character images...');
        await generateCharacterImages();
        
        // Step 2: Generate scene images with character context
        console.log('🎬 Step 2: Generating scene images with character context...');
        await generateSceneImagesWithContext();
        
        // Step 3: Display results
        console.log('📋 Step 3: Displaying results...');
        displayGeneratedImages();
        
        console.log('✅ Image generation completed successfully!');
        
    } catch (error) {
        console.error('❌ Image generation failed:', error);
        alert('Image generation failed: ' + error.message);
    } finally {
        // Hide progress elements
        const progressBar = document.getElementById('image-progress');
        const loadingDiv = document.getElementById('image-loading');
        const generateButton = document.getElementById('generate-images-btn');
        
        if (progressBar) progressBar.style.display = 'none';
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (generateButton) generateButton.disabled = false;
    }
}

// Generate character images using Flux model (from StoryGenerate script.js)
async function generateCharacterImages() {
    characterImageUrls = [];
    characterImagePrompts = {};
    
    const characters = window.storyGenerator.characters;
    console.log(`🎭 Generating images for ${characters.length} characters...`);
    
    for (let i = 0; i < characters.length; i++) {
        const character = characters[i];
        console.log(`🎭 Processing character ${i + 1}/${characters.length}: ${character.name}`);
        
        try {
            // Generate character image prompt
            const imagePrompt = await generateCharacterImagePrompt(character);
            characterImagePrompts[character.name] = imagePrompt;
            
            // Generate character image URL
            const imageUrl = generateCharacterImageUrl(imagePrompt);
            
            // Validate image with retry logic
            const isValid = await validateImageWithRetry(imageUrl, `Character ${character.name}`, 5);
            if (isValid) {
                characterImageUrls.push(imageUrl);
                console.log(`✅ Character ${character.name} image generated successfully`);
            } else {
                throw new Error(`Failed to generate valid image for ${character.name}`);
            }
            
            // Update progress
            updateProgress(i + 1, characters.length, 'character');
            
            // Delay between requests
            await delay(2000);
            
        } catch (error) {
            console.error(`❌ Error generating image for ${character.name}:`, error);
            // Use fallback image URL (Fixed to match StoryGen exactly)
            const fallbackUrl = `https://image.pollinations.ai/prompt/cartoon%20character%20${encodeURIComponent(character.name)}?nologo=true`;
            characterImageUrls.push(fallbackUrl);
        }
    }
    
    console.log(`🎭 Character image generation complete: ${characterImageUrls.length} images`);
}

// Generate scene images with character context using Kontext model
async function generateSceneImagesWithContext() {
    sceneImageUrls = [];
    
    const scenes = window.storyGenerator.scenes;
    console.log(`🎬 Generating images for ${scenes.length} scenes with character context...`);
    
    for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        console.log(`🎬 Processing scene ${i + 1}/${scenes.length}: Scene ${scene.number}`);
        
        try {
            // Generate scene image prompt
            const scenePrompt = await generateSceneImagePrompt(scene);
            
            // Generate scene image with character context (Fixed to match StoryGen - use first character image as context)
            const contextImageUrl = characterImageUrls.length > 0 ? characterImageUrls[0] : null;
            const imageUrl = await generateSceneImageWithContext(scenePrompt, contextImageUrl, pollinationsApiKey);
            
            // Validate image with retry logic
            const isValid = await validateImageWithRetry(imageUrl, `Scene ${scene.number}`, 3);
            if (isValid) {
                sceneImageUrls.push(imageUrl);
                console.log(`✅ Scene ${scene.number} image generated successfully`);
            } else {
                throw new Error(`Failed to generate valid image for Scene ${scene.number}`);
            }
            
            // Update progress
            updateProgress(i + 1, scenes.length, 'scene');
            
            // Delay between requests (15 seconds as per original)
            await delay(15000);
            
        } catch (error) {
            console.error(`❌ Error generating image for Scene ${scene.number}:`, error);
            // Use fallback image URL (Updated from StoryGen)
            const fallbackUrl = `https://image.pollinations.ai/prompt/storybook%20scene%20${scene.number}%20${encodeURIComponent(scene.narration.substring(0, 50))}?width=1920&height=1024&nologo=true`;
            sceneImageUrls.push(fallbackUrl);
        }
    }
    
    console.log(`🎬 Scene image generation complete: ${sceneImageUrls.length} images`);
}

// Generate character image prompt (enhanced from StoryGenerate script.js)
async function generateCharacterImagePrompt(character) {
    const promptTemplate = `A 2D cartoon illustration of ${character.name}, a friendly children's storybook character. ${character.description || 'A kind and approachable character'}. Simple, clean art style suitable for children's books. Bright, cheerful colors. Full body view. Plain background. High quality digital art.`;
    
    return promptTemplate;
}

// Generate scene image prompt with character context
async function generateSceneImagePrompt(scene) {
    const characters = scene.characters || [];
    const characterNames = characters.map(c => c.name).join(', ');
    
    const promptTemplate = `A 2D cartoon storybook illustration depicting: ${scene.narration}. Characters in scene: ${characterNames}. Bright, colorful children's book art style. Safe for children. High quality digital illustration. Scene number ${scene.number}.`;
    
    return promptTemplate;
}

// Generate character image URL (Fixed to match StoryGen exactly - no model=flux, no seed)
function generateCharacterImageUrl(prompt) {
    const encodedPrompt = encodeURIComponent(prompt);
    const finalUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true`;
    console.log('🔍 STORYBOARD-GENERATOR CONTEXT URL:', finalUrl);
    return finalUrl;
}

// Generate scene image with character context using Kontext model (Fixed to match StoryGen exactly)
async function generateSceneImageWithContext(prompt, contextUrl, token) {
    const encodedPrompt = encodeURIComponent(prompt);
    
    if (!token || token.trim() === '') {
        console.warn('⚠️ No token provided - generating scene without character context');
        return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1920&height=1024&nologo=true`;
    }
    
    if (!contextUrl) {
        console.warn('⚠️ No context URL provided - generating scene without character context');
        return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1920&height=1024&nologo=true`;
    }
    
    const sceneUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=kontext&token=${token}&image=${encodeURIComponent(contextUrl)}&width=1920&height=1024&nologo=true`;
    
    console.log('🔗 Generated scene URL with character context');
    return sceneUrl;
}

// Validate image with retry logic
async function validateImageWithRetry(imageUrl, imageName, maxRetries = 5) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`🔍 Testing image accessibility for ${imageName} (attempt ${attempt}/${maxRetries})...`);
        
        const isLoaded = await testImageLoad(imageUrl, imageName, 15000);
        
        if (isLoaded) {
            console.log(`✅ Image validation successful for ${imageName} on attempt ${attempt}`);
            return true;
        }
        
        if (attempt < maxRetries) {
            const waitTime = Math.min(5000 * attempt, 20000);
            console.log(`⏳ Waiting ${waitTime}ms before retry...`);
            await delay(waitTime);
        }
    }
    
    console.warn(`⚠️ Image validation failed for ${imageName} after ${maxRetries} attempts`);
    return false;
}

// Test image load
async function testImageLoad(imageUrl, description, timeoutMs = 15000) {
    return new Promise((resolve) => {
        const img = new Image();
        const timeout = setTimeout(() => {
            console.warn(`⏰ Image load timeout for ${description} after ${timeoutMs}ms`);
            resolve(false);
        }, timeoutMs);
        
        img.onload = function() {
            clearTimeout(timeout);
            if (this.naturalWidth > 0 && this.naturalHeight > 0) {
                console.log(`✅ Image successfully loaded for ${description} (${this.naturalWidth}x${this.naturalHeight})`);
                resolve(true);
            } else {
                console.warn(`⚠️ Image loaded but has no dimensions for ${description}`);
                resolve(false);
            }
        };
        
        img.onerror = function() {
            clearTimeout(timeout);
            console.warn(`❌ Image failed to load for ${description}`);
            resolve(false);
        };
        
        img.src = imageUrl;
    });
}

// Update progress display
function updateProgress(current, total, type) {
    const progressFill = document.getElementById('progress-fill');
    const percentage = (current / total) * 100;
    
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
    }
    
    console.log(`📊 Progress: ${current}/${total} ${type} images (${percentage.toFixed(1)}%)`);
}

// Display generated images
function displayGeneratedImages() {
    console.log('📋 Displaying generated images...');
    
    // Create a results container or update existing one
    let resultsContainer = document.getElementById('generated-images-results');
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.id = 'generated-images-results';
        resultsContainer.className = 'generated-images-container mt-4';
        
        // Insert after the generate button
        const generateButton = document.getElementById('generate-images-btn');
        if (generateButton && generateButton.parentNode) {
            generateButton.parentNode.insertBefore(resultsContainer, generateButton.nextSibling);
        }
    }
    
    let html = `
        <div class="card">
            <div class="card-header">
                <h5>🎨 Generated Images</h5>
            </div>
            <div class="card-body">
    `;
    
    // Character images section
    if (characterImageUrls.length > 0) {
        html += `
            <h6>🎭 Character Images (${characterImageUrls.length} characters)</h6>
            <div class="row mb-4">
        `;
        
        window.storyGenerator.characters.forEach((character, index) => {
            const imageUrl = characterImageUrls[index];
            if (imageUrl) {
                html += `
                    <div class="col-md-3 mb-3">
                        <div class="card">
                            <img src="${imageUrl}" class="card-img-top" alt="${character.name}" style="height: 200px; object-fit: cover;">
                            <div class="card-body">
                                <h6 class="card-title">${character.name}</h6>
                                <small class="text-muted">${character.description || 'Character'}</small>
                            </div>
                        </div>
                    </div>
                `;
            }
        });
        
        html += `
            </div>
        `;
    }
    
    // Scene images section
    if (sceneImageUrls.length > 0) {
        html += `
            <h6>🎬 Scene Images (${sceneImageUrls.length} scenes)</h6>
            <div class="row">
        `;
        
        window.storyGenerator.scenes.forEach((scene, index) => {
            const imageUrl = sceneImageUrls[index];
            if (imageUrl) {
                html += `
                    <div class="col-md-4 mb-3">
                        <div class="card">
                            <img src="${imageUrl}" class="card-img-top" alt="Scene ${scene.number}" style="height: 200px; object-fit: cover;">
                            <div class="card-body">
                                <h6 class="card-title">Scene ${scene.number}</h6>
                                <small class="text-muted">${scene.narration}</small>
                            </div>
                        </div>
                    </div>
                `;
            }
        });
        
        html += `
            </div>
        `;
    }
    
    html += `
            </div>
        </div>
    `;
    
    resultsContainer.innerHTML = html;
    resultsContainer.style.display = 'block';
    
    console.log('📋 Image display complete!');
}

// Utility function for delays
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Export StoryboardGenerator and key functions to global scope
window.StoryboardGenerator = StoryboardGenerator;
window.generateImages = generateImages;