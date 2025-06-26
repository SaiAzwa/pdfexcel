/**
 * UI Module - Handles all user interface updates and interactions
 */

export function updateFileList(selectedFiles, removeFileCallback) {
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
            <button class="remove-btn" onclick="window.removeFileHandler(${index})">Remove</button>
        `;
        fileList.appendChild(fileItem);
    });
}

export function updateConvertButton(selectedFiles) {
    const convertBtn = document.getElementById('convertBtn');
    convertBtn.disabled = selectedFiles.length === 0;
}

export function createPreviewTable(extractedData) {
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

export function updateProgress(current, total, message) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    const percentage = total > 0 ? (current / total) * 100 : 0;
    progressFill.style.width = percentage + '%';
    progressText.textContent = message;
}

export function showStatusMessage(message, type) {
    const statusContainer = document.getElementById('statusContainer');
    statusContainer.innerHTML = ''; // Clear previous messages
    const statusDiv = document.createElement('div');
    statusDiv.className = `status-message status-${type}`;
    statusDiv.textContent = message;
    statusContainer.appendChild(statusDiv);
}

export function showProgressSection() {
    const progressSection = document.getElementById('progressSection');
    progressSection.style.display = 'block';
}

export function hideProgressSection() {
    const progressSection = document.getElementById('progressSection');
    progressSection.style.display = 'none';
}

export function showResultsSection() {
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.style.display = 'block';
}

export function hideResultsSection() {
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.style.display = 'none';
}
