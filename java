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
    
    // Store all extracted data
    let allExtractedData = [];
    
    // File selection event
    pdfFileInput.addEventListener('change', function() {
        if (this.files && this.files.length > 0) {
            if (this.files.length === 1) {
                selectedFileText.textContent = this.files[0].name;
            } else {
                selectedFileText.textContent = `${this.files.length} files selected`;
            }
            selectedFileText.style.color = '#4CAF50';
        } else {
            selectedFileText.textContent = 'No files selected';
            selectedFileText.style.color = '#555';
        }
    });
    
    // Form submission
    pdfForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!pdfFileInput.files || pdfFileInput.files.length === 0) {
            alert('Please select at least one PDF file first.');
            return;
        }
        
        // Reset stored data
        allExtractedData = [];
        
        // Show processing screen
        uploadSection.classList.add('hidden');
        processingSection.classList.remove('hidden');
        
        // Process each file sequentially
        processFiles(Array.from(pdfFileInput.files), 0);
    });
    
    // Process files one by one
    function processFiles(files, index) {
        if (index >= files.length) {
            // All files processed
            processingSection.classList.add('hidden');
            displayAllResults();
            return;
        }
        
        const file = files[index];
        processingStatus.textContent = `Processing file ${index + 1} of ${files.length}: ${file.name}`;
        
        // Create form data for this file
        const formData = new FormData();
        formData.append('pdfFile', file);
        
        // Send to Make.com webhook
        fetch(webhookUrl, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Store this file's data
            if (data && data.items && data.items.length > 0) {
                // Add filename to each item for tracking
                const itemsWithSource = data.items.map(item => {
                    return {
                        ...item,
                        sourceFile: file.name
                    };
                });
                
                allExtractedData.push(...itemsWithSource);
            }
            
            // Process next file
            processFiles(files, index + 1);
        })
        .catch(error => {
            console.error('Error processing file:', file.name, error);
            // Continue with next file despite error
            processFiles(files, index + 1);
        });
    }
    
    // Display all results
    function displayAllResults() {
        // Clear previous results
        resultsData.innerHTML = '';
        
        if (allExtractedData.length > 0) {
            // Group by source file
            const fileGroups = {};
            allExtractedData.forEach(item => {
                if (!fileGroups[item.sourceFile]) {
                    fileGroups[item.sourceFile] = [];
                }
                fileGroups[item.sourceFile].push(item);
            });
            
            // Add each file's results with headers
            Object.keys(fileGroups).forEach(fileName => {
                // Add file header
                const fileHeader = document.createElement('div');
                fileHeader.className = 'file-header';
                fileHeader.textContent = fileName;
                resultsData.appendChild(fileHeader);
                
                // Add items from this file
                fileGroups[fileName].forEach(item => {
                    const row = document.createElement('div');
                    row.className = 'results-row';
                    row.innerHTML = `
                        <div>${item.stockCode || ''}</div>
                        <div>${item.description || ''}</div>
                        <div>${item.quantity || ''}</div>
                        <div>${item.unitPrice || ''}</div>
                    `;
                    resultsData.appendChild(row);
                });
            });
            
            // Update file count
            fileCount.textContent = Object.keys(fileGroups).length;
            
            // Show results section
            resultsSection.classList.remove('hidden');
        } else {
            // No results found
            errorMessage.textContent = 'No data could be extracted from any of the PDFs.';
            errorSection.classList.remove('hidden');
        }
    }
    
    // Handle "Try Again" button
    tryAgainBtn.addEventListener('click', function() {
        errorSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
    });
    
    // Handle "Convert More PDFs" button
    newConversionBtn.addEventListener('click', function() {
        resultsSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
        pdfFileInput.value = '';
        selectedFileText.textContent = 'No files selected';
        selectedFileText.style.color = '#555';
    });
    
    // Handle drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropzone.classList.add('highlight');
    }
    
    function unhighlight() {
        dropzone.classList.remove('highlight');
    }
    
    dropzone.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files && files.length) {
            pdfFileInput.files = files;
            
            // Trigger change event manually
            const event = new Event('change');
            pdfFileInput.dispatchEvent(event);
        }
    }
    
    // Download Excel functionality
    downloadExcelBtn.addEventListener('click', function() {
        if (allExtractedData.length === 0) {
            alert('No data available to download.');
            return;
        }
        
        // For this example, we'll generate a CSV that Excel can open
        // In a real implementation, you might want to use a library to create actual Excel files
        let csvContent = "data:text/csv;charset=utf-8,";
        
        // Add headers
        csvContent += "Source File,Stock Code,Description,Quantity,Unit Price\n";
        
        // Add data rows
        allExtractedData.forEach(item => {
            const row = [
                item.sourceFile || '',
                item.stockCode || '',
                `"${(item.description || '').replace(/"/g, '""')}"`, // Handle quotes in descriptions
                item.quantity || '',
                item.unitPrice || ''
            ];
            csvContent += row.join(',') + '\n';
        });
        
        // Create download link
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'extracted_data.csv');
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        
        // Clean up
        document.body.removeChild(link);
    });
});
