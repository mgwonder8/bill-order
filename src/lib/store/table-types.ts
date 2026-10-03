export type TableRow = Record<string, string>;
export type Table = { headers: string[]; rows: { rowNumber: number; data: TableRow }[] };
