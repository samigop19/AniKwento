/**
 * Fal.ai Image Generation Integration
 * Handles communication with the Fal.ai API through the PHP backend handler
 */

// API endpoint for Fal.ai image generation
const FAL_API_ENDPOINT = '/source/handlers/fal_image_generation.php';

// Request timeout in milliseconds (130 seconds to allow PHP's 120s timeout)
const REQUEST_TIMEOUT = 130000;

/**
 * Fetch with timeout wrapper
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise} - Fetch promise with timeout
 */
function fetchWithTimeout(url, options = {}, timeout = REQUEST_TIMEOUT) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout - server took too long to respond')), timeout)
        )
    ]);
}

/**
 * Generate a thumbnail image using Fal.ai nano-banana model
 * @param {string} prompt - The image generation prompt from Step 6
 * @returns {Promise<string>} - The generated image URL
 */
async function generateThumbnailImage(prompt) {
    console.log('🖼️ Generating thumbnail image with Fal.ai...');

    try {
        const response = await fetchWithTimeout(FAL_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'thumbnail',
                prompt: prompt
            })
        });

        if (!response.ok) {
            let errorMessage = 'Thumbnail generation failed';
            try {
                const error = await response.json();
                // Build detailed error message
                if (error.error_details) {
                    errorMessage = `${error.error}: ${error.error_details}`;
                } else if (error.error) {
                    errorMessage = error.error;
                } else if (error.raw_response) {
                    errorMessage = error.raw_response;
                }

                // Log full error for debugging
                console.error('Full error response:', error);
            } catch (jsonError) {
                // If response is not JSON, try to get text
                try {
                    const errorText = await response.text();
                    errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
                } catch {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();

        if (!result.success || !result.image_url) {
            throw new Error('Invalid response from Fal.ai API');
        }

        console.log('✅ Thumbnail image generated successfully');
        return result.image_url;

    } catch (error) {
        console.error('❌ Thumbnail generation error:', error);
        throw error;
    }
}

/**
 * Generate a thumbnail image using Fal.ai nano-banana/edit model with character reference
 * @param {string} prompt - The thumbnail image generation prompt from Step 6
 * @param {string} contextImageUrl - The context character image URL for consistency
 * @returns {Promise<string>} - The generated thumbnail image URL
 */
async function generateThumbnailWithContext(prompt, contextImageUrl) {
    console.log('🖼️ Generating thumbnail image with character reference...');

    try {
        const response = await fetchWithTimeout(FAL_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'thumbnail_with_context',
                prompt: prompt,
                reference_image: contextImageUrl
            })
        });

        if (!response.ok) {
            let errorMessage = 'Thumbnail generation with context failed';
            try {
                const error = await response.json();
                // Build detailed error message
                if (error.error_details) {
                    errorMessage = `${error.error}: ${error.error_details}`;
                } else if (error.error) {
                    errorMessage = error.error;
                } else if (error.raw_response) {
                    errorMessage = error.raw_response;
                }
                console.error('Full error response:', error);
            } catch {
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();

        if (!result.success || !result.image_url) {
            throw new Error('Invalid response from Fal.ai API');
        }

        console.log('✅ Thumbnail with character reference generated successfully');
        return result.image_url;

    } catch (error) {
        console.error('❌ Thumbnail with context generation error:', error);
        throw error;
    }
}

/**
 * Generate a context character image using Fal.ai nano-banana model
 * @param {string} characterPrompt - The combined character prompt from Step 3
 * @returns {Promise<string>} - The generated image URL
 */
async function generateContextImage(characterPrompt) {
    console.log('👥 Generating context character image with Fal.ai...');

    try {
        const response = await fetchWithTimeout(FAL_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'context',
                prompt: characterPrompt
            })
        });

        if (!response.ok) {
            let errorMessage = 'Context image generation failed';
            try {
                const error = await response.json();
                // Build detailed error message
                if (error.error_details) {
                    errorMessage = `${error.error}: ${error.error_details}`;
                } else if (error.error) {
                    errorMessage = error.error;
                } else if (error.raw_response) {
                    errorMessage = error.raw_response;
                }
                console.error('Full error response:', error);
            } catch {
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();

        if (!result.success || !result.image_url) {
            throw new Error('Invalid response from Fal.ai API');
        }

        console.log('✅ Context character image generated successfully');
        return result.image_url;

    } catch (error) {
        console.error('❌ Context image generation error:', error);
        throw error;
    }
}

