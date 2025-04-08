document.addEventListener('DOMContentLoaded', function() {
    // Configuration
    const webhookUrl = CONFIG.MAKE_WEBHOOK_URL;

    // Elements
    const pdfForm = document.getElementById('pdf-form');
    const pdfFileInput = document.getElementById('pdf-file');
    const selectedFileText = document.getElementById('selected-file');
    const dropzone = document.getElementById('dropzone');
    const uploadSection = document.getElementById('upload-section');
    const processingSection = document.getElementById('processing-section');
    const resultsSection = document.getElementById('results-section');
    const errorSection = document.getElementById('error-section');
    const resultsData = document.getElementById('results-data');
    const errorMessage = document.getElementById('error-message');
    const downloadExcelBtn = document.getElementById('download-excel');
    const newConversionBtn = document.getElementById('new-conversion');
    const tryAgainBtn = document.getElementById('try-again');
    const processingStatus = document.getElementById('processing-status');
    const fileCount = document.getElementById('file-count');

    // Store extracted data and drag-drop files
    let allExtractedData = [];
    let droppedFiles = null;

    // File selection event
    pdfFileInput.addEventListener('change', function() {
        droppedFiles = null; // reset if user uses file picker
        if (this.files.length > 0) {
            selectedFileText.textContent = this.files.length === 1 ? this.files[0].name : `${this.files.length} files selected`;
            selectedFileText.style.color = '#4CAF50';
        } else {
            selectedFileText.textContent = 'No files selected';
            selectedFileText.style.color = '#555';
        }
    });

    // Form submission
    pdfForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const filesToProcess = droppedFiles || pdfFileInput.files;

        if (!filesToProcess.length) {
            alert('Please select at least one PDF file.');
            return;
        }

        allExtractedData = [];

        uploadSection.classList.add('hidden');
        processingSection.classList.remove('hidden');

        processFiles(Array.from(filesToProcess), 0);
    });

    // Process files sequentially
    function processFiles(files, index) {
        if (index >= files.length) {
            processingSection.classList.add('hidden');
            displayAllResults();
            return;
        }

        const file = files[index];
        processingStatus.textContent = `Processing file ${index + 1} of ${files.length}: ${file.name}`;

        const formData = new FormData();
        formData.append('pdfFile', file);

        fetch(webhookUrl, { method: 'POST', body: formData })
        .then(response => response.ok ? response.json() : Promise.reject('Network error'))
        .then(data => {
            if (data?.items?.length > 0) {
                const validItems = data.items.filter(item => item.description && item.quantity && item.unitPrice);
                const itemsWithSource = validItems.map(item => ({
                    ...item,
                    sourceFile: file.name
                }));
                allExtractedData.push(...itemsWithSource);
            }

            processFiles(files, index + 1);
        })
        .catch(error => {
            console.error('Error processing file:', file.name, error);
            processFiles(files, index + 1);
        });
    }

    // Display all results
    function displayAllResults() {
        resultsData.innerHTML = '';

        if (allExtractedData.length > 0) {
            const fileGroups = {};
            allExtractedData.forEach(item => {
                fileGroups[item.sourceFile] ??= [];
                fileGroups[item.sourceFile].push(item);
            });

            Object.keys(fileGroups).forEach(fileName => {
                const fileHeader = document.createElement('div');
                fileHeader.className = 'file-header';
                fileHeader.textContent = fileName;
                resultsData.appendChild(fileHeader);

                fileGroups[fileName].forEach(item => {
                    const row = document.createElement('div');
                    row.className = 'results-row';
                    row.innerHTML = `
                        <div>${item.stockCode || '-'}</div>
                        <div>${item.description}</div>
                        <div>${item.quantity}</div>
                        <div>${item.unitPrice}</div>
                    `;
                    resultsData.appendChild(row);
                });
            });

            fileCount.textContent = Object.keys(fileGroups).length;
            resultsSection.classList.remove('hidden');
        } else {
            errorMessage.textContent = 'No valid data extracted.';
            errorSection.classList.remove('hidden');
        }
    }

    // Handle "Try Again" button
    tryAgainBtn.addEventListener('click', function() {
        errorSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
        droppedFiles = null;
    });

    // Handle "Convert More PDFs" button
    newConversionBtn.addEventListener('click', function() {
        resultsSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
        pdfFileInput.value = '';
        selectedFileText.textContent = 'No files selected';
        droppedFiles = null;
    });

    // Drag and Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.add('highlight'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.remove('highlight'), false);
    });

    dropzone.addEventListener('drop', function(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length) {
            droppedFiles = files;
            selectedFileText.textContent = files.length === 1 ? files[0].name : `${files.length} files selected`;
            selectedFileText.style.color = '#4CAF50';
        }
    });

    // Download Excel (CSV Format)
    downloadExcelBtn.addEventListener('click', function() {
        if (!allExtractedData.length) {
            alert('No data available.');
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,Stock Code,Description,Quantity,Unit Price\n";

        allExtractedData.forEach(item => {
            const row = [
                item.stockCode || '-',
                `"${(item.description).replace(/"/g, '""')}"`,
                item.quantity,
                item.unitPrice
            ];
            csvContent += row.join(',') + '\n';
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'extracted_data.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});
