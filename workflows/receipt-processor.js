//!amo

// Receipt Processor Workflow - Extract and organize information from receipts
// Supports: single file, multiple files, or directory batch processing
// Document types: images, PDFs, and other formats containing receipt information

function main() {
    // Get runtime variables
    var inputPath = getVar("input") || "";
    var outputPath = getVar("output") || "";
    var outputFormat = getVar("format") || "json"; // Output format for summary files: json or csv
    var overwrite = getVar("overwrite") === "true";
    var verbose = getVar("verbose") === "true";

    console.log("🧾➡️📊 Receipt Processor Workflow");
    console.log("===============================");
    console.log("Input:", inputPath || "Not specified");
    console.log("Output:", outputPath || "Same as input");
    console.log("Summary Format:", outputFormat);
    console.log("Verbose:", verbose ? "Yes" : "No");
    console.log("Overwrite existing:", overwrite ? "Yes" : "No");
    console.log("");

    // Validate required parameters
    if (!inputPath) {
        console.error("❌ Error: Input path is required");
        console.log("Usage: --var input=/path/to/receipts --var output=/path/to/output");
        console.log("Supported variables:");
        console.log("  input: Input file or directory path");
        console.log("  output: Output file or directory path");
        console.log("  format: Summary file format (json, csv), default: json. Individual receipt files always use JSON");
        console.log("  verbose: Enable verbose output (true/false)");
        console.log("  overwrite: Overwrite existing files (true/false)");
        return false;
    }

    // Check if input path exists
    if (!fs.exists(inputPath)) {
        console.error("❌ Error: Input path does not exist:", inputPath);
        return false;
    }

    // Determine if this is batch processing
    var isBatchProcessing = fs.isDir(inputPath);
    console.log("📊 Processing mode:", isBatchProcessing ? "Batch (directory - top level files only)" : "Single file");

    // Validate output path based on processing mode
    if (outputPath) {
        var outputValidation = validateOutputPath(outputPath, isBatchProcessing, outputFormat);
        if (!outputValidation.valid) {
            console.error("❌ Error:", outputValidation.error);
            return false;
        }
        outputPath = outputValidation.path;
        console.log("✅ Output path validated:", outputPath);
    }
    console.log("");

    // Check if required CLI tools are available
    console.log("🔍 Checking required CLI tools...");
    if (!checkCliTool("doc-to-text")) {
        return false;
    }
    if (!checkCliTool("llm-caller")) {
        return false;
    }
    console.log("✅ All required CLI tools are available");
    console.log("");

    // Supported document extensions
    var documentExtensions = [
        ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff",
        ".docx", ".doc", ".txt"
    ];

    // Get list of document files to process
    var documentFiles = getDocumentFiles(inputPath, documentExtensions, verbose);

    if (documentFiles.length === 0) {
        console.error("❌ No supported document files found in:", inputPath);
        console.log("Supported formats:", documentExtensions.join(", "));
        return false;
    }

    console.log("📁 Found", documentFiles.length, "document file(s) to process:");
    for (var i = 0; i < documentFiles.length; i++) {
        console.log("  " + (i + 1) + ". " + fs.filename(documentFiles[i]));
    }
    console.log("");

    // Process each document file
    var successCount = 0;
    var failureCount = 0;
    var allReceipts = [];
    var skippedCount = 0;

    for (var i = 0; i < documentFiles.length; i++) {
        var documentFile = documentFiles[i];
        var fileName = fs.filename(documentFile);
        var baseName = fs.basename(documentFile);
        
        console.log("🧾 Processing [" + (i + 1) + "/" + documentFiles.length + "]: " + fileName);
        
        // Determine individual output file path
        var receiptOutputFile = determineReceiptOutputPath(documentFile, baseName, outputPath, isBatchProcessing, outputFormat);
        
        // Check if output file already exists
        if (!overwrite && fs.exists(receiptOutputFile)) {
            console.log("⏭️  Skipping (file exists): " + fs.filename(receiptOutputFile));
            
            // Always try to read existing data for summary, even when skipping
                var existingData = readExistingReceiptData(receiptOutputFile);
                if (existingData) {
                    allReceipts.push(existingData);
                    console.log("📥 Added existing data to summary");
                skippedCount++;
            }
            
            console.log("");
            continue;
        }
        
        // Process document: extract text -> LLM extraction -> save result
        var extractedData = processReceipt(documentFile, receiptOutputFile, verbose);
        if (extractedData) {
            successCount++;
            console.log("✅ Success: " + fs.filename(receiptOutputFile));
            
            // Add to collection for summary if we're doing batch processing
            if (isBatchProcessing) {
                allReceipts.push(extractedData);
            }
        } else {
            failureCount++;
            console.log("❌ Failed: " + fileName);
        }
        console.log("");
    }

    // Create summary file for batch processing - regardless of whether we processed new files
    if (isBatchProcessing && allReceipts.length > 0) {
        // If no explicit output path is provided, use the input directory
        var summaryOutputPath = outputPath || inputPath;
        
        console.log("📊 Creating summary files in: " + summaryOutputPath);
        var summaryFiles = createSummaryFile(allReceipts, summaryOutputPath, outputFormat, overwrite);
        if (summaryFiles) {
            for (var i = 0; i < summaryFiles.length; i++) {
                console.log("📊 Created file: " + fs.filename(summaryFiles[i]));
            }
        }
    }

    // Summary
    console.log("🎯 Processing Summary:");
    console.log("===================");
    console.log("✅ Successful:", successCount);
    console.log("⏭️ Skipped (existing):", skippedCount);
    console.log("❌ Failed:", failureCount);
    console.log("📊 Total processed:", documentFiles.length);
    console.log("📊 Total receipts collected:", allReceipts.length);

    if (successCount > 0 || skippedCount > 0) {
        console.log("");
        console.log("🎉 Receipt processing completed successfully!");
        if (outputPath) {
            console.log("📂 Output location:", outputPath);
        }
    }

    return true;
}

