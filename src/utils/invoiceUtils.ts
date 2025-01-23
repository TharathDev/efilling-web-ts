import { Invoice, InvoiceResult } from '../types';
import axios from 'axios';

export const extractInvoiceData = (metadata: string, keys: string[]) => {
  console.log("\nExtracting invoice data from metadata...");
  const urlMatch = metadata.match(/fetch\("([^"]+)"/);
  if (!urlMatch) {
    throw new Error("Could not extract URL from fetch request");
  }
  const firstUrl = urlMatch[1];

  const headersMatch = metadata.match(/"headers":\s*({[\s\S]*?}),/);
  if (!headersMatch) {
    throw new Error("Could not extract headers from fetch request");
  }
  const headers = JSON.parse(headersMatch[1].replace(/\n/g, ''));

  const bodyMatch = metadata.match(/"body":\s*"({(?:[^"\\]|\\.)*})"/);
  if (!bodyMatch) {
    throw new Error("Could not extract body from fetch request");
  }
  const body = bodyMatch[1]
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t');

  let bodyObject: Record<string, unknown> = {};
  try {
    bodyObject = JSON.parse(body);
  } catch (error) {
    console.error("Failed to parse body JSON:", error);
  }

  const xsrfToken = headers['x-xsrf-token'] || "Not found";
  const cookie = headers['cookie'] || "Not found";

  keys.forEach(key => delete bodyObject[key]);

  return { firstUrl, xsrfToken, cookie, body: bodyObject, headers };
};

export const fetchCompanyInfo = async (tin: string, headers: Record<string, string>) => {
  const type = tin.includes("-") ? 1 : 2;
  const url = type === 1
    ? "https://efiling.tax.gov.kh/gdtefilingweb/company/info"
    : "https://efiling.tax.gov.kh/gdtefilingweb/api/nontaxpayer";

  const body = JSON.stringify(type === 1 ? { TIN: tin, TYPE: type } : { TIN: tin });

  try {
    const response = await axios.post<{ DATA: { ID: string } }>(url, body, { headers });
    const data = response.data;
    const id = data.DATA.ID;
    console.log(`Company info fetched successfully for TIN: ${tin}`);
    return { id, type };
  } catch (error) {
    console.error(`Failed to fetch company info for TIN: ${tin}`);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
    return null;
  }
};

export const validateInvoiceAmounts = (invoice: Invoice) => {
  if (invoice.TOTAL_AMT && invoice.AMOUNT_KHR) {
    throw new Error(`Invoice ${invoice.INV_NO} has both TOTAL_AMT and AMOUNT_KHR - only one amount field should be provided`);
  }
  if (!invoice.TOTAL_AMT && !invoice.AMOUNT_KHR) {
    throw new Error(`Invoice ${invoice.INV_NO} is missing both TOTAL_AMT and AMOUNT_KHR - one amount field is required`);
  }
};

export const processInvoiceAmounts = (invoice: Invoice, requestBody: Record<string, unknown>) => {
  if (invoice.TOTAL_AMT) {
    requestBody.TOTAL_AMT = parseFloat(invoice.TOTAL_AMT.replace(/,/g, "").trim());
    delete requestBody.AMOUNT_KHR;
  } else if (invoice.AMOUNT_KHR) {
    requestBody.AMOUNT_KHR = parseFloat(invoice.AMOUNT_KHR.replace(/,/g, "").trim());
    delete requestBody.TOTAL_AMT;
  }
};
