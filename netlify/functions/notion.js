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
