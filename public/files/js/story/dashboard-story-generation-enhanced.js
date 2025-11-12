// Enhanced Story Generation with Gamification Features
// Integrated EXACT process from UPDATE STORYGEN

/**
 * Worker-based delay helper to prevent tab throttling
 * Uses timerManager if available, otherwise falls back to native setTimeout
 * @param {number} ms - Delay in milliseconds
 * @returns {Promise} - Promise that resolves after delay
 */
function workerDelay(ms) {
    if (window.timerManager && typeof window.timerManager.delay === 'function') {
        return window.timerManager.delay(ms);
    }
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if IndexedDB is available and not blocked
function isIndexedDBAvailable() {
    try {
        if (!window.indexedDB) {
            console.warn('IndexedDB not supported in this browser');
            return false;
        }

        // Try to check if it's actually accessible (Brave/Firefox can have it blocked)
        const testRequest = indexedDB.open('__test__');
        testRequest.onerror = () => {
            console.warn('IndexedDB is blocked or restricted');
        };
        return true;
    } catch (e) {
        console.warn('IndexedDB access error:', e);
        return false;
    }
}

// Global flag to track IndexedDB availability
let indexedDBBlocked = false;

// IndexedDB Helper Functions for storing large audio data
async function saveStoryToIndexedDB(storyData) {
    // Check if IndexedDB was previously detected as blocked
    if (indexedDBBlocked) {
        return Promise.reject(new Error('IndexedDB is blocked in this browser'));
    }

    return new Promise((resolve, reject) => {
        try {
            if (!window.indexedDB) {
                indexedDBBlocked = true;
                reject(new Error('IndexedDB not supported'));
                return;
            }

            const request = indexedDB.open('AniKwentoStoryDB', 1);

            request.onerror = (event) => {
                indexedDBBlocked = true;
                console.error('IndexedDB error:', event.target.error);
                reject(new Error('IndexedDB is blocked or unavailable. Please check your browser settings.'));
            };

            request.onblocked = () => {
                indexedDBBlocked = true;
                reject(new Error('IndexedDB is blocked by browser'));
            };

            request.onupgradeneeded = (event) => {
                try {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains('stories')) {
                        db.createObjectStore('stories', { keyPath: 'id' });
                    }
                } catch (e) {
                    console.error('Error creating object store:', e);
                    indexedDBBlocked = true;
                    reject(e);
                }
            };

            request.onsuccess = (event) => {
                let db;
                try {
                    db = event.target.result;
                    const transaction = db.transaction(['stories'], 'readwrite');
                    const store = transaction.objectStore('stories');

                    const storyRecord = {
                        id: 'currentStory',
                        data: storyData,
                        timestamp: Date.now()
                    };

                    const putRequest = store.put(storyRecord);

                    putRequest.onsuccess = () => {
                        db.close();
                        resolve();
                    };

                    putRequest.onerror = (e) => {
                        db.close();
                        console.error('Error storing in IndexedDB:', e);
                        reject(putRequest.error);
                    };

                    transaction.onerror = (e) => {
                        db.close();
                        console.error('Transaction error:', e);
                        reject(transaction.error);
                    };
                } catch (e) {
                    if (db) db.close();
                    indexedDBBlocked = true;
                    console.error('IndexedDB operation error:', e);
                    reject(e);
                }
            };
        } catch (e) {
            indexedDBBlocked = true;
            console.error('IndexedDB initialization error:', e);
            reject(e);
        }
    });
}

async function loadStoryFromIndexedDB() {
    // Skip if IndexedDB is known to be blocked
    if (indexedDBBlocked) {
        return Promise.resolve(null);
    }

    return new Promise((resolve, reject) => {
        try {
            if (!window.indexedDB) {
                indexedDBBlocked = true;
                resolve(null);
                return;
            }

            const request = indexedDB.open('AniKwentoStoryDB', 1);

            request.onerror = (event) => {
                indexedDBBlocked = true;
                console.warn('Cannot load from IndexedDB:', event.target.error);
                resolve(null); // Resolve with null instead of reject
            };

            request.onsuccess = (event) => {
                let db;
                try {
                    db = event.target.result;

                    if (!db.objectStoreNames.contains('stories')) {
                        db.close();
                        resolve(null);
                        return;
                    }

                    const transaction = db.transaction(['stories'], 'readonly');
                    const store = transaction.objectStore('stories');
                    const getRequest = store.get('currentStory');

                    getRequest.onsuccess = () => {
                        db.close();
                        resolve(getRequest.result?.data || null);
                    };

                    getRequest.onerror = () => {
                        db.close();
                        console.warn('Error reading from IndexedDB');
                        resolve(null);
                    };
                } catch (e) {
                    if (db) db.close();
                    console.warn('Error accessing IndexedDB:', e);
                    resolve(null);
                }
            };
        } catch (e) {
            indexedDBBlocked = true;
            console.warn('IndexedDB load error:', e);
            resolve(null);
        }
    });
}

