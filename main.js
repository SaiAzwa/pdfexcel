/**
 * Main Application Module - Orchestrates the entire application
 */

import { 
    updateFileList, 
    updateConvertButton, 
    createPreviewTable, 
    updateProgress, 
    showStatusMessage,
    showProgressSection,
    hideProgressSection,
    showResultsSection,
    hideResultsSection
} from './ui.js';

import { 
    initializePDFWorker, 
    extractDataFromPDF, 
    removeDuplicates 
} from './pdfProcessor.js';

import { 
    createExcelFile, 
    downloadExcel, 
    resetWorkbook 
} from './excelExporter.js';

// Application state
let selectedFiles = [];
let extractedData = [];

// Initialize the application
function init() {
    initializePDFWorker();
    setupEventListeners();
}

// Set up all event listeners
function setupEventListeners() {
    const fileInputElement = document.getElementById('fileInput');
    if (fileInputElement) {
        fileInputElement.addEventListener('change', handleFileSelection);
    }

    const convertBtn = document.getElementById('convertBtn');
    if (convertBtn) {
        convertBtn.addEventListener('click', convertFiles);
    }

    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => downloadExcel(extractedData, showStatusMessage));
    }

    // Expose removeFile function globally for onclick handlers
    window.removeFileHandler = removeFile;
}

function handleFileSelection(event) {
    const files = Array.from(event.target.files);
    
    files.forEach(file => {
        // Ensure the file is a PDF and not already in the list
        if (file.type === 'application/pdf' && !selectedFiles.some(f => f.name === file.name)) {
            selectedFiles.push(file);
        }
    });

    updateFileList(selectedFiles, removeFile);
    updateConvertButton(selectedFiles);
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFileList(selectedFiles, removeFile);
    updateConvertButton(selectedFiles);
}

async function convertFiles() {
    if (selectedFiles.length === 0) return;

    const convertBtn = document.getElementById('convertBtn');

    // UI updates for starting conversion
    showProgressSection();
    hideResultsSection();
    convertBtn.disabled = true;
    resetWorkbook();

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
    extractedData = removeDuplicates(extractedData);

    updateProgress(selectedFiles.length, selectedFiles.length, 'Creating Excel file...');
    
    createExcelFile(extractedData);
    createPreviewTable(extractedData);

    // UI updates for finishing conversion
    hideProgressSection();
    showResultsSection();
    convertBtn.disabled = false;

    if (extractedData.length > 0) {
        showStatusMessage(`Successfully processed ${processedFiles} PDF file(s) and extracted ${extractedData.length} unique item(s).`, 'success');
    } else {
        showStatusMessage(`Processed ${processedFiles} PDF file(s), but could not find any items matching the required format.`, 'error');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
