import fetch from 'node-fetch';

const API_KEY = process.env.DASHSCOPE_API_KEY;

if (!API_KEY) {
  throw new Error('Set DASHSCOPE_API_KEY before running this test. Example: DASHSCOPE_API_KEY=sk-... node test-api.example.js');
}

async function testApi() {
  console.log('Testing DashScope API endpoint: qwen-image-edit-plus');

  const url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  };

  const dummyImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  const payload = {
    model: 'qwen-image-edit-plus',
    input: {
      messages: [
        {
          role: 'user',
          content: [
            { image: dummyImage },
            { text: 'Describe this image' },
          ],
        },
      ],
    },
    parameters: {
      n: 1,
      watermark: false,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  console.log('Status:', response.status);
  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

testApi().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
