import * as ExcelJS from 'exceljs';
import { Readable } from 'stream';
import {
    IExcelBuilder,
    IExcelSheetBuilder,
    IExcelDocumentOptions,
    IExcelSheetOptions,
    IExcelRowData,
    IExcelCellStyle,
    IExcelColumnDefinition,
} from '../interfaces/excel-generator.interface';

/**
 * Excel Sheet Builder - Fluent API for building individual Excel sheets
 */
class ExcelSheetBuilder implements IExcelSheetBuilder {
    private worksheet: ExcelJS.Worksheet;
    private headerStyle?: IExcelCellStyle;
    private defaultRowStyle?: IExcelCellStyle;
    private columnsAdded = false;

    constructor(
        private readonly parentBuilder: ExcelBuilderService,
        private readonly workbook: ExcelJS.Workbook,
        private readonly options: IExcelSheetOptions,
    ) {
        this.worksheet = workbook.addWorksheet(options.name);
        this.headerStyle = options.headerStyle || ExcelStyles.header;
        this.defaultRowStyle = options.defaultRowStyle || ExcelStyles.dataRows;
        this.initializeSheet();
    }

    private initializeSheet(): void {
        // Set up columns if provided
        if (this.options.columns && this.options.columns.length > 0) {
            this.setupColumns(this.options.columns);
        }

        // Apply freeze pane
        if (this.options.freezePane) {
            this.worksheet.views = [{
                state: 'frozen',
                xSplit: this.options.freezePane.column || 0,
                ySplit: this.options.freezePane.row || 0,
            }];
        }

        // Apply protection
        if (this.options.protection) {
            this.worksheet.protect(this.options.protection.password || '', {
                selectLockedCells: true,
                selectUnlockedCells: true,
                formatCells: false,
                formatColumns: false,
                formatRows: false,
                insertColumns: false,
                insertRows: false,
                insertHyperlinks: false,
                deleteColumns: false,
                deleteRows: false,
                sort: false,
                autoFilter: false,
                pivotTables: false,
            });
        }

        // Apply watermark if enabled (default to true if global setting exists)
        if (this.options.watermark !== undefined || true) { // Always check for default watermark
            this.applyWatermark();
        }
    }

    private applyWatermark(): void {
        try {
            const path = require('path');
            const watermarkPath = path.join(process.cwd(), 'src/assets/watermark.png');
            if (require('fs').existsSync(watermarkPath)) {
                const imageBuffer = require('fs').readFileSync(watermarkPath);
                const imageId = this.workbook.addImage({
                    buffer: imageBuffer,
                    extension: 'png',
                });
                //this.worksheet.addBackgroundImage(imageId);
            }
        } catch (error) {
            console.error('Failed to add watermark:', error);
        }
    }

    private setupColumns(columns: IExcelColumnDefinition[]): void {
        const excelColumns: Partial<ExcelJS.Column>[] = columns.map((col) => ({
            header: col.header,
            key: col.key,
            width: col.width || 15,
            outlineLevel: col.outlineLevel,
            hidden: col.hidden,
            style: col.style ? this.convertStyle(col.style) : undefined,
        }));

        this.worksheet.columns = excelColumns;
        this.columnsAdded = true;

        // Apply header style
        if (this.headerStyle) {
            const headerRow = this.worksheet.getRow(1);
            headerRow.eachCell((cell) => {
                this.applyCellStyle(cell, this.headerStyle!);
            });
        }

        // Apply auto filter if enabled
        if (this.options.autoFilter) {
            const lastColumn = String.fromCharCode(64 + columns.length);
            this.worksheet.autoFilter = `A1:${lastColumn}1`;
        }
    }

    addRow(data: IExcelRowData, style?: IExcelCellStyle): IExcelSheetBuilder {
        const row = this.worksheet.addRow(data);

        const effectiveStyle = style || this.defaultRowStyle;
        if (effectiveStyle) {
            row.eachCell((cell) => {
                this.applyCellStyle(cell, effectiveStyle);
            });
        }

        return this;
    }

    addRows(data: IExcelRowData[]): IExcelSheetBuilder {
        data.forEach((rowData) => this.addRow(rowData));

        if (this.options.autoSizeColumns !== false) {
            this.autoSizeColumns();
        }
        return this;
    }