/**
 * Generate a scene image using Fal.ai nano-banana/edit model with character reference
 * @param {string} scenePrompt - The scene-specific prompt from Step 4
 * @param {string} contextImageUrl - The context character image URL for consistency
 * @param {number} sceneNumber - The scene number (for logging)
 * @returns {Promise<string>} - The generated scene image URL
 */
async function generateSceneImage(scenePrompt, contextImageUrl, sceneNumber) {
    console.log(`🎬 Generating scene ${sceneNumber} image with Fal.ai...`);

    try {
        const response = await fetchWithTimeout(FAL_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'scene',
                prompt: scenePrompt,
                reference_image: contextImageUrl
            })
        });

        if (!response.ok) {
            let errorMessage = `Scene ${sceneNumber} generation failed`;
            try {
                const error = await response.json();
                // Build detailed error message
                if (error.error_details) {
                    errorMessage = `${error.error}: ${error.error_details}`;
                } else if (error.error) {
                    errorMessage = error.error;
                } else if (error.raw_response) {
                    errorMessage = error.raw_response;
                }
                console.error('Full error response:', error);
            } catch {
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();

        if (!result.success || !result.image_url) {
            throw new Error('Invalid response from Fal.ai API');
        }

        console.log(`✅ Scene ${sceneNumber} image generated successfully`);
        return result.image_url;

    } catch (error) {
        console.error(`❌ Scene ${sceneNumber} generation error:`, error);
        throw error;
    }
}

/**
 * Generate a scene image with retry logic (unlimited retries with timeout)
 * @param {string} scenePrompt - The scene-specific prompt
 * @param {string} contextImageUrl - The context character image URL
 * @param {number} sceneNumber - The scene number
 * @param {number} maxAttempts - Maximum number of retry attempts (default: unlimited)
 * @param {number} timeoutMinutes - Timeout in minutes (default: 5 minutes)
 * @returns {Promise<string>} - The generated scene image URL
 */