// ======================== Helper Functions ========================

function validateOutputPath(outputPath, isBatchProcessing, outputFormat) {
    // Check if output path exists
    var pathExists = fs.exists(outputPath);
    
    if (isBatchProcessing) {
        // For batch processing, output must be a directory
        if (pathExists) {
            if (!fs.isDir(outputPath)) {
                return {
                    valid: false,
                    error: "For batch processing, output path must be a directory, but '" + outputPath + "' is a file"
                };
            }
        } else {
            // Try to create the directory
            var mkdirResult = fs.mkdir(outputPath);
            if (mkdirResult.error) {
                return {
                    valid: false,
                    error: "Cannot create output directory '" + outputPath + "': " + mkdirResult.error
                };
            }
            console.log("📁 Created output directory:", outputPath);
        }
        
        // Get absolute path for directory
        var absResult = fs.abs(outputPath);
        return {
            valid: true,
            path: absResult.error ? outputPath : absResult.path
        };
    } else {
        // For single file processing, output can be a file path or directory
        if (pathExists) {
            if (fs.isDir(outputPath)) {
                // It's a directory, that's fine - we'll put the file in it
                var absResult = fs.abs(outputPath);
                return {
                    valid: true,
                    path: absResult.error ? outputPath : absResult.path
                };
            } else {
                // It's an existing file - check if we can overwrite
                var absResult = fs.abs(outputPath);
                return {
                    valid: true,
                    path: absResult.error ? outputPath : absResult.path
                };
            }
        } else {
            // Path doesn't exist - check if parent directory exists
            var parentDir = fs.dirname(outputPath);
            if (!fs.exists(parentDir)) {
                // Try to create parent directory
                var mkdirResult = fs.mkdir(parentDir);
                if (mkdirResult.error) {
                    return {
                        valid: false,
                        error: "Cannot create parent directory for '" + outputPath + "': " + mkdirResult.error
                    };
                }
                console.log("📁 Created parent directory:", parentDir);
            }
            
            // Get absolute path
            var absResult = fs.abs(outputPath);
            return {
                valid: true,
                path: absResult.error ? outputPath : absResult.path
            };
        }
    }
}

