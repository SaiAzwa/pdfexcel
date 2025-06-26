/**
 * PDF Processor Module - Handles PDF reading and data extraction
 */

// Initialize PDF.js worker
export function initializePDFWorker() {
    if (window.pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
}

export async function extractDataFromPDF(file) {
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
export function parseTextForItems(text) {
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

/**
 * Remove duplicates from extracted data across multiple PDFs
 * @param {Array} extractedData - Array of extracted items
 * @returns {Array} - Array with unique items only
 */
export function removeDuplicates(extractedData) {
    return extractedData.filter((item, index, self) =>
        index === self.findIndex(t =>
            t.description === item.description &&
            t.quantity === item.quantity &&
            t.unitPrice === item.unitPrice
        )
    );
}
