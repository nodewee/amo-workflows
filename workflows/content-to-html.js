//!amo

// 内容转信息图网页工作流 - 将文档内容转换为HTML信息图
// 支持：单文件或目录批量处理
// 支持文档类型：pdf, md（markdown）, txt

function main() {
    // 获取运行时变量
    var inputPath = getVar("input") || "";
    var outputPath = getVar("output") || "";
    var overwrite = getVar("overwrite") === "true";
    var verbose = getVar("verbose") === "true";
    var maxTextLength = parseInt(getVar("max_length") || "7000", 10);

    console.log("📄➡️🌐 内容转信息图网页工作流");
    console.log("===============================================");
    console.log("输入路径:", inputPath || "未指定");
    console.log("输出路径:", outputPath || "与输入相同");
    console.log("最大文本长度:", maxTextLength + " 字符");
    console.log("详细模式:", verbose ? "是" : "否");
    console.log("覆盖已存在文件:", overwrite ? "是" : "否");
    console.log("");

    // 校验必需参数
    if (!inputPath) {
        console.error("❌ 错误：必须指定输入路径");
        console.log("用法示例: --var input=/path/to/document --var output=/path/to/output");
        console.log("支持的变量:");
        console.log("  input: 输入文件或目录路径");
        console.log("  output: 输出文件或目录路径");
        console.log("  max_length: 最大文本长度（默认7000）");
        console.log("  verbose: 是否显示详细信息（true/false）");
        console.log("  overwrite: 是否覆盖已存在文件（true/false）");
        console.log("");
        console.log("支持的文件格式: .pdf, .md, .txt");
        return false;
    }

    // 检查输入路径是否存在
    if (!fs.exists(inputPath)) {
        console.error("❌ 错误：输入路径不存在:", inputPath);
        return false;
    }

    // 判断是否为批量处理
    var isBatchProcessing = fs.isDir(inputPath);
    console.log("📊 处理模式:", isBatchProcessing ? "批量（目录-仅顶层文件）" : "单文件");

    // 校验输出路径
    if (outputPath) {
        var outputValidation = validateOutputPath(outputPath, isBatchProcessing);
        if (!outputValidation.valid) {
            console.error("❌ 错误:", outputValidation.error);
            return false;
        }
        outputPath = outputValidation.path;
        console.log("✅ 输出路径校验通过:", outputPath);
    }
    console.log("");

    // 检查所需CLI工具
    console.log("🔍 检查所需CLI工具...");
    if (!checkCliTool("doc-to-text")) {
        return false;
    }
    if (!checkCliTool("llm-caller")) {
        return false;
    }
    console.log("✅ 所需CLI工具均可用");
    console.log("");

    // 检查所需LLM模板
    if (!checkRequiredTemplate("deepseek-content-to-html")) {
        return false;
    }
    console.log("");

    // 支持的文档扩展名
    var documentExtensions = [".pdf", ".md", ".txt"];

    // 获取待处理文档文件列表
    var documentFiles = getDocumentFiles(inputPath, documentExtensions);

    if (documentFiles.length === 0) {
        console.error("❌ 未找到支持的文档文件:", inputPath);
        console.log("支持的格式:", documentExtensions.join(", "));
        return false;
    }

    console.log("📁 共找到", documentFiles.length, "个文档文件:");
    for (var i = 0; i < documentFiles.length; i++) {
        console.log("  " + (i + 1) + ". " + fs.filename(documentFiles[i]));
    }
    console.log("");

    // 处理每个文档文件
    var successCount = 0;
    var failureCount = 0;
    var skippedCount = 0;

    for (var i = 0; i < documentFiles.length; i++) {
        var documentFile = documentFiles[i];
        var fileName = fs.filename(documentFile);
        var baseName = fs.basename(documentFile);
        
        console.log("📄 正在处理 [" + (i + 1) + "/" + documentFiles.length + "]: " + fileName);
        
        // 计算输出文件路径
        var htmlOutputFile = determineHtmlOutputPath(documentFile, baseName, outputPath, isBatchProcessing);
        
        // 检查输出文件是否已存在
        if (!overwrite && fs.exists(htmlOutputFile)) {
            console.log("⏭️  跳过（文件已存在）: " + fs.filename(htmlOutputFile));
            console.log("");
            continue;
        }
        
        // 文档处理：提取文本->检查长度->LLM转HTML->保存HTML
        var result = processDocumentToHtml(documentFile, htmlOutputFile, maxTextLength, verbose);
        if (result === "success") {
            successCount++;
            console.log("✅ 成功: " + fs.filename(htmlOutputFile));
        } else if (result === "skipped") {
            skippedCount++;
            console.log("⏭️  跳过: " + fileName + "（文本过长）");
        } else {
            failureCount++;
            console.log("❌ 失败: " + fileName);
        }
        console.log("");
    }

    // 总结
    console.log("🎯 处理总结:");
    console.log("===================");
    console.log("✅ 成功:", successCount);
    console.log("⏭️  跳过（过长）:", skippedCount);
    console.log("❌ 失败:", failureCount);
    console.log("📊 总计处理:", documentFiles.length);

    if (successCount > 0) {
        console.log("");
        console.log("🎉 HTML信息图生成完成！");
        if (outputPath) {
            console.log("📂 输出位置:", outputPath);
        }
    }

    return true;
}