function checkCliTool(toolName) {
    var result = cliCommand(toolName, ["-h"], { timeout: 10 });
    
    // Check for whitelist errors first (security)
    if (result.error && result.error.indexOf("not in the allowed CLI commands list") !== -1) {
        console.error("🚫 " + toolName + " command is blocked by security whitelist");
        console.error("Error:", result.error);
        console.log("💡 Add '" + toolName + "' to your allowed commands list to enable it");
        return false;
    }
    
    // Check if command exists and works
    if (result.error && (result.error.indexOf("command not found") !== -1 || 
                        result.error.indexOf("No such file or directory") !== -1)) {
        console.error("❌ " + toolName + " command not found");
        console.error("Error:", result.error);
        console.log("💡 Please install " + toolName + " first");
        return false;
    }
    
    // If we got help output or the command ran successfully, it's available
    var output = result.stdout || result.stderr || "";
    if (output.length > 0 || !result.error) {
        console.log("✅ " + toolName + " is available");
        return true;
    }
    
    console.error("❌ " + toolName + " command failed");
    console.error("Error:", result.error);
    
    // Show additional error details if available
    if (result.stderr && result.stderr.trim()) {
        console.error("Standard Error Output:");
        var errorLines = result.stderr.split("\n");
        for (var i = 0; i < errorLines.length && i < 5; i++) {
            if (errorLines[i].trim()) {
                console.error("  " + errorLines[i].trim());
            }
        }
    }
    
    return false;
}

function getDocumentFiles(inputPath, documentExtensions, verbose) {
    var files = [];
    
    // Check if path exists
    if (!fs.exists(inputPath)) {
        console.error("❌ Cannot access:", inputPath);
        return [];
    }
    
    // Check if it's a directory or file
    if (fs.isDir(inputPath)) {
        // It's a directory, only list files in the current directory (no recursion)
        var listResult = fs.readdir(inputPath);
        
        if (!listResult.error) {
            console.log("🔍 Found " + listResult.files.length + " items in directory");
            
            for (var i = 0; i < listResult.files.length; i++) {
                var fileInfo = listResult.files[i];

                // Safety check
                if (!fileInfo || typeof fileInfo.name !== 'string') {
                    if (verbose) {
                        console.warn("⚠️  Skipping invalid file entry:", fileInfo);
                    }
                    continue;
                }
                
                // Debug log to see what we're getting
                if (verbose) {
                    console.log("📄 Found item: " + fileInfo.name + " (is_dir: " + fileInfo.is_dir + ", path: " + fileInfo.path + ")");
                }
                
                // Only process files (not directories) in the current level
                if (!fileInfo.is_dir) {
                    // Check if it's a supported document file by extension
                    if (isDocumentFile(fileInfo.path, documentExtensions, verbose)) {
                        files.push(fileInfo.path);
                        if (verbose) {
                            console.log("✅ Added to processing list: " + fileInfo.path);
                        }
                    } else if (verbose) {
                        console.log("❌ Unsupported file type: " + fileInfo.path);
                    }
                }
            }
        } else {
            console.error("❌ Failed to list directory:", listResult.error);
        }
    } else if (fs.isFile(inputPath)) {
        // It's a file, check if it's a document file
        if (isDocumentFile(inputPath, documentExtensions, verbose)) {
            files.push(inputPath);
        }
    }
    
    return files.sort();
}

function isDocumentFile(filepath, documentExtensions, verbose) {
    var extension = fs.ext(filepath);
    if (!extension) {
        if (verbose) {
            console.log("📋 No extension for file: " + fs.filename(filepath));
        }
        return false;
    }

    extension = extension.toLowerCase();

    // Ensure extension has a leading dot for consistent comparison
    if (extension.charAt(0) !== '.') {
        extension = '.' + extension;
    }

    if (verbose) {
        console.log("📋 Checking file: " + fs.filename(filepath) + " with computed extension: " + extension);
    }

    for (var i = 0; i < documentExtensions.length; i++) {
        if (extension === documentExtensions[i]) {
            return true;
        }
    }
    return false;
}