// Helper Functions
function formatNameToProperCase(name) {
    if (!name || typeof name !== 'string') return name;
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

// Function to extract character count from text (e.g., "Two friends..." → 2)
function extractCharacterCountFromText(text) {
    if (!text) return 0;

    const lowerText = text.toLowerCase();

    // Map of number words to digits
    const numberWords = {
        'two': 2,
        'three': 3,
        'four': 4,
        'five': 5
    };

    // Check for number words at the start (two, three, four, five)
    for (const [word, num] of Object.entries(numberWords)) {
        if (lowerText.startsWith(word + ' ')) {
            return num;
        }
    }

    // Check for digits at the start (2, 3, 4, 5)
    const digitMatch = lowerText.match(/^(\d+)\s/);
    if (digitMatch) {
        const num = parseInt(digitMatch[1]);
        if (num >= 2 && num <= 5) {
            return num;
        }
    }

    return 0; // No valid character count found
}

// Function to get custom user inputs
function getCustomInputs() {
    const customTheme = document.getElementById('storyPrompt')?.value?.trim() || '';

    // Collect all character inputs (up to 5)
    const characters = [];
    console.log('🔍 Collecting student inputs...');
    for (let i = 1; i <= 5; i++) {
        const nameElement = document.getElementById(`character${i}Name`);
        const genderElement = document.getElementById(`character${i}Gender`);

        console.log(`Student ${i}:`, {
            nameElement: nameElement ? 'found' : 'NOT FOUND',
            genderElement: genderElement ? 'found' : 'NOT FOUND',
            name: nameElement?.value,
            gender: genderElement?.value
        });

        let name = nameElement?.value?.trim() || '';
        const gender = genderElement?.value || '';

        // Format name to proper case if provided
        if (name) {
            name = formatNameToProperCase(name);
        }

        // Add to array if both name and gender are provided
        if (name && gender) {
            characters.push({ name, gender });
            console.log(`✅ Added student ${i}: ${name} (${gender})`);
        } else if (name || gender) {
            // Partial input - validation error
            console.log(`❌ Student ${i} has incomplete data: name="${name}", gender="${gender}"`);
            if (typeof notificationSystem !== 'undefined') {
                notificationSystem.error(`Student ${i}: Please provide both name and gender, or leave both empty.`);
            } else {
                alert(`Student ${i}: Please provide both name and gender, or leave both empty.`);
            }
            return null; // Validation failed
        }
    }

    console.log('📊 Total students collected:', characters.length, characters);

    // Validate: must have 0, 2, 3, 4, or 5 characters (at least 2 if any are provided)
    if (characters.length === 1) {
        if (typeof notificationSystem !== 'undefined') {
            notificationSystem.error('Please add at least 2 students, or leave all empty to use random characters.');
        } else {
            alert('Please add at least 2 students, or leave all empty to use random characters.');
        }
        return null; // Validation failed
    }

    // Return custom inputs with character array
    return {
        customTheme: customTheme,
        characters: characters,
        characterCount: characters.length
    };
}

// API Configuration
// OpenRouter API key is now handled securely on the backend
let CURRENT_MODEL = 'openai/gpt-4.1-mini';

// Global variables
let currentStory = {};
let consoleLines = [];
let storyGenerationAborted = false;

// Color variations for character clothing
const CHARACTER_COLORS = {
    shirts: [
        'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'white',
        'turquoise', 'lime', 'coral', 'lavender', 'mint', 'salmon'
    ],
    pants: [
        'gray', 'navy', 'black', 'brown', 'khaki', 'denim blue', 'olive', 'maroon',
        'charcoal', 'beige', 'forest green', 'burgundy', 'slate', 'tan'
    ],
    shoes: [
        'white', 'black', 'brown', 'red', 'blue', 'yellow', 'green', 'orange',
        'purple', 'gray', 'pink', 'silver', 'gold', 'navy'
    ]
};

// 100 Story Themes for Randomization
const STORY_THEMES = [
    'Adventure', 'Friendship', 'Courage', 'Mystery', 'Magic', 'Self-discovery', 'Hope', 'Kindness',
    'Teamwork', 'Imagination', 'Nature', 'Family', 'Dreams', 'Bravery', 'Curiosity', 'Honesty',
    'Perseverance', 'Loyalty', 'Trust', 'Celebration', 'Gratitude', 'Discovery', 'Transformation',
    'New beginnings', 'Overcoming fear', 'Helping others', 'Belonging', 'Identity', 'Responsibility',
    'Growth', 'Change', 'Acceptance', 'Secrets', 'Wisdom', 'Determination', 'Wonder', 'Belief',
    'Fantasy', 'Joy', 'Creativity', 'Love', 'Forgiveness', 'Respect', 'Sacrifice', 'Loss', 'Healing',
    'Rebirth', 'Harmony', 'Resilience', 'Empowerment', 'Learning', 'Freedom', 'Justice', 'Unity',
    'Friendship across differences', 'Caring for the Earth', 'Facing challenges', 'Second chances',
    'Standing up for others', 'Facing the unknown', 'Protecting nature', 'Solving a mystery',
    'The power of music', 'A magical journey', 'Unexpected friendship', 'Lost and found',
    'Overcoming failure', 'Making choices', 'Believing in yourself', 'Facing consequences',
    'Courage to speak up', 'A wish come true', 'Hidden worlds', 'Facing danger', 'Building trust',
    'Helping a friend', 'A journey home', 'Light vs darkness', 'Finding your voice',
    'Protecting loved ones', 'New discoveries', 'Time travel', 'Following dreams', 'Facing change',
    'Magic in everyday life', 'The power of stories', 'Learning patience', 'A promise kept',
    'Finding courage', 'Building hope', 'Unlikely heroes', 'The value of honesty', 'A world of wonder',
    'New friendships', 'Lost treasures', 'Helping the community', 'Facing mistakes',
    'Strength in unity', 'Adventure awaits', 'Learning from failure', 'The beauty of kindness',
    'A secret garden', 'Discovering hidden talents', 'The power of belief', 'Overcoming obstacles',
    'A new adventure begins'
];

// Make STORY_THEMES available globally for other modules
window.STORY_THEMES = STORY_THEMES;

// Character Name Lists for Randomization
const CHARACTER_NAMES = {
    boy: [
        'Liam', 'Noah', 'Oliver', 'Elijah', 'James', 'Benjamin', 'Lucas', 'Henry', 'Alexander', 'Mason',
        'Ethan', 'Jacob', 'Michael', 'Daniel', 'Logan', 'Jackson', 'Levi', 'Sebastian', 'Mateo', 'Jack',
        'Owen', 'Theodore', 'Aiden', 'Samuel', 'Joseph', 'John', 'David', 'Wyatt', 'Matthew', 'Luke',
        'Asher', 'Carter', 'Julian', 'Grayson', 'Leo', 'Jayden', 'Gabriel', 'Isaac', 'Lincoln', 'Anthony',
        'Hudson', 'Dylan', 'Ezra', 'Thomas', 'Charles', 'Christopher', 'Jaxon', 'Maverick', 'Josiah', 'Isaiah'
    ],
    girl: [
        'Olivia', 'Emma', 'Amelia', 'Ava', 'Sophia', 'Isabella', 'Mia', 'Evelyn', 'Harper', 'Luna',
        'Camila', 'Gianna', 'Elizabeth', 'Eleanor', 'Ella', 'Abigail', 'Sofia', 'Avery', 'Scarlett', 'Emily',
        'Aria', 'Penelope', 'Chloe', 'Layla', 'Mila', 'Nora', 'Hazel', 'Madison', 'Ellie', 'Lily',
        'Nova', 'Isla', 'Grace', 'Violet', 'Aurora', 'Riley', 'Zoey', 'Willow', 'Emilia', 'Stella',
        'Zoe', 'Victoria', 'Hannah', 'Addison', 'Leah', 'Lucy', 'Natalie', 'Eliana', 'Ivy', 'Claire', 'Audrey'
    ],
    animal: [
        'Buddy', 'Bella', 'Max', 'Luna', 'Charlie', 'Daisy', 'Milo', 'Coco', 'Rocky', 'Ginger',
        'Lucky', 'Peanut', 'Shadow', 'Oreo', 'Bubbles', 'Sunny', 'Blue', 'Nibbles', 'Sparky', 'Snowy',
        'Fluffy', 'Paws', 'Simba', 'Whiskers', 'Pebbles'
    ]
};

// EXACT PROMPTS from UPDATE STORYGEN
const PROMPTS = {
    step1: `Step 1: Story Structure Generation
Purpose: can you provide me a short story that can be fitted for 10 scenes pictures, where this 10 scenes can contain 6 narration lines per scene but make sure to transition the narration to the next scene.
Key Requirements:
Creates EXACTLY 10 scenes (Scene 1 through Scene 10).

CHARACTER COUNT REQUIREMENT (CRITICAL):
- The story MUST have between 2-5 characters ONLY
- DO NOT create stories with 6 or more characters
- Minimum: 2 characters | Maximum: 5 characters
- This limit is STRICT and must be followed

CONTENT SAFETY & MODERATION (CRITICAL):
- This is for CHILDREN'S educational content - stories must be 100% child-friendly and age-appropriate
- ABSOLUTELY NO adult content, sexual themes, romantic relationships, or suggestive situations
- STRICTLY PROHIBITED: violence, gore, scary content, death, weapons, drugs, alcohol, or harmful behaviors
- NO inappropriate language, slang, or double meanings
- Focus on positive values: friendship, learning, kindness, courage, teamwork, and problem-solving
- All content must be suitable for children ages 3-10 years old
- Keep themes educational, wholesome, and uplifting
- Any violation of these rules will result in content rejection

{CHARACTER_REQUIREMENTS}
{UNIQUENESS_INSTRUCTIONS}

Mandatory Format:

Story Title: [Title of the story]

Scene [number]: [Scene Title]
Narration:
1. [First narration line – introduce setting or action.]
2. [Second narration line – describe character or event.]
3. [Third narration line – add simple dialogue or feeling.]
4. [Fourth narration line – build up action or emotion.]
5. [Fifth narration line – add detail or interaction.]
6. [Sixth narration line – set up the next event.] (→ Transition: [Short sentence that smoothly leads to the next scene.])
Characters in Scene: Names of characters present
Visual Description: 2D design description"`,

    step2: `Step 2: Character Descriptions
Purpose: Creates detailed physical descriptions for all characters

CHARACTER COUNT LIMIT: Describe 2-5 characters ONLY. DO NOT describe 6 or more characters. The story must have a minimum of 2 and maximum of 5 characters total.

Input: Complete story from Step 1

For Each Character:
Name, Age, Gender
Skin tone (fair, medium, dark)
Hair color and style
Eye color, Face shape
Clothing description (plain shoes with specific color)
Personality trait

For Animal Characters:
Name, Animal type, Size
Physical description (fur color, markings)
Personality trait

Key Requirement: DIVERSE physical features - varied hair colors, eye colors, skin tones, clothing colors`,

    step3: `Step 3: Character Image Prompt Generation
Purpose: Converts character descriptions into a single combined image prompt

CHARACTER COUNT LIMIT: Generate prompts for 2-5 characters ONLY. DO NOT generate prompts for 6 or more characters. The story must have a minimum of 2 and maximum of 5 characters total.

CRITICAL REQUIREMENT: Use the EXACT character descriptions from Step 2, including ALL clothing details (colors, styles, items). DO NOT change, modify, or omit any clothing details.

GENDER INDICATOR REQUIREMENT: Based on each character's gender from Step 2, include their gender indicator in parentheses after their name:
- If character is male/boy → use (he/boy)
- If character is female/girl → use (she/girl)
This helps the image generation understand the character's gender.

HAIR COLOR/STYLE REQUIREMENT: You MUST specify the character's hair description FIRST, before clothing. Format: "[Hair length] [hair style/texture] [hair color] hair". This is MANDATORY for all human characters.
- Example: "Short tousled dark brown hair"
- Example: "Long wavy dark brown hair"
- Example: "Medium-length curly black hair"

ANIMAL/PET POSTURE REQUIREMENT: If there are any animal or pet characters, they must be shown in their natural posture:
- Dogs, cats, and other four-legged animals should be on all fours (not standing upright)
- Animals should be positioned naturally beside or near the human characters
- Example: "standing on all fours" or "sitting on the ground" for pets

Format Structure (ADAPT based on actual character count - 2 to 5 characters ONLY):
"White background, {CHARACTER_COUNT} characters standing side-by-side in a straight horizontal line, evenly spaced, full-body view, consistent proportions, Disney 2D cartoon, minimal shadows, three-quarter front view angle, crisp black outlines around all characters and clothing. No text in the image.
Character 1 (far left): [Name] (he/boy or she/girl) — [Hair description], [exact clothing description from Step 2].
Character 2: [Name] (he/boy or she/girl) — [Hair description], [exact clothing description from Step 2].
[Continue for each character in the story - DO NOT exceed 5 characters total]
Character [LAST] (far right): [Name] (he/boy or she/girl) — [Hair description], [exact clothing description from Step 2].
Bold black outlines for clear definition."

Example Format (for 5 characters):
"White background, 5 characters standing side-by-side in a straight horizontal line, evenly spaced, full-body view, consistent proportions, Disney 2D cartoon, minimal shadows, three-quarter front view angle, crisp black outlines around all characters and clothing. No text in the image.
Character 1 (far left): Maverick (he/boy) — Short tousled dark brown hair, wears a deep green hoodie with a small compass emblem on the chest, tan cargo shorts, and sturdy dark brown plain shoes.
Character 2: Sophia (she/girl) — Long wavy dark brown hair, light lavender long-sleeve shirt with a subtle star pattern, denim jeans, and plain white sneakers.
Character 3 (center): Emilia (she/girl) — Medium-length curly black hair, bright yellow t-shirt, navy blue leggings, and plain black slip-on shoes.
Character 4: Elizabeth (she/girl) — Long straight auburn hair, vibrant red jacket over a white t-shirt, olive green cargo pants, and plain gray sneakers.
Character 5 (far right): Dylan (he/boy) — Short messy blonde hair, sky blue hoodie with a front pocket, dark gray joggers, and plain navy slip-on shoes.
Bold black outlines for clear definition."

Visual Style: Disney 2d cartoon, minimal shadows, white background, crisp black outlines

POSITION INDICATORS:
- First character: (far left)
- Middle character (if odd number): (center)
- Last character: (far right)
- Other characters: no position indicator needed

REMINDER:
- STRICT LIMIT: Generate prompts for 2-5 characters ONLY - never 6 or more characters
- ALWAYS list hair description FIRST, before clothing for ALL human characters
- Format: "[Name] (gender) — [Hair description], [clothing]"
- Copy the exact clothing descriptions from Step 2 - do not change colors, styles, or any details
- Always include gender indicator (he/boy or she/girl) after each character's name based on their gender in Step 2
- Animals/pets must be shown in natural posture (on all fours, not standing upright)
- Use numbered list format with position indicators for first, center, and last characters
- Maximum character count: 5 (minimum: 2)`,

    step4: `STEP 4: Scene Image Prompt Generation — Final Structure
Purpose:
Generate detailed and precise image prompts for each of the 10 story scenes based on narration and character descriptions.

NARRATION-TO-IMAGE MATCHING RULES
Every verb, object, number, and color mentioned in narration must be visually represented.
Character actions must exactly match the narration — no additions, no omissions.
If narration mentions numbers (e.g., 1, 2, 3), the image must show exactly that number of objects.
Examples:
"Three cats in the tree." → Show exactly 3 cats positioned in a tree with characters pointing or counting.
"Counting butterflies." → Show characters pointing, holding up fingers, or looking at butterflies.
"Holding a red ball." → Show the character actually holding a red ball.

MANDATORY VARYING BACKGROUND FORMAT
(The background must be DIFFERENT for each scene, but remain in the SAME GENERAL PLACE/LOCATION throughout the story)

CRITICAL RULE: Each scene MUST have a visually distinct background compared to the previous scene, while staying in the same location type.

For each scene, vary the following elements to create a different background:
- Different number and position of background objects (trees, rocks, buildings, etc.)
- Different sky conditions (number of clouds, position of sun/moon, time of day lighting)
- Different ground textures and decorative elements
- Different atmospheric elements (particles, lighting effects)
- Different camera angles or focal points within the same location

Example - If the location is "Magical Forest":
Scene 1: 3 trees on left, 2 rocks on right, 5 mushrooms, morning light with 2 clouds
Scene 2: 2 trees on right, 4 flowers on left, 3 butterflies, midday light with 4 clouds
Scene 3: 1 large tree center, 6 fireflies, 2 stumps, evening light with 3 clouds
(All are in a magical forest, but each background looks different)

This is the GENERAL location for all 10 scenes, with DIFFERENT backgrounds per scene:
Location Type: [INSERT LOCATION TYPE - e.g., Forest, Park, School, Beach, etc.]

For EACH scene, create a UNIQUE background layout within this location type by varying:
- Number and position of objects (vary from 1-6 objects, change positions: left/right/center)
- Sky conditions (vary cloud count, lighting tone, time progression)
- Ground decorations (vary types and quantities)
- Atmospheric effects (vary particle types and counts)

📌 CRITICAL: Each scene's background must look DIFFERENT from the previous scene, but stay in the same location type. Never repeat the exact same background configuration.

Example of Varying Backgrounds in Same Location

Location Type: Enchanted Forest Clearing (same for all scenes)

Scene 1 Background:
Exactly 2 tall ancient trees on the left
Exactly 1 large oak tree on the right
Exactly 5 glowing mushrooms scattered along the path
Exactly 4 forest flowers near the front left
Exactly 3 glowing fireflies above the flowers
Dirt path winding through the center
Sky with exactly 2 soft orange clouds at morning light

Scene 2 Background (DIFFERENT from Scene 1, but same location type):
Exactly 3 birch trees on the right
Exactly 2 moss-covered rocks on the left
Exactly 6 purple wildflowers scattered along the path
Exactly 2 tree stumps near the center
Exactly 4 butterflies hovering above the flowers
Grass path winding through the center
Sky with exactly 4 white clouds at midday bright light

Scene 3 Background (DIFFERENT from Scene 2, but same location type):
Exactly 1 giant ancient tree in the center
Exactly 4 glowing crystals on the left
Exactly 3 toadstools on the right
Exactly 5 fireflies near the back
Stone path winding through the center
Sky with exactly 5 pink clouds at sunset warm light

📌 Each scene has a DIFFERENT background configuration, but all are in an Enchanted Forest Clearing.

SCENE IMAGE PROMPT TEMPLATE (APPLIED TO EACH SCENE - VARY THE DETAILS)

Scene [Number]: [Sky/weather + exact cloud count + lighting tone - VARY PER SCENE], a [location type name] with exactly [number - VARY] [object 1 - VARY TYPE] on the [position - VARY] and exactly [number - VARY] [object 2 - VARY TYPE] on the [position - VARY].
The ground is [ground description - VARY TEXTURE], and a [path description - VARY TYPE: dirt/grass/stone] runs through the [position - VARY].
Exactly [number - VARY] [object 3 - VARY TYPE] are scattered along the path.
Exactly [number - VARY] [object 4 - VARY TYPE] appear near the [direction - VARY], with exactly [number - VARY] [atmospheric element - VARY TYPE] hovering above them.
Exactly [number - VARY] [ground decoration - VARY TYPE] rest on the [direction - VARY] side.
Soft [lighting tone - VARY] particles, exactly [number - VARY], float in the air, adding a [mood - VARY] atmosphere.
[Lighting type/time - VARY: morning/midday/evening/sunset], camera angle [VARY: wide/low/high] to capture the background.
Evenly spaced, full-body view of all characters in the scene, consistent proportions.

CHARACTER POSE & APPEARANCE FORMAT
Each character is described individually.

Character [#] ([position]): [Name] is wearing [clothing description], [body position & arm placement], [facial expression], facing [direction]. [Lighting interaction or effect].

Example:

Character 1 (center): Lila is wearing a forest-green cloak with brown boots, standing upright, arms slightly raised, with a curious expression, facing forward toward the glowing light. The edge of her cloak catches the golden sunset light.

✅ ADDED UNIVERSAL ART STYLE REQUIREMENTS

Art Style Requirements — Apply to EVERY SCENE
Disney-style 2D animation
Crisp black outlines
Soft pastel colors
Painterly textures
Warm cinematic lighting
Detailed fantasy garden elements
Magical atmosphere (fairy lights, glowing ambience)

Art style MUST appear in every final prompt line.

EXAMPLE SCENE 1 — FULL OUTPUT (Morning in Enchanted Forest)

Scene 1: A bright morning background with exactly 2 soft white clouds floating in the sky, an enchanted forest clearing with exactly 2 tall ancient trees on the left and exactly 1 large oak tree on the right.
The ground is covered with lush moss, and a narrow dirt path runs through the center of the scene.
Exactly 5 glowing mushrooms are scattered evenly along the path.
Exactly 4 purple forest flowers bloom near the front left, with exactly 3 glowing fireflies hovering above them.
Exactly 2 moss-covered rocks rest on the right side of the path.
Soft golden particles, exactly 4 in total, float gently in the air, adding a magical shimmer to the atmosphere.
Morning sunlight filtering through trees, camera angle wide and slightly low to capture the full forest depth and characters.
Evenly spaced, full-body view inside the background, consistent proportions.

Character 1 (center): Lila is wearing a forest-green cloak with brown boots, standing upright, arms slightly raised, with a curious expression, facing forward toward the glowing light. Her hair is shoulder-length, and the edge of her cloak catches the golden morning light.

Art style: Disney-style 2D animation, crisp black outlines, soft pastel colors, painterly textures, warm cinematic lighting, detailed fantasy garden elements, magical atmosphere with glowing ambience.

EXAMPLE SCENE 2 — FULL OUTPUT (Midday in Enchanted Forest - DIFFERENT Background)

Scene 2: A bright midday background with exactly 4 fluffy white clouds in the sky, an enchanted forest clearing with exactly 3 birch trees on the right and exactly 2 moss-covered boulders on the left.
The ground is covered with soft grass, and a winding grass path runs through the left side of the scene.
Exactly 6 red wildflowers are scattered along the path.
Exactly 2 wooden stumps appear near the center, with exactly 4 colorful butterflies hovering above them.
Exactly 3 river stones rest on the left side of the path.
Soft silver particles, exactly 6 in total, float gently in the air, adding a peaceful shimmer to the atmosphere.
Bright midday lighting with strong sun rays, camera angle wide and eye-level to capture the clearing and characters.
Evenly spaced, full-body view inside the background, consistent proportions.

Character 1 (center): Lila is wearing a forest-green cloak with brown boots, walking forward, arms at her sides, with a determined expression, facing right toward the path ahead. Her hair flows gently in the breeze.

Art style: Disney-style 2D animation, crisp black outlines, soft pastel colors, painterly textures, bright cinematic lighting, detailed fantasy garden elements, peaceful atmosphere with natural light.

GAMIFICATION RULES
Always specify exact quantities for all countable objects.
Use: "exactly [NUMBER] [OBJECT]" or "precisely [NUMBER] [OBJECT]".
At least 2–3 countable objects per scene.
Clear positioning (left, right, center, above, near).

Correct:
"exactly 3 red birds sitting on the tree branch"
"precisely 5 yellow flowers blooming on the left"

SETTING CONSISTENCY RULES
The location TYPE stays the same across all 10 scenes (e.g., all in a forest, or all in a park).
Each scene MUST have a DIFFERENT background configuration (different objects, counts, positions, lighting, time of day).
Never use the exact same background twice - vary the elements to create visual variety.
Fully write each unique background for every scene.
Character actions AND backgrounds both change between scenes.
If multiple location types exist in the story, choose one main location type for all scenes.`,

    step5: `STEP 5: Gamification Questions Generation
STEP 5: Gamification Questions Generation
------------------------------------------
Purpose: Adds interactive learning questions connected to the story to enhance engagement and comprehension. There will be two types of questions based on {QUESTION_TIMING}:

QUESTION TIMING MODE: {QUESTION_TIMING}
- "during" = Type 1 only (During Story Questions)
- "after" = Type 2 only (After Story Questions)
- "both" = Type 1 AND Type 2 (Both question types)

IMPORTANT BEFORE STARTING: You MUST randomize correct answer positions!
- Never place all correct answers in the same position (A, B, C, or D)
- Distribute correct answers randomly across all 4 positions
- Check your final output to ensure variety in correct answer letters

Input: Story scenes from Step 1 + Selected question types: {QUESTION_TYPES} + Question timing: {QUESTION_TIMING}

═══════════════════════════════════════════════════════
TYPE 1 — "DURING THE STORY" QUESTIONS (In-Story Interaction)
═══════════════════════════════════════════════════════
{DURING_STORY_SECTION}

═══════════════════════════════════════════════════════
TYPE 2 — "AFTER THE STORY" QUESTIONS (Post-Story Comprehension)
═══════════════════════════════════════════════════════
{AFTER_STORY_SECTION}

✅ CRITICAL RULES
* Generate questions based on {QUESTION_TIMING} mode
* If timing = "during": Generate ONLY Type 1 questions
* If timing = "after": Generate ONLY Type 2 questions
* If timing = "both": Generate BOTH Type 1 AND Type 2 questions
* Correct answers randomized among A–D
* All questions directly based on story content
* Sentences use simple, child-friendly wording (max 8 words per sentence)
* Avoid repeated phrasing (e.g., don't use "How many" every time)

OUTPUT FORMAT:
{OUTPUT_FORMAT_SECTION}

PATTERN SELECTION FOR THIS GENERATION (for during-story questions):
{PATTERN_INSTRUCTION}

STORY SCENES FROM STEP 1:
{STEP1_RESULT}

Please add gamification questions following the exact format and pattern specified above for "{QUESTION_TIMING}" mode.`,

    // During story questions template
    duringStoryTemplate: `Purpose: Inserted in between scenes to keep children engaged while the story plays. These appear naturally after some narration moments.

⚠️ CRITICAL PLACEMENT RULE - READ CAREFULLY:
* You MUST place EXACTLY 5 questions ONLY in the specified scenes
    * Pattern A (odd): Questions in scenes 1, 3, 5, 7, 9 ONLY
    * Pattern B (EVEN SCENES): Place questions ONLY in scenes 2, 4, 6, 8, and 10
* DO NOT place questions in other scenes
* Scenes without questions should ONLY have narration (no Question or Choices section)
* Each question connects directly to the current scene's narration or visual action.

Question Types:
* Color Recognition → "What color is the ball?"
* Shape Identification → "Which shape is the kite?"
* Number Counting → "Count the apples. What number do you get?"
* Emotion Recognition → "How does Emma feel now?"

Format Template for scenes WITH questions:
Scene [X]
(if scene matches pattern)
Question: [generated question]
Choices:
A) ...
B) ...
C) ...
D) ...
Correct Answer: [letter]) [correct option]


Example
Scene 2
Question: What color is the ball?
Choices:
A) Blue
B) Red
C) Yellow
D) Green
Correct Answer: B) Red

Scene 3
Narration: "Emma's friend Noah arrived with a big smile."

Scene 4
Narration: "Noah brought a triangle-shaped kite to fly."
Question: Which shape is the kite?
Choices:
A) Circle
B) Square
C) Triangle
D) Star
Correct Answer: C) Triangle`,

    // After story questions template
    afterStoryTemplate: `Purpose: To review what the child remembers or learned after the story ends. Focuses on understanding, recall, sequencing, and emotional reflection.

Placement: Appears after Scene 10 (the end of the story). Always 10 questions total, inspired by the full story content.

Question Themes:
1. Character Recall – "Who helped clean the park?"
2. Sequence Order – "What happened first in the story?"
3. Setting Recall – "Where did the story take place?"
4. Color/Shape Memory – "What color was the kite?"
5. Counting/Number Memory – "How many friends joined in the game?"
6. Emotion Reflection – "How did Emma feel at the end?"
7. Action Recall – "What did Noah do to help?"
8. Lesson Understanding – "What did the friends learn in the story?"
9. Object Recall – "What object did they find in the box?"
10. Moral Choice – "Why is sharing important?"

Format Template:
Post-Story Review
Question 1: [Question about story content]
Choices:
A) [Option 1]
B) [Option 2]
C) [Option 3]
D) [Option 4]
Correct Answer: [Letter]) [Correct option]
...
(repeat up to Question 10)

Example:
Post-Story Review
Question 5: How many butterflies did they count in the garden?
Choices:
A) 2
B) 4
C) 3
D) 5
Correct Answer: C) 3`,

    // Output format templates
    outputFormatDuring: `For "during" mode, output format:

⚠️ IMPORTANT: Follow the pattern specified in "PATTERN SELECTION FOR THIS GENERATION"


Pattern A (odd): Questions in scenes 1, 3, 5, 7, 9 ONLY
Pattern B (even): Questions in scenes 2, 4, 6, 8, 10 ONLY

Dynamic structure:
Scene [X]
(if scene matches pattern)
Question: [generated question]
Choices:
A) ...
B) ...
C) ...
D) ...
Correct Answer: [letter]) [correct option]

[Continue for all 10 scenes following the selected pattern]`,

    outputFormatAfter: `For "after" mode, output format:


Post-Story Review
Question 1: [question about full story]
Choices: A) [option] B) [option] C) [option] D) [option]
Correct Answer: [Letter]) [answer]

[Continue for all 10 post-story questions]`,

    outputFormatBoth: `For "both" mode, output format:
    
Scene [X]
(if scene matches pattern)
Question: [generated question]
Choices:
A) ...
B) ...
C) ...
D) ...
Correct Answer: [letter]) [correct option]


[All 10 scenes with alternating during-story questions]

Post-Story Review
Question 1: [question about full story]
Choices: A) [option] B) [option] C) [option] D) [option]
Correct Answer: [Letter]) [answer]

[All 10 post-story questions]`,

    step6: `Step 6: Story Thumbnail Prompt Generation

Purpose: Create a visually compelling thumbnail prompt that represents the full story and accurately shows the characters with their exact clothing details from Step 2.

CRITICAL REQUIREMENT: Use the EXACT clothing descriptions from Step 2 - copy every clothing detail (colors, styles, items) EXACTLY as written. DO NOT change, modify, summarize, or omit any clothing details.

GENDER INDICATOR REQUIREMENT: Based on each character's gender from Step 2, include their gender indicator in parentheses after their name:
- If character is male/boy → use (he/boy)
- If character is female/girl → use (she/girl)
This helps the image generation understand the character's gender.

Input:
• Full story from Step 1
• Character descriptions and clothing details from Step 2

Requirements:
• Main characters showing a key moment from the story
• EXACT clothing details as described in Step 2 (copy word-for-word, no changes)
• Gender indicators for each character based on Step 2 (he/boy or she/girl)
• 2D illustration style
• Disney animation style
• Disney-style 2D cartoon look
• Soft shading
• Bright and warm lighting
• Crisp black outlines
• Soft pastel colors
• Cinematic lighting
• Magical enchanted atmosphere
• Painterly texture
• Warm glow
• Aesthetic composition
• Detailed background
• Fantasy setting

IMPORTANT: When describing each character, you MUST include their gender indicator (based on their gender in Step 2) and their complete clothing description EXACTLY as it appears in Step 2 below. Do not paraphrase or shorten the clothing descriptions.

Format Example:
"[Main story theme], featuring [character name] (he/boy or she/girl based on Step 2) wearing [EXACT clothing description from Step 2] and [character name] (he/boy or she/girl based on Step 2) wearing [EXACT clothing description from Step 2], [key action], set in a [fantasy environment], 2D illustration, Disney animation style, soft pastel colors with warm glow, painterly texture, cinematic lighting creating a magical atmosphere, aesthetic composition with detailed background elements related to the story."

CHARACTER DETAILS FROM STEP 2:
{STEP2_RESULT}

STORY CONTEXT FROM STEP 1:
{STEP1_RESULT}

Task:
Generate one continuous and visually descriptive paragraph that naturally incorporates the characters WITH their gender indicators (he/boy or she/girl based on Step 2) and their EXACT clothing descriptions from Step 2, and the overall story mood. Copy the clothing details exactly as they appear in Step 2 - do not change any colors or details. Always include the gender indicator after each character's name based on their gender from Step 2.`
};

// Function to get random clothing colors ensuring characters have different colors
function getRandomClothingColors() {
    const shuffledShirts = [...CHARACTER_COLORS.shirts].sort(() => Math.random() - 0.5);
    const shuffledPants = [...CHARACTER_COLORS.pants].sort(() => Math.random() - 0.5);
    const shuffledShoes = [...CHARACTER_COLORS.shoes].sort(() => Math.random() - 0.5);

    return {
        character1: {
            shirt: shuffledShirts[0],
            pants: shuffledPants[0],
            shoes: shuffledShoes[0]
        },
        character2: {
            shirt: shuffledShirts[1],
            pants: shuffledPants[1],
            shoes: shuffledShoes[1]
        }
    };
}

// Clear cached story data
function clearStoredData() {
    localStorage.removeItem('generatedStoryData');
    logToConsole('Cleared cached story data', 'info');
}

// Console logging function
function logToConsole(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;

    consoleLines.push({ message: logEntry, type });

    // Keep only last 50 lines to prevent memory issues
    if (consoleLines.length > 50) {
        consoleLines = consoleLines.slice(-50);
    }

    updateConsoleDisplay();
}

// Update console display
function updateConsoleDisplay() {
    const consoleDiv = document.getElementById('consoleOutput');
    if (consoleDiv) {
        consoleDiv.innerHTML = consoleLines
            .map(line => `<div class="console-line console-${line.type}">${line.message}</div>`)
            .join('');
        consoleDiv.scrollTop = consoleDiv.scrollHeight;
    }
}

// Update progress modal
function updateProgress(percentage, message) {
    const progressBar = document.getElementById('mainProgressBar');
    const progressText = document.getElementById('progressText');

    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
        progressBar.setAttribute('aria-valuenow', percentage);
    }

    if (progressText) {
        progressText.textContent = message;
    }

    logToConsole(`Progress: ${percentage}% - ${message}`, 'info');
}

// OpenRouter API call with timeout - using secure backend handler
async function callOpenRouterAPI(prompt) {
    const loadingMsg = 'Calling OpenRouter API...';
    logToConsole(loadingMsg, 'info');

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
        logToConsole('OpenRouter API call timed out after 60 seconds', 'error');
    }, 60000); // 60 second timeout

    try {
        // Call our backend handler instead of OpenRouter directly
        const response = await fetch('/source/handlers/openrouter_completion.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: prompt,
                model: CURRENT_MODEL,
                max_tokens: 4000,
                temperature: 0.7
            }),
            signal: controller.signal
        });

        // Clear timeout if request completes
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`HTTP error! status: ${response.status}${errorData.error ? ' - ' + errorData.error : ''}`);
        }

        const data = await response.json();

        if (data.success && data.content) {
            logToConsole('OpenRouter API call successful', 'success');
            return data.content;
        } else {
            logToConsole('OpenRouter API connection successful but unexpected response', 'warning');
            return null;
        }
    } catch (error) {
        // Clear timeout if error occurs
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            logToConsole('OpenRouter API call was aborted due to timeout', 'error');
            throw new Error('API request timed out after 60 seconds. Please try again.');
        } else {
            logToConsole(`OpenRouter API error: ${error.message}`, 'error');
            throw error;
        }
    }
}