async function generateSceneImageWithRetry(scenePrompt, contextImageUrl, sceneNumber, maxAttempts = Infinity, timeoutMinutes = 5) {
    let attempt = 1;
    const startTime = Date.now();
    const timeoutMs = timeoutMinutes * 60 * 1000;

    while (attempt <= maxAttempts) {
        try {
            // Check timeout
            if (Date.now() - startTime > timeoutMs) {
                throw new Error(`Scene ${sceneNumber} generation timed out after ${timeoutMinutes} minutes (${attempt} attempts)`);
            }

            console.log(`🔄 Scene ${sceneNumber} generation attempt ${attempt}...`);

            // Add delay BEFORE attempt to give browser time to process
            if (attempt > 1) {
                const delay = Math.min(1000 * Math.pow(2, Math.min(attempt - 2, 4)), 5000);
                console.log(`⏳ Waiting ${delay/1000} seconds before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            const imageUrl = await generateSceneImage(scenePrompt, contextImageUrl, sceneNumber);
            console.log(`✅ Scene ${sceneNumber} generated successfully on attempt ${attempt}`);
            return imageUrl;
        } catch (error) {
            console.warn(`⚠️ Scene ${sceneNumber} attempt ${attempt} failed:`, error.message);

            // If timeout, throw immediately
            if (error.message.includes('timed out')) {
                throw error;
            }

            attempt++;
        }
    }

    // Should never reach here, but just in case
    throw new Error(`Scene ${sceneNumber} generation exhausted all attempts`);
}

/**
 * Generate a context image with retry logic (unlimited retries with timeout)
 * @param {string} characterPrompt - The character prompt
 * @param {number} maxAttempts - Maximum number of retry attempts (default: unlimited)
 * @param {number} timeoutMinutes - Timeout in minutes (default: 5 minutes)
 * @returns {Promise<string>} - The generated context image URL
 */
async function generateContextImageWithRetry(characterPrompt, maxAttempts = Infinity, timeoutMinutes = 5) {
    let attempt = 1;
    const startTime = Date.now();
    const timeoutMs = timeoutMinutes * 60 * 1000;

    while (attempt <= maxAttempts) {
        try {
            // Check timeout
            if (Date.now() - startTime > timeoutMs) {
                throw new Error(`Context image generation timed out after ${timeoutMinutes} minutes (${attempt} attempts)`);
            }

            console.log(`🔄 Context image generation attempt ${attempt}...`);

            // Add delay BEFORE attempt to give browser time to process
            if (attempt > 1) {
                const delay = Math.min(1000 * Math.pow(2, Math.min(attempt - 2, 4)), 5000);
                console.log(`⏳ Waiting ${delay/1000} seconds before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            const imageUrl = await generateContextImage(characterPrompt);
            console.log(`✅ Context image generated successfully on attempt ${attempt}`);
            return imageUrl;
        } catch (error) {
            console.warn(`⚠️ Context image attempt ${attempt} failed:`, error.message);

            // If timeout, throw immediately
            if (error.message.includes('timed out')) {
                throw error;
            }

            attempt++;
        }
    }

    // Should never reach here, but just in case
    throw new Error('Context image generation exhausted all attempts');
}

/**
 * Generate a thumbnail image with retry logic (unlimited retries with timeout)
 * @param {string} thumbnailPrompt - The thumbnail prompt
 * @param {number} maxAttempts - Maximum number of retry attempts (default: unlimited)
 * @param {number} timeoutMinutes - Timeout in minutes (default: 5 minutes)
 * @returns {Promise<string>} - The generated thumbnail image URL
 */
async function generateThumbnailImageWithRetry(thumbnailPrompt, maxAttempts = Infinity, timeoutMinutes = 5) {
    let attempt = 1;
    const startTime = Date.now();
    const timeoutMs = timeoutMinutes * 60 * 1000;

    while (attempt <= maxAttempts) {
        try {
            // Check timeout
            if (Date.now() - startTime > timeoutMs) {
                throw new Error(`Thumbnail image generation timed out after ${timeoutMinutes} minutes (${attempt} attempts)`);
            }

            console.log(`🔄 Thumbnail image generation attempt ${attempt}...`);

            // Add delay BEFORE attempt to give browser time to process
            if (attempt > 1) {
                const delay = Math.min(1000 * Math.pow(2, Math.min(attempt - 2, 4)), 5000);
                console.log(`⏳ Waiting ${delay/1000} seconds before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            const imageUrl = await generateThumbnailImage(thumbnailPrompt);
            console.log(`✅ Thumbnail generated successfully on attempt ${attempt}`);
            return imageUrl;
        } catch (error) {
            console.warn(`⚠️ Thumbnail image attempt ${attempt} failed:`, error.message);

            // If timeout, throw immediately
            if (error.message.includes('timed out')) {
                throw error;
            }

            attempt++;
        }
    }

    // Should never reach here, but just in case
    throw new Error('Thumbnail image generation exhausted all attempts');
}

/**
 * Generate a thumbnail with context image and retry logic (unlimited retries with timeout)
 * @param {string} thumbnailPrompt - The thumbnail prompt
 * @param {string} contextImageUrl - The context character image URL
 * @param {number} maxAttempts - Maximum number of retry attempts (default: unlimited)
 * @param {number} timeoutMinutes - Timeout in minutes (default: 5 minutes)
 * @returns {Promise<string>} - The generated thumbnail image URL
 */
async function generateThumbnailWithContextRetry(thumbnailPrompt, contextImageUrl, maxAttempts = Infinity, timeoutMinutes = 5) {
    let attempt = 1;
    const startTime = Date.now();
    const timeoutMs = timeoutMinutes * 60 * 1000;

    while (attempt <= maxAttempts) {
        try {
            // Check timeout
            if (Date.now() - startTime > timeoutMs) {
                throw new Error(`Thumbnail with context generation timed out after ${timeoutMinutes} minutes (${attempt} attempts)`);
            }

            console.log(`🔄 Thumbnail with context generation attempt ${attempt}...`);

            // Add delay BEFORE attempt to give browser time to process
            if (attempt > 1) {
                const delay = Math.min(1000 * Math.pow(2, Math.min(attempt - 2, 4)), 5000);
                console.log(`⏳ Waiting ${delay/1000} seconds before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            const imageUrl = await generateThumbnailWithContext(thumbnailPrompt, contextImageUrl);
            console.log(`✅ Thumbnail with context generated successfully on attempt ${attempt}`);
            return imageUrl;
        } catch (error) {
            console.warn(`⚠️ Thumbnail with context attempt ${attempt} failed:`, error.message);

            // If timeout, throw immediately
            if (error.message.includes('timed out')) {
                throw error;
            }

            attempt++;
        }
    }

    // Should never reach here, but just in case
    throw new Error('Thumbnail with context generation exhausted all attempts');
}

// Export functions for use in other modules
window.FalAI = {
    generateThumbnailImage,
    generateThumbnailWithContext,
    generateContextImage,
    generateSceneImage,
    generateSceneImageWithRetry,
    generateContextImageWithRetry,
    generateThumbnailImageWithRetry,
    generateThumbnailWithContextRetry
};

console.log('✅ Fal.ai integration module loaded');
