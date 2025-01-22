interface Invoice {
  ITEM_ID?: string;
  INV_NO: string;
  INV_DATE: string;
  TOTAL_AMT?: string;
  AMOUNT_KHR?: string;
  [key: string]: string | undefined;
}

interface CompanyInfo {
  id: string;
  type: number;
}

interface ApiResponse {
  DATA: {
    ID: string;
  };
}

interface InvoiceResult {
  invoice_no: string;
  message: string;
}

export interface ProcessResult {
  success: InvoiceResult[];
  failed: InvoiceResult[];
  message: string;
  statusMessages: string[];
}

import axios from 'axios';

// Configure axios defaults
const axiosInstance = axios.create({
  baseURL: 'https://efiling.tax.gov.kh',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*'
  }
});

export async function processData(textJsContent: string, jsonData: string) {
  try {
    const startTime = Date.now();
    const invoices = JSON.parse(jsonData);
    const keys = Object.keys(invoices[0]);

    console.log("\n=== Starting Data Processing ===\n");
    console.log(`Total invoices to process: ${invoices.length}`);
    console.log(`Processing started at: ${new Date(startTime).toLocaleString()}`);

    const extractInvoiceData = (metadata: string) => {
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

    const fetchCompanyInfo = async (tin: string, headers: Record<string, string>) => {
      // console.log(`Fetching company info for TIN: ${tin}`);
      const type = tin.includes("-") ? 1 : 2;
      const url = type === 1
        ? "https://efiling.tax.gov.kh/gdtefilingweb/company/info"
        : "https://efiling.tax.gov.kh/gdtefilingweb/api/nontaxpayer";

      const body = JSON.stringify(type === 1 ? { TIN: tin, TYPE: type } : { TIN: tin });

      try {
        const response = await axiosInstance.post<ApiResponse>(url, body, { headers });
        const data = response.data;
        const id = data.DATA.ID;
        console.log(`Company info fetched successfully for TIN: ${tin}`);
        return { id, type };
      } catch (error) {
        console.error(`Failed to fetch company info for TIN: ${tin}`);
        if (error instanceof Error) {
          console.error("Error details:", error.message);
        }
      }
    };

    const successfulInvoices: InvoiceResult[] = [];
    const failedInvoices: InvoiceResult[] = [];

    const savePurchaseSaleTax = async (invoice: Invoice) => {
      console.log(`\nProcessing invoice ${invoice.INV_NO}...`);
      const result = extractInvoiceData(textJsContent);
      if (!result) {
        console.error("Failed to extract invoice data");
        failedInvoices.push({
          invoice_no: invoice.INV_NO,
          message: "Failed to extract invoice data"
        });
        return;
      }

      const { firstUrl, xsrfToken, cookie, body } = result;
      const headers = {
        accept: "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/json;charset=UTF-8",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-requested-with": "XMLHttpRequest",
        "x-xsrf-token": xsrfToken,
        cookie,
        referrer: "https://efiling.tax.gov.kh/gdtefilingweb/entry/purchase-sale/PZXAr702MNle",
        referrerPolicy: "strict-origin-when-cross-origin"
      };

      if (invoice.ITEM_ID) {
        console.log(`Fetching company info for ITEM_ID: ${invoice.ITEM_ID}`);
        const newItemId = await fetchCompanyInfo(invoice.ITEM_ID, headers);
        if (!newItemId) {
          console.log(`Skipping invoice ${invoice.INV_NO}: Unable to fetch company info`);
          failedInvoices.push({
            invoice_no: invoice.INV_NO,
            message: "Unable to fetch company info"
          });
          return;
        }
        invoice.ITEM_ID = newItemId.id;
        if (result.body && typeof result.body === 'object') {
          (result.body as Record<string, unknown>).TAXPAYER_TYPE = newItemId.type;
        }
        console.log(`Updated ITEM_ID: ${newItemId.id}, TAXPAYER_TYPE: ${newItemId.type}`);
      }

      const requestBody: Record<string, unknown> = { ...body };
      // Validate that exactly one amount field exists
      if (invoice.TOTAL_AMT && invoice.AMOUNT_KHR) {
        throw new Error(`Invoice ${invoice.INV_NO} has both TOTAL_AMT and AMOUNT_KHR - only one amount field should be provided`);
      }
      if (!invoice.TOTAL_AMT && !invoice.AMOUNT_KHR) {
        throw new Error(`Invoice ${invoice.INV_NO} is missing both TOTAL_AMT and AMOUNT_KHR - one amount field is required`);
      }

      keys.forEach(key => {
        const value = invoice[key];
        if (value) {
          if (key === "TOTAL_AMT" || key === "AMOUNT_KHR" || key === "ACCOM_AMT") {
            requestBody[key] = parseFloat(value.replace(/,/g, "").trim());
          } else {
            requestBody[key] = value.trim();
          }
        }
      });

      // Remove the other amount field to ensure only one is used
      if (invoice.TOTAL_AMT) {
        delete requestBody.AMOUNT_KHR;
      } else if (invoice.AMOUNT_KHR) {
        delete requestBody.TOTAL_AMT;
      }

      try {
        
        const response = await axiosInstance.post(firstUrl, requestBody, { headers });
        const data =  response.data;
        
        console.log(`Invoice ${invoice.INV_NO} processed successfully`, data);
        
        successfulInvoices.push({
          invoice_no: invoice.INV_NO,
          message: data
        });
      } catch (error) {
        console.error(`Failed to process invoice ${invoice.INV_NO}`);
        if (error instanceof Error) {
          console.error("Error details:", error.message);
        } else {
          console.error("Unknown error occurred");
        }
        failedInvoices.push({
          invoice_no: invoice.INV_NO,
          message: "Failed to process invoice"
        });
      }
    };

    const processInvoicesSequentially = async () => {
      const datePattern = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
      let baseYearMonth = null;

      for (const [index, invoice] of invoices.entries()) {
        console.log(`\nProcessing invoice ${index + 1} of ${invoices.length}`);
        if (!datePattern.test(invoice.INV_DATE)) {
          console.log(`Skipping Invoice ${invoice.INV_NO}: Invalid date format`);
          failedInvoices.push({
            invoice_no: invoice.INV_NO,
            message: "Invalid date format"
          });
          continue;
        }

        const currentYearMonth = invoice.INV_DATE.substring(0, 7);
        if (baseYearMonth === null) baseYearMonth = currentYearMonth;
        if (currentYearMonth !== baseYearMonth) {
          console.log(`Skipping Invoice ${invoice.INV_NO}: Mismatched month/year`);
          failedInvoices.push({
            invoice_no: invoice.INV_NO,
            message: "Invalid date format"
          });
          continue;
        }

        try {
          await savePurchaseSaleTax(invoice);
        } catch (error) {
          if (error instanceof Error) {
            console.error(`Error processing invoice ${invoice.INV_NO}:`, error.message);
          } else {
            console.error(`Unknown error processing invoice ${invoice.INV_NO}`);
          }
        }
        console.log("_______________________________________________________________");
      }

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      console.log("\n=== Processing Summary ===");
      console.log(`✅ Successfully Processed: ${successfulInvoices.length}`);
      console.log(`❌ Failed Invoices: ${failedInvoices.length}`);
      console.log(`⏱️  Total Processing Time: ${duration} seconds`);
      console.log(`📊 Success Rate: ${((successfulInvoices.length / invoices.length) * 100).toFixed(2)}%`);

      if (failedInvoices.length > 0) {
        console.log("\n⚠️  Failed Invoice Numbers:");
        failedInvoices.forEach((invNo, idx) => console.log(`${idx + 1}. ${invNo}`));
      }

      console.log("\n=== Processing Complete ===");
      console.log(`Finished at: ${new Date(endTime).toLocaleString()}`);
      console.log(`Total duration: ${duration} seconds\n`);

      return { success: successfulInvoices, failed: failedInvoices };
    };

    const result = await processInvoicesSequentially();
    return {
      success: result.success,
      failed: result.failed,
      message: `Processed ${result.success.length} invoices successfully, ${result.failed.length} failed`
    };
    } catch (error) {
      let message = "Unknown error occurred";
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || error.message;
      } else if (error instanceof Error) {
        message = error.message;
      }
    console.error("\n=== Processing Failed ===");
    console.error("Error details:", message);
    return {
      success: [],
      failed: [],
      message: `Error processing data: ${message}`
    };
  }
}
