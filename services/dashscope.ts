
/**
 * Service for interacting with Alibaba Cloud DashScope API (Qwen Image Edit Plus).
 * Documentation: https://help.aliyun.com/document_detail/2713709.html
 */

const API_KEY = process.env.DASHSCOPE_API_KEY;
// Use local proxy to avoid CORS
const BASE_URL = '/api/aliyun/services/aigc/multimodal-generation/generation';

interface DashScopeResponse {
    output: {
        choices: Array<{
            finish_reason: string;
            message: {
                role: string;
                content: Array<{
                    image?: string;
                    text?: string;
                }>;
            };
        }>;
    };
    usage?: {
        image_count: number;
        width: number;
        height: number;
    };
    request_id: string;
    code?: string;
    message?: string;
}

/**
 * Generate image using qwen-image-edit-plus model.
 * Supports multi-modal input (images + text).
 * Response is synchronous.
 * 
 * @param prompt Text instruction
 * @param images Array of Base64 image strings (data:image/jpeg;base64,...)
 */
export async function generateImageWithDashScope(
    prompt: string,
    images: string[]
): Promise<string> {
    if (!API_KEY) {
        throw new Error('DASHSCOPE_API_KEY is not configured');
    }

    const headers = {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        // 'X-DashScope-Async': 'enable' // Not used for this model according to docs
    };

    // Construct message content
    const content = [];

    // Add images
    images.forEach(img => {
        content.push({ image: img });
    });

    // Add prompt
    content.push({ text: prompt });

    const payload = {
        model: 'qwen-image-edit-plus',
        input: {
            messages: [
                {
                    role: 'user',
                    content: content
                }
            ]
        },
        parameters: {
            n: 1, // Number of output images
            negative_prompt: "low quality, text, watermark, blurry, deformed, distortion",
            prompt_extend: true,
            watermark: false
        }
    };

    const response = await fetch(BASE_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`DashScope API Error (${response.status}): ${errorData.message || errorData.code || response.statusText}`);
    }

    const data: DashScopeResponse = await response.json();

    if (data.code) {
        throw new Error(`Generation Failed: ${data.message}`);
    }

    // Extract result image URL
    const choices = data.output?.choices;
    if (choices && choices.length > 0) {
        const messageContent = choices[0].message.content;
        const imageItem = messageContent.find(item => item.image);
        if (imageItem && imageItem.image) {
            return imageItem.image;
        }
    }

    throw new Error('No image found in response');
}