// Generate context image (character reference) with unlimited retries using Fal.ai
async function generateContextImageWithEnhancedRetry(characterPrompt) {
    logToConsole('Starting context image generation with Fal.ai (unlimited retries)...', 'info');

    let attempt = 1;
    let currentPrompt = characterPrompt;
    const maxReasonableAttempts = 10; // Reduced attempts since Fal.ai is more reliable

    // Simple words to add after every 3 attempts
    const simpleWords = [
        'clear', 'bright', 'simple', 'clean', 'detailed',
        'colorful', 'vivid', 'sharp', 'focused', 'quality',
        'perfect', 'nice', 'good', 'cute', 'happy',
        'friendly', 'cheerful', 'smiling', 'lovely', 'beautiful'
    ];

    while (attempt <= maxReasonableAttempts) {
        try {
            logToConsole(`Context image generation attempt ${attempt} (using Fal.ai nano-banana)...`, 'info');

            // Use Fal.ai API through our integration (1 attempt per outer loop iteration)
            const imageUrl = await window.FalAI.generateContextImage(currentPrompt);

            logToConsole(`🎉 Context image generated successfully with Fal.ai after ${attempt} attempts`, 'success');
            return imageUrl;

        } catch (error) {
            logToConsole(`Context image generation attempt ${attempt} failed: ${error.message}`, 'error');

            // If we've reached the max attempts, throw the error
            if (attempt >= maxReasonableAttempts) {
                throw error;
            }

            // For attempts 1-3: Keep original prompt unchanged
            if (attempt <= 3) {
                logToConsole(`Attempt ${attempt}/3: Using original prompt unchanged`, 'info');
            }
            // From attempt 4 onwards: Add one simple word after every 3 attempts
            else if (attempt >= 4 && (attempt - 3) % 3 === 1) {
                const wordIndex = Math.floor((attempt - 4) / 3) % simpleWords.length;
                const simpleWord = simpleWords[wordIndex];
                currentPrompt += `, ${simpleWord}`;
                logToConsole(`🔧 Enhanced context prompt at attempt ${attempt} - Added word: "${simpleWord}"`, 'info');
                logToConsole(`Current prompt: ${currentPrompt.slice(0, 100)}...`, 'info');
            }

            // CRITICAL: Add delay before retry to prevent stack overflow and UI freezing
            const delay = Math.min(1000 * Math.pow(2, Math.min(attempt - 1, 4)), 10000);
            logToConsole(`⏳ Waiting ${delay/1000} seconds before retry...`, 'info');
            await workerDelay(delay);

            attempt++;
        }
    }

    // If we reach the safety limit, try one final simplified attempt
    logToConsole(`⚠️ Context image generation reached safety limit of ${maxReasonableAttempts} attempts. Trying final simplified approach...`, 'warning');

    try {
        const simplifiedPrompt = `${characterPrompt.split(',')[0]}, simple, clear portrait`;
        const imageUrl = await window.FalAI.generateContextImage(simplifiedPrompt);

        logToConsole('Final simplified context image attempt succeeded with Fal.ai', 'success');
        return imageUrl;
    } catch (finalError) {
        logToConsole(`Final simplified attempt also failed: ${finalError.message}`, 'error');
    }

    throw new Error(`Context image generation failed after ${maxReasonableAttempts} attempts with Fal.ai. Please try again.`);
}

// Verify image loaded successfully before proceeding (from UPDATE STORYGEN)
async function verifyImageLoaded(imageUrl, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            logToConsole(`Image verification attempt ${attempt}/${maxRetries}...`, 'info');

            // Create a temporary image element to test loading
            const testImage = new Image();
            const loadPromise = new Promise((resolve, reject) => {
                testImage.onload = () => {
                    if (testImage.naturalWidth > 0 && testImage.naturalHeight > 0) {
                        resolve(true);
                    } else {
                        reject(new Error('Image loaded but has invalid dimensions'));
                    }
                };
                testImage.onerror = () => reject(new Error('Image failed to load'));

                // Set a timeout
                setTimeout(() => reject(new Error('Image loading timeout')), 10000);
            });

            testImage.src = imageUrl;
            await loadPromise;

            logToConsole(`Image verification successful on attempt ${attempt}`, 'success');
            return true;

        } catch (error) {
            logToConsole(`Image verification attempt ${attempt} failed: ${error.message}`, 'warning');
            if (attempt === maxRetries) {
                return false;
            }
            // Brief delay before retry
            await workerDelay(1000);
        }
    }
    return false;
}

// Generate scene image with context (base function - adds prompt enhancements)
async function generateSceneImageBase(prompt, contextImageUrl, sceneNumber) {
    // Add character positioning enhancement to prompt
    const characterCount = window.accurateCharacterCount ? window.accurateCharacterCount.totalCount : 2;
    const enhancedPrompt = `${prompt}. Evenly spaced, full-body view inside the background, consistent proportions. Exact ${characterCount} characters visible in the image`;

    logToConsole(`Scene ${sceneNumber}: Enhanced prompt (last 100 chars): ...${enhancedPrompt.substring(enhancedPrompt.length - 100)}`, 'info');

    // Use Fal.ai nano-banana/edit for scene generation with character consistency (base function, no retry)
    const imageUrl = await window.FalAI.generateSceneImage(enhancedPrompt, contextImageUrl, sceneNumber);

    logToConsole(`Scene ${sceneNumber}: Image generated successfully with Fal.ai`, 'success');
    return imageUrl;
}

// Image Dimension Validation with retry logic to wait for CDN propagation
// This prevents unnecessary regeneration when fal.ai successfully generated the image
// but it's not yet accessible on their CDN
async function validateImageDimensions(imageUrl, maxRetries = 6) {
    // Wait 5 seconds after receiving URL from fal.ai to give CDN time to propagate
    logToConsole('⏳ Waiting 5 seconds for fal.ai CDN propagation before validation...', 'info');
    await workerDelay(5000);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            logToConsole(`🔍 Image validation attempt ${attempt}/${maxRetries} (waiting for CDN)...`, 'info');

            const result = await new Promise((resolve, reject) => {
                const img = new Image();

                // 30 second timeout per attempt - should be enough once CDN has the image
                const timeout = setTimeout(() => {
                    reject(new Error(`Image not accessible after 30 seconds (attempt ${attempt}) - CDN may still be propagating`));
                }, 30000);

                img.onload = function() {
                    clearTimeout(timeout);
                    const width = this.naturalWidth;
                    const height = this.naturalHeight;

                    // Fal.ai returns requested dimensions - accept any reasonable size
                    const isValidDimension = (width > 512 && height > 512);

                    resolve({
                        width,
                        height,
                        isValid: isValidDimension,
                        expected: 'minimum 512x512',
                        actual: `${width} × ${height}`
                    });
                };

                img.onerror = function(error) {
                    clearTimeout(timeout);
                    reject(new Error(`Image failed to load (attempt ${attempt}): ${error.message || 'Unknown error'}`));
                };

                // Fal.ai images support CORS
                img.crossOrigin = 'anonymous';
                img.src = imageUrl + '?t=' + Date.now(); // Add cache buster
            });

            // If we got here, image loaded successfully
            logToConsole(`✅ Image validation successful on attempt ${attempt} - CDN ready`, 'success');
            return result;

        } catch (error) {
            logToConsole(`⚠️ Image validation attempt ${attempt} failed: ${error.message}`, 'warning');

            // If this is not the last attempt, wait before retrying
            if (attempt < maxRetries) {
                const waitTime = 5000; // Wait 5 seconds between attempts
                logToConsole(`⏳ Waiting ${waitTime/1000} seconds for CDN to become ready...`, 'info');
                await workerDelay(waitTime);
            } else {
                // Last attempt failed - this means the image truly isn't accessible
                logToConsole(`❌ Image validation failed after ${maxRetries} attempts (${5 + maxRetries * 30 + (maxRetries - 1) * 5} seconds total wait time)`, 'error');
                throw new Error(`Image validation failed after ${maxRetries} attempts. Image URL from fal.ai may be invalid or CDN is experiencing issues.`);
            }
        }
    }
}

// Generate single scene with UNLIMITED retries until success (matching thumbnail pattern)
// NOTE: The validation function now waits properly for fal.ai CDN propagation,
// which prevents unnecessary regeneration when fal.ai successfully created the image
// but it's not immediately accessible on their CDN yet.
async function generateSingleSceneWithValidation(scenePrompt, contextImageUrl, sceneNumber, sceneData) {
    let attempt = 1;
    const startTime = Date.now();
    const timeoutMinutes = 10; // 10 minute timeout per scene
    const timeoutMs = timeoutMinutes * 60 * 1000;

    while (true) { // Unlimited retries until success or timeout
        try {
            // Check timeout
            if (Date.now() - startTime > timeoutMs) {
                throw new Error(`Scene ${sceneNumber} generation timed out after ${timeoutMinutes} minutes (${attempt} attempts)`);
            }

            logToConsole(`🔄 Scene ${sceneNumber} generation attempt ${attempt}...`, 'info');

            // Add delay BEFORE attempt (except first) to prevent API rate limiting
            if (attempt > 1) {
                const delay = Math.min(1000 * Math.pow(2, Math.min(attempt - 2, 4)), 5000);
                logToConsole(`⏳ Waiting ${delay/1000} seconds before regeneration attempt...`, 'info');
                await workerDelay(delay);
            }

            // Update progress with attempt info for scenes that need multiple tries
            if (attempt > 1) {
                updateProgress(60 + ((sceneNumber - 1) * 35 / 1), `Creating scene ${sceneNumber} of 1 (attempt ${attempt})...`);
            }

            // STEP 1: Generate scene image via fal.ai API (gets URL immediately)
            logToConsole(`📡 Scene ${sceneNumber}: Requesting image generation from fal.ai...`, 'info');
            const sceneImageUrl = await generateSceneImageBase(scenePrompt, contextImageUrl, sceneNumber);
            logToConsole(`📡 Scene ${sceneNumber}: Received URL from fal.ai, now validating accessibility...`, 'info');

            // STEP 2: Validate image dimensions (waits for CDN propagation with internal retries)
            // This function will retry validation for up to ~210 seconds before giving up
            // This prevents unnecessary regeneration when fal.ai succeeded but CDN needs time
            const dimensionValidation = await validateImageDimensions(sceneImageUrl);

            if (!dimensionValidation.isValid) {
                logToConsole(`Scene ${sceneNumber}: ❌ Invalid dimensions: ${dimensionValidation.actual}, expected ${dimensionValidation.expected}`, 'warning');
                logToConsole(`Scene ${sceneNumber}: Will regenerate with new fal.ai request`, 'warning');
                throw new Error(`Invalid image dimensions: ${dimensionValidation.actual}`);
            }

            // If we reach here, validation passed - return successful result
            logToConsole(`✅ Scene ${sceneNumber} generated successfully on generation attempt ${attempt}`, 'success');
            logToConsole(`Scene ${sceneNumber}: ✅ Image dimensions validated (${dimensionValidation.actual})`, 'success');

            return {
                sceneNumber: sceneNumber,
                imageUrl: sceneImageUrl,
                sceneData: sceneData,
                scenePrompt: scenePrompt,
                attempts: attempt,
                dimensionValidation: dimensionValidation
            };

        } catch (error) {
            const isGenerationError = error.message.includes('generation') || error.message.includes('fal.ai') || error.message.includes('Failed to load image');
            const isValidationError = error.message.includes('validation') || error.message.includes('CDN');

            if (isValidationError) {
                logToConsole(`⚠️ Scene ${sceneNumber} attempt ${attempt}: Image validation/CDN issue - ${error.message}`, 'warning');
                logToConsole(`🔄 Will regenerate scene ${sceneNumber} with new fal.ai request (this costs API credits)`, 'warning');
            } else if (isGenerationError) {
                logToConsole(`⚠️ Scene ${sceneNumber} attempt ${attempt}: fal.ai generation error - ${error.message}`, 'warning');
            } else {
                logToConsole(`⚠️ Scene ${sceneNumber} attempt ${attempt} failed: ${error.message}`, 'warning');
            }

            // If timeout error, throw immediately
            if (error.message.includes('timed out')) {
                return {
                    sceneNumber: sceneNumber,
                    imageUrl: null,
                    sceneData: sceneData,
                    scenePrompt: scenePrompt,
                    attempts: attempt,
                    error: error.message
                };
            }

            attempt++;
            // Continue to next iteration (retry full generation)
        }
    }
}

// Generate all scene images sequentially with validation
async function generateSceneImages(scenePrompts, contextImageUrl, scenes) {
    // FULL MODE: Generate scenes 1-10
    logToConsole('🎬 FULL MODE: Generating images for Scenes 1-10...', 'info');
    logToConsole('📌 All scenes will use the context image as reference for consistency', 'info');

    const totalScenes = scenePrompts.length;
    const generatedScenes = [];
    const maxScenesToGenerate = 10; // FULL MODE: Generate all 10 scenes
    const testSceneIndexes = Array.from({ length: Math.min(maxScenesToGenerate, totalScenes) }, (_, i) => i); // [0-9] for scenes 1-10
    const delayBetweenScenes = 2000; // 2 second delay between scenes

    console.log('\n🖼️ ========== IMAGE GENERATION STARTED ==========');
    console.log(`   Total scenes in story: ${totalScenes}`);
    console.log(`   Scenes to generate: ${testSceneIndexes.length} (Scenes 1-10)`);
    console.log(`   Reference image: CONTEXT IMAGE (same for all scenes)`);
    console.log(`   💰 Expected API calls: ${testSceneIndexes.length} (10 scene images)`);
    console.log('==================================================\n');

    // Generate placeholder results for all scenes
    for (let i = 0; i < totalScenes; i++) {
        if (testSceneIndexes.includes(i)) {
            // Generate image for this scene
            const sceneNumber = i + 1;
            const scenePrompt = scenePrompts[i];
            const sceneData = scenes[i];

            // ALL scenes use the same context image as reference
            const referenceImageUrl = contextImageUrl;
            logToConsole(`🎬 Generating Scene ${sceneNumber} using CONTEXT IMAGE as reference...`, 'info');

            updateProgress(70 + (sceneNumber * 1), `Creating scene ${sceneNumber} image...`);

            const sceneResult = await generateSingleSceneWithValidation(scenePrompt, referenceImageUrl, sceneNumber, sceneData);
            generatedScenes.push(sceneResult);

            if (sceneResult.imageUrl) {
                logToConsole(`✅ Scene ${sceneNumber} completed successfully (${sceneResult.attempts} attempts)`, 'success');
            } else {
                logToConsole(`❌ Scene ${sceneNumber} failed after ${sceneResult.attempts} attempts`, 'error');
            }

            // Add delay before next scene
            if (i < testSceneIndexes[testSceneIndexes.length - 1]) {
                logToConsole(`⏳ Waiting ${delayBetweenScenes}ms before next scene...`, 'info');
                await workerDelay(delayBetweenScenes);
            }
        } else {
            // Skip scenes beyond 10 (if story has more than 10 scenes)
            const sceneNumber = i + 1;
            console.log(`⚠️ Scene ${sceneNumber} - SKIPPING (beyond scene limit)`);

            // Placeholder for skipped scenes
            generatedScenes.push({
                sceneNumber: sceneNumber,
                imageUrl: null,
                attempts: 0,
                prompt: scenePrompts[i],
                skipped: true
            });
        }
    }

    const successfulScenes = generatedScenes.filter(s => s.imageUrl).length;
    const skippedScenes = generatedScenes.filter(s => s.skipped).length;

    console.log('\n🖼️ ============================================');
    console.log('🖼️ IMAGE GENERATION COMPLETE SUMMARY');
    console.log('🖼️ ============================================');
    console.log(`✅ Successfully generated: ${successfulScenes} images (Scenes 1-10)`);
    console.log(`❌ Failed: ${generatedScenes.length - successfulScenes - skippedScenes} images`);
    console.log(`⚠️ Skipped: ${skippedScenes} scenes`);
    console.log(`💰 Total API calls made: ${successfulScenes}`);
    console.log('🖼️ ============================================\n');
    logToConsole(`🎉 Image generation completed: ${successfulScenes}/${testSceneIndexes.length} scenes generated`, 'info');
    return generatedScenes;
}

// Parse response into structured data
function parseComprehensiveResponse(fullResponse) {
    // Check if response contains Step 5 (gamification)
    const hasStep5 = fullResponse.includes('=== STEP 5 RESULT ===');
    const stepCount = hasStep5 ? 5 : 4;

    logToConsole(`Parsing ${stepCount}-step response...`, 'info');

    const parsedResponse = {
        step1: '',
        step2: '',
        step3: '',
        step4: '',
        step5: ''
    };

    // Split by step headers
    const step1Match = fullResponse.match(/=== STEP 1 RESULT ===([\s\S]*?)(?:=== STEP 2 RESULT ===|$)/);
    const step2Match = fullResponse.match(/=== STEP 2 RESULT ===([\s\S]*?)(?:=== STEP 3 RESULT ===|$)/);
    const step3Match = fullResponse.match(/=== STEP 3 RESULT ===([\s\S]*?)(?:=== STEP 4 RESULT ===|$)/);
    const step4Match = fullResponse.match(/=== STEP 4 RESULT ===([\s\S]*?)(?:=== STEP 5 RESULT ===|$)/);
    const step5Match = fullResponse.match(/=== STEP 5 RESULT ===([\s\S]*?)$/);

    if (step1Match) parsedResponse.step1 = step1Match[1].trim();
    if (step2Match) parsedResponse.step2 = step2Match[1].trim();
    if (step3Match) parsedResponse.step3 = step3Match[1].trim();
    if (step4Match) parsedResponse.step4 = step4Match[1].trim();
    if (step5Match) parsedResponse.step5 = step5Match[1].trim();

    logToConsole(`Parsed ${Object.keys(parsedResponse).filter(key => parsedResponse[key]).length} steps successfully`, 'success');
    return parsedResponse;
}

// Parse story scenes from Step 1
function parseStoryScenes(step1Content) {
    const scenes = [];
    const lines = step1Content.split('\n');
    let currentScene = null;
    let inNarration = false;
    let narrationLines = [];
    let storyTitle = '';

    for (const line of lines) {
        const trimmedLine = line.trim();

        // Check for story title
        const titleMatch = trimmedLine.match(/^Story Title:\s*(.+)$/i);
        if (titleMatch) {
            storyTitle = titleMatch[1].trim();
            continue;
        }

        // Check for scene markers
        const sceneMatch = trimmedLine.match(/Scene (\d+)/i);
        if (sceneMatch) {
            if (currentScene) {
                // Store collected narration lines
                if (narrationLines.length > 0) {
                    currentScene.narration = narrationLines.join('\n');
                    currentScene.narrationLines = [...narrationLines]; // Preserve array for TTS
                }
                scenes.push(currentScene);
            }
            currentScene = {
                number: parseInt(sceneMatch[1]),
                narration: '',
                narrationLines: [], // Initialize for TTS
                characters: '',
                visualDescription: ''
            };
            inNarration = false;
            narrationLines = [];
            continue;
        }

        if (currentScene) {
            // Check for Narration section
            if (trimmedLine.startsWith('Narration:') || trimmedLine.startsWith('Narration/Dialogue:')) {
                inNarration = true;
                narrationLines = [];
                continue;
            }

            // Check for end of narration section
            if (trimmedLine.startsWith('Characters in Scene:')) {
                inNarration = false;
                if (narrationLines.length > 0) {
                    currentScene.narration = narrationLines.join('\n');
                    currentScene.narrationLines = [...narrationLines]; // Preserve array for TTS
                }
                currentScene.characters = trimmedLine.replace('Characters in Scene:', '').trim();
                continue;
            }

            if (trimmedLine.startsWith('Visual Description')) {
                inNarration = false;
                currentScene.visualDescription = trimmedLine.replace(/Visual Description.*?:/, '').trim();
                continue;
            }

            // Collect narration lines (numbered 1-6 or plain sentences)
            if (inNarration && trimmedLine.length > 0) {
                // Remove line numbers (1., 2., etc.) and transitions
                let cleanLine = trimmedLine.replace(/^\d+\.\s*/, '').trim();

                // Remove brackets at start and end (e.g., "[text –" or "text]")
                cleanLine = cleanLine.replace(/^\[/, '').replace(/\]$/, '').trim();

                // Remove trailing dashes/hyphens
                cleanLine = cleanLine.replace(/[–-]\s*$/, '').trim();

                // Remove transition markers
                cleanLine = cleanLine.replace(/\(→\s*Transition:.*?\)$/i, '').trim();
                cleanLine = cleanLine.replace(/→\s*Transition:.*$/i, '').trim();

                if (cleanLine.length > 0) {
                    narrationLines.push(cleanLine);
                }
            }
        }
    }

    // Add the last scene
    if (currentScene) {
        if (narrationLines.length > 0) {
            currentScene.narration = narrationLines.join('\n');
            currentScene.narrationLines = [...narrationLines]; // Preserve array for TTS
        }
        scenes.push(currentScene);
    }

    logToConsole(`Parsed ${scenes.length} scenes from Step 1 (expected 10)`, 'info');

    // Ensure we have exactly 10 scenes
    if (scenes.length !== 10) {
        logToConsole(`⚠️ WARNING: Expected 10 scenes but got ${scenes.length}`, 'warning');

        // If we have fewer than 10, create basic fallback scenes
        while (scenes.length < 10) {
            const sceneNumber = scenes.length + 1;
            const fallbackNarration = `This is scene ${sceneNumber} of our educational story.`;
            scenes.push({
                number: sceneNumber,
                title: `Scene ${sceneNumber}`,
                narration: fallbackNarration,
                narrationLines: [fallbackNarration], // Single line for TTS
                characters: scenes[0]?.characters || ['Character 1', 'Character 2'],
                visualDescription: `Scene ${sceneNumber} visual description`
            });
            logToConsole(`Added fallback scene ${sceneNumber}`, 'warning');
        }
    }

    return {
        title: storyTitle || 'Educational Story',
        scenes: scenes
    };
}

