"use client";

import { useState } from 'react';
import { ProcessResult } from '../backend';

export default function Home() {
  const [textJsContent, setTextJsContent] = useState('');
  const [jsonData, setJsonData] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);

  const validateJson = (jsonString: string): boolean => {
    try {
      JSON.parse(jsonString);
      setJsonError(null);
      return true;
    } catch (error) {
      setJsonError('Invalid JSON format');
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!textJsContent || !jsonData) {
      alert('Please provide both text content and JSON data');
      return;
    }

    if (!validateJson(jsonData)) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          textJsContent, 
          jsonData 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Processing failed');
      }

      const data: ProcessResult = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      setResult({
        success: [],
        failed: [],
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        statusMessages: [
          '=== Processing Failed ===',
          error instanceof Error ? error.message : 'Unknown error occurred'
        ]
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Data Processor</h1>
      
      <div className="mb-4">
        <label className="block mb-2">Text JS Content:</label>
        <textarea
          value={textJsContent}
          onChange={(e) => setTextJsContent(e.target.value)}
          className="w-full p-2 border rounded"
          rows={6}
          placeholder="Paste your text JS content here..."
        />
      </div>

      <div className="mb-4">
        <label className="block mb-2">JSON Data:</label>
        <textarea
          value={jsonData}
          onChange={(e) => {
            setJsonData(e.target.value);
            validateJson(e.target.value);
          }}
          className={`w-full p-2 border rounded ${
            jsonError ? 'border-red-500' : ''
          }`}
          rows={6}
          placeholder="Paste your JSON data here..."
        />
        {jsonError && (
          <p className="text-red-500 text-sm mt-1">{jsonError}</p>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={processing}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {processing ? 'Processing...' : 'Process Data'}
      </button>

      {result && (
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-2">Processing Results:</h2>
          <div className="bg-gray-100 p-4 rounded">
            <div className="mb-4 space-y-2">
              {result.statusMessages?.map((msg, idx) => (
                <div key={idx} className={`
                  ${msg.startsWith('===') ? 'font-bold' : ''}
                  ${msg.includes('✅') ? 'text-green-600' : ''}
                  ${msg.includes('❌') ? 'text-red-600' : ''}
                  ${msg.includes('⚠️') ? 'text-yellow-600' : ''}
                  ${msg.includes('⏱️') ? 'text-blue-600' : ''}
                  ${msg.includes('📊') ? 'text-purple-600' : ''}
                `}>
                  {msg}
                </div>
              ))}
            </div>
            <p className={`mb-4 ${
              result.failed.length > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {result.message}
            </p>

            {result.success.length > 0 && (
              <div className="mb-4">
                <h3 className="font-bold mb-2">✅ Successful Invoices:</h3>
                <ul className="list-disc pl-5">
                  {result.success.map((invoice, idx) => (
                    <li key={idx} className="mb-2">
                      <div className="font-medium">Invoice: {invoice.invoice_no}</div>
                      <div className="text-sm text-gray-600">{invoice.message}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.failed.length > 0 && (
              <div>
                <h3 className="font-bold mb-2 text-red-600">❌ Failed Invoices:</h3>
                <ul className="list-disc pl-5">
                  {result.failed.map((invoice, idx) => (
                    <li key={idx} className="mb-2">
                      <div className="font-medium">Invoice: {invoice.invoice_no}</div>
                      <div className="text-sm text-gray-600">{invoice.message}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