function determineReceiptOutputPath(inputFile, baseName, outputPath, isBatchProcessing, outputFormat) {
    // Always use JSON format for individual receipt files
    var extension = ".json";
    var outputFileName = baseName + ".receipt" + extension;
    
    if (outputPath) {
        if (isBatchProcessing || fs.isDir(outputPath)) {
            // For batch processing or when output is a directory, put file in the directory
            return fs.join([outputPath, outputFileName]);
        } else {
            // For single file processing with specific file path
            // Check if the output path has an extension
            var outputExt = fs.ext(outputPath);
            if (outputExt) {
                // Use the specified path as-is
                return outputPath;
            } else {
                // No extension specified, add the appropriate extension
                return outputPath + extension;
            }
        }
    } else {
        // No output path specified, use same directory as input file
        var inputDir = fs.dirname(inputFile);
        return fs.join([inputDir, outputFileName]);
    }
}

function readExistingReceiptData(filePath) {
    var result = fs.read(filePath);
    if (result.error) {
        console.error("❌ Failed to read existing receipt data:", result.error);
        return null;
    }
    
    try {
        // Individual receipt files are always in JSON format
        return JSON.parse(result.content);
    } catch (error) {
        console.error("❌ Failed to parse existing receipt data:", error);
        return null;
    }
}