// Parse scene image prompts from Step 4
function parseSceneImagePrompts(step4Content) {
    const prompts = [];
    const sceneBlocks = step4Content.split(/Scene \d+:/i);

    logToConsole(`Split step4Content into ${sceneBlocks.length} blocks`, 'info');
    logToConsole(`First 200 chars of step4Content: ${step4Content.substring(0, 200)}...`, 'info');

    // Skip the first empty element
    for (let i = 1; i < sceneBlocks.length; i++) {
        let block = sceneBlocks[i].trim();

        if (block) {
            // Clean up the block by removing content after scene separators
            // Stop at: ---, ## Scene, or other scene delimiters
            const separatorMatch = block.match(/(.*?)(?:\n\s*---|\n\s*##\s*Scene|\n\s*Scene\s+\d+\.)/s);
            if (separatorMatch) {
                block = separatorMatch[1].trim();
                logToConsole(`Cleaned scene ${i} at separator (new length: ${block.length})`, 'info');
            }

            prompts.push(`Scene ${i}: ${block}`);
            logToConsole(`Added scene ${i} prompt (length: ${block.length})`, 'info');
        } else {
            logToConsole(`Scene ${i} block is empty or whitespace only`, 'warning');
        }
    }

    logToConsole(`Parsed ${prompts.length} scene image prompts from Step 4 (expected 10)`, 'info');

    // Ensure we have exactly 10 prompts
    if (prompts.length !== 10) {
        logToConsole(`⚠️ WARNING: Expected 10 scene prompts but got ${prompts.length}`, 'warning');

        // If we have fewer than 10, duplicate the last prompt for missing scenes
        while (prompts.length < 10) {
            const lastPrompt = prompts[prompts.length - 1] || 'Default scene prompt';
            prompts.push(`Scene ${prompts.length + 1}: ${lastPrompt.replace(/Scene \d+:/, '').trim()}`);
            logToConsole(`Added fallback prompt for scene ${prompts.length}`, 'warning');
        }
    }

    return prompts;
}

// Parse gamification data from Step 5
function parseGamificationData(step5Content) {
    if (!step5Content || step5Content.trim() === '') {
        logToConsole('No gamification data to parse', 'info');
        return {};
    }

    console.log('🎮 DEBUG: Step 5 Content received:', step5Content.substring(0, 500) + '...');
    logToConsole('Parsing gamification data from Step 5...', 'info');

    const gamificationData = {};

    // Check if there's a "Post-Story Review" section for after-story questions
    const postStoryMatch = step5Content.match(/Post-Story Review([\s\S]*?)$/i);
    let afterStoryQuestions = [];

    if (postStoryMatch) {
        logToConsole('Found Post-Story Review section', 'info');
        const postStoryContent = postStoryMatch[1];

        // Parse individual after-story questions
        // Support both "Question N:" and "N." formats
        const questionBlocks = postStoryContent.split(/(?:Question\s+\d+:|(?:^|\n)\d+\.)/gm).filter(block => block.trim());

        questionBlocks.forEach((block, index) => {
            const questionNumber = index + 1;

            // Extract question text - everything before "Choices:" or first choice letter
            const questionMatch = block.match(/^\s*(.*?)(?=\s*(?:Choices:|[A-D]\)))/s);

            // Extract choices - handle both formats:
            // Format 1 (multi-line): "Choices:\nA) ...\nB) ...\nC) ...\nD) ..."
            // Format 2 (single-line): "Choices: A) ... B) ... C) ... D) ..."
            let choicesMatch = block.match(/Choices:\s*(.*?)(?=Correct Answer:|$)/s);

            // Extract correct answer
            const correctAnswerMatch = block.match(/Correct Answer:\s*([A-D])\)\s*(.*?)(?=\n|$)/s);

            if (questionMatch && choicesMatch && correctAnswerMatch) {
                const choicesText = choicesMatch[1].trim();
                const choices = [];

                // Parse choices - works for both single-line and multi-line formats
                // This regex captures: A) text B) text C) text D) text
                const choiceMatches = choicesText.match(/([A-D])\)\s*([^A-D\n][^\n]*?)(?=\s*[A-D]\)|$)/g);

                if (choiceMatches) {
                    choiceMatches.forEach(choice => {
                        const parts = choice.match(/([A-D])\)\s*(.+?)$/s);
                        if (parts) {
                            choices.push({
                                letter: parts[1],
                                text: parts[2].trim() || '[Missing text]'
                            });
                        }
                    });
                }

                // Ensure we have exactly 4 choices
                const requiredLetters = ['A', 'B', 'C', 'D'];
                requiredLetters.forEach(letter => {
                    if (!choices.find(c => c.letter === letter)) {
                        choices.push({
                            letter: letter,
                            text: '[Missing option]'
                        });
                    }
                });

                choices.sort((a, b) => a.letter.localeCompare(b.letter));

                afterStoryQuestions.push({
                    questionNumber: questionNumber,
                    question: questionMatch[1].trim(),
                    choices: choices,
                    correctAnswer: {
                        letter: correctAnswerMatch[1],
                        text: correctAnswerMatch[2].trim()
                    }
                });

                logToConsole(`🎮 After-Story Q${questionNumber}: "${questionMatch[1].trim()}"`, 'success');
            }
        });
    }

    // Parse scene-based (during-story) questions
    const sceneBlocks = step5Content.split(/Scene \d+/i).filter(block => block.trim());

    sceneBlocks.forEach((block, index) => {
        const sceneNumber = index + 1;
        const sceneContent = block.trim();

        if (sceneContent && sceneNumber) {
            // Check if this scene has a question
            const hasQuestion = sceneContent.includes('Question:') && !sceneContent.includes('Post-Story Review');

            if (hasQuestion) {
                const narrationMatch = sceneContent.match(/Narration:\s*(.*?)(?=Question:|$)/s);

                // Extract question text - everything before "Choices:" or first choice letter
                const questionMatch = sceneContent.match(/Question:\s*(.*?)(?=\s*Choices:|$)/s);

                // Extract choices - handle both formats:
                // Format 1 (multi-line): "Choices:\nA) ...\nB) ...\nC) ...\nD) ..."
                // Format 2 (single-line): "Choices: A) ... B) ... C) ... D) ..."
                const choicesMatch = sceneContent.match(/Choices:\s*(.*?)(?=Correct Answer:|$)/s);

                // Extract correct answer
                const correctAnswerMatch = sceneContent.match(/Correct Answer:\s*([A-D])\)\s*(.*?)(?=\n|$)/s);

                if (questionMatch && choicesMatch && correctAnswerMatch) {
                    // Parse choices into array
                    const choicesText = choicesMatch[1].trim();
                    const choices = [];

                    // Parse choices - works for both single-line and multi-line formats
                    // This regex captures: A) text B) text C) text D) text
                    const choiceMatches = choicesText.match(/([A-D])\)\s*([^A-D\n][^\n]*?)(?=\s*[A-D]\)|$)/g);

                    if (choiceMatches) {
                        choiceMatches.forEach(choice => {
                            const parts = choice.match(/([A-D])\)\s*(.+?)$/s);
                            if (parts) {
                                const choiceText = parts[2].trim();
                                choices.push({
                                    letter: parts[1],
                                    text: choiceText || '[Missing text]'
                                });
                            }
                        });
                    }

                    // Ensure we have exactly 4 choices (A, B, C, D)
                    const requiredLetters = ['A', 'B', 'C', 'D'];
                    requiredLetters.forEach(letter => {
                        const existingChoice = choices.find(c => c.letter === letter);
                        if (!existingChoice) {
                            choices.push({
                                letter: letter,
                                text: '[Missing option]'
                            });
                        }
                    });

                    // Sort choices by letter
                    choices.sort((a, b) => a.letter.localeCompare(b.letter));

                    // Create correct answer object with letter and text
                    const correctAnswerLetter = correctAnswerMatch[1];
                    const correctAnswerText = correctAnswerMatch[2].trim();

                    // Clean narration: remove line numbers and transitions
                    let cleanedNarration = '';
                    if (narrationMatch) {
                        const narrationText = narrationMatch[1].trim();
                        const narrationLines = narrationText.split('\n');
                        const processedLines = [];

                        narrationLines.forEach(line => {
                            let cleanLine = line.trim();
                            // Remove line numbers (1., 2., etc.)
                            cleanLine = cleanLine.replace(/^\d+\.\s*/, '');
                            // Remove transition markers
                            cleanLine = cleanLine.replace(/\(→\s*Transition:.*?\)$/i, '').trim();
                            cleanLine = cleanLine.replace(/→\s*Transition:.*$/i, '').trim();

                            if (cleanLine.length > 0) {
                                processedLines.push(cleanLine);
                            }
                        });

                        cleanedNarration = processedLines.join('\n');
                    }

                    gamificationData[sceneNumber] = {
                        hasQuestion: true,
                        narration: cleanedNarration,
                        question: questionMatch[1].trim(),
                        choices: choices,
                        correctAnswer: {
                            letter: correctAnswerLetter,
                            text: correctAnswerText
                        }
                    };

                    logToConsole(`🎮 Scene ${sceneNumber}: Question parsed - "${questionMatch[1].trim()}"`, 'success');
                }
            } else {
                // Scene without question
                const narrationMatch = sceneContent.match(/Narration:\s*(.*?)$/s);

                // Clean narration: remove line numbers and transitions
                let cleanedNarration = '';
                if (narrationMatch) {
                    const narrationText = narrationMatch[1].trim();
                    const narrationLines = narrationText.split('\n');
                    const processedLines = [];

                    narrationLines.forEach(line => {
                        let cleanLine = line.trim();
                        // Remove line numbers (1., 2., etc.)
                        cleanLine = cleanLine.replace(/^\d+\.\s*/, '');
                        // Remove transition markers
                        cleanLine = cleanLine.replace(/\(→\s*Transition:.*?\)$/i, '').trim();
                        cleanLine = cleanLine.replace(/→\s*Transition:.*$/i, '').trim();

                        if (cleanLine.length > 0) {
                            processedLines.push(cleanLine);
                        }
                    });

                    cleanedNarration = processedLines.join('\n');
                }

                gamificationData[sceneNumber] = {
                    hasQuestion: false,
                    narration: cleanedNarration
                };
            }
        }
    });

    // Add after-story questions to the gamification data
    if (afterStoryQuestions.length > 0) {
        gamificationData.afterStoryQuestions = afterStoryQuestions;
        logToConsole(`🎮 Parsed ${afterStoryQuestions.length} after-story questions`, 'success');
    }

    console.log('🎮 Final parsed gamification data:', gamificationData);
    return gamificationData;
}

// Gamification checkbox selection logic
function initializeGamificationOptions() {
    const checkboxes = document.querySelectorAll('input[name="questionTypes"]');
    const counter = document.getElementById('selectionCounter');

    function updateSelectionCounter() {
        const checkedBoxes = document.querySelectorAll('input[name="questionTypes"]:checked');
        const count = checkedBoxes.length;

        if (counter) {
            counter.textContent = `(Select up to 2) - ${count}/2 selected`;
        }
    }

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const checkedBoxes = document.querySelectorAll('input[name="questionTypes"]:checked');

            if (checkedBoxes.length >= 2) {
                // Disable unchecked checkboxes
                checkboxes.forEach(cb => {
                    if (!cb.checked) {
                        cb.disabled = true;
                        cb.parentElement.style.opacity = '0.5';
                        cb.parentElement.style.pointerEvents = 'none';
                    }
                });
            } else {
                // Enable all checkboxes
                checkboxes.forEach(cb => {
                    cb.disabled = false;
                    cb.parentElement.style.opacity = '1';
                    cb.parentElement.style.pointerEvents = 'auto';
                });
            }

            updateSelectionCounter();
        });
    });

    updateSelectionCounter();
}

// Get selected question types
function getSelectedQuestionTypes() {
    const checkedBoxes = document.querySelectorAll('input[name="questionTypes"]:checked');
    return Array.from(checkedBoxes).map(cb => cb.value);
}

// Get question timing selection (during, after, or both)
function getQuestionTiming() {
    const timingRadio = document.querySelector('input[name="questionTiming"]:checked');
    return timingRadio ? timingRadio.value : 'during'; // Default to 'during' if not found
}

