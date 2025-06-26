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

import { 
    batchTranslate, 
    clearTranslationCache 
} from './translator.js';

// Application state
let selectedFiles = [];
let extractedData = [];
let translationEnabled = false;

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

    const translationToggle = document.getElementById('translationToggle');
    if (translationToggle) {
        translationToggle.addEventListener('change', (e) => {
            translationEnabled = e.target.checked;
            if (translationEnabled) {
                showStatusMessage('Translation enabled. Descriptions will be translated to Chinese.', 'success');
            } else {
                showStatusMessage('Translation disabled.', 'success');
            }
        });
    }

    // Note: removeFile is now handled via event listeners in ui.js, no global exposure needed
}

function handleFileSelection(event) {
    console.log('File selection event triggered');
    const files = Array.from(event.target.files);
    console.log('Selected files:', files);
    
    files.forEach(file => {
        console.log('Processing file:', file.name, 'Type:', file.type);
        // Ensure the file is a PDF and not already in the list
        if (file.type === 'application/pdf' && !selectedFiles.some(f => f.name === file.name)) {
            selectedFiles.push(file);
            console.log('File added to selectedFiles:', file.name);
        } else {
            console.log('File rejected - either not PDF or already exists:', file.name);
        }
    });

    console.log('Total selected files:', selectedFiles.length);
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

    // Translate descriptions if translation is enabled
    if (translationEnabled && extractedData.length > 0) {
        updateProgress(selectedFiles.length, selectedFiles.length + 1, 'Translating descriptions to Chinese...');
        
        try {
            const descriptions = extractedData.map(item => item.description);
            const translatedDescriptions = await batchTranslate(descriptions, 
                (current, total, message) => {
                    updateProgress(selectedFiles.length, selectedFiles.length + 1, message);
                }
            );
            
            // Update the extracted data with translated descriptions
            extractedData.forEach((item, index) => {
                item.description = translatedDescriptions[index];
            });
            
            showStatusMessage('Descriptions translated to Chinese successfully!', 'success');
        } catch (error) {
            console.error('Translation error:', error);
            showStatusMessage('Translation failed, proceeding with original text.', 'error');
        }
    }

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
