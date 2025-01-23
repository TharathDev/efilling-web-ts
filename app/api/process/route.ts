import { processData } from '../../../backend';

export const maxDuration = 30; // Set max duration to 30 seconds
export const dynamic = 'force-dynamic'; // Disable static optimization

export async function POST(request: Request) {
  try {
    // Set CORS headers
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Vary': 'Origin'
    });

    // Handle OPTIONS request for CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers
      });
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON format in request body'
      }), {
        status: 400,
        headers
      });
    }

    const { textJsContent, jsonData } = body;
    
    if (!textJsContent || !jsonData) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: textJsContent and jsonData are required'
      }), {
        status: 400,
        headers
      });
    }

    // Validate and parse JSON data with timeout
    let parsedJsonData;
    try {
      parsedJsonData = await Promise.race([
        JSON.parse(jsonData),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('JSON parsing timeout')), 5000)
        )
      ]);
    } catch (error) {
      console.error('JSON parsing error:', error);
      return new Response(JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Invalid JSON format'
      }), {
        status: 400,
        headers
      });
    }

    console.log('Processing request with:', { textJsContent, parsedJsonData });
    const startTime = Date.now();
    
    // Process data with timeout and type checking
    const processResult = await Promise.race([
      processData(textJsContent, JSON.stringify(parsedJsonData)),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Processing timeout')), 25000)
      )
    ]);

    // Type guard for processData result
    if (!processResult || 
        typeof processResult !== 'object' ||
        !('success' in processResult) ||
        !('failed' in processResult)) {
      throw new Error('Invalid processData response format');
    }

    const result = {
      success: Array.isArray(processResult.success) ? processResult.success : [],
      failed: Array.isArray(processResult.failed) ? processResult.failed : []
    };
    
    const successCount = result.success.length;
    const failedCount = result.failed.length;
    const totalCount = successCount + failedCount;
    
    return new Response(JSON.stringify({
      success: result.success,
      failed: result.failed,
      requestBody: {
        textJsContent,
        jsonData,
        parsedJsonData
      },
      statusMessages: [
        '=== Processing Complete ===',
        `✅ Successfully Processed: ${successCount}`,
        `❌ Failed Invoices: ${failedCount}`,
        `⏱️  Total Processing Time: ${((Date.now() - startTime) / 1000).toFixed(2)} seconds`,
        `📊 Success Rate: ${totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(2) : 0}%`
      ]
    }), {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }), {
      status: error instanceof Error && error.message.includes('timeout') ? 504 : 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*'
      }
    });
  }
}