// MAIN STORY GENERATION FUNCTION - EXACT 5-STEP PROCESS
async function generateComprehensiveStory() {
    try {
        // Reset abort flag
        storyGenerationAborted = false;
        logToConsole('Starting comprehensive story generation with exact 5-step process...', 'info');

        // Validate question timing and types
        const questionTiming = getQuestionTiming();
        const selectedQuestionTypes = getSelectedQuestionTypes();

        // If timing is 'during' or 'both', question types must be selected
        if ((questionTiming === 'during' || questionTiming === 'both') && selectedQuestionTypes.length === 0) {
            if (typeof notificationSystem !== 'undefined') {
                notificationSystem.error('Please select at least one question type for interactive questions during the story.');
            } else {
                alert('Please select at least one question type for interactive questions during the story.');
            }
            return;
        }

        // Get custom inputs from user
        const customInputs = getCustomInputs();

        // Validate custom inputs
        if (customInputs === null) {
            // Validation failed, don't proceed
            if (typeof notificationSystem !== 'undefined') {
                notificationSystem.error('Character validation error: If you provide character names, both names and genders must be filled out completely.');
            } else {
                alert('Character validation error: If you provide character names, both names and genders must be filled out completely.');
            }
            return;
        }

        // Show progress modal
        const progressModal = document.getElementById('progressModal');
        let modal = null;
        if (progressModal) {
            modal = new bootstrap.Modal(progressModal);
            modal.show();

            // Update progress modal with gamification info
            const selectedQuestionTypes = getSelectedQuestionTypes();
            if (selectedQuestionTypes.length > 0) {
                const gamificationProgress = document.getElementById('gamificationProgress');
                const gamificationDetails = document.getElementById('gamificationDetails');
                if (gamificationProgress) {
                    gamificationProgress.classList.remove('hidden');
                }
                if (gamificationDetails) {
                    gamificationDetails.textContent = `Selected: ${selectedQuestionTypes.join(', ')}`;
                }
            }
        }

        // Update progress
        updateProgress(10, 'Getting started...');

        // Get form data
        const storyPrompt = customInputs.customTheme || '';

        // Use the question types and timing already retrieved at the start
        const questionTypesString = selectedQuestionTypes.length > 0 ? selectedQuestionTypes.join(', ') : 'None selected';

        logToConsole(`🎮 Gamification check: ${selectedQuestionTypes.length} question types selected: ${questionTypesString}`, 'info');
        logToConsole(`🎮 Question timing: ${questionTiming}`, 'info');
        updateProgress(15, 'Building your story...');

        // Determine character count: use custom if provided, otherwise random
        let finalCharacterCount;
        let characterRequirements = '';

        // Debug: Log character input values
        if (customInputs.characters && customInputs.characters.length > 0) {
            const charList = customInputs.characters.map((c, i) => `C${i+1}="${c.name}"|G${i+1}="${c.gender}"`).join('|');
            logToConsole(`📝 Character inputs: ${charList}`, 'info');
        } else {
            logToConsole(`📝 No custom characters provided - will use random generation`, 'info');
        }

        if (customInputs.characters && customInputs.characters.length > 0) {
            // Use custom characters when provided
            finalCharacterCount = customInputs.characters.length;

            // Build character list
            let characterList = '';
            customInputs.characters.forEach((char, index) => {
                characterList += `  • Character ${index + 1}: ${char.name} (${char.gender})\n`;
            });

            characterRequirements = `
CHARACTER REQUIREMENTS:
- Use ONLY exactly these ${finalCharacterCount} characters - NO MORE, NO LESS:
${characterList}- DO NOT create any additional characters beyond this list
- DO NOT add extra characters, background characters, or unnamed characters
- All ${finalCharacterCount} characters must appear consistently in all 10 scenes
- STRICT LIMIT: The story must have exactly ${finalCharacterCount} characters, not ${finalCharacterCount + 1} or more`;
            logToConsole(`Using ${finalCharacterCount} custom characters: ${customInputs.characters.map(c => c.name).join(', ')}`, 'info');

            // Store accurate character count globally
            window.accurateCharacterCount = {
                totalCount: finalCharacterCount,
                humanCount: finalCharacterCount,
                animalCount: 0
            };
        } else {
            // Check if character count was suggested from prompt
            const suggestedCount = localStorage.getItem('suggestedCharacterCount');
            const promptText = customInputs.customTheme || '';

            // Try to extract character count from the prompt text itself
            let extractedCount = 0;
            if (promptText) {
                extractedCount = extractCharacterCountFromText(promptText);
            }

            // Priority: 1) extracted from prompt, 2) suggested from click, 3) random
            if (extractedCount > 0) {
                finalCharacterCount = extractedCount;
                logToConsole(`📝 Using character count from prompt text: ${finalCharacterCount}`, 'info');
            } else if (suggestedCount && parseInt(suggestedCount) >= 2 && parseInt(suggestedCount) <= 5) {
                finalCharacterCount = parseInt(suggestedCount);
                logToConsole(`💡 Using suggested character count from clicked idea: ${finalCharacterCount}`, 'info');
                // Clear the suggestion after using it
                localStorage.removeItem('suggestedCharacterCount');
            } else {
                // Generate random character count (2-5) when no suggestion
                const randomValue = Math.random(); // Get random value 0-1
                finalCharacterCount = Math.floor(randomValue * 4) + 2; // Random between 2-5
                logToConsole(`🎲 Random character count: Math.random()=${randomValue.toFixed(3)} → ${finalCharacterCount} characters`, 'info');
            }

            // Animal inclusion logic: 40% chance to include an animal
            const animalRoll = Math.random();
            const includeAnimal = animalRoll < 0.4; // 40% chance to include an animal
            const humanCount = includeAnimal ? finalCharacterCount - 1 : finalCharacterCount;
            const animalCount = includeAnimal ? 1 : 0;
            logToConsole(`🐾 Animal roll: ${animalRoll.toFixed(3)} → ${includeAnimal ? 'Including animal' : 'No animal'}`, 'info');

            // Generate random character names
            const usedNames = new Set();
            const characters = [];

            // Helper function to get unique random name
            const getRandomName = (type) => {
                const nameList = CHARACTER_NAMES[type];
                let attempts = 0;
                let name;
                do {
                    name = nameList[Math.floor(Math.random() * nameList.length)];
                    attempts++;
                } while (usedNames.has(name) && attempts < 50);
                usedNames.add(name);
                return name;
            };

            // Distribute boys and girls randomly for human characters
            let boysCount = 0;
            let girlsCount = 0;

            for (let i = 0; i < humanCount; i++) {
                const isBoy = Math.random() < 0.5;
                if (isBoy) {
                    const name = getRandomName('boy');
                    characters.push({ name, gender: 'boy' });
                    boysCount++;
                } else {
                    const name = getRandomName('girl');
                    characters.push({ name, gender: 'girl' });
                    girlsCount++;
                }
            }

            // Add animal if needed
            let animalName = '';
            let animalType = '';
            if (includeAnimal) {
                const animalTypes = [
                    'dog (golden retriever puppy)',
                    'dog (labrador puppy)',
                    'dog (beagle puppy)',
                    'dog (corgi puppy)',
                    'dog (poodle puppy)',
                    'cat (tabby kitten)',
                    'cat (calico kitten)',
                    'cat (siamese kitten)',
                    'cat (persian kitten)',
                    'rabbit (white bunny)',
                    'rabbit (brown bunny)',
                    'rabbit (spotted bunny)',
                    'hamster (golden hamster)',
                    'hamster (dwarf hamster)',
                    'guinea pig',
                    'small bird (parakeet)',
                    'small bird (canary)',
                    'turtle (small pet turtle)'
                ];
                animalType = animalTypes[Math.floor(Math.random() * animalTypes.length)];
                animalName = getRandomName('animal');
                characters.push({ name: animalName, gender: 'animal', type: animalType });
            }

            // Build character requirements string
            let characterList = '';
            characters.forEach((char) => {
                if (char.gender === 'animal') {
                    characterList += `  • ${char.name} - a friendly ${char.type}\n`;
                } else {
                    characterList += `  • ${char.name} (${char.gender})\n`;
                }
            });

            if (includeAnimal) {
                characterRequirements = `
CHARACTER REQUIREMENTS:
- Create ONLY exactly ${finalCharacterCount} characters total - NO MORE, NO LESS (${boysCount} boy${boysCount !== 1 ? 's' : ''}, ${girlsCount} girl${girlsCount !== 1 ? 's' : ''}, and 1 animal)
- ONLY use these character names and types - DO NOT create any additional characters:
${characterList}- DO NOT add extra characters, background characters, or unnamed characters beyond this list
- All ${finalCharacterCount} characters must appear consistently in all 10 scenes
- STRICT LIMIT: The story must have exactly ${finalCharacterCount} characters, not ${finalCharacterCount + 1} or more`;
                logToConsole(`🎲 Randomly generated: ${boysCount} boy(s), ${girlsCount} girl(s), 1 ${animalType} named ${animalName}`, 'info');
            } else {
                characterRequirements = `
CHARACTER REQUIREMENTS:
- Create ONLY exactly ${finalCharacterCount} characters total - NO MORE, NO LESS (${boysCount} boy${boysCount !== 1 ? 's' : ''} and ${girlsCount} girl${girlsCount !== 1 ? 's' : ''})
- ONLY use these character names - DO NOT create any additional characters:
${characterList}- DO NOT add extra characters, background characters, or unnamed characters beyond this list
- All ${finalCharacterCount} characters must appear consistently in all 10 scenes
- STRICT LIMIT: The story must have exactly ${finalCharacterCount} characters, not ${finalCharacterCount + 1} or more`;
                logToConsole(`🎲 Randomly generated: ${boysCount} boy(s) and ${girlsCount} girl(s)`, 'info');
            }

            // Store accurate character count globally
            window.accurateCharacterCount = {
                totalCount: finalCharacterCount,
                humanCount: humanCount,
                animalCount: animalCount
            };
        }


        // Use custom theme if provided, otherwise pick random theme
        let themeToUse = storyPrompt || '';
        if (themeToUse) {
            logToConsole(`Using custom theme: ${themeToUse}`, 'info');
        } else {
            // Randomly select a theme from the 100 themes
            themeToUse = STORY_THEMES[Math.floor(Math.random() * STORY_THEMES.length)];
            logToConsole(`🎲 Randomly selected theme: ${themeToUse}`, 'info');
        }

        // Create Step 1 prompt with uniqueness enforcement
        const currentTimestamp = Date.now();
        const uniquenessInstruction = `
UNIQUENESS REQUIREMENT (Session ${currentTimestamp}):
- This must be a COMPLETELY NEW story with DIFFERENT characters than any previous generation
- Use a UNIQUE combination of character names that haven't been used together before
- Ensure character diversity in appearance, personality, and background
- Create a fresh, original story concept`;

        // Replace {CHARACTER_REQUIREMENTS} placeholder with actual character requirements
        const step1WithCharacterReqs = PROMPTS.step1.replace(/{CHARACTER_REQUIREMENTS}/g, characterRequirements);
        const step1WithUniqueness = step1WithCharacterReqs.replace(/{UNIQUENESS_INSTRUCTIONS}/g, uniquenessInstruction);

        const step1Prompt = `${step1WithUniqueness}

THEME: ${themeToUse}

TITLE GENERATION INSTRUCTION (CRITICAL):
- Create a SPECIFIC, UNIQUE title based on the actual story content and plot
- DO NOT simply use the theme word directly in the title (e.g., avoid generic titles like "The [Theme] Adventure")
- Instead, create a descriptive title that reflects the specific characters, setting, or main plot element
- Examples of good titles: "The Lost Puppy's Journey Home", "Mystery at Moonlight Lake", "When Stars Fell from the Sky"
- Examples of titles to AVOID: "The Adventure Story", "A Friendship Adventure", "The Magic Adventure"

Create a complete 10-scene educational story following the exact format above.`;

        updateProgress(20, 'Creating story content...');

        // STEP 1: Generate story structure
        logToConsole('=== STEP 1: Story Structure Generation ===', 'info');
        const step1Result = await callOpenRouterAPI(step1Prompt);
        if (!step1Result) throw new Error('Step 1 failed - no story structure generated');

        // Check if generation was cancelled
        if (storyGenerationAborted) {
            throw new Error('Story generation was cancelled by user');
        }

        updateProgress(30, 'Adding characters...');

        // STEP 2: Generate character descriptions
        logToConsole('=== STEP 2: Character Descriptions ===', 'info');
        const step2WithCharacterCount = PROMPTS.step2.replace(/{CHARACTER_COUNT}/g, finalCharacterCount);
        const step2Prompt = `${step2WithCharacterCount}

STORY FROM STEP 1:
${step1Result}

Please create detailed character descriptions for all characters that appear in this story.`;

        const step2Result = await callOpenRouterAPI(step2Prompt);
        if (!step2Result) throw new Error('Step 2 failed - no character descriptions generated');

        // Check if generation was cancelled
        if (storyGenerationAborted) {
            throw new Error('Story generation was cancelled by user');
        }

        updateProgress(40, 'Preparing illustrations...');

        // STEP 3: Generate character image prompt
        logToConsole('=== STEP 3: Character Image Prompt ===', 'info');
        const step3WithCharacterCount = PROMPTS.step3.replace(/{CHARACTER_COUNT}/g, finalCharacterCount);
        const step3Prompt = `${step3WithCharacterCount}

CHARACTER DESCRIPTIONS FROM STEP 2:
${step2Result}

Please create a single combined character image prompt following the exact format above.`;

        const step3Result = await callOpenRouterAPI(step3Prompt);
        if (!step3Result) throw new Error('Step 3 failed - no character image prompt generated');

        // Check if generation was cancelled
        if (storyGenerationAborted) {
            throw new Error('Story generation was cancelled by user');
        }

        updateProgress(45, 'Planning scenes...');

        // STEP 4: Generate scene image prompts with retry logic
        logToConsole('=== STEP 4: Scene Image Prompts ===', 'info');
        const step4WithCharacterCount = PROMPTS.step4.replace(/{CHARACTER_COUNT}/g, finalCharacterCount);
        const step4Prompt = `${step4WithCharacterCount}

STORY SCENES FROM STEP 1:
${step1Result}

CHARACTER DESCRIPTIONS FROM STEP 2:
${step2Result}

Please create detailed image prompts for all 10 scenes following the exact format above.`;

        let step4Result = null;
        let step4Attempt = 1;
        const maxStep4Attempts = 3;

        while (step4Attempt <= maxStep4Attempts && !step4Result) {
            // Check if generation was cancelled
            if (storyGenerationAborted) {
                throw new Error('Story generation was cancelled by user');
            }

            try {
                logToConsole(`Step 4 attempt ${step4Attempt}/${maxStep4Attempts}...`, 'info');
                updateProgress(45, `Planning scenes...`);

                step4Result = await callOpenRouterAPI(step4Prompt);

                if (step4Result && step4Result.trim() !== '') {
                    logToConsole('Step 4 completed successfully', 'success');
                    break;
                } else {
                    throw new Error('Empty response from API');
                }
            } catch (error) {
                logToConsole(`Step 4 attempt ${step4Attempt} failed: ${error.message}`, 'error');

                if (step4Attempt === maxStep4Attempts) {
                    throw new Error('Step 4 failed after 3 attempts - unable to generate scene image prompts. Please try again.');
                }

                step4Attempt++;
                // Wait before retry
                await workerDelay(2000);
            }
        }

        // Parse scene image prompts from Step 4
        const scenePrompts = parseSceneImagePrompts(step4Result);
        logToConsole(`✅ Parsed ${scenePrompts.length} scene image prompts from Step 4`, 'success');

        // STEP 5: Generate gamification (if selected)
        let step5Result = '';
        // Run Step 5 if question timing is selected (for "after" mode, questionTypes not needed)
        const shouldRunStep5 = questionTiming === 'after' || selectedQuestionTypes.length > 0;
        if (shouldRunStep5) {
            updateProgress(50, 'Adding questions...');

            logToConsole('=== STEP 5: Gamification Questions ===', 'info');

            // Randomly choose alternating pattern
            const useOddPattern = Math.random() < 0.5;
            const patternInstruction = useOddPattern
                ? "For this story, use Pattern A (odd scenes): Place questions in scenes 1, 3, 5, 7, and 9 only."
                : "For this story, use Pattern B (even scenes): Place questions in scenes 2, 4, 6, 8, and 10 only.";

            // Build the step 5 prompt based on question timing
            let duringSection = '';
            let afterSection = '';
            let outputFormat = '';

            if (questionTiming === 'during' || questionTiming === 'both') {
                // Build question types dynamically based on selected types
                const questionTypeExamples = {
                    'Color': '* Color Recognition → "What color is the ball?"',
                    'Shape': '* Shape Identification → "Which shape is the kite?"',
                    'Number': '* Number Counting → "Count the apples. What number do you get?"',
                    'Emotion': '* Emotion Recognition → "How does Emma feel now?"'
                };

                const selectedTypesList = selectedQuestionTypes.length > 0
                    ? selectedQuestionTypes.map(type => questionTypeExamples[type]).join('\n')
                    : Object.values(questionTypeExamples).join('\n');

                // Replace the hardcoded question types with selected ones
                duringSection = PROMPTS.duringStoryTemplate.replace(
                    /Question Types:[\s\S]*?(?=Format Template)/,
                    `Question Types (ONLY use these selected types):\n${selectedTypesList}\n\n⚠️ IMPORTANT: Generate questions ONLY from the types listed above. Do not use other question types.\n\n`
                );
            }

            if (questionTiming === 'after' || questionTiming === 'both') {
                afterSection = PROMPTS.afterStoryTemplate;
            }

            // Select appropriate output format
            if (questionTiming === 'during') {
                outputFormat = PROMPTS.outputFormatDuring;
            } else if (questionTiming === 'after') {
                outputFormat = PROMPTS.outputFormatAfter;
            } else {
                outputFormat = PROMPTS.outputFormatBoth;
            }

            // Create a more emphatic pattern instruction
            const scenesList = useOddPattern
                ? "1, 3, 5, 7, 9"
                : "2, 4, 6, 8, 10";
            const noQuestionScenes = useOddPattern
                ? "2, 4, 6, 8, 10"
                : "1, 3, 5, 7, 9";

            const emphasizedPattern = `
═══════════════════════════════════════════════════════════════
🚨 CRITICAL PATTERN REQUIREMENT - YOU MUST FOLLOW THIS EXACTLY 🚨
═══════════════════════════════════════════════════════════════

${patternInstruction}

THIS MEANS:
✅ ADD QUESTIONS to scenes: ${scenesList}
❌ DO NOT ADD QUESTIONS to scenes: ${noQuestionScenes}

EXAMPLE STRUCTURE YOU MUST FOLLOW:
${useOddPattern ? `
Scene 1 ← HAS QUESTION
Narration: [content]
Question: [question]
Choices: A) B) C) D)
Correct Answer: [X])

Scene 2 ← NO QUESTION
Narration: [content]

Scene 3 ← HAS QUESTION
Narration: [content]
Question: [question]
Choices: A) B) C) D)
Correct Answer: [X])

Scene 4 ← NO QUESTION
Narration: [content]
` : `
Scene 1 ← NO QUESTION
Narration: [content]

Scene 2 ← HAS QUESTION
Narration: [content]
Question: [question]
Choices: A) B) C) D)
Correct Answer: [X])

Scene 3 ← NO QUESTION
Narration: [content]

