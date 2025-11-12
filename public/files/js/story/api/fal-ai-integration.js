


const FAL_API_ENDPOINT = '/source/handlers/fal_image_generation.php';


const REQUEST_TIMEOUT = 130000;


function fetchWithTimeout(url, options = {}, timeout = REQUEST_TIMEOUT) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout - server took too long to respond')), timeout)
        )
    ]);
}


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
                
                if (error.error_details) {
                    errorMessage = `${error.error}: ${error.error_details}`;
                } else if (error.error) {
                    errorMessage = error.error;
                } else if (error.raw_response) {
                    errorMessage = error.raw_response;
                }

                
                console.error('Full error response:', error);
            } catch (jsonError) {
                
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


async function generateSceneImageWithRetry(scenePrompt, contextImageUrl, sceneNumber, maxAttempts = Infinity, timeoutMinutes = 5) {
    let attempt = 1;
    const startTime = Date.now();
    const timeoutMs = timeoutMinutes * 60 * 1000;

    while (attempt <= maxAttempts) {
        try {
            
            if (Date.now() - startTime > timeoutMs) {
                throw new Error(`Scene ${sceneNumber} generation timed out after ${timeoutMinutes} minutes (${attempt} attempts)`);
            }

            console.log(`🔄 Scene ${sceneNumber} generation attempt ${attempt}...`);

            
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

            
            if (error.message.includes('timed out')) {
                throw error;
            }

            attempt++;
        }
    }

    
    throw new Error(`Scene ${sceneNumber} generation exhausted all attempts`);
}


async function generateContextImageWithRetry(characterPrompt, maxAttempts = Infinity, timeoutMinutes = 5) {
    let attempt = 1;
    const startTime = Date.now();
    const timeoutMs = timeoutMinutes * 60 * 1000;

    while (attempt <= maxAttempts) {
        try {
            
            if (Date.now() - startTime > timeoutMs) {
                throw new Error(`Context image generation timed out after ${timeoutMinutes} minutes (${attempt} attempts)`);
            }

            console.log(`🔄 Context image generation attempt ${attempt}...`);

            
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

            
            if (error.message.includes('timed out')) {
                throw error;
            }

            attempt++;
        }
    }

    
    throw new Error('Context image generation exhausted all attempts');
}


async function generateThumbnailImageWithRetry(thumbnailPrompt, maxAttempts = Infinity, timeoutMinutes = 5) {
    let attempt = 1;
    const startTime = Date.now();
    const timeoutMs = timeoutMinutes * 60 * 1000;

    while (attempt <= maxAttempts) {
        try {
            
            if (Date.now() - startTime > timeoutMs) {
                throw new Error(`Thumbnail image generation timed out after ${timeoutMinutes} minutes (${attempt} attempts)`);
            }

            console.log(`🔄 Thumbnail image generation attempt ${attempt}...`);

            
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

            
            if (error.message.includes('timed out')) {
                throw error;
            }

            attempt++;
        }
    }

    
    throw new Error('Thumbnail image generation exhausted all attempts');
}


async function generateThumbnailWithContextRetry(thumbnailPrompt, contextImageUrl, maxAttempts = Infinity, timeoutMinutes = 5) {
    let attempt = 1;
    const startTime = Date.now();
    const timeoutMs = timeoutMinutes * 60 * 1000;

    while (attempt <= maxAttempts) {
        try {
            
            if (Date.now() - startTime > timeoutMs) {
                throw new Error(`Thumbnail with context generation timed out after ${timeoutMinutes} minutes (${attempt} attempts)`);
            }

            console.log(`🔄 Thumbnail with context generation attempt ${attempt}...`);

            
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

            
            if (error.message.includes('timed out')) {
                throw error;
            }

            attempt++;
        }
    }

    
    throw new Error('Thumbnail with context generation exhausted all attempts');
}


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
