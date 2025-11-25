const OpenAI = require('openai');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { prompt, context, videoUrl, imageUrl, config, fileData, fileType } = JSON.parse(event.body);

        if (!process.env.OPENAI_API_KEY) {
            return { statusCode: 500, body: 'OpenAI API Key is missing' };
            ```javascript
const OpenAI = require('openai');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { prompt, context, videoUrl, imageUrl, config, fileData, fileType } = JSON.parse(event.body);

    if (!process.env.OPENAI_API_KEY) {
      return { statusCode: 500, body: 'OpenAI API Key is missing' };
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // 3. Construct User Message
    const userContent = [
        { type: "text", text: `[학습 내용]\n${ context || '' } \n\n[주제 / 키워드]\n${ prompt } ` }
    ];
    // 1. Process File Upload (Images only, PDF text is already in context)
    // If fileData exists, it's an image for GPT-4o Vision
    
    // 2. Construct System Prompt
```