Scene 4 ← HAS QUESTION
Narration: [content]
Question: [question]
Choices: A) B) C) D)
Correct Answer: [X])
`}
(Continue this exact pattern for all 10 scenes)

VERIFICATION CHECKLIST:
- [ ] Total questions = EXACTLY 5
- [ ] Questions only in scenes: ${scenesList}
- [ ] NO questions in scenes: ${noQuestionScenes}
═══════════════════════════════════════════════════════════════`;

            // Format scene image prompts for reference
            const sceneImageReference = scenePrompts.map((prompt, index) => {
                return `Scene ${index + 1} Visual Elements:\n${prompt}\n`;
            }).join('\n');

            const step5Prompt = emphasizedPattern + `

` + PROMPTS.step5
                .replace(/{QUESTION_TYPES}/g, questionTypesString)
                .replace(/{QUESTION_TIMING}/g, questionTiming)
                .replace(/{DURING_STORY_SECTION}/g, duringSection)
                .replace(/{AFTER_STORY_SECTION}/g, afterSection)
                .replace(/{OUTPUT_FORMAT_SECTION}/g, outputFormat)
                + `

STORY SCENES FROM STEP 1:
${step1Result}

SCENE IMAGE VISUAL ELEMENTS (Use these for gamification questions):
${sceneImageReference}

🎯 IMPORTANT FOR GAMIFICATION QUESTIONS:
- Base counting questions on the EXACT objects mentioned in "Scene Image Visual Elements" above
- Each scene has specific countable objects (e.g., "exactly 3 red birds", "precisely 5 yellow flowers")
- Use these countable elements to create engaging counting and observation questions
- Questions should reference the visual elements that children will see in the scene images
- Examples: "How many red birds are in the scene?", "Count the yellow flowers. What number do you get?"

🚨 REMINDER: Only add questions to scenes ${scenesList}. Do NOT add questions to scenes ${noQuestionScenes}.

Please add gamification questions following the EXACT pattern specified above for "${questionTiming}" mode.`;

            // Retry gamification generation up to 3 times
            let step5Attempt = 1;
            const maxStep5Attempts = 3;

            while (step5Attempt <= maxStep5Attempts) {
                logToConsole(`Step 5 attempt ${step5Attempt}/${maxStep5Attempts} (Pattern: ${useOddPattern ? 'A/Odd' : 'B/Even'})...`, 'info');
                step5Result = await callOpenRouterAPI(step5Prompt);

                if (step5Result && step5Result.trim() !== '') {
                    // For "after only" mode, skip scene validation and check for Post-Story Review
                    if (questionTiming === 'after') {
                        const hasPostStoryReview = /Post-Story Review/i.test(step5Result);
                        const afterQuestionMatches = step5Result.match(/Question \d+:/gi);
                        const afterQuestionCount = afterQuestionMatches ? afterQuestionMatches.length : 0;

                        if (hasPostStoryReview && afterQuestionCount >= 5) {
                            logToConsole(`✅ Step 5 success: Found Post-Story Review with ${afterQuestionCount} questions`, 'success');
                            break;
                        } else if (!hasPostStoryReview) {
                            logToConsole(`Step 5 incomplete: Post-Story Review section not found, retrying...`, 'warning');
                        } else {
                            logToConsole(`Step 5 incomplete: Only ${afterQuestionCount} after-story questions found (need at least 5), retrying...`, 'warning');
                        }
                    } else {
                        // Enhanced validation for "during" or "both" modes
                        const sceneCount = (step5Result.match(/Scene \d+/gi) || []).length;

                        // Count total questions (just check if we have questions)
                        const questionMatches = step5Result.match(/Question:/gi);
                        const questionCount = questionMatches ? questionMatches.length : 0;

                        // Detect which scenes have questions
                        const scenesWithQuestions = [];
                        for (let i = 1; i <= 10; i++) {
                            const sceneRegex = new RegExp(`Scene ${i}[\\s\\S]*?(?:Question:|Scene ${i+1}|Post-Story Review|$)`, 'i');
                            const sceneMatch = step5Result.match(sceneRegex);
                            if (sceneMatch && /Question:/i.test(sceneMatch[0])) {
                                scenesWithQuestions.push(i);
                            }
                        }

                        // Check if pattern is correct (all odd or all even)
                        const allOdd = scenesWithQuestions.every(n => n % 2 === 1);
                        const allEven = scenesWithQuestions.every(n => n % 2 === 0);
                        const patternCorrect = allOdd || allEven;

                        // Check if the detected pattern matches the expected pattern
                        const expectedPattern = useOddPattern ? 'odd' : 'even';
                        const detectedPattern = allOdd ? 'odd' : allEven ? 'even' : 'mixed';
                        const patternsMatch = (expectedPattern === detectedPattern);

                        if (sceneCount >= 5 && questionCount >= 3 && patternCorrect && patternsMatch) {
                            logToConsole(`✅ Step 5 success: Found ${sceneCount} scenes with ${questionCount} questions on ${detectedPattern} pages (${scenesWithQuestions.join(', ')})`, 'success');
                            break;
                        } else if (!patternCorrect || !patternsMatch) {
                            logToConsole(`Step 5 pattern mismatch: Expected ${expectedPattern}, got ${detectedPattern} pattern on scenes [${scenesWithQuestions.join(', ')}], retrying...`, 'warning');
                        } else {
                            logToConsole(`Step 5 incomplete: Found ${sceneCount} scenes and ${questionCount} questions (need 5 scenes and 3+ questions), retrying...`, 'warning');
                        }
                    }
                }

                if (step5Attempt === maxStep5Attempts) {
                    logToConsole('Step 5 failed after 3 attempts - continuing without gamification', 'error');
                    step5Result = '';
                } else {
                    step5Attempt++;
                    await workerDelay(1000); // Brief delay before retry
                }
            }
        }

        // STEP 6: Generate Thumbnail Prompt
        logToConsole('=== STEP 6: Thumbnail Prompt Generation ===', 'info');

        const step6Prompt = PROMPTS.step6
            .replace('{STEP2_RESULT}', step2Result)
            .replace('{STEP1_RESULT}', step1Result);

        const step6Result = await callOpenRouterAPI(step6Prompt);
        const thumbnailPrompt = step6Result.trim();

        logToConsole('Step 6: Thumbnail prompt generated', 'success');

        // Parse scenes for story data
        const parsedStory = parseStoryScenes(step1Result);
        const storyTitle = parsedStory.title;
        const scenes = parsedStory.scenes;

        logToConsole(`Story title: ${storyTitle}`, 'info');
        logToConsole(`Total scenes: ${scenes.length}`, 'info');

        // CONTEXT CHARACTER IMAGE GENERATION (STEP 1)
        updateProgress(55, 'Creating your story characters...');
        logToConsole('=== CONTEXT CHARACTER IMAGE GENERATION (Fal.ai) ===', 'info');

        let contextImageUrl = null;
        try {
            const tempContextUrl = await generateContextImageWithEnhancedRetry(step3Result);

            // CRITICAL: Verify the context image is fully loaded and valid before proceeding
            logToConsole('🔍 Validating context character image...', 'info');
            const isValid = await verifyImageLoaded(tempContextUrl, 3);

            if (isValid) {
                contextImageUrl = tempContextUrl;
                logToConsole('✅ Context character image generated and validated successfully', 'success');
                logToConsole(`✅ Context image URL: ${contextImageUrl.substring(0, 100)}...`, 'info');
            } else {
                throw new Error('Context image validation failed - image did not load properly');
            }
        } catch (error) {
            logToConsole('❌ Context character image generation failed: ' + error.message, 'error');
            logToConsole('⚠️ Thumbnail and scene images may not have character consistency without context image', 'warning');
        }

        // Ensure we have a valid context image before proceeding
        if (contextImageUrl) {
            logToConsole('🎯 Context image is 100% ready - proceeding to thumbnail generation', 'success');
        } else {
            logToConsole('⚠️ No valid context image - thumbnail and scenes will be generated without character reference', 'warning');
        }

        // THUMBNAIL IMAGE GENERATION (STEP 2 - Uses context image if available)
        updateProgress(60, 'Preparing story cover...');
        logToConsole('=== THUMBNAIL IMAGE GENERATION (Fal.ai) ===', 'info');

        let thumbnailImageUrl = null;
        let thumbnailAttempt = 1;
        const maxThumbnailAttempts = 5;

        while (thumbnailAttempt <= maxThumbnailAttempts && !thumbnailImageUrl) {
            try {
                logToConsole(`📸 Thumbnail generation attempt ${thumbnailAttempt}/${maxThumbnailAttempts}...`, 'info');

                // Enhance thumbnail prompt with character count requirement
                const characterCount = window.accurateCharacterCount ? window.accurateCharacterCount.totalCount : 2;
                const enhancedThumbnailPrompt = `${thumbnailPrompt}. Exact ${characterCount} characters visible in the image`;

                logToConsole(`Thumbnail: Enhanced with character count requirement (${characterCount} characters)`, 'info');

                // Generate thumbnail with context image if available, otherwise without
                let tempThumbnailUrl;
                if (contextImageUrl) {
                    logToConsole('Using character context for thumbnail generation...', 'info');
                    tempThumbnailUrl = await window.FalAI.generateThumbnailWithContextRetry(enhancedThumbnailPrompt, contextImageUrl, 1);
                } else {
                    logToConsole('Generating thumbnail without character context...', 'info');
                    tempThumbnailUrl = await window.FalAI.generateThumbnailImageWithRetry(enhancedThumbnailPrompt, 1);
                }

                // CRITICAL: Verify the thumbnail is fully loaded and valid before proceeding
                logToConsole('🔍 Validating thumbnail image...', 'info');
                const isValid = await verifyImageLoaded(tempThumbnailUrl, 3);

                if (isValid) {
                    thumbnailImageUrl = tempThumbnailUrl;
                    logToConsole('✅ Thumbnail image generated and validated successfully', 'success');
                    logToConsole(`✅ Thumbnail URL: ${thumbnailImageUrl.substring(0, 100)}...`, 'info');
                    break;
                } else {
                    throw new Error('Thumbnail image validation failed - image did not load properly');
                }

            } catch (error) {
                logToConsole(`❌ Thumbnail attempt ${thumbnailAttempt} failed: ${error.message}`, 'error');

                if (thumbnailAttempt >= maxThumbnailAttempts) {
                    logToConsole('❌ All thumbnail generation attempts failed', 'error');
                    logToConsole('⚠️ Continuing without thumbnail image...', 'warning');
                } else {
                    // Wait before retrying
                    const delay = Math.min(2000 * thumbnailAttempt, 10000);
                    logToConsole(`⏳ Waiting ${delay/1000} seconds before retry...`, 'info');
                    await workerDelay(delay);
                }

                thumbnailAttempt++;
            }
        }

        // Ensure we have a valid thumbnail before proceeding
        if (thumbnailImageUrl) {
            logToConsole('🎯 Thumbnail is 100% ready - proceeding to TTS generation', 'success');
        } else {
            logToConsole('⚠️ No valid thumbnail - continuing to TTS generation anyway', 'warning');
        }

        // Parse gamification data first (needed for TTS generation)
        let parsedGamificationData = {};
        if (step5Result && step5Result.trim() !== '') {
            parsedGamificationData = parseGamificationData(step5Result);
        }

        // Create preliminary story data for TTS generation (without scene images yet)
        let storyData = {
            title: storyTitle,
            theme: themeToUse || 'Educational Story',
            scenes: scenes.map((scene, index) => {
                const sceneNumber = index + 1;
                const gamificationScene = parsedGamificationData[sceneNumber];

                return {
                    number: sceneNumber,
                    narration: scene.narration,
                    narrationLines: scene.narrationLines, // CRITICAL: Preserve array for individual TTS generation
                    characters: scene.characters,
                    visualDescription: scene.visualDescription,
                    imageUrl: null, // Will be filled after image generation
                    scenePrompt: scenePrompts[index],
                    // Add gamification data if present
                    gamification: gamificationScene ? {
                        hasQuestion: gamificationScene.hasQuestion,
                        question: gamificationScene.question || null,
                        choices: gamificationScene.choices || [],
                        correctAnswer: gamificationScene.correctAnswer || null
                    } : { hasQuestion: false }
                };
            }),
            contextImageUrl: contextImageUrl,
            characterPrompt: step3Result,
            thumbnailUrl: thumbnailImageUrl,
            thumbnailPrompt: thumbnailPrompt,
            totalScenes: scenes.length,
            // Add gamification metadata
            gamificationEnabled: Object.keys(parsedGamificationData).length > 0,
            selectedQuestionTypes: selectedQuestionTypes,
            questionTiming: questionTiming,
            totalQuestions: Object.values(parsedGamificationData).filter(scene => scene && scene.hasQuestion).length,
            afterStoryQuestions: parsedGamificationData.afterStoryQuestions || []
        };

        // TTS AUDIO GENERATION (Before scene images)
        updateProgress(65, 'Adding voice to your story...');

        // Get selected voice
        const voiceSelect = document.getElementById('voiceOption');
        const selectedVoice = voiceSelect ? voiceSelect.value : '';

        // Voice ID mapping for ElevenLabs
        const voiceIdMap = {
            'Rachel': '21m00Tcm4TlvDq8ikWAM',
            'Amara': 'GEcKlrQ1MWkJKoc7UTJd',
            'Lily': 'qBDvhofpxp92JgXJxDjB',
            'Rod': 'yXCvTL13fpQ4Uuqriplz',
            'Aaron': 'BVirrGoC94ipnqfb5ewn'
        };

        // Avatar URL mapping for ReadyPlayerMe avatars
        const avatarUrlMap = {
            'Rachel': 'https://models.readyplayer.me/68ef4192e831796787c84586.glb?morphTargets=ARKit,Oculus Visemes', // Rachel avatar
            'Amara': 'https://models.readyplayer.me/68f4cee330d2941a6e0ca93a.glb?morphTargets=ARKit,Oculus Visemes', // Amara avatar
            'Lily': 'https://models.readyplayer.me/68f4d3134d43cdede1a35f04.glb?morphTargets=ARKit,Oculus Visemes', // Lily avatar
            'Rod': 'https://models.readyplayer.me/6900c7a0f2f24d4396aff789.glb?morphTargets=ARKit,Oculus Visemes', // Rod avatar
            'Aaron': 'https://models.readyplayer.me/6900cb7e032c83e9bdece86f.glb?morphTargets=ARKit,Oculus Visemes' // Aaron avatar
        };

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

        // Handle custom voices - extract voice ID and avatar from data attributes
        let actualVoiceId = null;
        let actualAvatarUrl = null;
        let voiceNameForTTS = selectedVoice; // Voice identifier to send to TTS

        if (selectedVoice === 'custom' && voiceSelect) {
            // Get custom voice details from selected option's data attributes
            const selectedOption = voiceSelect.options[voiceSelect.selectedIndex];
            const customVoiceId = selectedOption?.getAttribute('data-voice-id');
            const customAvatarUrl = selectedOption?.getAttribute('data-avatar-url');

            if (customVoiceId) {
                actualVoiceId = customVoiceId;
                actualAvatarUrl = ensureLipSyncSupport(customAvatarUrl) || null; // Add lip sync support
                voiceNameForTTS = customVoiceId; // Send the actual ElevenLabs voice ID
                console.log('✅ Custom voice detected:', {
                    voiceName: selectedOption?.textContent,
                    voiceId: customVoiceId,
                    avatarUrl: actualAvatarUrl
                });
            }
        } else {
            // Use standard voice mapping
            actualVoiceId = voiceIdMap[selectedVoice] || null;
            actualAvatarUrl = avatarUrlMap[selectedVoice] || null;
        }

        // Add voice to story data (only if a voice is actually selected)
        storyData.selectedVoice = selectedVoice || null; // Do NOT default to Rachel - respect user's choice
        storyData.voiceId = actualVoiceId;
        storyData.voiceNameForTTS = voiceNameForTTS; // The voice identifier to send to TTS API

        // Add avatar URL to story data (only if a voice is selected)
        storyData.avatarUrl = actualAvatarUrl;

        console.log('🎤 Voice Configuration:', {
            selectedVoice: storyData.selectedVoice,
            voiceId: storyData.voiceId,
            avatarUrl: storyData.avatarUrl,
            TTSIntegrationLoaded: typeof TTSIntegration !== 'undefined'
        });

        // CRITICAL DEBUG: Check if TTS is ready
        console.log('\n🔍 ========== TTS READINESS CHECK ==========');
        console.log('   Selected Voice:', selectedVoice);
        console.log('   Voice is truthy:', !!selectedVoice);
        console.log('   TTSStoryGenerator exists:', typeof TTSStoryGenerator !== 'undefined');
        console.log('   TTSIntegration exists:', typeof TTSIntegration !== 'undefined');
        console.log('   Story data has scenes:', storyData.scenes?.length || 0);
        console.log('   First scene has narrationLines:', storyData.scenes?.[0]?.narrationLines?.length || 0);
        console.log('==========================================\n');

        // SCENE IMAGES GENERATION - Now happens BEFORE TTS
        updateProgress(65, 'Creating scene images...');
        logToConsole('=== SCENE IMAGE GENERATION (All 10 scenes with Fal.ai) ===', 'info');

        const sceneImageResults = await generateSceneImages(scenePrompts, contextImageUrl, scenes);
        const successfulImages = sceneImageResults.filter(r => r.imageUrl).length;

        // CRITICAL: Update storyData scenes with generated image URLs
        sceneImageResults.forEach((result, index) => {
            if (result.imageUrl && storyData.scenes[index]) {
                storyData.scenes[index].imageUrl = result.imageUrl;
                console.log(`✅ Assigned imageUrl to scene ${index + 1}:`, result.imageUrl.substring(0, 50) + '...');
            }
        });

        logToConsole(`✅ Generated ${successfulImages}/${scenes.length} scene images with Fal.ai`, 'success');

        // Generate TTS audio if voice is selected (ALL 10 scenes = 60 audio files)
        if (!selectedVoice) {
            console.warn('⚠️ No voice selected - skipping TTS generation');
            logToConsole('ℹ️ No voice selected - story will use text-only narration', 'info');
        } else if (typeof TTSStoryGenerator === 'undefined') {
            console.error('❌ TTSStoryGenerator not loaded!');
            logToConsole('⚠️ TTS Story Generator not loaded. Story will use text-only narration.', 'warning');
        } else if (typeof TTSIntegration === 'undefined') {
            console.error('❌ TTSIntegration not loaded!');
            logToConsole('⚠️ TTS Integration not loaded. Story will use text-only narration.', 'warning');
        } else {
            try {
                console.log('\n🎤 ========== STARTING TTS GENERATION ==========');
                logToConsole(`🎤 FULL MODE: Generating audio for SCENES 1-10 (60 audio files) with ${selectedVoice} voice (ID: ${storyData.voiceId})...`, 'info');
                logToConsole(`🎵 Audio will be generated for all 10 scenes (10 scenes × 6 lines = 60 audio files)...`, 'info');

                // Generate TTS audio for all 10 scenes (60 audio files total)
                // Use voiceNameForTTS which contains the actual voice ID for custom voices
                const enhancedStoryData = await TTSStoryGenerator.generateAllStoryAudio(
                    storyData,
                    voiceNameForTTS,
                    (progress) => {
                        if (progress.type === 'narration') {
                            // Calculate progress for all 10 scenes (60 lines total: 10 scenes × 6 lines)
                            const totalLines = 10 * 6;
                            const completedLines = (progress.scene - 1) * 6 + progress.line;
                            const percentage = 75 + Math.floor((completedLines / totalLines) * 10);

                            // Show scene-level progress
                            updateProgress(percentage, `Recording scene ${progress.scene} (line ${progress.line}/6)...`);

                            // Log detailed progress to console
                            console.log(`📊 Audio progress: Scene ${progress.scene} - Line ${progress.line}/6 (${completedLines}/${totalLines} lines, ${percentage}%)`);
                        } else if (progress.type === 'quiz') {
                            const percentage = 84;
                            updateProgress(percentage, `Recording quiz questions...`);
                        }
                    }
                );

                // Update story data with audio URLs
                storyData = enhancedStoryData;

                // Count successful audio generations
                const totalNarrationAudio = storyData.scenes.reduce((sum, scene) => {
                    return sum + (scene.audioUrls?.filter(url => url !== null).length || 0);
                }, 0);

                const totalQuizAudio = storyData.gamification?.duringQuestions?.filter(q => q.audioUrl !== null).length || 0;

                logToConsole(`✅ Audio narration generated for all scenes: ${totalNarrationAudio} audio files created`, 'success');
                if (totalQuizAudio > 0) {
                    logToConsole(`✅ Quiz audio generated: ${totalQuizAudio} question audio files created`, 'success');
                }
                console.log('🎵 Audio generated for all scenes:', { narration: totalNarrationAudio, quiz: totalQuizAudio });
                console.log('=================================================\n');
            } catch (error) {
                console.error('\n❌ ========== TTS GENERATION ERROR ==========');
                console.error('   Error:', error);
                console.error('   Message:', error.message);
                console.error('   Stack:', error.stack);
                console.error('===========================================\n');
                logToConsole(`⚠️ Audio generation failed: ${error.message}. Story will use text-only narration.`, 'warning');
            }
        }

        updateProgress(85, 'Putting it all together...');

        // Calculate success rate
        const totalExpectedImages = 1 + 1 + scenes.length; // thumbnail + context + scenes
        const totalGeneratedImages = (thumbnailImageUrl ? 1 : 0) + (contextImageUrl ? 1 : 0) + successfulImages;
        const successRate = Math.round((totalGeneratedImages / totalExpectedImages) * 100);

        logToConsole(`Image Generation Summary: ${totalGeneratedImages}/${totalExpectedImages} images (${successRate}%)`, 'info');

        // Update storyData with image generation results
        storyData.successRate = successRate;
        storyData.imagesValidated = successfulImages === scenes.length;
        storyData.generatedImages = totalGeneratedImages;

        updateProgress(90, 'Done!');

        // Debug: Check what's being saved to localStorage
        console.log('💾 SAVING TO LOCALSTORAGE - Audio URLs Check:');
        storyData.scenes?.forEach((scene, i) => {
            const firstUrl = scene.audioUrls?.[0];
            console.log(`   Scene ${i + 1}:`, {
                hasNarrationLines: !!scene.narrationLines,
                narrationLinesCount: scene.narrationLines?.length || 0,
                hasAudioUrls: !!scene.audioUrls,
                audioUrlsCount: scene.audioUrls?.length || 0,
                firstAudioUrlType: typeof firstUrl,
                firstAudioUrlPreview: (typeof firstUrl === 'string' ? firstUrl.substring(0, 100) + '...' : String(firstUrl))
            });
        });

        // Store the generated story using IndexedDB for audio URLs (supports large data)
        console.log('💾 Preparing to save story data...');

        let storySaved = false;
        let storageError = null;

        // Save full story with audio URLs to IndexedDB
        try {
            await saveStoryToIndexedDB(storyData);
            console.log('✅ Story with audio URLs saved to IndexedDB');
            storySaved = true;
        } catch (idbError) {
            console.error('❌ IndexedDB save failed:', idbError);
            storageError = idbError;

            // Show user-friendly warning
            if (idbError.message && idbError.message.includes('blocked')) {
                console.warn('⚠️ IndexedDB is blocked. Your browser privacy settings may be preventing story storage.');
                console.warn('💡 For Brave browser: Go to Settings > Shields > disable "Block fingerprinting" or allow IndexedDB for this site');
            }
        }

        // Also save metadata (without audio) to localStorage as backup
        const storyDataForStorage = {
            ...storyData,
            scenes: storyData.scenes.map(scene => ({
                ...scene,
                audioUrls: [] // Remove audio URLs for localStorage
            }))
        };

        try {
            localStorage.setItem('generatedStoryData', JSON.stringify(storyDataForStorage));
            const sizeInKB = (JSON.stringify(storyDataForStorage).length / 1024).toFixed(2);
            console.log(`✅ Story metadata saved to localStorage (${sizeInKB} KB, without audio)`);
            storySaved = true;
        } catch (storageError) {
            console.warn('⚠️ localStorage save failed:', storageError.message);

            // If both storage methods failed, show alert
            if (!storySaved) {
                console.error('❌ CRITICAL: Both IndexedDB and localStorage failed!');
                console.error('Your browser may be blocking storage. The story will work in this session but may not persist.');
            }
        }

        // Show warning to user if storage failed
        if (!storySaved && storageError) {
            const warningMsg = 'Story created successfully but may not be saved due to browser settings. ' +
                'For Brave browser: Please enable IndexedDB in Settings > Shields, or use Safari/Chrome.';
            if (typeof logToConsole === 'function') {
                logToConsole(warningMsg, 'warning');
            }
            console.warn('⚠️ USER WARNING:', warningMsg);

            // Show user-visible notification
            if (typeof notificationSystem !== 'undefined') {
                notificationSystem.warning(
                    '<strong>Browser Storage Limited</strong><br>' +
                    'Your story was created but may not persist after closing. ' +
                    '<br><small>For Brave: Enable IndexedDB in Settings → Shields</small>',
                    8000
                );
            } else {
                // Fallback to alert if notification system not available
                alert('⚠️ Story created but browser storage is blocked.\n\n' +
                      'For Brave browser: Enable IndexedDB in Settings > Shields\n' +
                      'Or use Safari/Chrome for better compatibility.');
            }
        }

        // Keep full story data with audio in memory
        currentStory = storyData;

        // Also store in window for access across pages
        window.currentGeneratedStory = storyData;

        console.log('✅ Story generation complete! Audio URLs generated:', storyData.scenes?.filter(s => s.audioUrls?.length > 0).length);

        updateProgress(100, 'Complete! Opening preview...');
        logToConsole('✅ Story generation completed successfully with Fal.ai!', 'success');
        logToConsole(`📊 Images Generated: ${totalGeneratedImages}/${totalExpectedImages} (${successRate}%)`, 'info');

        // Log gamification summary
        if (storyData.gamificationEnabled) {
            logToConsole(`🎮 Gamification: ${storyData.totalQuestions} questions (${storyData.selectedQuestionTypes.join(', ')})`, 'info');
        }

        // Force hide progress modal immediately
        console.log('🔄 Hiding progress modal...');
        const progressModalEl = document.getElementById('progressModal');
        if (progressModalEl) {
            progressModalEl.style.display = 'none';

            // Try to get Bootstrap modal instance and hide it
            try {
                const bootstrapModal = bootstrap.Modal.getInstance(progressModalEl);
                if (bootstrapModal) {
                    bootstrapModal.hide();
                }
            } catch (e) {
                console.warn('Bootstrap modal hide error:', e);
            }
        }

        // Remove all modal backdrops
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());

        // Show thumbnail modal first (if thumbnail exists), then preview modal
        setTimeout(() => {
            if (thumbnailImageUrl && typeof window.showThumbnailModal === 'function') {
                console.log('🖼️ Opening thumbnail modal...');
                window.showThumbnailModal(storyData);
            } else if (typeof window.showPreviewModal === 'function') {
                console.log('📖 Opening preview modal directly (no thumbnail)...');
                window.showPreviewModal(storyData);
            } else {
                console.error('❌ Modal functions not available');
            }
        }, 500);

        return storyData;

    } catch (error) {
        logToConsole(`Story generation failed: ${error.message}`, 'error');
        console.error('❌ Story generation error:', error);

        // Hide progress modal
        const progressModalEl = document.getElementById('progressModal');
        if (progressModalEl) {
            progressModalEl.style.display = 'none';
            try {
                const bootstrapModal = bootstrap.Modal.getInstance(progressModalEl);
                if (bootstrapModal) {
                    bootstrapModal.hide();
                }
            } catch (e) {
                console.warn('Error hiding progress modal:', e);
            }
        }

        // Remove backdrops
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());

        throw error;
    }
}

// Track if scene is being regenerated
let isRegenerating = false;

// Show preview modal with story data
function showPreviewModal(storyData) {
    console.log('🎬 showPreviewModal called with data:', {
        title: storyData?.title,
        scenes: storyData?.scenes?.length,
        hasAudio: storyData?.scenes?.[0]?.audioUrls?.length > 0
    });

    const modal = document.getElementById('previewModal');
    console.log('🔍 Preview modal element found:', !!modal);

    if (!modal) {
        console.error('❌ Preview modal element not found!');
        return;
    }

    // Export story data to window for keyboard navigation in EXACT.js
    window.currentStoryData = storyData;

    // Reset regeneration state
    isRegenerating = false;

    // Set story title
    const titleElement = document.getElementById('previewStoryTitle');
    if (titleElement) {
        titleElement.textContent = storyData.title || 'Your Educational Story';
        console.log('✅ Title set:', titleElement.textContent);
    }

    // Create timeline dots
    const timelineContainer = document.getElementById('previewTimelineDots');
    if (timelineContainer) {
        timelineContainer.innerHTML = '';

        storyData.scenes.forEach((scene, index) => {
            const dotContainer = document.createElement('div');
            dotContainer.className = 'dot-container';

            const dot = document.createElement('button');
            dot.className = `dot ${index === 0 ? 'active' : ''}`;
            dot.dataset.scene = scene.number;
            dot.title = `Scene ${scene.number}`;

            const dotNumber = document.createElement('div');
            dotNumber.className = 'dot-number';
            dotNumber.textContent = scene.number;

            dotContainer.appendChild(dot);
            dotContainer.appendChild(dotNumber);
            timelineContainer.appendChild(dotContainer);

            // Add click event
            dot.addEventListener('click', () => {
                // Prevent scene switching during regeneration
                if (isRegenerating) {
                    console.log('Cannot switch scenes while regenerating');
                    return;
                }
                showPreviewScene(scene.number, storyData);
            });
        });
        console.log('✅ Timeline dots created:', storyData.scenes.length);
    }

    // Show first scene
    console.log('🎬 Showing first scene...');
    showPreviewScene(1, storyData);

    // Show modal
    console.log('🎬 Adding show class to modal...');
    modal.classList.remove('hidden');
    modal.classList.add('show');
    console.log('✅ Preview modal should now be visible');
    console.log('🔍 Modal classes:', modal.className);
}