    private autoSizeColumns(): void {
        // Iterate over definitions to check who needs auto-sizing
        const definitions = this.options.columns || [];

        this.worksheet.columns.forEach((column, index) => {
            const definition = definitions[index];
            // If explicit width is provided in definition, don't auto-size
            if (definition && definition.width) {
                return;
            }

            let maxLength = 0;
            if (column.header) {
                maxLength = Math.max(maxLength, column.header.toString().length);
            }

            column.eachCell?.({ includeEmpty: true }, (cell) => {
                const columnLength = cell.value ? cell.value.toString().length : 0;
                if (columnLength > maxLength) {
                    maxLength = columnLength;
                }
            });

            column.width = maxLength < 10 ? 12 : maxLength + 2;
        });
    }

    setCell(row: number, col: number | string, value: any, style?: IExcelCellStyle): IExcelSheetBuilder {
        const cell = this.worksheet.getCell(row, typeof col === 'string' ? this.columnLetterToNumber(col) : col);
        cell.value = value;

        if (style) {
            this.applyCellStyle(cell, style);
        }

        return this;
    }

    mergeCells(startRow: number, startCol: number, endRow: number, endCol: number): IExcelSheetBuilder {
        this.worksheet.mergeCells(startRow, startCol, endRow, endCol);
        return this;
    }

    setColumnWidth(col: number | string, width: number): IExcelSheetBuilder {
        const colIndex = typeof col === 'string' ? this.columnLetterToNumber(col) : col;
        const column = this.worksheet.getColumn(colIndex);
        column.width = width;
        return this;
    }

    setRowHeight(row: number, height: number): IExcelSheetBuilder {
        const worksheetRow = this.worksheet.getRow(row);
        worksheetRow.height = height;
        return this;
    }

    addConditionalFormatting(range: string, rules: ExcelJS.ConditionalFormattingRule[]): IExcelSheetBuilder {
        this.worksheet.addConditionalFormatting({
            ref: range,
            rules,
        });
        return this;
    }

    /**
     * Add a formula to a cell
     */
    addFormula(row: number, col: number | string, formula: string, style?: IExcelCellStyle): IExcelSheetBuilder {
        const cell = this.worksheet.getCell(row, typeof col === 'string' ? this.columnLetterToNumber(col) : col);
        cell.value = { formula };

        if (style) {
            this.applyCellStyle(cell, style);
        }

        return this;
    }

    /**
     * Add a hyperlink to a cell
     */
    addHyperlink(row: number, col: number | string, text: string, url: string, style?: IExcelCellStyle): IExcelSheetBuilder {
        const cell = this.worksheet.getCell(row, typeof col === 'string' ? this.columnLetterToNumber(col) : col);
        cell.value = {
            text,
            hyperlink: url,
        };

        // Default hyperlink style
        const hyperlinkStyle: IExcelCellStyle = {
            font: {
                color: '#0563C1',
                underline: true,
            },
            ...style,
        };
        this.applyCellStyle(cell, hyperlinkStyle);

        return this;
    }

    /**
     * Add an image to the sheet
     */
    addImage(imageBuffer: Buffer, extension: 'png' | 'jpeg' | 'gif', range: string | any): IExcelSheetBuilder {
        const imageId = this.workbook.addImage({
            buffer: imageBuffer as unknown as ExcelJS.Buffer,
            extension,
        });

        this.worksheet.addImage(imageId, range);
        return this;
    }

    /**
     * Set print area for the sheet
     */
    setPrintArea(startRow: number, startCol: number, endRow: number, endCol: number): IExcelSheetBuilder {
        this.worksheet.pageSetup.printArea = `${this.numberToColumnLetter(startCol)}${startRow}:${this.numberToColumnLetter(endCol)}${endRow}`;
        return this;
    }

    /**
     * Set page orientation
     */
    setPageOrientation(orientation: 'portrait' | 'landscape'): IExcelSheetBuilder {
        this.worksheet.pageSetup.orientation = orientation;
        return this;
    }

