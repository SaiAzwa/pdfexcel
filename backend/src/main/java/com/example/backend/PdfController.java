package com.example.backend;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

@RestController
public class PdfController {

    @PostMapping("/extract")
    public ResponseEntity<Map<String, Object>> extractData(@RequestParam("pdfFile") MultipartFile file) {
        Map<String, Object> response = new HashMap<>();
        List<Map<String, String>> items = new ArrayList<>();

        try (PDDocument document = PDDocument.load(file.getInputStream())) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);

            // TODO: Improve parsing logic as needed
            // Simple mock: extract lines and simulate items
            String[] lines = text.split("\n");
            for (String line : lines) {
                if (line.toLowerCase().contains("item")) {
                    Map<String, String> item = new HashMap<>();
                    item.put("stockCode", "123ABC");
                    item.put("description", line.trim());
                    item.put("quantity", "1");
                    item.put("unitPrice", "10.00");
                    items.add(item);
                }
            }

            response.put("items", items);
            return ResponseEntity.ok(response);

        } catch (IOException e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to process PDF"));
        }
    }
}
