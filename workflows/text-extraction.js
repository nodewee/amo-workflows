//!amo

// Text Extraction Workflow - Extract pure text from documents using doc-to-text
// Supports: single file, multiple files, or directory batch processing (top level files only)
// Document types: pdf, docx, doc, txt, and images

function main() {
    // Get runtime variables
    var inputPath = getVar("input") || "";
    var outputPath = getVar("output") || "";
    var ocrTool = getVar("ocr") || "interactive"; // OCR tool: llm-caller, surya_ocr, or interactive
    var ocrLlmTemplate = getVar("ocr_llm_template") || ""; // LLM template for llm-caller OCR
    var contentType = getVar("content_type") || ""; // Content type: text or image
    var overwrite = getVar("overwrite") === "true";
    var verbose = getVar("verbose") === "true";

    console.log("📄➡️📝 Text Extraction Workflow");
    console.log("===============================");
    console.log("Input:", inputPath || "Not specified");
    console.log("Output:", outputPath || "Same as input");
    console.log("OCR Tool:", ocrTool);
    if (ocrTool === "llm-caller" && ocrLlmTemplate) {
        console.log("OCR LLM Template:", ocrLlmTemplate);
    }
    console.log("Content Type:", contentType);
    console.log("Verbose:", verbose ? "Yes" : "No");
    console.log("Overwrite existing:", overwrite ? "Yes" : "No");
    console.log("");

    // Validate required parameters
    if (!inputPath) {
        console.error("❌ Error: Input path is required");
        console.log("Usage: --var input=/path/to/document --var output=/path/to/output");
        console.log("Supported variables:");
        console.log("  input: Input file or directory path");
        console.log("  output: Output file or directory path");
        console.log("  ocr: OCR tool (llm-caller, surya_ocr, interactive)");
        console.log("  ocr_llm_template: LLM template for OCR (required when ocr=llm-caller)");
        console.log("  content_type: Content type (text, image, default: image)");
        console.log("  verbose: Enable verbose output (true/false)");
        console.log("  overwrite: Overwrite existing files (true/false)");
        return false;
    }

    // Validate OCR tool and template combination
    if (ocrTool === "llm-caller" && !ocrLlmTemplate) {
        console.error("❌ Error: ocr_llm_template is required when using llm-caller as OCR tool");
        console.log("Example: --var ocr=llm-caller --var ocr_llm_template=qwen-vl-ocr");
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
        var outputValidation = validateOutputPath(outputPath, isBatchProcessing);
        if (!outputValidation.valid) {
            console.error("❌ Error:", outputValidation.error);
            return false;
        }
        outputPath = outputValidation.path;
        console.log("✅ Output path validated:", outputPath);
    }
    console.log("");

    // Check if required CLI tool is available
    console.log("🔍 Checking required CLI tools...");
    if (!checkCliTool("doc-to-text")) {
        return false;
    }
    console.log("✅ All required CLI tools are available");
    console.log("");

    // Supported document extensions
    var documentExtensions = [
        ".pdf", ".docx", ".doc", ".txt", 
        ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff"
    ];

    // Get list of document files to process
    var documentFiles = getDocumentFiles(inputPath, documentExtensions);

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

    for (var i = 0; i < documentFiles.length; i++) {
        var documentFile = documentFiles[i];
        var fileName = fs.filename(documentFile);
        var baseName = fs.basename(documentFile);
        
        console.log("📄 Processing [" + (i + 1) + "/" + documentFiles.length + "]: " + fileName);
        
        // Determine output file path
        var textOutputFile = determineTextOutputPath(documentFile, baseName, outputPath, isBatchProcessing);
        
        // Check if output file already exists
        if (!overwrite && fs.exists(textOutputFile)) {
            console.log("⏭️  Skipping (file exists): " + fs.filename(textOutputFile));
            console.log("");
            continue;
        }
        
        // Extract text from document
        if (extractTextFromDocument(documentFile, textOutputFile, ocrTool, ocrLlmTemplate, contentType, verbose)) {
            successCount++;
            console.log("✅ Success: " + fs.filename(textOutputFile));
        } else {
            failureCount++;
            console.log("❌ Failed: " + fileName);
        }
        console.log("");
    }

    // Summary
    console.log("🎯 Processing Summary:");
    console.log("===================");
    console.log("✅ Successful:", successCount);
    console.log("❌ Failed:", failureCount);
    console.log("📊 Total processed:", documentFiles.length);

    if (successCount > 0) {
        console.log("");
        console.log("🎉 Text extraction completed successfully!");
        if (outputPath) {
            console.log("📂 Output location:", outputPath);
        }
    }

    return true;
}

// ======================== Helper Functions ========================

function validateOutputPath(outputPath, isBatchProcessing) {
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
    
    if (result.stdout && result.stdout.trim()) {
        console.error("Standard Output:");
        var outputLines = result.stdout.split("\n");
        for (var i = 0; i < outputLines.length && i < 5; i++) {
            if (outputLines[i].trim()) {
                console.error("  " + outputLines[i].trim());
            }
        }
    }
    
    return false;
}

function getDocumentFiles(inputPath, documentExtensions) {
    var files = [];
    
    // Check if path exists
    if (!fs.exists(inputPath)) {
        console.error("❌ Cannot access:", inputPath);
        return [];
    }
    
    // Check if it's a directory or file
    if (fs.isDir(inputPath)) {
        // It's a directory, list only direct children (no recursion)
        var listResult = fs.readdir(inputPath);
        if (!listResult.error) {
            for (var i = 0; i < listResult.files.length; i++) {
                var fileInfo = listResult.files[i];
                // Only process files (not directories) in the top level
                if (!fileInfo.is_dir && isDocumentFile(fileInfo.path, documentExtensions)) {
                    files.push(fileInfo.path);
                }
            }
        } else {
            console.error("❌ Failed to list directory:", listResult.error);
        }
    } else if (fs.isFile(inputPath)) {
        // It's a file, check if it's a document file
        if (isDocumentFile(inputPath, documentExtensions)) {
            files.push(inputPath);
        }
    }
    
    return files.sort();
}

