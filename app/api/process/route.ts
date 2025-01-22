import { processData } from '../../../backend';

export async function POST(request: Request) {
  try {
    const { textJsContent, jsonData } = await request.json();
    
    if (!textJsContent || !jsonData) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate and parse JSON data
    let parsedJsonData;
    try {
      parsedJsonData = JSON.parse(jsonData);
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid JSON format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('Processing request with:', { textJsContent, parsedJsonData });
    const startTime = Date.now();
    const result = await processData(textJsContent, JSON.stringify(parsedJsonData));
    
    return new Response(JSON.stringify({
      ...result,
      requestBody: {
        textJsContent,
        jsonData,
        parsedJsonData
      },
      statusMessages: [
        '=== Processing Complete ===',
        `✅ Successfully Processed: ${result.success.length}`,
        `❌ Failed Invoices: ${result.failed.length}`,
        `⏱️  Total Processing Time: ${((Date.now() - startTime) / 1000).toFixed(2)} seconds`,
        `📊 Success Rate: ${((result.success.length / (result.success.length + result.failed.length)) * 100).toFixed(2)}%`
      ]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
