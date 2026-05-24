import { IDocumentOptions } from './common.interface';

/**
 * Excel Generator Interfaces
 */

export type ExcelCellType = 'string' | 'number' | 'date' | 'boolean' | 'formula' | 'hyperlink' | 'richText';
export type ExcelHorizontalAlignment = 'left' | 'center' | 'right' | 'fill' | 'justify' | 'centerContinuous' | 'distributed';
export type ExcelVerticalAlignment = 'top' | 'middle' | 'bottom' | 'distributed' | 'justify';
export type ExcelBorderStyle = 'thin' | 'dotted' | 'dashDot' | 'hair' | 'dashDotDot' | 'slantDashDot' | 'mediumDashed' | 'mediumDashDotDot' | 'mediumDashDot' | 'medium' | 'double' | 'thick';

export interface IExcelCellStyle {
    font?: {
        name?: string;
        size?: number;
        bold?: boolean;
        italic?: boolean;
        underline?: boolean;
        strike?: boolean;
        color?: string;
    };
    fill?: {
        type?: 'pattern' | 'gradient';
        pattern?: 'solid' | 'darkGray' | 'mediumGray' | 'lightGray' | 'gray125' | 'gray0625';
        fgColor?: string;
        bgColor?: string;
    };
    alignment?: {
        horizontal?: ExcelHorizontalAlignment;
        vertical?: ExcelVerticalAlignment;
        wrapText?: boolean;
        shrinkToFit?: boolean;
        indent?: number;
        textRotation?: number;
    };
    border?: {
        top?: { style?: ExcelBorderStyle; color?: string };
        bottom?: { style?: ExcelBorderStyle; color?: string };
        left?: { style?: ExcelBorderStyle; color?: string };
        right?: { style?: ExcelBorderStyle; color?: string };
    };
    numFmt?: string;
}

export interface IExcelColumnDefinition {
    header: string;
    key: string;
    width?: number;
    style?: IExcelCellStyle;
    outlineLevel?: number;
    hidden?: boolean;
}

export interface IExcelRowData {
    [key: string]: any;
}

export interface IExcelSheetOptions {
    name: string;
    columns?: IExcelColumnDefinition[];
    headerStyle?: IExcelCellStyle;
    defaultRowStyle?: IExcelCellStyle;
    freezePane?: {
        row?: number;
        column?: number;
    };
    autoFilter?: boolean;
    autoSizeColumns?: boolean;
    watermark?: string;
    protection?: {
        password?: string;
        sheet?: boolean;
        objects?: boolean;
        scenarios?: boolean;
    };
}

export interface IExcelDocumentOptions extends IDocumentOptions {
    creator?: string;
    lastModifiedBy?: string;
    created?: Date;
    modified?: Date;
    company?: string;
}

export interface IExcelBuilder {
    setOptions(options: IExcelDocumentOptions): IExcelBuilder;
    addSheet(options: IExcelSheetOptions): IExcelSheetBuilder;
    build(): Promise<Buffer>;
    buildStream(): Promise<NodeJS.ReadableStream>;
}

export interface IExcelSheetBuilder {
    addRow(data: IExcelRowData, style?: IExcelCellStyle): IExcelSheetBuilder;
    addRows(data: IExcelRowData[]): IExcelSheetBuilder;
    setCell(row: number, col: number | string, value: any, style?: IExcelCellStyle): IExcelSheetBuilder;
    mergeCells(startRow: number, startCol: number, endRow: number, endCol: number): IExcelSheetBuilder;
    setColumnWidth(col: number | string, width: number): IExcelSheetBuilder;
    setRowHeight(row: number, height: number): IExcelSheetBuilder;
    addConditionalFormatting(range: string, rules: any): IExcelSheetBuilder;
    addFormula(row: number, col: number | string, formula: string, style?: IExcelCellStyle): IExcelSheetBuilder;
    addHyperlink(row: number, col: number | string, text: string, url: string, style?: IExcelCellStyle): IExcelSheetBuilder;
    addImage(imageBuffer: Buffer, extension: 'png' | 'jpeg' | 'gif', range: string | any): IExcelSheetBuilder;
    addReportHeader(options: { title: string; subtitle?: string; mergeColumns?: number; generationDate?: Date }): IExcelSheetBuilder;
    endSheet(): IExcelBuilder;
}
