"use client";

import { useState } from 'react';
import type { ProcessResult, InvoiceResult } from '../backend';

export default function Home() {
  const [textJsContent, setTextJsContent] = useState('');
  const [jsonData, setJsonData] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);

  console.log(result);
  

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
      <h1 className="text-2xl font-bold mb-4">E-Filling WEB</h1>
      
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label>Text JS Content:</label>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  setTextJsContent(text);
                } catch (error) {
                  alert('Failed to read from clipboard');
                }
              }}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded text-sm"
            >
              Paste
            </button>
            <button
              onClick={() => setTextJsContent('')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded text-sm"
            >
              Clear
            </button>
          </div>
        </div>
        <textarea
          value={textJsContent}
          onChange={(e) => setTextJsContent(e.target.value)}
          className="w-full p-2 border rounded"
          rows={6}
          placeholder="Paste your text JS content here..."
        />
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label>JSON Data:</label>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  setJsonData(text);
                  validateJson(text);
                } catch (error) {
                  alert('Failed to read from clipboard');
                }
              }}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded text-sm"
            >
              Paste
            </button>
            <button
              onClick={() => {
                setJsonData('');
                setJsonError(null);
              }}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded text-sm"
            >
              Clear
            </button>
          </div>
        </div>
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

            <div className="overflow-x-auto">
              <table className="w-full results-table">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="px-4 py-2 text-left">Invoice No</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Remark</th>
                    <th className="px-4 py-2 text-left">Total Amount</th>
                    <th className="px-4 py-2 text-left">VAT Type</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {result.success.map((invoice, idx) => (
                    <tr key={`success-${idx}`} className={`
                      ${invoice.message === 'OK' ? 'bg-green-50' : 'bg-yellow-50'}
                      border-b border-gray-200
                    `}>
                      <td className="px-4 py-2">{invoice.parsedJsonData?.INV_DATE || 'N/A'}</td>
                      <td className="px-4 py-2">{invoice.invoice_no}</td>
                      <td className="px-4 py-2">{invoice.parsedJsonData?.INV_REMARK || 'N/A'}</td>
                      <td className="px-4 py-2">{invoice.parsedJsonData?.TOTAL_AMT || 'N/A'}</td>
                      <td className="px-4 py-2">{invoice.parsedJsonData?.VAT_TYPE || 3}</td>
                      <td className="px-4 py-2">Success</td>
                      <td className="px-4 py-2">{invoice.message}</td>
                    </tr>
                  ))}
                  {result.failed.map((invoice, idx) => (
                    <tr key={`failed-${idx}`} className="bg-red-50 border-b border-gray-200">
                      <td className="px-4 py-2">{invoice.parsedJsonData?.INV_DATE || 'N/A'}</td>
                      <td className="px-4 py-2">{invoice.invoice_no}</td>
                      <td className="px-4 py-2">{invoice.parsedJsonData?.INV_REMARK || 'N/A'}</td>
                      <td className="px-4 py-2">{invoice.parsedJsonData?.TOTAL_AMT || 'N/A'}</td>
                      <td className="px-4 py-2">{invoice.parsedJsonData?.VAT_TYPE || 3}</td>
                      <td className="px-4 py-2">Failed</td>
                      <td className="px-4 py-2">{JSON.parse(invoice.message).message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