function isDocumentFile(filepath, documentExtensions) {
    var extension = fs.ext(filepath).toLowerCase();
    for (var i = 0; i < documentExtensions.length; i++) {
        if (extension === documentExtensions[i]) {
            return true;
        }
    }
    return false;
}

function determineTextOutputPath(inputFile, baseName, outputPath, isBatchProcessing) {
    var textFileName = baseName + ".txt";
    
    if (outputPath) {
        if (isBatchProcessing || fs.isDir(outputPath)) {
            // For batch processing or when output is a directory, put file in the directory
            return fs.join([outputPath, textFileName]);
        } else {
            // For single file processing with specific file path
            // Check if the output path has an extension
            var outputExt = fs.ext(outputPath);
            if (outputExt) {
                // Use the specified path as-is
                return outputPath;
            } else {
                // No extension specified, add .txt extension
                return outputPath + ".txt";
            }
        }
    } else {
        // No output path specified, use same directory as input file
        var inputDir = fs.dirname(inputFile);
        return fs.join([inputDir, textFileName]);
    }
}

function extractTextFromDocument(documentFile, textOutputFile, ocrTool, ocrLlmTemplate, contentType, verbose) {
    console.log("🔄 Extracting text from document...");
    
    // Extract text using doc-to-text with new parameter format
    var extractArgs = [documentFile];
    
    // Add content type parameter
    if (contentType) {
        extractArgs.push("--content-type", contentType);
    }
    
    // Add OCR tool parameter
    if (ocrTool && ocrTool !== "interactive") {
        extractArgs.push("--ocr", ocrTool);
        
        // Add LLM template if using llm-caller
        if (ocrTool === "llm-caller" && ocrLlmTemplate) {
            extractArgs.push("--llm_template", ocrLlmTemplate);
        }
    }
    
    // Add verbose flag if enabled
    if (verbose) {
        extractArgs.push("--verbose");
    }
    
    // Specify output file path using -o parameter
    extractArgs.push("-o", textOutputFile);
    
    console.log("🔧 Command: doc-to-text " + extractArgs.join(" "));
    
    // For interactive mode, we need to allow user input
    var commandOptions = { timeout: 600 };
    
    // If OCR tool is interactive or not specified, the command may need user input
    if (!ocrTool || ocrTool === "interactive") {
        console.log("ℹ️  OCR tool not specified - doc-to-text will prompt for OCR tool selection");
        console.log("📝 Please select the appropriate OCR tool when prompted");
        // Enable interactive mode and increase timeout
        commandOptions.interactive = true;
        commandOptions.timeout = 1800;
    }
    
    var extractResult = cliCommand("doc-to-text", extractArgs, commandOptions);
    
    if (extractResult.error) {
        console.error("❌ Text extraction failed:");
        console.error("Command: doc-to-text " + extractArgs.join(" "));
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
        
        // Show stdout if available (some tools output errors to stdout)
        if (extractResult.stdout && extractResult.stdout.trim()) {
            console.error("Standard Output:");
            var outputLines = extractResult.stdout.split("\n");
            for (var i = 0; i < outputLines.length && i < 10; i++) {
                if (outputLines[i].trim()) {
                    console.error("  " + outputLines[i].trim());
                }
            }
        }
        
        return false;
    }
    
    // Check if the specified output file was created
    if (!fs.exists(textOutputFile)) {
        console.error("❌ Text file was not created at expected location:", textOutputFile);
        
        // If the file wasn't created at the specified location, 
        // doc-to-text might have used its default MD5-based path
        console.log("🔍 Checking for default MD5-based output...");
        
        // Try to find the output in current working directory with MD5 hash structure
        var cwdResult = fs.cwd();
        if (!cwdResult.error) {
            var findResult = fs.find(cwdResult.path, "text.txt");
            if (!findResult.error && findResult.files.length > 0) {
                // Move the found file to the desired location
                var sourceFile = findResult.files[0];
                console.log("✅ Found extracted text at:", sourceFile);
                
                // Read the content and write to the desired location
                var readResult = fs.read(sourceFile);
                if (!readResult.error) {
                    var writeResult = fs.write(textOutputFile, readResult.content);
                    if (!writeResult.error) {
                        console.log("✅ Text file moved to desired location:", textOutputFile);
                        // Clean up temporary file
                        fs.rm(sourceFile);
                    } else {
                        console.error("❌ Failed to write text to desired location:", writeResult.error);
                        return false;
                    }
                } else {
                    console.error("❌ Failed to read extracted text:", readResult.error);
                    return false;
                }
            } else {
                console.error("❌ Could not locate extracted text file");
                return false;
            }
        } else {
            console.error("❌ Could not determine current working directory");
            return false;
        }
    }
    
    console.log("✅ Text extracted successfully");
    
    // Verify the output file contains content
    var verifyResult = fs.read(textOutputFile);
    if (verifyResult.error) {
        console.error("❌ Failed to verify output file:", verifyResult.error);
        return false;
    }
    
    if (!verifyResult.content || verifyResult.content.trim().length === 0) {
        console.error("❌ Extracted text is empty");
        return false;
    }
    
    console.log("✅ Text content verified (" + verifyResult.content.length + " characters)");
    
    return true;
}

// Execute main function
main(); 