    addReportHeader(options: { title: string; subtitle?: string; mergeColumns?: number; generationDate?: Date }): IExcelSheetBuilder {
        const mergeCols = options.mergeColumns || 3;
        
        // ── Letterhead (rows 1-4) ──────────────────────────────────────────────
        this.mergeCells(1, 1, 1, mergeCols);
        this.setRowHeight(1, 38);
        this.setCell(1, 1, 'NABARUN', ExcelStyles.letterheadOrgStyle);

        this.mergeCells(2, 1, 2, mergeCols);
        this.setRowHeight(2, 22);
        this.setCell(2, 1, 'An Apolitical Socio-Cultural Organisation', ExcelStyles.letterheadTaglineStyle);

        this.mergeCells(3, 1, 3, mergeCols);
        this.setRowHeight(3, 18);
        this.setCell(3, 1, 'Reg. No:   |  Email: nabarunbangla18@gmail.com  |  Website: https://ngonabarun.web.app', ExcelStyles.letterheadInfoStyle);

        this.mergeCells(4, 1, 4, mergeCols);
        this.setRowHeight(4, 4);
        this.setCell(4, 1, '', ExcelStyles.letterheadDividerStyle);

        // ── Report Title Block (rows 5-8) ──────────────────────────────────
        this.mergeCells(5, 1, 5, mergeCols);
        this.setRowHeight(5, 8);

        this.mergeCells(6, 1, 6, mergeCols);
        this.setRowHeight(6, 40);
        this.setCell(6, 1, options.title, ExcelStyles.titleStyle);

        if (options.subtitle) {
            this.mergeCells(7, 1, 7, mergeCols);
            this.setRowHeight(7, 22);
            this.setCell(7, 1, options.subtitle, ExcelStyles.subtitleStyle);
        }

        const date = options.generationDate || new Date();
        const formattedDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
        
        this.mergeCells(8, 1, 8, mergeCols);
        this.setRowHeight(8, 20);
        this.setCell(8, 1, `Generated on: ${formattedDate}`, {
            font: { italic: true, size: 9, color: '#595959' },
            alignment: { horizontal: 'center' as const },
        });

        return this;
    }

    endSheet(): IExcelBuilder {
        return this.parentBuilder;
    }

    private applyCellStyle(cell: ExcelJS.Cell, style: IExcelCellStyle): void {
        const excelStyle = this.convertStyle(style);

        if (excelStyle.font) {
            cell.font = { ...cell.font, ...excelStyle.font };
        }
        if (excelStyle.fill) {
            cell.fill = excelStyle.fill;
        }
        if (excelStyle.alignment) {
            cell.alignment = { ...cell.alignment, ...excelStyle.alignment };
        }
        if (excelStyle.border) {
            cell.border = { ...cell.border, ...excelStyle.border };
        }
        if (excelStyle.numFmt) {
            cell.numFmt = excelStyle.numFmt;
        }
    }

    private convertStyle(style: IExcelCellStyle): Partial<ExcelJS.Style> {
        const excelStyle: Partial<ExcelJS.Style> = {};

        if (style.font) {
            excelStyle.font = {};
            if (style.font.name !== undefined) excelStyle.font.name = style.font.name;
            if (style.font.size !== undefined) excelStyle.font.size = style.font.size;
            if (style.font.bold !== undefined) excelStyle.font.bold = style.font.bold;
            if (style.font.italic !== undefined) excelStyle.font.italic = style.font.italic;
            if (style.font.underline !== undefined) excelStyle.font.underline = style.font.underline;
            if (style.font.strike !== undefined) excelStyle.font.strike = style.font.strike;
            if (style.font.color !== undefined) excelStyle.font.color = { argb: this.colorToArgb(style.font.color) };
        }

        if (style.fill) {
            excelStyle.fill = {
                type: style.fill.type || 'pattern',
                pattern: style.fill.pattern || 'solid',
                fgColor: style.fill.fgColor ? { argb: this.colorToArgb(style.fill.fgColor) } : undefined,
                bgColor: style.fill.bgColor ? { argb: this.colorToArgb(style.fill.bgColor) } : undefined,
            } as ExcelJS.FillPattern;
        }

        if (style.alignment) {
            excelStyle.alignment = {};
            if (style.alignment.horizontal !== undefined) excelStyle.alignment.horizontal = style.alignment.horizontal;
            if (style.alignment.vertical !== undefined) excelStyle.alignment.vertical = style.alignment.vertical;
            if (style.alignment.wrapText !== undefined) excelStyle.alignment.wrapText = style.alignment.wrapText;
            if (style.alignment.shrinkToFit !== undefined) excelStyle.alignment.shrinkToFit = style.alignment.shrinkToFit;
            if (style.alignment.indent !== undefined) excelStyle.alignment.indent = style.alignment.indent;
            if (style.alignment.textRotation !== undefined) excelStyle.alignment.textRotation = style.alignment.textRotation;
        }

        if (style.border) {
            excelStyle.border = {};
            if (style.border.top) {
                excelStyle.border.top = {
                    style: style.border.top.style,
                    color: style.border.top.color ? { argb: this.colorToArgb(style.border.top.color) } : undefined,
                };
            }
            if (style.border.bottom) {
                excelStyle.border.bottom = {
                    style: style.border.bottom.style,
                    color: style.border.bottom.color ? { argb: this.colorToArgb(style.border.bottom.color) } : undefined,
                };
            }
            if (style.border.left) {
                excelStyle.border.left = {
                    style: style.border.left.style,
                    color: style.border.left.color ? { argb: this.colorToArgb(style.border.left.color) } : undefined,
                };
            }
            if (style.border.right) {
                excelStyle.border.right = {
                    style: style.border.right.style,
                    color: style.border.right.color ? { argb: this.colorToArgb(style.border.right.color) } : undefined,
                };
            }
        }

        if (style.numFmt) {
            excelStyle.numFmt = style.numFmt;
        }

        return excelStyle;
    }

