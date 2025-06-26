/**
 * Enhanced PDF Processor Module - Handles PDF reading and data extraction
 * Improvements: Better error handling, flexible patterns, validation, and logging
 */

// PDF.js configuration
const PDFJS_CONFIG = {
    workerSrc: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
    cMapPacked: true
};

/**
 * Initialize PDF.js worker with enhanced configuration
 * @returns {boolean} - Success status
 */
export function initializePDFWorker() {
    try {
        if (typeof window !== 'undefined' && window.pdfjsLib) {
            Object.assign(pdfjsLib.GlobalWorkerOptions, PDFJS_CONFIG);
            console.log('PDF.js worker initialized successfully');
            return true;
        } else {
            console.warn('PDF.js library not found');
            return false;
        }
    } catch (error) {
        console.error('Failed to initialize PDF.js worker:', error);
        return false;
    }
}

/**
 * Extract data from PDF file with comprehensive error handling
 * @param {File} file - The PDF file to process
 * @param {Object} options - Processing options
 * @returns {Promise<Array<Object>>} - Extracted items
 */
export async function extractDataFromPDF(file, options = {}) {
    const { maxPages = Infinity, timeout = 30000 } = options;
    
    if (!file) {
        throw new Error('No file provided');
    }
    
    if (file.type !== 'application/pdf') {
        throw new Error('File must be a PDF');
    }
    
    try {
        console.log(`Processing PDF: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
        
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            ...PDFJS_CONFIG
        });
        
        // Add timeout to prevent hanging
        const pdf = await Promise.race([
            loadingTask.promise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('PDF loading timeout')), timeout)
            )
        ]);
        
        const totalPages = Math.min(pdf.numPages, maxPages);
        console.log(`PDF loaded successfully. Processing ${totalPages} pages...`);
        
        let fullText = '';
        const pageTexts = [];
        
        // Extract text from all pages
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            try {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map(item => item.str)
                    .join(' ');
                
                pageTexts.push(pageText);
                fullText += pageText + '\n';
                
                console.log(`Page ${pageNum}/${totalPages} processed`);
            } catch (pageError) {
                console.warn(`Error processing page ${pageNum}:`, pageError);
                continue; // Skip problematic pages
            }
        }
        
        if (!fullText.trim()) {
            throw new Error('No text content found in PDF');
        }
        
        const items = parseTextForItems(fullText, { pageTexts });
        console.log(`Extraction completed: ${items.length} items found`);
        
        return items;
        
    } catch (error) {
        console.error('PDF extraction failed:', error);
        throw new Error(`PDF processing failed: ${error.message}`);
    }
}

/**
 * Enhanced text parsing with multiple pattern support and validation
 * @param {string} text - The full text extracted from the PDF
 * @param {Object} options - Parsing options
 * @returns {Array<Object>} - Array of validated item objects
 */
export function parseTextForItems(text, options = {}) {
    const { strictMode = false, customPatterns = [] } = options;
    
    if (!text || typeof text !== 'string') {
        console.warn('Invalid text input for parsing');
        return [];
    }
    
    // Clean and normalize the text
    const cleanText = text
        .replace(/\s+/g, ' ')
        .replace(/[\r\n]+/g, ' ')
        .trim();
    
    console.log(`Processing text: ${cleanText.length} characters`);
    
    const items = [];
    const patterns = [
        // Original pattern
        /\d+\s+([0-9A-Z\-]+)\s+([\s\S]+?)\s+(\d+)\s+\$?(\d+\.\d{2})\s*yuan/gi,
        
        // Alternative patterns for different formats
        /(\w+[-_]\w+)\s+([\w\s,.-]+?)\s+qty:\s*(\d+)\s+price:\s*\$?(\d+\.?\d*)/gi,
        /([A-Z0-9-]+)\s+"([^"]+)"\s+(\d+)\s+@\s*\$?(\d+\.\d{2})/gi,
        
        // Add custom patterns
        ...customPatterns
    ];
    
    // Try each pattern
    patterns.forEach((pattern, index) => {
        console.log(`Trying pattern ${index + 1}...`);
        let match;
        let matchCount = 0;
        
        while ((match = pattern.exec(cleanText)) !== null && matchCount < 1000) {
            matchCount++;
            
            try {
                const item = extractItemFromMatch(match, index);
                if (item && validateItem(item, strictMode)) {
                    items.push(item);
                    console.log(`Found item: ${item.stockCode} - ${item.description.substring(0, 30)}...`);
                }
            } catch (error) {
                console.warn('Error processing match:', error);
            }
        }
        
        console.log(`Pattern ${index + 1} found ${matchCount} potential matches`);
    });
    
    // Remove duplicates and return
    const uniqueItems = removeDuplicates(items);
    console.log(`Final result: ${uniqueItems.length} unique items extracted`);
    
    return uniqueItems;
}

/**
 * Extract item object from regex match
 * @param {Array} match - Regex match array
 * @param {number} patternIndex - Index of the pattern used
 * @returns {Object|null} - Extracted item or null
 */
function extractItemFromMatch(match, patternIndex) {
    if (!match || match.length < 5) return null;
    
    try {
        let stockCode = match[1]?.trim() || '';
        let description = match[2]?.trim() || '';
        let quantity = parseInt(match[3], 10);
        let unitPrice = parseFloat(match[4]);
        
        // Clean description based on pattern
        description = cleanDescription(description);
        
        // Ensure stock code format
        stockCode = stockCode.toUpperCase();
        
        return {
            stockCode,
            description,
            quantity,
            unitPrice: parseFloat(unitPrice.toFixed(2)),
            source: `pattern_${patternIndex + 1}`,
            rawMatch: match[0]
        };
    } catch (error) {
        console.warn('Error extracting item from match:', error);
        return null;
    }
}

/**
 * Clean and normalize item description
 * @param {string} description - Raw description
 * @returns {string} - Cleaned description
 */
function cleanDescription(description) {
    if (!description) return '';
    
    return description
        .replace(/Specifications:[\s\S]*/i, '')
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s,.-]/g, '')
        .trim();
}

/**
 * Validate extracted item data
 * @param {Object} item - Item to validate
 * @param {boolean} strictMode - Whether to use strict validation
 * @returns {boolean} - Validation result
 */
export function validateItem(item, strictMode = false) {
    if (!item || typeof item !== 'object') return false;
    
    const { stockCode, description, quantity, unitPrice } = item;
    
    // Basic validation
    const basicValid = 
        stockCode && stockCode.length >= 2 &&
        description && description.length >= 3 &&
        Number.isInteger(quantity) && quantity > 0 &&
        typeof unitPrice === 'number' && unitPrice > 0;
    
    if (!basicValid) return false;
    
    // Strict validation
    if (strictMode) {
        return (
            /^[A-Z0-9-_]+$/.test(stockCode) &&
            description.length >= 5 &&
            description.length <= 200 &&
            quantity <= 10000 &&
            unitPrice <= 100000
        );
    }
    
    return true;
}

/**
 * Enhanced duplicate removal with configurable comparison
 * @param {Array} extractedData - Array of extracted items
 * @param {Object} options - Comparison options
 * @returns {Array} - Array with unique items only
 */
export function removeDuplicates(extractedData, options = {}) {
    const { 
        compareFields = ['stockCode', 'description', 'quantity', 'unitPrice'],
        caseSensitive = false 
    } = options;
    
    if (!Array.isArray(extractedData)) return [];
    
    const seen = new Set();
    const unique = [];
    
    for (const item of extractedData) {
        // Create comparison key
        const key = compareFields
            .map(field => {
                let value = item[field];
                if (typeof value === 'string' && !caseSensitive) {
                    value = value.toLowerCase();
                }
                return value;
            })
            .join('|');
        
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(item);
        }
    }
    
    console.log(`Removed ${extractedData.length - unique.length} duplicates`);
    return unique;
}

/**
 * Batch process multiple PDF files
 * @param {FileList|Array} files - PDF files to process
 * @param {Object} options - Processing options
 * @returns {Promise<Array>} - Combined results from all files
 */
export async function batchProcessPDFs(files, options = {}) {
    const { concurrency = 3, onProgress } = options;
    
    if (!files || files.length === 0) {
        throw new Error('No files provided for batch processing');
    }
    
    const results = [];
    const errors = [];
    
    // Process files in batches to avoid overwhelming the system
    for (let i = 0; i < files.length; i += concurrency) {
        const batch = Array.from(files).slice(i, i + concurrency);
        
        const batchPromises = batch.map(async (file, index) => {
            try {
                const items = await extractDataFromPDF(file, options);
                
                if (onProgress) {
                    onProgress({
                        completed: i + index + 1,
                        total: files.length,
                        currentFile: file.name,
                        itemsFound: items.length
                    });
                }
                
                return { file: file.name, items, success: true };
            } catch (error) {
                console.error(`Failed to process ${file.name}:`, error);
                errors.push({ file: file.name, error: error.message });
                return { file: file.name, items: [], success: false, error: error.message };
            }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
    }
    
    // Combine all successful results
    const allItems = results
        .filter(result => result.success)
        .flatMap(result => result.items);
    
    const uniqueItems = removeDuplicates(allItems);
    
    return {
        items: uniqueItems,
        processedFiles: results.length,
        errors: errors,
        summary: {
            totalFiles: files.length,
            successfulFiles: results.filter(r => r.success).length,
            failedFiles: errors.length,
            totalItemsFound: allItems.length,
            uniqueItemsFound: uniqueItems.length
        }
    };
}

/**
 * Export extracted data to various formats
 * @param {Array} items - Items to export
 * @param {string} format - Export format ('json', 'csv', 'txt')
 * @returns {string} - Formatted data
 */
export function exportData(items, format = 'json') {
    if (!Array.isArray(items) || items.length === 0) {
        return format === 'json' ? '[]' : '';
    }
    
    switch (format.toLowerCase()) {
        case 'json':
            return JSON.stringify(items, null, 2);
            
        case 'csv':
            const headers = Object.keys(items[0]).join(',');
            const rows = items.map(item => 
                Object.values(item)
                    .map(value => `"${String(value).replace(/"/g, '""')}"`)
                    .join(',')
            );
            return [headers, ...rows].join('\n');
            
        case 'txt':
            return items.map(item => 
                `Stock Code: ${item.stockCode}\n` +
                `Description: ${item.description}\n` +
                `Quantity: ${item.quantity}\n` +
                `Unit Price: $${item.unitPrice}\n` +
                '---'
            ).join('\n');
            
        default:
            throw new Error(`Unsupported format: ${format}`);
    }
}
