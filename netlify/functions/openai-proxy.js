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

        // 1. Construct System Prompt
        let typeConfig = "";
        let totalCount = 0;

        if (Array.isArray(config)) {
            config.forEach(c => {
                typeConfig += `- ${c.type}: ${c.count}문항\n`;
                totalCount += parseInt(c.count);
            });
        } else {
            // Fallback for legacy
            const body = JSON.parse(event.body);
            typeConfig = `- ${body.type}: ${body.count}문항`;
            totalCount = parseInt(body.count);
        }

        const systemPrompt = `
      당신은 선생님을 돕는 AI 보조교사입니다. 제공된 [학습 내용]을 바탕으로 학생들을 위한 학습 자료와 문제를 생성해주세요.
      반드시 유효한 JSON 형식으로만 출력하세요. 마크다운 포맷(\`\`\`json)을 포함하지 마세요.
      
      [요청 사항]
      - 총 문항 수: ${totalCount}개
      - 문항 구성:
      ${typeConfig}
      - 언어: 한국어

      [문제 유형별 가이드]
      1. **short-answer (단답형)**: 정답은 반드시 **단어** 또는 **짧은 구**여야 합니다. 문장이 되어서는 안 됩니다.
      2. **fill-in-the-blank (빈칸 채우기)**: 문제 문장에 빈칸 \`(    )\`을 포함하세요. 정답은 그 빈칸에 들어갈 말입니다.
      3. **multiple-choice (선택형)**: 4개의 보기를 제공하세요.
      4. **ox-quiz**: 정답은 "O" 또는 "X"입니다.
      5. **essay (논술형)**: 정답 필드에 모범 답안이나 채점 기준을 작성하세요.
      6. **inquiry (탐구과제형)**: 정답 필드에 탐구 가이드를 작성하세요.

      [출력 JSON 구조]
      {
        "title": "생성된 학습 자료 제목",
        "learningContent": {
          "text": "학습 내용 요약 (업로드된 파일 내용 포함)",
          "video": "${videoUrl || ''}",
          "image": "${imageUrl || ''}"
        },
        "questions": [
          {
            "id": 1,
            "type": "question_type", 
            "question": "질문 내용 (빈칸 채우기인 경우 (    ) 포함)",
            "options": ["보기1", "보기2", "보기3", "보기4"], // 객관식만
            "answer": "정답",
            "explanation": "해설"
          }
        ]
      }
    `;

        // 2. Construct User Message
        const userContent = [
            { type: "text", text: `[학습 내용]\n${context || ''}\n\n[주제/키워드]\n${prompt}` }
        ];

        if (fileData && fileType && fileType.startsWith('image/')) {
            userContent.push({
                type: "image_url",
                image_url: {
                    "url": `data:${fileType};base64,${fileData}`
                }
            });
        }

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userContent }
            ],
            model: "gpt-4o", // Use GPT-4o for vision and better complex instruction following
        });

        const content = completion.choices[0].message.content;
        const jsonContent = content.replace(/```json\n?|```/g, "").trim();

        return {
            statusCode: 200,
            body: jsonContent,
        };

    } catch (error) {
        console.error("OpenAI Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