    private colorToArgb(color: string): string {
        // Remove # if present and ensure 8 character ARGB format
        const hex = color.replace('#', '');
        if (hex.length === 6) {
            return 'FF' + hex.toUpperCase();
        }
        return hex.toUpperCase();
    }

    private columnLetterToNumber(letter: string): number {
        let result = 0;
        for (let i = 0; i < letter.length; i++) {
            result = result * 26 + letter.charCodeAt(i) - 64;
        }
        return result;
    }

    private numberToColumnLetter(num: number): string {
        let result = '';
        while (num > 0) {
            const remainder = (num - 1) % 26;
            result = String.fromCharCode(65 + remainder) + result;
            num = Math.floor((num - 1) / 26);
        }
        return result;
    }
}

/**
 * Excel Builder Service - Main service for building Excel documents with a fluent API
 * 
 * @example
 * ```typescript
 * const excel = await excelBuilder
 *   .setOptions({ creator: 'System', title: 'Monthly Report' })
 *   .addSheet({ 
 *     name: 'Sales Data', 
 *     columns: [
 *       { header: 'Date', key: 'date', width: 15 },
 *       { header: 'Product', key: 'product', width: 25 },
 *       { header: 'Amount', key: 'amount', width: 12 }
 *     ],
 *     autoFilter: true,
 *     freezePane: { row: 1 }
 *   })
 *     .addRows(salesData)
 *   .endSheet()
 *   .addSheet({ name: 'Summary' })
 *     .setCell(1, 1, 'Total Sales')
 *     .addFormula(1, 2, 'SUM(\'Sales Data\'!C:C)')
 *   .endSheet()
 *   .build();
 * ```
 */
export class ExcelBuilderService implements IExcelBuilder {
    private workbook: ExcelJS.Workbook;
    private options: IExcelDocumentOptions = {};

    constructor() {
        this.workbook = new ExcelJS.Workbook();
    }

    setOptions(options: IExcelDocumentOptions): IExcelBuilder {
        this.options = { ...this.options, ...options };

        // Apply workbook properties
        if (options.creator) this.workbook.creator = options.creator;
        if (options.lastModifiedBy) this.workbook.lastModifiedBy = options.lastModifiedBy;
        if (options.created) this.workbook.created = options.created;
        if (options.modified) this.workbook.modified = options.modified;
        if (options.company) this.workbook.company = options.company;

        // Apply metadata
        if (options.metadata) {
            if (options.metadata.title) this.workbook.title = options.metadata.title;
            if (options.metadata.subject) this.workbook.subject = options.metadata.subject;
            if (options.metadata.keywords) this.workbook.keywords = options.metadata.keywords.join(', ');
        }

        return this;
    }

    addSheet(options: IExcelSheetOptions): IExcelSheetBuilder {
        return new ExcelSheetBuilder(this, this.workbook, options);
    }

    async build(): Promise<Buffer> {
        const buffer = await this.workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }

