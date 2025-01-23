export interface Invoice {
  ITEM_ID?: string;
  INV_NO: string;
  INV_DATE: string;
  TOTAL_AMT?: string;
  AMOUNT_KHR?: string;
  [key: string]: string | undefined;
}

export interface CompanyInfo {
  id: string;
  type: number;
}

export interface ApiResponse {
  DATA: {
    ID: string;
  };
}

export interface InvoiceResult {
  invoice_no: string;
  message: string;
  parsedJsonData: any;
}

export interface ProcessResult {
  success: InvoiceResult[];
  failed: InvoiceResult[];
  message: string;
  statusMessages?: string[];
  requestBody?: {
    textJsContent: string;
    jsonData: string;
  };
}

export interface InvoiceProcessingConfig {
  baseURL: string;
  headers: Record<string, string>;
  timeout: number;
}
