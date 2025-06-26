/**
 * Excel Exporter Module - Handles Excel file creation and download
 */

let workbook = null;

export function createExcelFile(extractedData) {
    // Create a new worksheet from the extracted JSON data
    const worksheet = XLSX.utils.json_to_sheet(extractedData.map(item => ({
        'Stock Code': item.stockCode,
        'Description': item.description,
        'Quantity': item.quantity,
        'Unit Price': item.unitPrice
    })));

    // Set column widths for better readability in the output Excel file
    worksheet['!cols'] = [
        { wch: 20 }, // Stock Code column width
        { wch: 60 }, // Description column width
        { wch: 10 }, // Quantity column width
        { wch: 15 }  // Unit Price column width
    ];

    // Create a new workbook and append the worksheet
    workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Extracted Data');

    return workbook;
}

export function downloadExcel(extractedData, showStatusCallback) {
    if (!workbook || extractedData.length === 0) {
        showStatusCallback("No data available to download.", "error");
        return;
    }

    const fileName = `extracted_data_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
}

export function getWorkbook() {
    return workbook;
}

export function resetWorkbook() {
    workbook = null;
}
