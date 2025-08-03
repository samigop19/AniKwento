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

        const encodedPrompt = encodeURIComponent(imagePrompt);
        const imageUrl = `https://pollinations.ai/p/${encodedPrompt}?width=1024&height=768&model=flux&enhance=true`;
        
        return {
            sceneNumber: sceneNumber,
            prompt: imagePrompt,
            imageUrl: imageUrl
        };
    }

    async generateAllSceneImages(progressCallback) {
        this.generatedImages = [];
        const totalScenes = this.scenes.length;

        for (let i = 0; i < totalScenes; i++) {
            const scene = this.scenes[i];
            try {
                const imageData = await this.generateSceneImage(scene.number);
                this.generatedImages.push(imageData);
                
                if (progressCallback) {
                    progressCallback(i + 1, totalScenes);
                }
                
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`Error generating image for scene ${scene.number}:`, error);
            }
        }

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

window.StoryboardGenerator = StoryboardGenerator;