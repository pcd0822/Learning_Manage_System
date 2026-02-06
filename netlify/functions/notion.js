const { Client } = require('@notionhq/client');

exports.handler = async (event, context) => {
    // Get credentials from Headers (Frontend Config) or Env Vars (Backend Config)
    const NOTION_API_KEY = event.headers['x-notion-token'] || process.env.NOTION_API_KEY;
    const MATERIALS_DB_ID = event.headers['x-materials-db'] || process.env.NOTION_DATABASE_ID_MATERIALS;
    const RESULTS_DB_ID = event.headers['x-results-db'] || process.env.NOTION_DATABASE_ID_RESULTS;

    if (!NOTION_API_KEY) {
        return { statusCode: 401, body: JSON.stringify({ error: "Missing Notion API Key" }) };
    }

    const notion = new Client({ auth: NOTION_API_KEY });

    try {
        // Handle GET requests (Fetch Quiz or Stats)
        if (event.httpMethod === 'GET') {
            const { action, id } = event.queryStringParameters;

            if (action === 'fetch') {
                // Fetch specific quiz by Page ID
                const page = await notion.pages.retrieve({ page_id: id });

                // Fetch content from the page's children (looking for the Code Block)
                const blocks = await notion.blocks.children.list({ block_id: id });
                let quizDataString = "{}";

                const codeBlock = blocks.results.find(b => b.type === 'code');
                if (codeBlock) {
                    quizDataString = codeBlock.code.rich_text[0].plain_text;
                } else {
                    // Fallback for legacy data (if any)
                    const props = page.properties;
                    quizDataString = props.QuizData?.rich_text[0]?.plain_text || "{}";
                }

                return {
                    statusCode: 200,
                    body: quizDataString,
                };
            }

            if (action === 'stats') {
                // Fetch all results
                const response = await notion.databases.query({
                    database_id: RESULTS_DB_ID,
                });

                // Transform data for dashboard
                const results = response.results.map(page => {
                    const props = page.properties;
                    return {
                        studentName: props['학생이름'].title[0]?.plain_text || 'Anonymous',
                        score: props['점수'].number,
                        accuracy: props['정답률'].number,
                        timeTaken: props['소요시간'].rich_text[0]?.plain_text,
                        submittedAt: props['제출일시'].date?.start,
                        materialId: props['학습자료'].relation[0]?.id,
                        answers: props['제출답안'].rich_text[0]?.plain_text
                    };
                });

                return {
                    statusCode: 200,
                    body: JSON.stringify(results),
                };
            }
        }

        // Handle POST requests (Publish Quiz or Submit Result)
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            const { action } = body;

            if (action === 'publish') {
                const { title, quizData, count } = body;

                // 학습자료(재료) DB 필수 속성: 제목(title), 문항수(number), 생성일(date) — 이름이 정확히 일치해야 함
                if (!MATERIALS_DB_ID) {
                    return { statusCode: 400, body: JSON.stringify({ error: '학습자료 DB ID가 없습니다. 설정에서 재료 DB ID를 입력해 주세요.' }) };
                }

                const quizDataString = typeof quizData === 'string' ? quizData : JSON.stringify(quizData, null, 2);

                const response = await notion.pages.create({
                    parent: { database_id: MATERIALS_DB_ID },
                    properties: {
                        '제목': { title: [{ text: { content: title } }] },
                        '문항수': { number: parseInt(count) },
                        '생성일': { date: { start: new Date().toISOString() } }
                    },
                    children: [
                        {
                            object: 'block',
                            type: 'code',
                            code: {
                                rich_text: [{ text: { content: quizDataString } }],
                                language: 'json'
                            }
                        }
                    ]
                });

                return {
                    statusCode: 200,
                    body: JSON.stringify({ pageId: response.id }),
                };
            }

            if (action === 'submit') {
                const { studentName, materialId, score, accuracy, timeTaken, answers } = body;

                if (!RESULTS_DB_ID || RESULTS_DB_ID === 'null') {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ error: '학습결과 DB ID가 없습니다. 선생님 설정에서 학습결과 DB ID를 저장한 뒤, 새 공유 링크로 다시 접속해 주세요.' })
                    };
                }

                const formattedAnswers = answers.map(a => `Q${a.questionId}. ${a.userAnswer}`).join('\n');
                const safeText = (str, maxLen = 2000) => (str && str.length > maxLen ? str.slice(0, maxLen) + '…' : str);

                const response = await notion.pages.create({
                    parent: { database_id: RESULTS_DB_ID },
                    properties: {
                        '학생이름': { title: [{ text: { content: (studentName || '이름없음').slice(0, 255) } }] },
                        '학습자료': { relation: [{ id: materialId }] },
                        '점수': { number: score },
                        '정답률': { number: accuracy },
                        '소요시간': { rich_text: [{ text: { content: safeText(timeTaken) } }] },
                        '제출답안': { rich_text: [{ text: { content: safeText(formattedAnswers) } }] },
                        '제출일시': { date: { start: new Date().toISOString() } },
                        '복습완료': { checkbox: false }
                    }
                });

                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: "Submission successful", pageId: response.id }),
                };
            }

            if (action === 'review_complete') {
                const { pageId } = body;

                await notion.pages.update({
                    page_id: pageId,
                    properties: {
                        '복습완료': { checkbox: true }
                    }
                });

                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: "Review status updated" }),
                };
            }
        }

        return { statusCode: 400, body: 'Invalid Request' };

    } catch (error) {
        console.error("Notion Error:", error);
        let message = error.message || String(error);
        if (error.body) {
            try {
                const parsed = typeof error.body === 'string' ? JSON.parse(error.body) : error.body;
                if (parsed && parsed.message) message = parsed.message;
            } catch (_) {
                if (typeof error.body === 'string') message = error.body;
            }
        }
        const hint = (message.includes('validation') || message.includes('property'))
            ? ' Notion DB 속성 확인: 학습자료 DB → 제목, 문항수, 생성일 / 학습결과 DB → 학생이름, 학습자료(관계), 점수, 정답률, 소요시간, 제출답안, 제출일시, 복습완료'
            : '';
        return {
            statusCode: error.status || 500,
            body: JSON.stringify({ error: message + hint }),
        };
    }
};