// Export showPreviewModal to window immediately after definition
window.showPreviewModal = showPreviewModal;

// Show specific scene in preview
function showPreviewScene(sceneNumber, storyData) {
    console.log(`🎬 showPreviewScene called for scene ${sceneNumber}`);
    const scene = storyData.scenes.find(s => s.number === sceneNumber);
    if (!scene) {
        console.error(`❌ Scene ${sceneNumber} not found in storyData`);
        return;
    }

    console.log(`📖 Scene ${sceneNumber} data:`, {
        number: scene.number,
        hasImageUrl: !!scene.imageUrl,
        imageUrl: scene.imageUrl?.substring(0, 100) + '...',
        hasNarration: !!scene.narration
    });

    // Update active dot
    const dots = document.querySelectorAll('#previewTimelineDots .dot');
    dots.forEach(dot => {
        dot.classList.toggle('active', parseInt(dot.dataset.scene) === sceneNumber);
    });

    // Update image display
    const imagePlaceholder = document.getElementById('previewImagePlaceholder');
    console.log('🔍 imagePlaceholder element:', !!imagePlaceholder);

    if (imagePlaceholder && scene.imageUrl) {
        console.log(`✅ Displaying image for scene ${sceneNumber}`);
        imagePlaceholder.innerHTML = `<img src="${scene.imageUrl}" alt="Scene ${sceneNumber}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`;
    } else if (imagePlaceholder) {
        console.log(`⚠️ No imageUrl for scene ${sceneNumber}, showing placeholder`);
        imagePlaceholder.innerHTML = `<p>Scene ${sceneNumber} image will be displayed here</p>`;
    }

    // Update narration
    const narrationElement = document.getElementById('previewNarration');
    if (narrationElement) {
        narrationElement.textContent = scene.narration || `Scene ${sceneNumber} content`;
    }

    // Show/hide retry button based on whether scene has an image
    const retryContainer = document.getElementById('sceneRetryContainer');
    console.log('🔍 Recreate button check:', {
        containerExists: !!retryContainer,
        sceneHasImageUrl: !!scene.imageUrl,
        imageUrl: scene.imageUrl?.substring(0, 100)
    });

    if (retryContainer) {
        if (scene.imageUrl) {
            console.log('✅ Showing recreate button for scene', sceneNumber);
            retryContainer.style.display = 'block';
            // Setup retry button listener each time we show it
            setTimeout(() => {
                setupRetryButtonListener(sceneNumber, storyData);
            }, 50);
        } else {
            console.log('⚠️ Hiding recreate button - no imageUrl for scene', sceneNumber);
            retryContainer.style.display = 'none';
        }
    } else {
        console.error('❌ sceneRetryContainer element not found in DOM!');
    }

    // Handle gamification
    const gamificationOverlay = document.getElementById('previewGamificationOverlay');
    if (scene.gamification?.hasQuestion && gamificationOverlay) {
        // Show question
        const questionText = document.getElementById('previewQuestionText');
        const answerChoices = document.getElementById('previewAnswerChoices');

        if (questionText) {
            questionText.textContent = scene.gamification.question;
        }

        if (answerChoices && scene.gamification.choices) {
            answerChoices.innerHTML = '';
            scene.gamification.choices.forEach(choice => {
                const button = document.createElement('button');
                button.className = 'choice-btn';
                button.dataset.choice = choice.letter;
                button.textContent = `${choice.letter}) ${choice.text}`;

                button.addEventListener('click', () => {
                    handlePreviewQuestionAnswer(choice.letter, scene.gamification.correctAnswer, button);
                });

                answerChoices.appendChild(button);
            });
        }

        // Show gamification overlay after a delay
        setTimeout(() => {
            gamificationOverlay.classList.remove('hidden');
            gamificationOverlay.classList.add('show');
        }, 1000);
    } else {
        // Hide gamification overlay
        if (gamificationOverlay) {
            gamificationOverlay.classList.remove('show');
            gamificationOverlay.classList.add('hidden');
        }
    }
}

