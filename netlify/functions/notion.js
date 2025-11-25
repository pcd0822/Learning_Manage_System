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
                const props = page.properties;
                const quizDataString = props.QuizData.rich_text[0]?.plain_text || "{}";

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
                        materialId: props['학습자료'].relation[0]?.id
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

                // Create page in Materials DB
                const response = await notion.pages.create({
                    parent: { database_id: MATERIALS_DB_ID },
                    properties: {
                        '제목': { title: [{ text: { content: title } }] },
                        'QuizData': { rich_text: [{ text: { content: JSON.stringify(quizData) } }] }, // Warning: 2000 char limit
                        '문항수': { number: parseInt(count) },
                        '생성일': { date: { start: new Date().toISOString() } }
                    }
                });

                return {
                    statusCode: 200,
                    body: JSON.stringify({ pageId: response.id }),
                };
            }

            if (action === 'submit') {
                const { studentName, materialId, score, accuracy, timeTaken, answers } = body;

                await notion.pages.create({
                    parent: { database_id: RESULTS_DB_ID },
                    properties: {
                        '학생이름': { title: [{ text: { content: studentName } }] },
                        '학습자료': { relation: [{ id: materialId }] },
                        '점수': { number: score },
                        '정답률': { number: accuracy },
                        '소요시간': { rich_text: [{ text: { content: timeTaken } }] },
                        '제출답안': { rich_text: [{ text: { content: JSON.stringify(answers) } }] },
                        '제출일시': { date: { start: new Date().toISOString() } }
                    }
                });

                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: "Submission successful" }),
                };
            }
        }

        return { statusCode: 400, body: 'Invalid Request' };

    } catch (error) {
        console.error("Notion Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