function processReceipt(documentFile, outputFile, verbose) {
    console.log("🔄 Step 1: Extracting text from receipt...");
    
    // Step 1: Extract text using doc-to-text with specific parameters
    // Create MD5 hash of the file path to use as a subfolder for temporary files
    function calculateMd5(str) {
        // Try to use fs.md5 API if the input is a file path that exists
        if (fs.exists(str)) {
            var md5Result = fs.md5(str);
            if (!md5Result.error) {
                return md5Result.hash;
            }
        }
        
        // Fallback to the simple implementation if fs.md5 fails or input is not a file
        var uniquePart = fs.basename(str) + "_" + new Date().getTime();
        return uniquePart.replace(/[^a-zA-Z0-9]/g, "").substring(0, 32);
    }
    
    var md5Hash = calculateMd5(documentFile);
    
    var tempDir = fs.dirname(outputFile);
    var baseName = fs.basename(documentFile);
    
    // Create a subdirectory using the MD5 hash
    var hashDir = fs.join([tempDir, md5Hash]);
    if (!fs.exists(hashDir)) {
        var mkdirResult = fs.mkdir(hashDir);
        if (mkdirResult.error) {
            console.error("❌ Failed to create hash directory:", mkdirResult.error);
            // Fall back to using the original tempDir
            hashDir = tempDir;
        }
    }
    
    var tempTextFile = fs.join([hashDir, baseName + ".extracted.txt"]);
    
    // Check if the extracted text file already exists
    var skipTextExtraction = false;
    if (fs.exists(tempTextFile)) {
        console.log("✅ Found existing extracted text file at: " + tempTextFile);
        console.log("🔄 Using existing extracted text file");
        skipTextExtraction = true;
    }
    
    if (!skipTextExtraction) {
    var extractArgs = [
        documentFile,
        "--content-type", "image",
        "--ocr", "llm-caller",
        "--llm_template", "qwen-vl-ocr-image",
        "-o", tempTextFile
    ];
    
    // Add verbose flag if enabled
    if (verbose) {
        extractArgs.push("--verbose");
    }
    
    console.log("🔧 Command: doc-to-text " + extractArgs.join(" "));
    
    var extractResult = cliCommand("doc-to-text", extractArgs, { timeout: 600 });
    
    if (extractResult.error) {
        console.error("❌ Text extraction failed:");
        console.error("Error:", extractResult.error);
        
        // Show stderr if available
        if (extractResult.stderr && extractResult.stderr.trim()) {
            console.error("Standard Error Output:");
            var errorLines = extractResult.stderr.split("\n");
            for (var i = 0; i < errorLines.length && i < 10; i++) {
                if (errorLines[i].trim()) {
                    console.error("  " + errorLines[i].trim());
                }
            }
        }
        
        return null;
    }
    
    // Check if the specified output file was created
    if (!fs.exists(tempTextFile)) {
        console.error("❌ Text file was not created at expected location:", tempTextFile);
        
        // If the file wasn't created at the specified location, 
        // doc-to-text might have used its default MD5-based path
        console.log("🔍 Checking for default MD5-based output...");
        
        // Try to find the output in current working directory with MD5 hash structure
        var cwdResult = fs.cwd();
        if (!cwdResult.error) {
            // First check in the hash directory (if it exists)
            if (hashDir !== tempDir && fs.exists(hashDir)) {
                var hashDirList = fs.readdir(hashDir);
                if (!hashDirList.error && hashDirList.files.length > 0) {
                    // Look for text files in the hash directory
                    for (var i = 0; i < hashDirList.files.length; i++) {
                        if (hashDirList.files[i].name.endsWith(".txt") && !hashDirList.files[i].is_dir) {
                            tempTextFile = hashDirList.files[i].path;
                            console.log("✅ Found extracted text in hash directory:", tempTextFile);
                            break;
                        }
                    }
                }
            }
            
            // If still not found, look in the current working directory
            if (!fs.exists(tempTextFile)) {
                var findResult = fs.find(cwdResult.path, "text.txt");
                if (!findResult.error && findResult.files.length > 0) {
                    // Use the first found text.txt file (most recent)
                    tempTextFile = findResult.files[0];
                    console.log("✅ Found extracted text at:", tempTextFile);
                } else {
                    console.error("❌ Could not locate extracted text file");
                    return null;
                }
            }
        } else {
            console.error("❌ Could not determine current working directory");
            return null;
        }
    }
    
    console.log("✅ Text extracted successfully");
    }
    
    // Step 2: Read extracted text
    console.log("🔄 Step 2: Reading extracted text...");
    var textContent = fs.read(tempTextFile);
    if (textContent.error) {
        console.error("❌ Failed to read extracted text:", textContent.error);
        return null;
    }
    
    if (!textContent.content || textContent.content.trim().length === 0) {
        console.error("❌ Extracted text is empty");
        return null;
    }
    
    console.log("✅ Text content loaded (" + textContent.content.length + " characters)");
    
    // Check if the final output file already exists and contains valid data
    if (fs.exists(outputFile)) {
        console.log("✅ Found existing output file at: " + outputFile);
        try {
            var existingData = readExistingReceiptData(outputFile);
            if (existingData) {
                console.log("🔄 Using existing extracted data");
                return existingData;
            } else {
                console.log("⚠️ Existing output file contains invalid data, proceeding with extraction");
            }
        } catch (e) {
            console.log("⚠️ Error reading existing output file, proceeding with extraction");
        }
    }
    
    // Step 3: Call LLM for structured extraction
    console.log("🔄 Step 3: Extracting structured data with LLM...");
    
    var llmArgs = [
        "call", "deepseek-ticket-extraction",
        "--var", "text:text:" + textContent.content
    ];

    console.log("🔧 Command: llm-caller call deepseek-ticket-extraction --var text:text:[" + textContent.content.length + " characters]");
    
    var llmResult = cliCommand("llm-caller", llmArgs, { timeout: 600 });
    
    if (llmResult.error) {
        console.error("❌ LLM extraction failed:");
        console.error("Error:", llmResult.error);
        
        // Show stderr if available
        if (llmResult.stderr && llmResult.stderr.trim()) {
            console.error("Standard Error Output:");
            var errorLines = llmResult.stderr.split("\n");
            for (var i = 0; i < errorLines.length && i < 10; i++) {
                if (errorLines[i].trim()) {
                    console.error("  " + errorLines[i].trim());
                }
            }
        }
        
        return null;
    }
    
    if (!llmResult.stdout || llmResult.stdout.trim().length === 0) {
        console.error("❌ LLM extraction returned empty result");
        return null;
    }
    
    console.log("✅ Structured data extraction completed");
    
    // Step 4: Parse LLM output to extract JSON data
    console.log("🔄 Step 4: Parsing structured data...");
    
    var extractedData = parseExtractedData(llmResult.stdout, fs.basename(documentFile));
    if (!extractedData) {
        console.error("❌ Failed to parse structured data");
        return null;
    }
    
    console.log("✅ Structured data parsed successfully");
    
    // Step 5: Save extracted data
    console.log("🔄 Step 5: Saving extracted data...");
    
    // Always use JSON format for individual receipt files
    var outputContent = JSON.stringify(extractedData, null, 2);
    
    var writeResult = fs.write(outputFile, outputContent);
    if (writeResult.error) {
        console.error("❌ Failed to save extracted data:", writeResult.error);
        return null;
    }
    
    console.log("✅ Extracted data saved");
    
    // Preserve extracted text file for reference
    console.log("📁 Preserving extracted text file for reference:");
    console.log("   " + tempTextFile);
    
    return extractedData;
}

