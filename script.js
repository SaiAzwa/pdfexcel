let selectedFiles = [];
let extractedData = [];
let workbook = null;

// Initialize PDF.js worker
if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Add event listener to the file input element once the DOM is loaded
document.addEventListener('DOMContentLoaded', (event) => {
    const fileInputElement = document.getElementById('fileInput');
    if(fileInputElement) {
        fileInputElement.addEventListener('change', handleFileSelection);
    }
});


function handleFileSelection(event) {
    const files = Array.from(event.target.files);
    
    files.forEach(file => {
        // Ensure the file is a PDF and not already in the list
        if (file.type === 'application/pdf' && !selectedFiles.some(f => f.name === file.name)) {
            selectedFiles.push(file);
        }
    });

    updateFileList();
    updateConvertButton();
}

function updateFileList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';

    if (selectedFiles.length === 0) {
         fileList.innerHTML = '<p style="text-align:center; color:#6c757d;">No files selected.</p>';
         return;
    }

    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-info">
                <span class="file-name">📄 ${file.name}</span>
                <span class="file-size">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
            <button class="remove-btn" onclick="removeFile(${index})">Remove</button>
        `;
        fileList.appendChild(fileItem);
    });
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFileList();
    updateConvertButton();
}

function updateConvertButton() {
    const convertBtn = document.getElementById('convertBtn');
    convertBtn.disabled = selectedFiles.length === 0;
}

async function convertFiles() {
    if (selectedFiles.length === 0) return;

    const progressSection = document.getElementById('progressSection');
    const resultsSection = document.getElementById('resultsSection');
    const convertBtn = document.getElementById('convertBtn');

    // UI updates for starting conversion
    progressSection.style.display = 'block';
    resultsSection.style.display = 'none';
    convertBtn.disabled = true;

    extractedData = [];
    let processedFiles = 0;

    for (const file of selectedFiles) {
        try {
            updateProgress(processedFiles, selectedFiles.length, `Processing ${file.name}...`);
            const data = await extractDataFromPDF(file);
            extractedData.push(...data);
            processedFiles++;
        } catch (error) {
            console.error(`Error processing ${file.name}:`, error);
            showStatusMessage(`Error processing ${file.name}: ${error.message}`, 'error');
        }
    }
    
    // Remove duplicates across all processed files to ensure unique items
    const uniqueItems = extractedData.filter((item, index, self) =>
        index === self.findIndex(t =>
            t.description === item.description &&
            t.quantity === item.quantity &&
            t.unitPrice === item.unitPrice
        )
    );
    extractedData = uniqueItems;

    updateProgress(selectedFiles.length, selectedFiles.length, 'Creating Excel file...');
    
    createExcelFile();

    // UI updates for finishing conversion
    progressSection.style.display = 'none';
    resultsSection.style.display = 'block';
    convertBtn.disabled = false;

    if (extractedData.length > 0) {
        showStatusMessage(`Successfully processed ${processedFiles} PDF file(s) and extracted ${extractedData.length} unique item(s).`, 'success');
    } else {
         showStatusMessage(`Processed ${processedFiles} PDF file(s), but could not find any items matching the required format.`, 'error');
    }
}

async function extractDataFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = '';

    // Concatenate text from all pages of the PDF
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => item.str).join(' ');
    }

    return parseTextForItems(fullText);
}

/**
 * This is the core function for extracting data using regular expressions.
 * It's designed to find rows matching a specific pattern in the PDF text.
 * @param {string} text - The full text extracted from the PDF.
 * @returns {Array<Object>} - An array of item objects found in the text.
 */
function parseTextForItems(text) {
    // 1. Clean the text by normalizing whitespace to simplify regex matching.
    const cleanText = text.replace(/\s+/g, ' ').trim();
    console.log('Cleaned Text:', cleanText);

    const items = [];

    // 2. Define the regular expression to find item rows.
    // This regex looks for: Serial Number, Part Number, Product Name, Quantity, and Unit Price.
    const pattern = /\d+\s+([0-9A-Z\-]+)\s+([\s\S]+?)\s+(\d+)\s+\$?(\d+\.\d{2})\s*yuan/gi;
    
    let match;
    while ((match = pattern.exec(cleanText)) !== null) {
        console.log('Found a match:', match[0]);

        let stockCode = match[1].trim();
        let description = match[2].trim();
        let quantity = parseInt(match[3], 10);
        let unitPrice = parseFloat(match[4]);

        // Further clean the description to remove any unwanted artifacts.
        description = description.replace(/Specifications:[\s\S]*/i, '').trim();

        // Validate the extracted data before adding it to the list.
        if (description && description.length > 5 && !isNaN(quantity) && !isNaN(unitPrice) && quantity > 0) {
            items.push({
                stockCode: stockCode,
                description: description,
                quantity: quantity,
                unitPrice: unitPrice.toFixed(2) // Format price to 2 decimal places
            });
        }
    }

    console.log(`Extraction complete. Found ${items.length} items.`);
    return items;
}

function createExcelFile() {
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

    // Generate the preview table in the UI
    createPreviewTable();
}

function createPreviewTable() {
    const previewContainer = document.getElementById('previewContainer');
    previewContainer.innerHTML = ''; // Clear previous preview
    
    if (extractedData.length === 0) {
        previewContainer.innerHTML = '<p style="text-align:center; padding:20px; color:#721c24;">No data was extracted. Please ensure the PDF has a table with "Part Number", "Product Name", "quantity", and "unit price".</p>';
        document.getElementById('downloadBtn').style.display = 'none';
        return;
    }
    
    document.getElementById('downloadBtn').style.display = 'inline-block';

    const table = document.createElement('table');
    table.className = 'preview-table';

    // Create table header
    const header = table.createTHead();
    const headerRow = header.insertRow();
    ['Stock Code', 'Description', 'Quantity', 'Unit Price'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });

    // Create table body with a sample of the data (first 10 rows)
    const tbody = table.createTBody();
    const sampleData = extractedData.slice(0, 10);
    
    sampleData.forEach(item => {
        const row = tbody.insertRow();
        row.insertCell().textContent = item.stockCode;
        row.insertCell().textContent = item.description;
        row.insertCell().textContent = item.quantity;
        row.insertCell().textContent = item.unitPrice;
    });

    const previewHeader = document.createElement('h4');
    previewHeader.style.textAlign = 'center';
    previewHeader.style.margin = '20px 0';
    previewHeader.style.color = '#2c3e50';
    previewHeader.textContent = `Preview (showing first ${sampleData.length} of ${extractedData.length} items)`;
    
    previewContainer.appendChild(previewHeader);
    previewContainer.appendChild(table);
}

function downloadExcel() {
    if (!workbook || extractedData.length === 0) {
        showStatusMessage("No data available to download.", "error");
        return;
    }

    const fileName = `extracted_data_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
}

function updateProgress(current, total, message) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    const percentage = total > 0 ? (current / total) * 100 : 0;
    progressFill.style.width = percentage + '%';
    progressText.textContent = message;
}

function showStatusMessage(message, type) {
    const statusContainer = document.getElementById('statusContainer');
    statusContainer.innerHTML = ''; // Clear previous messages
    const statusDiv = document.createElement('div');
    statusDiv.className = `status-message status-${type}`;
    statusDiv.textContent = message;
    statusContainer.appendChild(statusDiv);
}