    async buildStream(): Promise<NodeJS.ReadableStream> {
        const buffer = await this.workbook.xlsx.writeBuffer();
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);
        return stream;
    }

    /**
     * Build as CSV (first sheet only)
     */
    async buildCsv(): Promise<Buffer> {
        const buffer = await this.workbook.csv.writeBuffer();
        return Buffer.from(buffer);
    }

    /**
     * Get the underlying workbook for advanced operations
     */
    getWorkbook(): ExcelJS.Workbook {
        return this.workbook;
    }

    /**
     * Reset the builder for reuse
     */
    reset(): ExcelBuilderService {
        this.workbook = new ExcelJS.Workbook();
        this.options = {};
        return this;
    }
}

/**
 * Predefined styles for common use cases
 */
export const ExcelStyles = {
    header: {
        font: { bold: true, size: 12, color: '#000000' },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: '#FFCC99' },
        alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
        border: {
            top: { style: 'thin' as const, color: '#000000' },
            bottom: { style: 'thin' as const, color: '#000000' },
            left: { style: 'thin' as const, color: '#000000' },
            right: { style: 'thin' as const, color: '#000000' },
        },
    } as IExcelCellStyle,

    dataRows: {
        alignment: { vertical: 'middle' as const },
        border: {
            top: { style: 'thin' as const, color: '#000000' },
            bottom: { style: 'thin' as const, color: '#000000' },
            left: { style: 'thin' as const, color: '#000000' },
            right: { style: 'thin' as const, color: '#000000' },
        },
    } as IExcelCellStyle,

    currency: {
        numFmt: '$#,##0.00',
        alignment: { horizontal: 'right' as const },
    } as IExcelCellStyle,

    percentage: {
        numFmt: '0.00%',
        alignment: { horizontal: 'right' as const },
    } as IExcelCellStyle,

    date: {
        numFmt: 'DD/MM/YYYY',
        alignment: { horizontal: 'center' as const },
    } as IExcelCellStyle,

    dateTime: {
        numFmt: 'DD/MM/YYYY HH:MM:SS',
        alignment: { horizontal: 'center' as const },
    } as IExcelCellStyle,

    number: {
        numFmt: '#,##0',
        alignment: { horizontal: 'right' as const },
    } as IExcelCellStyle,

    decimal: {
        numFmt: '#,##0.00',
        alignment: { horizontal: 'right' as const },
    } as IExcelCellStyle,

    wrapText: {
        alignment: { wrapText: true, vertical: 'top' as const },
    } as IExcelCellStyle,

    alternateRow: {
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: '#F2F2F2' },
    } as IExcelCellStyle,

    success: {
        font: { color: '#006100' },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: '#C6EFCE' },
    } as IExcelCellStyle,

    warning: {
        font: { color: '#9C5700' },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: '#FFEB9C' },
    } as IExcelCellStyle,

    error: {
        font: { color: '#9C0006' },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: '#FFC7CE' },
    } as IExcelCellStyle,

    // Nabarun Report Shared Styles
    titleStyle: {
        font: { bold: true, size: 16, color: '#FFFFFF' },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: '#1F4E78' },
        alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    } as IExcelCellStyle,

    subtitleStyle: {
        font: { bold: true, size: 11, color: '#1F4E78' },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: '#DDEBF7' },
        alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    } as IExcelCellStyle,

    sectionHeaderStyle: {
        font: { bold: true, size: 12, color: '#1F4E78' },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: '#DDEBF7' },
        alignment: { horizontal: 'left' as const, vertical: 'middle' as const },
        border: {
            top: { style: 'thin' as const, color: '#D3D3D3' },
            bottom: { style: 'thin' as const, color: '#D3D3D3' },
            left: { style: 'thin' as const, color: '#D3D3D3' },
            right: { style: 'thin' as const, color: '#D3D3D3' },
        },
    } as IExcelCellStyle,

    labelStyle: {
        font: { bold: false, size: 11 },
        alignment: { horizontal: 'left' as const, vertical: 'middle' as const },
        border: {
            top: { style: 'thin' as const, color: '#D3D3D3' },
            bottom: { style: 'thin' as const, color: '#D3D3D3' },
            left: { style: 'thin' as const, color: '#D3D3D3' },
            right: { style: 'thin' as const, color: '#D3D3D3' },
        },
    } as IExcelCellStyle,

    labelBoldStyle: {
        font: { bold: true, size: 11 },
        alignment: { horizontal: 'left' as const, vertical: 'middle' as const },
        border: {
            top: { style: 'thin' as const, color: '#D3D3D3' },
            bottom: { style: 'thin' as const, color: '#D3D3D3' },
            left: { style: 'thin' as const, color: '#D3D3D3' },
            right: { style: 'thin' as const, color: '#D3D3D3' },
        },
    } as IExcelCellStyle,

    rupeeAmountStyle: {
        font: { bold: false, size: 11 },
        numFmt: '₹ #,##0.00',
        alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
        border: {
            top: { style: 'thin' as const, color: '#D3D3D3' },
            bottom: { style: 'thin' as const, color: '#D3D3D3' },
            left: { style: 'thin' as const, color: '#D3D3D3' },
            right: { style: 'thin' as const, color: '#D3D3D3' },
        },
    } as IExcelCellStyle,

    rupeeAmountBoldStyle: {
        font: { bold: true, size: 11 },
        numFmt: '₹ #,##0.00',
        alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
        border: {
            top: { style: 'thin' as const, color: '#D3D3D3' },
            bottom: { style: 'thin' as const, color: '#D3D3D3' },
            left: { style: 'thin' as const, color: '#D3D3D3' },
            right: { style: 'thin' as const, color: '#D3D3D3' },
        },
    } as IExcelCellStyle,

    percentageReportStyle: {
        font: { bold: false, size: 11 },
        numFmt: '0.0%',
        alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
        border: {
            top: { style: 'thin' as const, color: '#D3D3D3' },
            bottom: { style: 'thin' as const, color: '#D3D3D3' },
            left: { style: 'thin' as const, color: '#D3D3D3' },
            right: { style: 'thin' as const, color: '#D3D3D3' },
        },
    } as IExcelCellStyle,

    percentageBoldReportStyle: {
        font: { bold: true, size: 11 },
        numFmt: '0.0%',
        alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
        border: {
            top: { style: 'thin' as const, color: '#D3D3D3' },
            bottom: { style: 'thin' as const, color: '#D3D3D3' },
            left: { style: 'thin' as const, color: '#D3D3D3' },
            right: { style: 'thin' as const, color: '#D3D3D3' },
        },
    } as IExcelCellStyle,

    totalRowLabelStyle: {
        font: { bold: true, size: 11, color: '#000000' },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: '#F2F2F2' },
        alignment: { horizontal: 'left' as const, vertical: 'middle' as const },
        border: {
            top: { style: 'thin' as const, color: '#D3D3D3' },
            bottom: { style: 'double' as const, color: '#000000' },
            left: { style: 'thin' as const, color: '#D3D3D3' },
            right: { style: 'thin' as const, color: '#D3D3D3' },
        },
    } as IExcelCellStyle,

    totalRowAmountStyle: {
        font: { bold: true, size: 11, color: '#000000' },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: '#F2F2F2' },
        numFmt: '₹ #,##0.00',
        alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
        border: {
            top: { style: 'thin' as const, color: '#D3D3D3' },
            bottom: { style: 'double' as const, color: '#000000' },
            left: { style: 'thin' as const, color: '#D3D3D3' },
            right: { style: 'thin' as const, color: '#D3D3D3' },
        },
    } as IExcelCellStyle,

    totalRowPercentageStyle: {
        font: { bold: true, size: 11, color: '#000000' },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: '#F2F2F2' },
        numFmt: '0.0%',
        alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
        border: {
            top: { style: 'thin' as const, color: '#D3D3D3' },
            bottom: { style: 'double' as const, color: '#000000' },
            left: { style: 'thin' as const, color: '#D3D3D3' },
            right: { style: 'thin' as const, color: '#D3D3D3' },
        },
    } as IExcelCellStyle,

    letterheadOrgStyle: {
        font: { bold: true, size: 20, color: '#FFFFFF', name: 'Calibri' },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: '#1F4E78' },
        alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    } as IExcelCellStyle,

    letterheadTaglineStyle: {
        font: { bold: false, size: 11, color: '#BDD7EE', italic: true, name: 'Calibri' },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: '#1F4E78' },
        alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    } as IExcelCellStyle,

    letterheadInfoStyle: {
        font: { bold: false, size: 9, color: '#DDEBF7', name: 'Calibri' },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: '#1F4E78' },
        alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    } as IExcelCellStyle,

    letterheadDividerStyle: {
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: '#F4A623' },
    } as IExcelCellStyle,
};
