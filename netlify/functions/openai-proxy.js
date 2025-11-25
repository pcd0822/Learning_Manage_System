const OpenAI = require('openai');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { prompt, type, count } = JSON.parse(event.body);

    if (!process.env.OPENAI_API_KEY) {
      return { statusCode: 500, body: 'OpenAI API Key is missing' };
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = `
      You are a helpful assistant that generates educational quizzes.
      Output ONLY valid JSON. Do not include markdown formatting like \`\`\`json.
      Structure:
      {
        "title": "Quiz Title",
        "questions": [
          {
            "id": 1,
            "type": "${type}", 
            "question": "Question text",
            "options": ["Option A", "Option B", "Option C", "Option D"], // Only for multiple choice
            "answer": "Correct Answer"
          }
        ]
      }
      Generate ${count} questions about the topic provided.
    `;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Topic: ${prompt}` }
      ],
      model: "gpt-3.5-turbo", // Or gpt-4 if available/preferred
    });

    const content = completion.choices[0].message.content;
    
    // Attempt to parse JSON to ensure validity
    let quizData;
    try {
        quizData = JSON.parse(content);
    } catch (e) {
        // Fallback cleanup if model includes markdown code blocks
        const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
        quizData = JSON.parse(cleaned);
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quizData),
    };

  } catch (error) {
    console.error("OpenAI Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to generate quiz", details: error.message }),
    };
  }
};
