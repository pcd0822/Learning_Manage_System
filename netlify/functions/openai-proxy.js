const OpenAI = require('openai');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { prompt, context, videoUrl, imageUrl, type, count } = JSON.parse(event.body);

        if (!process.env.OPENAI_API_KEY) {
            return { statusCode: 500, body: 'OpenAI API Key is missing' };
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const systemPrompt = `
      당신은 선생님을 돕는 AI 보조교사입니다. 제공된 [학습 내용]을 바탕으로 학생들을 위한 학습 자료와 문제를 생성해주세요.
      반드시 유효한 JSON 형식으로만 출력하세요. 마크다운 포맷(\`\`\`json)을 포함하지 마세요.
      
      [요청 사항]
      - 문제 유형: ${type}
      - 문항 수: ${count}개
      - 언어: 한국어

      [출력 JSON 구조]
      {
        "title": "생성된 학습 자료 제목",
        "learningContent": {
          "text": "학습 내용 요약 또는 원문",
          "video": "${videoUrl || ''}",
          "image": "${imageUrl || ''}"
        },
        "questions": [
          {
            "id": 1,
            "type": "${type}", 
            "question": "문제 질문",
            "options": ["보기1", "보기2", "보기3", "보기4"], // 객관식인 경우에만 포함
            "answer": "정답 (객관식은 보기 내용, 주관식/논술형은 모범 답안)",
            "explanation": "해설"
          }
        ]
      }

      유형별 가이드:
      - ox-quiz: options 없이 answer에 "O" 또는 "X"
      - multiple-choice: options에 4개 보기 제공
      - short-answer: 빈칸 채우기 등. answer에 정답 단어
      - essay: 논술형. answer에 채점 기준이나 모범 답안 예시
      - inquiry: 탐구과제형. answer에 탐구 포인트나 가이드
    `;

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `[학습 내용]\n${context}\n\n[주제/키워드]\n${prompt}` }
            ],
            model: "gpt-3.5-turbo", // gpt-4-turbo recommended for better Korean essay generation
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