function parseExtractedData(llmOutput, sourceFileName) {
    try {
        // Look for JSON data in the LLM output - it might be enclosed in ```json or similar
        var jsonMatch = llmOutput.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        var jsonStr = jsonMatch ? jsonMatch[1] : llmOutput;
        
        // Try to parse the JSON
        var data = JSON.parse(jsonStr);
        
        // Add metadata
        data.source_file = sourceFileName;
        data.extraction_timestamp = new Date().toISOString();
        
        return data;
    } catch (error) {
        console.error("❌ Error parsing LLM output:", error);
        console.log("Raw LLM output:");
        console.log(llmOutput.slice(0, 200) + "..." + (llmOutput.length > 200 ? " (truncated)" : ""));
        return null;
    }
}

function convertToCsv(data) {
    // This is a simple implementation - in a real scenario, you'd want more robust CSV handling
    // Flatten the object for CSV
    var flatData = flattenObject(data);
    
    // Create header row
    var headers = Object.keys(flatData);
    var headerRow = headers.join(",");
    
    // Create data row
    var dataRow = headers.map(function(header) {
        var value = flatData[header];
        // Handle CSV escaping
        if (typeof value === "string" && (value.includes(",") || value.includes("\"") || value.includes("\n"))) {
            return "\"" + value.replace(/"/g, "\"\"") + "\"";
        }
        return value !== undefined && value !== null ? value : "";
    }).join(",");
    
    return headerRow + "\n" + dataRow;
}

function flattenObject(obj, prefix = "") {
    var result = {};
    
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            var value = obj[key];
            var newKey = prefix ? prefix + "." + key : key;
            
            // Skip type-code field for CSV output
            if (newKey === "type-code") {
                continue;
            }
            
            // Special handling for fields object to remove "fields." prefix
            if (key === "fields" && typeof value === "object" && value !== null && !Array.isArray(value)) {
                // Directly add fields without the "fields." prefix
                for (var fieldKey in value) {
                    // Skip type-code field from fields object
                    if (fieldKey === "type-code") {
                        continue;
                    }
                    
                    if (value.hasOwnProperty(fieldKey)) {
                        result[fieldKey] = value[fieldKey];
                    }
                }
            } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
                // Recursively flatten nested objects
                var flattened = flattenObject(value, newKey);
                for (var subKey in flattened) {
                    if (flattened.hasOwnProperty(subKey)) {
                        result[subKey] = flattened[subKey];
                    }
                }
            } else if (Array.isArray(value)) {
                // Handle arrays by joining values
                result[newKey] = value.join("; ");
            } else {
                result[newKey] = value;
            }
        }
    }
    
    return result;
}