// Handle question answer in preview
function handlePreviewQuestionAnswer(selectedAnswer, correctAnswer, buttonElement) {
    // Handle both string (legacy) and object (new) correctAnswer formats
    const correctLetter = typeof correctAnswer === 'string' ? correctAnswer : correctAnswer.letter;
    const isCorrect = selectedAnswer === correctLetter;
    const feedbackElement = document.getElementById('previewQuestionFeedback');
    const allButtons = document.querySelectorAll('#previewAnswerChoices .choice-btn');

    // Disable all buttons
    allButtons.forEach(btn => {
        btn.classList.add('disabled');
        if (btn.dataset.choice === correctLetter) {
            btn.classList.add('correct');
        } else if (btn.dataset.choice === selectedAnswer && !isCorrect) {
            btn.classList.add('incorrect');
        }
    });

    // Show feedback
    if (feedbackElement) {
        const feedbackText = feedbackElement.querySelector('.feedback-text');
        if (feedbackText) {
            // Handle both string and object formats for display
            const correctAnswerText = typeof correctAnswer === 'string' ?
                correctAnswer :
                `${correctAnswer.letter}) ${correctAnswer.text}`;
            feedbackText.textContent = isCorrect ? 'Correct! Well done!' : `Incorrect. The correct answer was ${correctAnswerText}.`;
        }
        feedbackElement.className = `question-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
        feedbackElement.classList.remove('hidden');
    }

    // Auto-hide question after feedback
    setTimeout(() => {
        const gamificationOverlay = document.getElementById('previewGamificationOverlay');
        if (gamificationOverlay) {
            gamificationOverlay.classList.remove('show');
            gamificationOverlay.classList.add('hidden');
        }
    }, 3000);
}

// Export showPreviewScene to window so it can be called from other scripts
window.showPreviewScene = showPreviewScene;

// Setup retry button event listener
function setupRetryButtonListener(currentSceneNumber, storyData) {
    const retryBtn = document.getElementById('sceneRetryBtn');

    if (retryBtn) {
        // Remove any existing listeners to avoid duplicates
        const newRetryBtn = retryBtn.cloneNode(true);
        retryBtn.parentNode.replaceChild(newRetryBtn, retryBtn);

        newRetryBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const scene = storyData.scenes.find(s => s.number === currentSceneNumber);
            if (!scene) {
                console.error('Scene not found for retry');
                return;
            }

            console.log(`🔥 RETRY BUTTON CLICKED for Scene ${currentSceneNumber}!`);

            // Disable retry button during processing
            newRetryBtn.disabled = true;
            newRetryBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#007ACC" stroke-width="2" style="animation: spin 1s linear infinite;">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M8 12l2 2 4-4"/>
                </svg>
                <span>Recreating...</span>
            `;

            try {
                console.log(`🎯 Calling retrySceneInPreview for Scene ${currentSceneNumber}`);
                await retrySceneInPreview(currentSceneNumber, scene, storyData);
            } finally {
                // Re-enable retry button
                newRetryBtn.disabled = false;
                newRetryBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                    </svg>
                    <span>Recreate</span>
                `;
            }
        });
    }
}

// Export setupRetryButtonListener to window so it can be called from test preview
window.setupRetryButtonListener = setupRetryButtonListener;

// Retry scene in preview modal with enhanced prompt
async function retrySceneInPreview(sceneNumber, scene, storyData) {
    if (!storyData) {
        console.error('No story data available for retry');
        return;
    }

    // Set regeneration state to true
    isRegenerating = true;

    // Disable all scene dots
    const allDots = document.querySelectorAll('#previewTimelineDots .dot');
    allDots.forEach(dot => {
        dot.style.opacity = '0.5';
        dot.style.cursor = 'not-allowed';
    });

    console.log(`🔄 RETRY FUNCTION CALLED for Scene ${sceneNumber}`);
    console.log(`Scene data:`, scene);

    try {
        // Get the stored story data to access original prompts
        const storedStoryData = JSON.parse(localStorage.getItem('generatedStoryData') || '{}');
        let originalPrompt = '';

        // Get the original prompt from stored data
        if (storedStoryData.scenes && storedStoryData.scenes[sceneNumber - 1]) {
            originalPrompt = storedStoryData.scenes[sceneNumber - 1].scenePrompt || '';
        }

        // If no stored prompt, try to extract from current scene's image URL
        if (!originalPrompt && scene && scene.imageUrl) {
            console.log(`No stored scene prompt for Scene ${sceneNumber}, extracting from image URL`);
            try {
                const url = new URL(scene.imageUrl);
                const pathname = url.pathname;
                // Extract the prompt from the Pollinations URL format: /prompt/ENCODED_PROMPT
                if (pathname.startsWith('/prompt/')) {
                    const encodedPrompt = pathname.substring(8); // Remove '/prompt/'
                    let decodedPrompt = decodeURIComponent(encodedPrompt);

                    // Clean up the prompt by removing query parameter artifacts and enhancement words
                    const enhancementWords = ['improved', 'enhanced', 'refined', 'perfected', 'optimized'];
                    enhancementWords.forEach(word => {
                        decodedPrompt = decodedPrompt.replace(new RegExp(`,\\s*${word}\\s*$`, 'i'), '');
                        decodedPrompt = decodedPrompt.replace(new RegExp(`\\s*,\\s*${word}\\s*$`, 'i'), '');
                        decodedPrompt = decodedPrompt.replace(new RegExp(`\\s+${word}\\s*$`, 'i'), '');
                    });

                    // Remove any trailing artifacts that might come from URL parameters
                    decodedPrompt = decodedPrompt.replace(/\s*[?&].*$/, '');
                    decodedPrompt = decodedPrompt.replace(/\s*\.\s*Evenly\s+spaced.*$/, '');
                    decodedPrompt = decodedPrompt.trim();

                    originalPrompt = decodedPrompt;
                    console.log(`Extracted and cleaned prompt from image URL for Scene ${sceneNumber}:`, originalPrompt);
                }
            } catch (error) {
                console.log(`Failed to extract prompt from URL:`, error);
            }
        }

        // If still no prompt, create one from current preview scene data as fallback
        if (!originalPrompt && storyData && storyData.scenes) {
            console.log(`No prompt found for Scene ${sceneNumber}, creating fallback from preview data`);
            const currentScene = storyData.scenes[sceneNumber - 1];
            if (currentScene) {
                const sceneTitle = currentScene.title || `Scene ${sceneNumber}`;
                const sceneNarration = currentScene.narration || currentScene.description || '';
                const setting = storyData.setting || 'educational setting';
                originalPrompt = `${sceneTitle}: ${sceneNarration}. Educational cartoon style illustration, colorful, child-friendly`;
                console.log(`Created fallback prompt from preview data for Scene ${sceneNumber}:`, originalPrompt);
            }
        }

        if (originalPrompt) {
            console.log(`Using prompt for Scene ${sceneNumber}:`, originalPrompt);
        } else {
            console.log(`Warning: No prompt available for Scene ${sceneNumber}`);
            return;
        }

        // Add a simple quality enhancement word to the existing prompt
        const qualityWords = ['improved', 'enhanced', 'refined', 'perfected', 'optimized'];
        const selectedWord = qualityWords[Math.floor(Math.random() * qualityWords.length)];
        const enhancedPrompt = `${originalPrompt}, ${selectedWord}`;

        console.log(`🎨 Enhanced prompt: "${enhancedPrompt}"`);

        // Show loading animation over existing image
        const imageContainer = document.getElementById('previewImagePlaceholder');
        if (imageContainer) {
            // Add loading overlay to existing content
            const loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'retryLoadingOverlay';
            loadingOverlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 20;
            `;
            loadingOverlay.innerHTML = `
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3498DB" stroke-width="2" style="animation: spin 1s linear infinite;">
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                    <path d="M21 3v5h-5"/>
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                    <path d="M3 21v-5h5"/>
                </svg>
            `;

            // Remove any existing loading overlay first
            const existingOverlay = document.getElementById('retryLoadingOverlay');
            if (existingOverlay) {
                existingOverlay.remove();
            }

            imageContainer.appendChild(loadingOverlay);
        }

        // Get context image URL for proper scene generation
        const contextImageUrl = storedStoryData.contextImage || storedStoryData.contextImageUrl || '';

        // Retry logic with fallback (same as generateSceneImage)
        const maxRetries = 3;
        let retryAttempt = 1;
        let newImageUrl = null;
        let dimensionValidation = null;
        let currentPrompt = enhancedPrompt;

        while (retryAttempt <= maxRetries && !newImageUrl) {
            try {
                console.log(`🔄 Scene ${sceneNumber} recreate attempt ${retryAttempt}/${maxRetries}...`);

                // Add attempt-specific variations for retries
                if (retryAttempt > 1) {
                    const variations = [', high quality detailed scene', ', clear character positions', ', professional scene composition'];
                    const variationIndex = (retryAttempt - 2) % variations.length;
                    currentPrompt = `${enhancedPrompt}${variations[variationIndex]}`;
                    console.log(`🎨 Retry attempt ${retryAttempt} with variation: ${currentPrompt}`);
                }

                // Generate new image using Fal.ai (same system as scene generation)
                let candidateImageUrl;
                if (contextImageUrl) {
                    // Use Fal.ai with context image for character consistency
                    candidateImageUrl = await window.FalAI.generateSceneImage(currentPrompt, contextImageUrl, sceneNumber);
                } else {
                    // Fallback to context image generation (for stories without context image)
                    candidateImageUrl = await window.FalAI.generateContextImage(currentPrompt);
                }

                if (candidateImageUrl) {

                    // Validate image dimensions before accepting the regenerated image
                    console.log(`🔍 Validating dimensions for regenerated Scene ${sceneNumber} (attempt ${retryAttempt})...`);
                    try {
                        dimensionValidation = await validateImageDimensions(candidateImageUrl);
                        if (dimensionValidation.isValid) {
                            console.log(`✅ Scene ${sceneNumber}: Image dimensions validated (${dimensionValidation.actual})`);
                            newImageUrl = candidateImageUrl; // Accept this image
                            break; // Success, exit retry loop
                        } else {
                            console.log(`❌ Scene ${sceneNumber}: Invalid dimensions: ${dimensionValidation.actual}, expected ${dimensionValidation.expected}`);
                            throw new Error(`Invalid image dimensions: ${dimensionValidation.actual}`);
                        }
                    } catch (dimError) {
                        console.log(`⚠️ Scene ${sceneNumber}: Dimension validation failed on attempt ${retryAttempt}: ${dimError.message}`);
                        if (retryAttempt >= maxRetries) {
                            // Last attempt failed, show error
                            if (imageContainer) {
                                const loadingOverlay = document.getElementById('retryLoadingOverlay');
                                if (loadingOverlay) {
                                    loadingOverlay.remove();
                                }
                            }

                            // Re-enable scene dots on final failure
                            isRegenerating = false;
                            const allDots = document.querySelectorAll('#previewTimelineDots .dot');
                            allDots.forEach(dot => {
                                dot.style.opacity = '1';
                                dot.style.cursor = 'pointer';
                            });

                            throw new Error(`Failed to generate valid image after ${maxRetries} attempts. ${dimError.message}`);
                        }
                        // Otherwise continue to next retry
                    }
                } else {
                    throw new Error(`HTTP ${response.status}: Failed to fetch image`);
                }
            } catch (error) {
                console.log(`❌ Recreate attempt ${retryAttempt} failed: ${error.message}`);
                if (retryAttempt >= maxRetries) {
                    // Remove loading overlay on final failure
                    if (imageContainer) {
                        const loadingOverlay = document.getElementById('retryLoadingOverlay');
                        if (loadingOverlay) {
                            loadingOverlay.remove();
                        }
                    }

                    // Re-enable scene dots
                    isRegenerating = false;
                    const allDots = document.querySelectorAll('#previewTimelineDots .dot');
                    allDots.forEach(dot => {
                        dot.style.opacity = '1';
                        dot.style.cursor = 'pointer';
                    });

                    throw error;
                }
            }

            retryAttempt++;
            // Wait before retry
            await workerDelay(2000);
        }

        // If we got here and newImageUrl is still null, something went wrong
        if (!newImageUrl) {
            throw new Error('Failed to generate valid image after all retry attempts');
        }

        // Update the scene data for the correct scene
        console.log(`📝 Updating Scene ${sceneNumber} with new image URL: ${newImageUrl}`);
        storyData.scenes[sceneNumber - 1].imageUrl = newImageUrl;

        // Update stored data
        if (storedStoryData.scenes && storedStoryData.scenes[sceneNumber - 1]) {
            console.log(`💾 Updating localStorage for Scene ${sceneNumber}`);
            storedStoryData.scenes[sceneNumber - 1].imageUrl = newImageUrl;
            localStorage.setItem('generatedStoryData', JSON.stringify(storedStoryData));
        }

        // Update the preview with the new image
        const img = new Image();
        img.onload = function() {
            if (imageContainer) {
                // Remove loading overlay
                const loadingOverlay = document.getElementById('retryLoadingOverlay');
                if (loadingOverlay) {
                    loadingOverlay.remove();
                }

                // Replace with new image
                imageContainer.innerHTML = `<img src="${newImageUrl}" alt="Scene ${sceneNumber}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`;
            }

            // Re-enable scene dots
            isRegenerating = false;
            const allDots = document.querySelectorAll('#previewTimelineDots .dot');
            allDots.forEach(dot => {
                dot.style.opacity = '1';
                dot.style.cursor = 'pointer';
            });

            console.log(`✅ Scene ${sceneNumber} regenerated successfully with enhanced prompt (${dimensionValidation.actual})`);
        };
        img.onerror = function() {
            if (imageContainer) {
                // Remove loading overlay
                const loadingOverlay = document.getElementById('retryLoadingOverlay');
                if (loadingOverlay) {
                    loadingOverlay.remove();
                }
            }

            // Re-enable scene dots
            isRegenerating = false;
            const allDots = document.querySelectorAll('#previewTimelineDots .dot');
            allDots.forEach(dot => {
                dot.style.opacity = '1';
                dot.style.cursor = 'pointer';
            });

            console.log(`❌ Failed to load regenerated Scene ${sceneNumber}`);
        };
        img.src = newImageUrl;

    } catch (error) {
        console.log(`❌ Failed to retry Scene ${sceneNumber}: ${error.message}`);

        // Remove loading overlay on error
        const imageContainer = document.getElementById('previewImagePlaceholder');
        if (imageContainer) {
            const loadingOverlay = document.getElementById('retryLoadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.remove();
            }
        }

        // Re-enable scene dots on error
        isRegenerating = false;
        const allDots = document.querySelectorAll('#previewTimelineDots .dot');
        allDots.forEach(dot => {
            dot.style.opacity = '1';
            dot.style.cursor = 'pointer';
        });
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize gamification options
    initializeGamificationOptions();

    // Add event listeners
    const createBtn = document.getElementById('createStoryBtn');
    if (createBtn) {
        createBtn.addEventListener('click', function(e) {
            // Check if storage is available before generating story
            if (window.storageCheckComplete && !window.isStorageAvailable) {
                e.preventDefault();
                e.stopPropagation();
                console.error('❌ Cannot generate story - IndexedDB is not available');

                // Show warning modal
                if (typeof window.showStorageWarningModal === 'function') {
                    window.showStorageWarningModal();
                } else {
                    alert('⚠️ Story creation is disabled because IndexedDB is blocked.\n\n' +
                          'For Brave: Enable IndexedDB in Shields settings, then refresh.\n' +
                          'Or use Safari, Chrome, or Firefox.');
                }
                return false;
            }

            // VALIDATION REMOVED: Storyteller voice is now optional for testing
            // const voiceOption = document.getElementById('voiceOption');
            // if (!voiceOption || !voiceOption.value) {
            //     ... validation code removed for testing ...
            // }

            // Proceed with story generation
            generateComprehensiveStory();
        });
    }

    // Preview modal close
    const closeBtn = document.getElementById('previewModalClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const modal = document.getElementById('previewModal');
            if (modal) {
                modal.classList.remove('show');
                modal.classList.add('hidden');
            }
        });
    }

    // Continue to storyboard button - saves story then navigates
    const continueBtn = document.getElementById('continueToStoryboard');
    if (continueBtn) {
        continueBtn.addEventListener('click', async () => {
            console.log('🎮 Play button clicked - will save then navigate to storyboard');

            // Validate that music is selected before continuing
            const musicSelect = document.getElementById('previewMusicSelect');
            if (!musicSelect || !musicSelect.value || musicSelect.value === '') {
                // Show notification that music must be selected
                notificationSystem.error(
                    '<strong>Background Music Required</strong><br>' +
                    'Please select background music before playing your story.<br>' +
                    '<small>Choose a music track from the dropdown menu below</small>',
                    5000
                );

                // Highlight the music selector to draw attention
                if (musicSelect) {
                    musicSelect.style.border = '2px solid #ffc107';
                    musicSelect.focus();

                    // Remove highlight after 3 seconds
                    setTimeout(() => {
                        musicSelect.style.border = '';
                    }, 3000);
                }

                return; // Prevent navigation
            }

            // Get the story data from window or IndexedDB
            let storyData = window.currentGeneratedStory || window.currentStoryData;

            if (!storyData) {
                // Try to load from IndexedDB
                try {
                    storyData = await loadStoryFromIndexedDB();
                } catch (error) {
                    console.error('❌ Failed to load story data:', error);
                }
            }

            if (!storyData) {
                notificationSystem.error('No story data found. Please generate a story first.');
                return;
            }

            // Disable button and show loading state
            const originalText = continueBtn.innerHTML;
            continueBtn.disabled = true;
            continueBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            try {
                // Ensure music is saved to story data
                const selectedMusic = musicSelect.value;
                const selectedOption = musicSelect.options[musicSelect.selectedIndex];
                const musicLabel = selectedOption ? selectedOption.text : selectedMusic;

                // Get volume from user settings, default to 0.5 (50%)
                const musicVolume = (window.userSettings && typeof window.userSettings.music_volume === 'number')
                    ? window.userSettings.music_volume
                    : 0.5;

                const musicData = {
                    enabled: true,
                    file: selectedMusic,      // PHP expects 'file' not 'fileName'
                    name: musicLabel,          // PHP expects 'name' not 'label'
                    volume: musicVolume       // Volume as decimal (0-1), from user settings
                };

                storyData.music = musicData;

                console.log('📤 Preparing to save story to database before navigation...');
                console.log('🎵 Music data being saved:', {
                    selectedMusic,
                    musicLabel,
                    musicVolume,
                    musicData
                });

                // Prepare audio files and viseme data objects
                const audioFiles = {};
                const visemeData = {};

                // Extract audio and viseme data from scenes
                if (storyData.scenes) {
                    for (let sceneIndex = 0; sceneIndex < storyData.scenes.length; sceneIndex++) {
                        const scene = storyData.scenes[sceneIndex];
                        const sceneNumber = sceneIndex + 1;

                        if (scene.audioUrls && scene.audioUrls.length > 0) {
                            for (let lineIndex = 0; lineIndex < scene.audioUrls.length; lineIndex++) {
                                const audioUrl = scene.audioUrls[lineIndex];
                                const lineNumber = lineIndex + 1;
                                const audioKey = `scene_${sceneNumber}_line_${lineNumber}`;

                                // Convert audio URL to base64 if it's a blob or data URL
                                if (audioUrl && typeof audioUrl === 'string') {
                                    audioFiles[audioKey] = audioUrl;
                                }

                                // Extract viseme data for this line
                                if (scene.visemeDataArray && scene.visemeDataArray[lineIndex]) {
                                    visemeData[audioKey] = scene.visemeDataArray[lineIndex];
                                }
                            }
                        }
                    }
                }

                console.log(`📤 Audio files to upload: ${Object.keys(audioFiles).length}`);
                console.log(`📤 Viseme data to save: ${Object.keys(visemeData).length}`);

                // Prepare the request payload
                const payload = {
                    storyData: {
                        title: storyData.title || 'Untitled Story',
                        theme: storyData.theme || null,
                        totalScenes: storyData.scenes.length,
                        thumbnailUrl: storyData.thumbnailUrl || null,
                        contextImageUrl: storyData.contextImageUrl || null,
                        selectedVoice: storyData.selectedVoice || null,
                        voiceId: storyData.voiceId || null,
                        voiceNameForTTS: storyData.voiceNameForTTS || storyData.selectedVoice,
                        avatarUrl: storyData.avatarUrl || null,
                        music: musicData,
                        gamificationEnabled: storyData.gamificationEnabled || false,
                        questionTiming: storyData.questionTiming || 'none',
                        selectedQuestionTypes: storyData.selectedQuestionTypes || [],
                        totalQuestions: storyData.totalQuestions || 0,
                        characterPrompt: storyData.characterPrompt || null,
                        scenes: storyData.scenes.map((scene, index) => ({
                            number: index + 1,
                            narration: scene.narration || '',
                            narrationLines: scene.narrationLines || [],
                            characters: scene.characters || [],
                            visualDescription: scene.visualDescription || '',
                            imageUrl: scene.imageUrl || null,
                            scenePrompt: scene.scenePrompt || '',
                            gamification: scene.gamification || null
                        })),
                        afterStoryQuestions: storyData.afterStoryQuestions || []
                    },
                    audioFiles: audioFiles,
                    visemeData: visemeData
                };

                console.log('📤 Payload prepared:', {
                    title: payload.storyData.title,
                    scenes: payload.storyData.scenes.length,
                    audioFiles: Object.keys(audioFiles).length
                });

                // Send to save_story.php
                const response = await fetch('/source/handlers/save_story.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                // Get response text first for better error handling
                const responseText = await response.text();
                console.log('📥 Server response:', responseText);

                let result;
                try {
                    result = JSON.parse(responseText);
                } catch (parseError) {
                    console.error('❌ Failed to parse JSON response:', parseError);
                    console.error('Response text:', responseText);
                    throw new Error('Server returned invalid response. Check console for details.');
                }

                if (!result.success) {
                    throw new Error(result.error || 'Failed to save story');
                }

                console.log('✅ Story saved successfully:', result);

                // Update IndexedDB with the saved story
                await saveStoryToIndexedDB(storyData);
                console.log('🎵 Music and story saved to IndexedDB');

                // Also update localStorage as backup
                localStorage.setItem('generatedStoryData', JSON.stringify(storyData));
                console.log('🎵 Music and story saved to localStorage');

                // Show success notification
                notificationSystem.success('Story saved! Redirecting to storyboard...', 2000);

                // Stop preview music before navigating to storyboard
                const stopMusicEvent = new CustomEvent('stopPreviewMusic');
                document.dispatchEvent(stopMusicEvent);

                // Hide preview modal
                const previewModal = document.getElementById('previewModal');
                if (previewModal) {
                    previewModal.classList.remove('show');
                    previewModal.classList.add('hidden');
                }

                // Redirect to separate storyboard page
                setTimeout(() => {
                    window.location.href = '/storyboard';
                }, 1000);

            } catch (error) {
                console.error('❌ Error saving story before navigation:', error);
                notificationSystem.error(
                    `<strong>Save Failed</strong><br>
                    ${error.message}<br>
                    <small>Please try again or contact support</small>`,
                    8000
                );

                // Restore button
                continueBtn.disabled = false;
                continueBtn.innerHTML = originalText;
            }
        });
    }

    // Save Story button - saves to database
    const saveStoryBtn = document.getElementById('saveStoryBtn');
    if (saveStoryBtn) {
        saveStoryBtn.addEventListener('click', async () => {
            console.log('💾 Save Story button clicked');

            // Get the story data from window or IndexedDB
            let storyData = window.currentGeneratedStory || window.currentStoryData;

            if (!storyData) {
                // Try to load from IndexedDB
                try {
                    storyData = await loadStoryFromIndexedDB();
                } catch (error) {
                    console.error('❌ Failed to load story data:', error);
                }
            }

            if (!storyData) {
                notificationSystem.error('No story data found. Please generate a story first.');
                return;
            }

            // Disable button and show loading state
            const originalText = saveStoryBtn.innerHTML;
            saveStoryBtn.disabled = true;
            saveStoryBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            try {
                // Get music selection from preview modal
                const musicSelect = document.getElementById('previewMusicSelect');
                let musicData = null;

                // Validate that music is selected
                if (!musicSelect || !musicSelect.value || musicSelect.value === '') {
                    // Check if there's music in storyData as fallback
                    if (!storyData.music || !storyData.music.file || storyData.music.file === '') {
                        // Restore button state
                        saveStoryBtn.disabled = false;
                        saveStoryBtn.innerHTML = originalText;

                        // Show error notification
                        notificationSystem.error(
                            '<strong>Background Music Required</strong><br>' +
                            'Please select background music before saving your story.<br>' +
                            '<small>Choose a music track from the dropdown menu below</small>',
                            5000
                        );
                        return;
                    }
                }

                if (musicSelect && musicSelect.value && musicSelect.value !== '') {
                    const selectedMusic = musicSelect.value;
                    const selectedOption = musicSelect.options[musicSelect.selectedIndex];
                    const musicLabel = selectedOption ? selectedOption.text : selectedMusic;

                    // Get volume from user settings, default to 0.5 (50%)
                    const musicVolume = (window.userSettings && typeof window.userSettings.music_volume === 'number')
                        ? window.userSettings.music_volume
                        : 0.5;

                    musicData = {
                        enabled: true,
                        file: selectedMusic,      // PHP expects 'file' not 'fileName'
                        name: musicLabel,          // PHP expects 'name' not 'label'
                        volume: musicVolume       // Volume as decimal (0-1), from user settings
                    };

                    console.log('🎵 Music data from preview modal:', musicData);
                } else {
                    // Fallback to storyData.music if no music selected in modal
                    musicData = storyData.music || null;
                    console.log('🎵 Using music data from storyData:', musicData);
                }

                console.log('📤 Preparing to save story to database...');

                // Prepare audio files and viseme data objects
                const audioFiles = {};
                const visemeData = {};

                // Extract audio and viseme data from scenes
                if (storyData.scenes) {
                    for (let sceneIndex = 0; sceneIndex < storyData.scenes.length; sceneIndex++) {
                        const scene = storyData.scenes[sceneIndex];
                        const sceneNumber = sceneIndex + 1;

                        if (scene.audioUrls && scene.audioUrls.length > 0) {
                            for (let lineIndex = 0; lineIndex < scene.audioUrls.length; lineIndex++) {
                                const audioUrl = scene.audioUrls[lineIndex];
                                const lineNumber = lineIndex + 1;
                                const audioKey = `scene_${sceneNumber}_line_${lineNumber}`;

                                // Convert audio URL to base64 if it's a blob or data URL
                                if (audioUrl && typeof audioUrl === 'string') {
                                    audioFiles[audioKey] = audioUrl;
                                }

                                // Extract viseme data for this line
                                if (scene.visemeDataArray && scene.visemeDataArray[lineIndex]) {
                                    visemeData[audioKey] = scene.visemeDataArray[lineIndex];
                                }
                            }
                        }
                    }
                }

                console.log(`📤 Audio files to upload: ${Object.keys(audioFiles).length}`);
                console.log(`📤 Viseme data to save: ${Object.keys(visemeData).length}`);

                // Prepare the request payload
                const payload = {
                    storyData: {
                        title: storyData.title || 'Untitled Story',
                        theme: storyData.theme || null,
                        totalScenes: storyData.scenes.length,
                        thumbnailUrl: storyData.thumbnailUrl || null,
                        contextImageUrl: storyData.contextImageUrl || null,
                        selectedVoice: storyData.selectedVoice || null,
                        voiceId: storyData.voiceId || null,
                        voiceNameForTTS: storyData.voiceNameForTTS || storyData.selectedVoice,
                        avatarUrl: storyData.avatarUrl || null,
                        music: musicData,
                        gamificationEnabled: storyData.gamificationEnabled || false,
                        questionTiming: storyData.questionTiming || 'none',
                        selectedQuestionTypes: storyData.selectedQuestionTypes || [],
                        totalQuestions: storyData.totalQuestions || 0,
                        characterPrompt: storyData.characterPrompt || null,
                        scenes: storyData.scenes.map((scene, index) => ({
                            number: index + 1,
                            narration: scene.narration || '',
                            narrationLines: scene.narrationLines || [],
                            characters: scene.characters || [],
                            visualDescription: scene.visualDescription || '',
                            imageUrl: scene.imageUrl || null,
                            scenePrompt: scene.scenePrompt || '',
                            gamification: scene.gamification || null
                        })),
                        afterStoryQuestions: storyData.afterStoryQuestions || []
                    },
                    audioFiles: audioFiles,
                    visemeData: visemeData
                };

                console.log('📤 Payload prepared:', {
                    title: payload.storyData.title,
                    scenes: payload.storyData.scenes.length,
                    audioFiles: Object.keys(audioFiles).length
                });

                // Send to save_story.php
                const response = await fetch('/source/handlers/save_story.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                // Get response text first for better error handling
                const responseText = await response.text();
                console.log('📥 Server response:', responseText);

                let result;
                try {
                    result = JSON.parse(responseText);
                } catch (parseError) {
                    console.error('❌ Failed to parse JSON response:', parseError);
                    console.error('Response text:', responseText);
                    throw new Error('Server returned invalid response. Check console for details.');
                }

                if (!result.success) {
                    throw new Error(result.error || 'Failed to save story');
                }

                console.log('✅ Story saved successfully:', result);

                // Show success notification with upload status
                const audioInfo = result.details.upload_status === 'processing'
                    ? `${result.details.audio_files_total} audio files uploading in background`
                    : `Audio: ${result.details.audio_files || result.details.audio_files_total}`;

                notificationSystem.success(
                    `<strong>Story Saved!</strong><br>
                    Your story has been saved successfully.<br>
                    <small>Scenes: ${result.details.scenes_saved}, ${audioInfo}</small>`,
                    5000
                );

                // Close the preview modal
                const previewModal = document.getElementById('previewModal');
                if (previewModal) {
                    previewModal.classList.remove('show');
                    previewModal.classList.add('hidden');
                }

                // Reload the stories in the dashboard
                setTimeout(() => {
                    if (typeof window.loadUserStories === 'function') {
                        window.loadUserStories();
                    } else {
                        // Fallback: reload the page
                        window.location.reload();
                    }
                }, 500);

            } catch (error) {
                console.error('❌ Error saving story:', error);
                notificationSystem.error(
                    `<strong>Save Failed</strong><br>
                    ${error.message}<br>
                    <small>Please try again or contact support</small>`,
                    8000
                );
            } finally {
                // Restore button
                saveStoryBtn.disabled = false;
                saveStoryBtn.innerHTML = originalText;
            }
        });
    }

    // Regenerate story button
    const regenerateBtn = document.getElementById('regenerateStory');
    if (regenerateBtn) {
        regenerateBtn.addEventListener('click', () => {
            const modal = document.getElementById('previewModal');
            if (modal) {
                modal.classList.remove('show');
                modal.classList.add('hidden');
            }
            generateComprehensiveStory();
        });
    }

    // Cancel generation button
    const cancelBtn = document.getElementById('cancelGenerationBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            storyGenerationAborted = true;
            logToConsole('Story generation cancelled by user', 'warning');

            const progressModal = document.getElementById('progressModal');
            if (progressModal) {
                const modal = bootstrap.Modal.getInstance(progressModal);
                if (modal) {
                    modal.hide();
                }
            }
        });
    }

    // Thumbnail modal close button
    const thumbnailCloseBtn = document.getElementById('thumbnailModalClose');
    if (thumbnailCloseBtn) {
        thumbnailCloseBtn.addEventListener('click', function() {
            hideThumbnailModal();
        });
    }

    // View Story Preview button - transition to preview modal
    const viewPreviewBtn = document.getElementById('viewStoryPreviewBtn');
    if (viewPreviewBtn) {
        viewPreviewBtn.addEventListener('click', function() {
            // Hide thumbnail modal
            hideThumbnailModal();

            // Show preview modal after brief delay
            setTimeout(() => {
                if (window.currentThumbnailStoryData && typeof window.showPreviewModal === 'function') {
                    window.showPreviewModal(window.currentThumbnailStoryData);
                } else {
                    console.error('Story data or showPreviewModal function not available');
                }
            }, 300);
        });
    }

    // Close thumbnail modal on overlay click
    const thumbnailModal = document.getElementById('thumbnailModal');
    if (thumbnailModal) {
        const overlay = thumbnailModal.querySelector('.thumbnail-modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', function() {
                hideThumbnailModal();
            });
        }
    }

    // Test Thumbnail Modal button
    const testThumbnailBtn = document.getElementById('testThumbnailBtn');
    if (testThumbnailBtn) {
        testThumbnailBtn.addEventListener('click', function() {
            console.log('🧪 Testing Thumbnail Modal...');

            // Create sample story data for testing
            const sampleStoryData = {
                title: "The Magical Forest Adventure",
                theme: "Friendship and Discovery",
                thumbnailUrl: "https://image.pollinations.ai/prompt/A%20magical%20forest%20adventure%20story%20thumbnail%2C%20featuring%20two%20children%20exploring%20an%20enchanted%20forest%2C%202D%20illustration%2C%20Disney%20animation%20style%2C%20soft%20pastel%20colors%20with%20warm%20glow%2C%20cinematic%20lighting%20creating%20a%20magical%20atmosphere%2C%20painterly%20texture%2C%20aesthetic%20composition%20with%20detailed%20fantasy%20background%2C%20glowing%20mushrooms%20and%20fireflies%2C%20whimsical%20trees%2C%20children%20holding%20hands%20and%20smiling?width=1920&height=1024&nologo=true",
                thumbnailPrompt: "The Magical Forest Adventure, featuring two young adventurers discovering an enchanted forest filled with wonder, 2D illustration, Disney animation style, soft pastel colors with warm glow, cinematic lighting creating a magical atmosphere, painterly texture, aesthetic composition with detailed background showing glowing mushrooms, sparkling fireflies, and ancient trees with friendly faces, characters in excited exploring poses with backpacks and maps, fantasy setting with mystical fog and golden sunbeams filtering through the canopy.",
                scenes: []
            };

            // Show the thumbnail modal with sample data
            if (typeof window.showThumbnailModal === 'function') {
                window.showThumbnailModal(sampleStoryData);
                console.log('✅ Thumbnail modal test displayed');
            } else {
                console.error('showThumbnailModal function not available');
            }
        });
    }

    // Debug: Verify function availability
    console.log('✅ Enhanced story generation loaded successfully');
    console.log('📖 generateComprehensiveStory function available:', typeof generateComprehensiveStory === 'function');
});

// ============================================
// THUMBNAIL MODAL FUNCTIONS
// ============================================

// Show thumbnail modal with story data
function showThumbnailModal(storyData) {
    const thumbnailModal = document.getElementById('thumbnailModal');
    if (!thumbnailModal) {
        console.error('Thumbnail modal not found!');
        return;
    }

    // Set story title
    const titleElement = document.getElementById('thumbnailStoryTitle');
    if (titleElement) {
        titleElement.textContent = storyData.title || 'Your Amazing Story';
    }

    // Set thumbnail image
    const thumbnailImage = document.getElementById('thumbnailImage');
    if (thumbnailImage && storyData.thumbnailUrl) {
        thumbnailImage.src = storyData.thumbnailUrl;
        thumbnailImage.alt = `${storyData.title} - Thumbnail`;
    }

    // Show the modal
    thumbnailModal.classList.remove('hidden');

    // Store story data for later use
    window.currentThumbnailStoryData = storyData;

    console.log('✅ Thumbnail modal displayed');
}

// Hide thumbnail modal
function hideThumbnailModal() {
    const thumbnailModal = document.getElementById('thumbnailModal');
    if (thumbnailModal) {
        thumbnailModal.classList.add('hidden');
    }
}

// Make functions available globally
window.showThumbnailModal = showThumbnailModal;
window.hideThumbnailModal = hideThumbnailModal;
window.showPreviewModal = showPreviewModal;
window.generateComprehensiveStory = generateComprehensiveStory;