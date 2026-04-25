import Papa from 'papaparse';
// @ts-ignore
import ofx from 'node-ofx-parser';

export interface ParsedTransaction {
  id: string;
  data: string;
  descricao: string;
  valor: number;
}

export async function parseStatementFile(file: File): Promise<ParsedTransaction[]> {
  const text = await file.text();
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    return parseCSV(text);
  } else if (extension === 'ofx') {
    return parseOFX(text);
  } else {
    throw new Error('Formato de arquivo não suportado. Use CSV ou OFX.');
  }
}

function parseCSV(text: string): ParsedTransaction[] {
  // Simple CSV parser assuming columns: Date, Description, Amount
  // Often banks export CSV in diverse formats, we'll try a generic approach
  const results = Papa.parse(text, { header: true, skipEmptyLines: true });
  const transactions: ParsedTransaction[] = [];

  results.data.forEach((row: any, index: number) => {
    // Attempt to dynamically find the correct columns
    const columns = Object.keys(row);
    let dateCol = columns.find(c => c.toLowerCase().includes('data') || c.toLowerCase().includes('date'));
    let descCol = columns.find(c => c.toLowerCase().includes('desc') || c.toLowerCase().includes('histórico'));
    let amountCol = columns.find(c => c.toLowerCase().includes('valor') || c.toLowerCase().includes('amount'));

    // Fallback if generic names aren't found, try indices
    if (!dateCol) dateCol = columns[0];
    if (!descCol) descCol = columns[1];
    if (!amountCol) amountCol = columns[2];

    const rawDate = row[dateCol as string];
    const rawDesc = row[descCol as string];
    const rawAmount = row[amountCol as string];

    if (!rawDate || !rawAmount) return; // Skip invalid rows

    // Parse amount (handle BRL formats like 1.234,56 or - 1.234,56)
    let parsedAmount = 0;
    if (typeof rawAmount === 'string') {
        const cleanAmount = rawAmount.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
        parsedAmount = parseFloat(cleanAmount);
    } else if (typeof rawAmount === 'number') {
        parsedAmount = rawAmount;
    }

    if (!isNaN(parsedAmount)) {
        transactions.push({
            id: `csv-${index}-${Date.now()}`,
            data: rawDate, // Needs normalization to ISO later
            descricao: rawDesc || 'Transação',
            valor: parsedAmount
        });
    }
  });

  return transactions;
}

function parseOFX(text: string): ParsedTransaction[] {
  try {
    const data = ofx.parse(text);
    const transactions: ParsedTransaction[] = [];
    
    // OFX structure varies, but generally transactions are under BANKTRANLIST
    const stmtTrnResult = data?.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS?.BANKTRANLIST?.STMTTRN;
    
    if (!stmtTrnResult) {
      console.warn("No transactions found in OFX file.");
      return [];
    }

    // Single transaction might come as an object instead of array
    const trnArray = Array.isArray(stmtTrnResult) ? stmtTrnResult : [stmtTrnResult];

    trnArray.forEach((trn: any, index: number) => {
      // OFX Date is usually YYYYMMDDHHMMSS
      const rawDate = trn.DTPOSTED || '';
      const formattedDate = formatOFXDate(rawDate) || new Date().toISOString();
      const rawAmount = trn.TRNAMT || '0';
      const amount = parseFloat(rawAmount);

      transactions.push({
        id: trn.FITID || `ofx-${index}-${Date.now()}`,
        data: formattedDate,
        descricao: trn.MEMO || trn.NAME || 'Transação',
        valor: amount
      });
    });

    return transactions;
  } catch (error) {
    console.error("Erro ao parsear OFX:", error);
    throw new Error('Falha ao parsear o arquivo OFX.');
  }
}

function formatOFXDate(ofxDate: string): string | null {
  // Try to parse YYYYMMDDHHMMSS to ISO 8601
  if (!ofxDate || ofxDate.length < 8) return null;
  
  const year = ofxDate.substring(0, 4);
  const month = ofxDate.substring(4, 6);
  const day = ofxDate.substring(6, 8);
  
  // Return YYYY-MM-DD format as preferred by input date fields
  return `${year}-${month}-${day}`;
}