function createSummaryFile(receipts, outputPath, outputFormat, overwrite) {
    // Create a "total" subfolder for all summary files
    var totalDirPath = fs.join([outputPath, "total"]);
    if (!fs.exists(totalDirPath)) {
        var mkdirResult = fs.mkdir(totalDirPath);
        if (mkdirResult.error) {
            console.error("❌ Failed to create 'total' directory:", mkdirResult.error);
            // Fall back to the original output path
            totalDirPath = outputPath;
        } else {
            console.log("📁 Created 'total' directory for summary files");
        }
    }
    
    var results = [];
    
    // Group receipts by type-code
    var receiptsByType = groupReceiptsByType(receipts);
    
    // Create files for each receipt type
    for (var receiptType in receiptsByType) {
        if (receiptsByType.hasOwnProperty(receiptType) && 
            receiptsByType[receiptType].length > 0 && 
            receiptType !== "general") { // Skip "general" type
            
            var typeReceipts = receiptsByType[receiptType];
            var typeName = sanitizeFileName(receiptType);
            
            // Create type-specific file name
            var typeFileName = "receipts_" + typeName + "." + (outputFormat === "csv" ? "csv" : "json");
            var typeFilePath = fs.join([totalDirPath, typeFileName]);
            
            // Check if the file already exists and we're not overwriting
            if (!overwrite && fs.exists(typeFilePath)) {
                console.log("⏭️  Skipping type summary file (already exists): " + typeFilePath);
                continue;
            }
            
            console.log("📊 Creating type summary file: " + typeFilePath + " (" + typeReceipts.length + " receipts)");
            
            var typeContent = "";
            
            if (outputFormat === "csv") {
                typeContent = createTotalCsv(typeReceipts);
            } else {
                typeContent = JSON.stringify(typeReceipts, null, 2);
            }
            
            var writeTypeResult = fs.write(typeFilePath, typeContent);
            if (writeTypeResult.error) {
                console.error("❌ Failed to save type summary file:", writeTypeResult.error);
            } else {
                results.push(typeFilePath);
            }
        }
    }
    
    return results.length > 0 ? results : null;
}

// Helper function to sanitize receipt type for file name
function sanitizeFileName(name) {
    // Replace invalid file characters and spaces with underscores
    return (name || "unknown")
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9_\-]/g, "_")
        .replace(/_+/g, "_")  // Replace multiple underscores with a single one
        .replace(/^_|_$/g, ""); // Remove leading/trailing underscores
}

// Group receipts by their type
function groupReceiptsByType(receipts) {
    var receiptsByType = {};
    
    for (var i = 0; i < receipts.length; i++) {
        var receipt = receipts[i];
        var receiptType = determineReceiptType(receipt);
        
        // If no type-code is found, skip this receipt
        if (!receiptType) {
            continue;
        }
        
        if (!receiptsByType[receiptType]) {
            receiptsByType[receiptType] = [];
        }
        
        receiptsByType[receiptType].push(receipt);
    }
    
    return receiptsByType;
}

// Determine the type of a receipt based on its fields
function determineReceiptType(receipt) {
    // Check for type-code field first (highest priority)
    if (receipt["type-code"]) {
        return receipt["type-code"];
    }
    
    // Check for type-code in fields object
    if (receipt.fields && receipt.fields["type-code"]) {
        return receipt.fields["type-code"];
    }
    
    // Return null if no valid type-code is found
    // This will be caught and converted to "general" by groupReceiptsByType
    return null;
}

function createTotalCsv(receipts) {
    if (receipts.length === 0) {
        return "";
    }
    
    // Get all possible fields from all receipts
    var allFields = new Set();
    receipts.forEach(function(receipt) {
        var flat = flattenObject(receipt);
        Object.keys(flat).forEach(function(key) {
            // Skip the type-code column
            if (key !== "type-code") {
                allFields.add(key);
            }
        });
    });
    
    var fields = Array.from(allFields);
    var headerRow = fields.join(",");
    
    // Create data rows
    var dataRows = receipts.map(function(receipt) {
        var flat = flattenObject(receipt);
        return fields.map(function(field) {
            var value = flat[field];
            // Handle CSV escaping
            if (typeof value === "string" && (value.includes(",") || value.includes("\"") || value.includes("\n"))) {
                return "\"" + value.replace(/"/g, "\"\"") + "\"";
            }
            return value !== undefined && value !== null ? value : "";
        }).join(",");
    });
    
    return headerRow + "\n" + dataRows.join("\n");
}

// Execute main function
main(); 