// ======================== 辅助函数 ========================

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
    var result = cliCommand(toolName, ["-h"], { timeout: 3600 });
    
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
    
    return false;
}

function checkRequiredTemplate(templateName) {
    console.log("🔍 Checking required LLM template: " + templateName);
    
    // First, validate if the template exists
    var validateResult = cliCommand("llm-caller", ["template", "validate", templateName], { timeout: 3600 });
    
    // Check for whitelist errors first (security)
    if (validateResult.error && validateResult.error.indexOf("not in the allowed CLI commands list") !== -1) {
        console.error("🚫 llm-caller command is blocked by security whitelist");
        console.error("Error:", validateResult.error);
        console.log("💡 Add 'llm-caller' to your allowed commands list to enable it");
        return false;
    }
    
    // If validation is successful, template exists
    if (!validateResult.error && validateResult.stdout && validateResult.stdout.indexOf("✅") !== -1) {
        console.log("✅ Template '" + templateName + "' is available");
        return true;
    }
    
    // Template doesn't exist
    console.error("❌ Required template '" + templateName + "' is not available");
    console.log("💡 Please manually install the '" + templateName + "' template");
    console.log("   You can find templates at: https://github.com/nodewee/llm-calling-templates");
    console.log("   Or create your own template for content to HTML conversion");
    console.log("");
    console.log("📋 Template should accept text content and generate HTML infographic");
    console.log("💡 Manual installation command (if URL is available):");
    console.log("   llm-caller template download <template-url>");
    
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

function determineHtmlOutputPath(inputFile, baseName, outputPath, isBatchProcessing) {
    var htmlFileName = baseName + ".html";
    
    if (outputPath) {
        if (isBatchProcessing || fs.isDir(outputPath)) {
            // For batch processing or when output is a directory, put file in the directory
            return fs.join([outputPath, htmlFileName]);
        } else {
            // For single file processing with specific file path
            // Check if the output path has an extension
            var outputExt = fs.ext(outputPath);
            if (outputExt) {
                // Use the specified path as-is
                return outputPath;
            } else {
                // No extension specified, add .html extension
                return outputPath + ".html";
            }
        }
    } else {
        // No output path specified, use same directory as input file
        var inputDir = fs.dirname(inputFile);
        return fs.join([inputDir, htmlFileName]);
    }
}

function processDocumentToHtml(documentFile, htmlOutputFile, maxTextLength, verbose) {
    console.log("🔄 Step 1: Extracting text from document...");
    
    // Step 1: Extract text using doc-to-text
    // Create a temporary text file path for extracted content
    var tempDir = fs.dirname(htmlOutputFile);
    var baseName = fs.basename(documentFile);
    var tempTextFile = fs.join([tempDir, baseName + ".extracted.txt"]);
    
    var extractArgs = [documentFile, "-o", tempTextFile];
    
    // Add verbose flag if enabled
    if (verbose) {
        extractArgs.push("--verbose");
    }
    
    console.log("🔧 Command: doc-to-text " + extractArgs.join(" "));
    
    var extractResult = cliCommand("doc-to-text", extractArgs, { timeout: 3600 });
    
    if (extractResult.error) {
        console.error("❌ Text extraction failed:");
        console.error("Error:", extractResult.error);
        
        // Show stderr if available
        if (extractResult.stderr && extractResult.stderr.trim()) {
            console.error("Standard Error Output:");
            var errorLines = extractResult.stderr.split("\n");
            for (var i = 0; i < errorLines.length && i < 5; i++) {
                if (errorLines[i].trim()) {
                    console.error("  " + errorLines[i].trim());
                }
            }
        }
        
        return "failed";
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
            var findResult = fs.find(cwdResult.path, "text.txt");
            if (!findResult.error && findResult.files.length > 0) {
                // Use the first found text.txt file (most recent)
                tempTextFile = findResult.files[0];
                console.log("✅ Found extracted text at:", tempTextFile);
            } else {
                console.error("❌ Could not locate extracted text file");
                return "failed";
            }
        } else {
            console.error("❌ Could not determine current working directory");
            return "failed";
        }
    }
    
    console.log("✅ Text extracted successfully");
    
    // Step 2: Read extracted text and check length
    console.log("🔄 Step 2: Reading and checking text length...");
    var textContent = fs.read(tempTextFile);
    if (textContent.error) {
        console.error("❌ Failed to read extracted text:", textContent.error);
        return "failed";
    }
    
    if (!textContent.content || textContent.content.trim().length === 0) {
        console.error("❌ Extracted text is empty");
        return "failed";
    }
    
    var textLength = textContent.content.length;
    console.log("📏 Text content length: " + textLength + " characters");
    
    // Check if text length exceeds maximum
    if (textLength > maxTextLength) {
        console.log("⚠️  Text length (" + textLength + ") exceeds maximum (" + maxTextLength + ") - skipping this file");
        console.log("💡 Consider increasing max_length parameter or splitting the document");
        
        // Clean up temporary file
        var rmResult = fs.rm(tempTextFile);
        if (rmResult.error && verbose) {
            console.warn("⚠️ Warning: Failed to remove temporary file:", rmResult.error);
        }
        
        return "skipped";
    }
    
    console.log("✅ Text length is within limits");
    
    // Step 3: Call LLM for HTML conversion
    console.log("🔄 Step 3: Converting to HTML infographic with LLM...");
    
    var llmArgs = [
        "call", "deepseek-content-to-html",
        "--var", "text:text:" + textContent.content
    ];

    console.log("🔧 Command: llm-caller call deepseek-content-to-html --var text:text:[" + textLength + " characters]");
    
    var llmResult = cliCommand("llm-caller", llmArgs, { timeout: 3600 });
    
    if (llmResult.error) {
        console.error("❌ LLM HTML conversion failed:");
        console.error("Error:", llmResult.error);
        
        // Show stderr if available
        if (llmResult.stderr && llmResult.stderr.trim()) {
            console.error("Standard Error Output:");
            var errorLines = llmResult.stderr.split("\n");
            for (var i = 0; i < errorLines.length && i < 5; i++) {
                if (errorLines[i].trim()) {
                    console.error("  " + errorLines[i].trim());
                }
            }
        }
        
        // Clean up temporary file
        var rmResult = fs.rm(tempTextFile);
        if (rmResult.error && verbose) {
            console.warn("⚠️ Warning: Failed to remove temporary file:", rmResult.error);
        }
        
        return "failed";
    }
    
    if (!llmResult.stdout || llmResult.stdout.trim().length === 0) {
        console.error("❌ LLM conversion returned empty result");
        
        // Clean up temporary file
        var rmResult = fs.rm(tempTextFile);
        if (rmResult.error && verbose) {
            console.warn("⚠️ Warning: Failed to remove temporary file:", rmResult.error);
        }
        
        return "failed";
    }
    
    console.log("✅ HTML conversion completed");
    
    // Step 4: Clean up HTML content (remove ```html and ```)
    console.log("🔄 Step 4: Cleaning up HTML content...");
    
    var htmlContent = llmResult.stdout.trim();
    
    // Remove ```html from the beginning
    if (htmlContent.indexOf("```html") === 0) {
        htmlContent = htmlContent.substring(7);
    }
    
    // Remove ``` from the end
    if (htmlContent.lastIndexOf("```") === htmlContent.length - 3) {
        htmlContent = htmlContent.substring(0, htmlContent.length - 3);
    }
    
    // Trim any remaining whitespace
    htmlContent = htmlContent.trim();
    
    if (htmlContent.length === 0) {
        console.error("❌ HTML content is empty after cleanup");
        
        // Clean up temporary file
        var rmResult = fs.rm(tempTextFile);
        if (rmResult.error && verbose) {
            console.warn("⚠️ Warning: Failed to remove temporary file:", rmResult.error);
        }
        
        return "failed";
    }
    
    console.log("✅ HTML content cleaned successfully");
    
    // Step 5: Save HTML content
    console.log("🔄 Step 5: Saving HTML file...");
    
    var writeResult = fs.write(htmlOutputFile, htmlContent);
    if (writeResult.error) {
        console.error("❌ Failed to save HTML file:", writeResult.error);
        
        // Clean up temporary file
        var rmResult = fs.rm(tempTextFile);
        if (rmResult.error && verbose) {
            console.warn("⚠️ Warning: Failed to remove temporary file:", rmResult.error);
        }
        
        return "failed";
    }
    
    console.log("✅ HTML file saved successfully");
    
    // Clean up temporary file
    var rmResult = fs.rm(tempTextFile);
    if (rmResult.error && verbose) {
        console.warn("⚠️ Warning: Failed to remove temporary file:", rmResult.error);
    } else if (verbose) {
        console.log("🧹 Cleaned up temporary text file");
    }
    
    return "success";
}

// Execute main function
main(); 