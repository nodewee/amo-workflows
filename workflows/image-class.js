//!amo

// Image Classifier Workflow - Classify images using LLM and organize them into folders
// Supports: single file or directory batch processing

function main() {
    // Get runtime variables
    var inputPath = getVar("input") || "";
    var outputPath = getVar("output") || "";
    var verbose = getVar("verbose") === "true";
    var llmCallingTemplate = getVar("llm_calling_template") || "ollama-image-class";
    var maxSize = getVar("max_size") || 800;

    console.log("🖼️➡️📂 Image Classifier Workflow");
    console.log("===============================");
    console.log("Input:", inputPath || "Not specified");
    console.log("Output:", outputPath || "Same as input");
    console.log("LLM Calling Template:", llmCallingTemplate);
    console.log("Max Image Size:", maxSize + "px");
    console.log("Verbose:", verbose ? "Yes" : "No");
    console.log("");

    // Validate required parameters
    if (!inputPath) {
        console.error("❌ Error: Input path is required");
        console.log("Usage: --var input=/path/to/images --var output=/path/to/output");
        console.log("Supported variables:");
        console.log("  input: Input file or directory path containing images");
        console.log("  output: Output directory path for organized images");
        console.log("  llm_calling_template: LLM model for image classification (default: ollama-image-class)");
        console.log("  max_size: Maximum size for image dimension in pixels (default: 800)");
        console.log("  verbose: Enable verbose output (true/false)");
        return false;
    }

    // Check if input path exists
    if (!fs.exists(inputPath)) {
        console.error("❌ Error: Input path does not exist:", inputPath);
        return false;
    }

    // Determine if this is single file or batch processing
    var isBatchProcessing = fs.isDir(inputPath);
    console.log("📊 Processing mode:", isBatchProcessing ? "Batch (directory)" : "Single file");

    // Validate output path
    if (outputPath) {
        var outputValidation = validateOutputPath(outputPath);
        if (!outputValidation.valid) {
            console.error("❌ Error:", outputValidation.error);
            return false;
        }
        outputPath = outputValidation.path;
        console.log("✅ Output path validated:", outputPath);
    } else {
        // Use input directory as output path if not specified
        outputPath = isBatchProcessing ? inputPath : fs.dirname(inputPath);
    }
    console.log("");

    // Check if required CLI tools are available
    console.log("🔍 Checking required CLI tools...");
    // Check if ImageMagick is available
    if (!checkCliTool("convert")) {
        console.error("❌ Error: ImageMagick is required");
        return false;
    }
    if (!checkCliTool("llm-caller")) {
        console.error("❌ Error: 'llm-caller' tool is required");
        return false;
    }
    console.log("✅ All required CLI tools are available");
    console.log("");

    // Check required LLM template
    if (!checkRequiredTemplate(llmCallingTemplate)) {
        return false;
    }
    console.log("");

    // Supported image extensions
    var imageExtensions = [
        ".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".webp",
        ".gif", ".heic", ".heif"
    ];

    // Get list of image files to process
    var imageFiles = [];
    if (isBatchProcessing) {
        imageFiles = getImageFiles(inputPath, imageExtensions, verbose);
    } else {
        // Single file mode
        if (isImageFile(inputPath, imageExtensions)) {
            imageFiles.push(inputPath);
        } else {
            console.error("❌ Input file is not a supported image format:", inputPath);
            console.log("Supported formats:", imageExtensions.join(", "));
            return false;
        }
    }

    if (imageFiles.length === 0) {
        console.error("❌ No image files found in:", inputPath);
        console.log("Supported formats:", imageExtensions.join(", "));
        return false;
    }

    console.log("📁 Found", imageFiles.length, "image file(s) to process:");
    for (var i = 0; i < Math.min(imageFiles.length, 10); i++) {
        console.log("  " + (i + 1) + ". " + fs.filename(imageFiles[i]));
    }
    if (imageFiles.length > 10) {
        console.log("  ... and " + (imageFiles.length - 10) + " more files");
    }
    console.log("");

    // Process each image file
    var successCount = 0;
    var failureCount = 0;
    var renameCount = 0;
    var categoryStats = {};

    for (var i = 0; i < imageFiles.length; i++) {
        var imageFile = imageFiles[i];
        var fileName = fs.filename(imageFile);

        console.log("🖼️ Processing [" + (i + 1) + "/" + imageFiles.length + "]: " + fileName);

        // Classify the image and move to category folder
        var result = classifyAndOrganizeImage(imageFile, outputPath, llmCallingTemplate, maxSize, verbose);

        if (result.success) {
            successCount++;
            console.log("✅ Success: Moved to category '" + result.category + "'");

            // Check if file was renamed
            if (result.destinationFile && result.destinationFile !== fileName) {
                renameCount++;
            }

            // Update category statistics
            if (!categoryStats[result.category]) {
                categoryStats[result.category] = 0;
            }
            categoryStats[result.category]++;
        } else {
            failureCount++;
            console.log("❌ Failed: " + fileName + " - " + result.error);
        }
        console.log("");
    }

    // Summary
    console.log("🎯 Classification Summary:");
    console.log("=======================");
    console.log("✅ Successfully classified and organized:", successCount);
    console.log("❌ Failed:", failureCount);
    if (renameCount > 0) {
        console.log("🔄 Auto-renamed files (due to name conflicts):", renameCount);
    }
    console.log("📊 Total processed:", imageFiles.length);

    // Show category statistics
    if (successCount > 0) {
        console.log("\n📊 Category Statistics:");
        var categories = Object.keys(categoryStats).sort();
        for (var i = 0; i < categories.length; i++) {
            var category = categories[i];
            var count = categoryStats[category];
            var percentage = Math.round((count / successCount) * 100);
            console.log("  " + category + ": " + count + " images (" + percentage + "%)");
        }

        console.log("");
        console.log("🎉 Image classification completed successfully!");
        console.log("📂 Output location:", outputPath);
    }

    return true;
}

// ======================== Helper Functions ========================

function validateOutputPath(outputPath) {
    // Check if output path exists
    var pathExists = fs.exists(outputPath);

    if (pathExists) {
        if (!fs.isDir(outputPath)) {
            return {
                valid: false,
                error: "Output path must be a directory, but '" + outputPath + "' is a file"
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
}

function checkCliTool(toolName) {
    // For ImageMagick, check only magick command
    if (toolName === "convert") {
        var magickResult = cliCommand("magick", ["-version"], { timeout: 10 });
        if (magickResult.stdout && magickResult.stdout.indexOf("ImageMagick") !== -1) {
            console.log("✅ ImageMagick is available");
            return "magick"; // Return the command name to use
        }

        // magick command not available
        console.error("❌ ImageMagick not found. Please install ImageMagick.");
        return false;
    }

    // For other tools, use the standard check
    var testArgs = toolName === "llm-caller" ? ["-h"] : ["-h"];
    var result = cliCommand(toolName, testArgs, { timeout: 10 });

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

    // If we got output or the command ran successfully, it's available
    var output = result.stdout || result.stderr || "";
    if (output.length > 0 || !result.error) {
        console.log("✅ " + toolName + " is available");
        return true;
    }

    console.error("❌ " + toolName + " command failed");
    console.error("Error:", result.error);

    return false;
}

function checkLlmTemplate(templateName, downloadUrl) {
    console.log("🔍 Checking template: " + templateName);
    
    // First, validate if the template exists
    var validateResult = cliCommand("llm-caller", ["template", "validate", templateName], { timeout: 30 });
    
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
    
    // Template doesn't exist, try to download it
    console.log("⚠️  Template '" + templateName + "' not found, attempting to download...");
    
    if (!downloadUrl) {
        console.error("❌ No download URL provided for template: " + templateName);
        console.log("💡 Please manually install the template or provide a download URL");
        console.log("   You can find templates at: https://github.com/nodewee/llm-calling-templates");
        console.log("   Or create your own template for image classification");
        return false;
    }
    
    console.log("📥 Downloading template from: " + downloadUrl);
    var downloadResult = cliCommand("llm-caller", ["template", "download", downloadUrl], { timeout: 60 });
    
    if (downloadResult.error) {
        console.error("❌ Failed to download template '" + templateName + "':");
        console.error("Error:", downloadResult.error);
        
        // Show stderr if available
        if (downloadResult.stderr && downloadResult.stderr.trim()) {
            console.error("Standard Error Output:");
            var errorLines = downloadResult.stderr.split("\n");
            for (var i = 0; i < errorLines.length && i < 10; i++) {
                if (errorLines[i].trim()) {
                    console.error("  " + errorLines[i].trim());
                }
            }
        }
        
        console.log("💡 Please manually download and install the template:");
        console.log("   llm-caller template download " + downloadUrl);
        return false;
    }
    
    // Check if download was successful
    if (downloadResult.stdout && downloadResult.stdout.indexOf("successfully downloaded") !== -1) {
        console.log("✅ Template '" + templateName + "' downloaded successfully");
        
        // Verify the template is now available
        var verifyResult = cliCommand("llm-caller", ["template", "validate", templateName], { timeout: 30 });
        if (!verifyResult.error && verifyResult.stdout && verifyResult.stdout.indexOf("✅") !== -1) {
            console.log("✅ Template '" + templateName + "' verified and ready to use");
            return true;
        } else {
            console.error("❌ Template download completed but validation failed");
            console.error("Validation error:", verifyResult.error || "Unknown error");
            return false;
        }
    } else {
        console.error("❌ Template download may have failed - no success message found");
        console.log("Download output:", downloadResult.stdout || "No output");
        return false;
    }
}

function checkRequiredTemplate(templateName) {
    console.log("🔍 Checking required LLM template...");
    
    // Define known templates with their download URLs
    var knownTemplates = {
        "ollama-image-class": "https://raw.githubusercontent.com/nodewee/llm-calling-templates/refs/heads/main/ollama-image-class.json",
        "llava-describe": null,     // LLaVA-based image description template (if available)
        "vision-classify": null,    // Generic vision classification template (if available)
        // Add more known templates here as they become available
    };
    
    var downloadUrl = knownTemplates[templateName] || null;
    
    if (!checkLlmTemplate(templateName, downloadUrl)) {
        console.error("❌ Required template '" + templateName + "' is not available");
        
        if (!downloadUrl) {
            console.log("💡 Please manually install the '" + templateName + "' template");
            console.log("   You can find templates at: https://github.com/nodewee/llm-calling-templates");
            console.log("   Or create your own template for image classification");
            console.log("");
            console.log("📋 Template creation suggestions:");
            console.log("   - Create a template that accepts base64 image input");
            console.log("   - Template should return classification in format: 类型：<type> 内容：<content>");
            console.log("   - Use a vision-capable model like LLaVA, GPT-4V, or Qwen-VL");
            console.log("");
            console.log("📋 Manual installation command (if URL is available):");
            console.log("   llm-caller template download <template-url>");
        }
        
        console.log("");
        console.log("💡 Alternative: You can specify a different template using:");
        console.log("   --var llm_calling_template=<your-template-name>");
        console.log("");
        console.log("🔧 Example template names you might try:");
        console.log("   - llava-describe (if you have LLaVA models)");
        console.log("   - qwen-vl-ocr-image (multi-modal Qwen model)");
        console.log("   - gpt-4v-classify (if using OpenAI API)");
        
        return false;
    }
    
    console.log("✅ Required LLM template is available");
    return true;
}

function getImageFiles(inputPath, imageExtensions, verbose) {
    var files = [];

    // Check if path exists
    if (!fs.exists(inputPath)) {
        console.error("❌ Cannot access:", inputPath);
        return [];
    }

    // It's a directory, find all image files
    var findResult = fs.find(inputPath, "*");
    if (findResult.error) {
        console.error("❌ Failed to search directory:", findResult.error);
        return [];
    }

    for (var i = 0; i < findResult.files.length; i++) {
        var file = findResult.files[i];
        if (fs.isFile(file) && isImageFile(file, imageExtensions)) {
            files.push(file);
            if (verbose) {
                console.log("✅ Found image: " + file);
            }
        }
    }

    return files.sort();
}

function isImageFile(filepath, imageExtensions) {
    var extension = fs.ext(filepath).toLowerCase();
    for (var i = 0; i < imageExtensions.length; i++) {
        if (extension === imageExtensions[i]) {
            return true;
        }
    }
    return false;
}

function classifyAndOrganizeImage(imageFile, outputPath, llmCallingTemplate, maxSize, verbose) {
    // Step 1: Resize image if needed and convert to base64
    console.log("🔄 Step 1: Processing image...");

    var needsConvert = [".gif", ".heic", ".heif"].indexOf(fs.ext(imageFile).toLowerCase()) !== -1;
    var needsResize = checkIfResizeNeeded(imageFile, maxSize);
    if (needsResize.error) {
        return {
            success: false,
            error: "Failed to check image dimensions: " + needsResize.error
        };
    }

    if (verbose) {
        console.log("📏 Image dimensions: " + needsResize.width + "x" + needsResize.height);
        console.log("🔍 Resize needed: " + (needsResize.needsResize ? "Yes" : "No"));
        if (needsConvert) {
            console.log("🔄 GIF format detected: will be converted to PNG for LLM compatibility");
        }
    }

    // prepare temp image file
    var tempImageFile = ""
    if (needsConvert || needsResize.needsResize) {
        // 使用getTempFilePath获取系统临时文件路径
        var tempResult = fs.getTempFilePath("image_class_");
        if (!tempResult.success) {
            return {
                success: false,
                error: tempResult.error || "Failed to get temporary file path"
            };
        }
        tempImageFile = tempResult.path + ".png";
        if (verbose) {
            console.log("📄 Using temporary file: " + tempImageFile);
        }
    }

    var resultImageFile = imageFile;
    // Resize the image if needed
    if (needsResize.needsResize) {
        var resizeResult = resizeImage(imageFile, tempImageFile, maxSize);
        if (!resizeResult.success) {
            return {
                success: false,
                error: "Failed to resize image: " + resizeResult.error
            };
        }
        resultImageFile = tempImageFile;
    } else if (needsConvert) {
        var convertResult = convertImage(imageFile, tempImageFile);
        if (!convertResult.success) {
            return {
                success: false,
                error: "Failed to convert image to PNG: " + convertResult.error
            };
        }
        resultImageFile = tempImageFile;
    }
    // else, no need to convert or resize

    // Step 2: Convert image to base64
    console.log("🔄 Step 2: Encoding image to base64...");
    var base64Result = imageToBase64(resultImageFile);

    if (!base64Result.success) {
        // Clean up temp file
        if (fs.exists(resultImageFile)) {
            var rmResult = fs.rm(resultImageFile);
            if (rmResult.error && verbose) {
                console.warn("⚠️ Warning: Failed to remove temporary file:", rmResult.error);
            }
        }

        return {
            success: false,
            error: "Failed to convert image to base64: " + base64Result.error
        };
    }

    var base64String = base64Result.base64;
    if (verbose) {
        var operation = needsResize.needsResize ? "resized" : "converted";
        console.log(`✅ ${operation} PNG image converted to base64 (${base64String.length} characters)`);
    } else {
        var operation = needsResize.needsResize ? "resized" : "converted";
        console.log(`✅ ${operation} PNG image converted to base64`);
    }

    // Step 3: Call LLM for classification
    console.log("🔄 Step 3: Classifying image with LLM...");

    var llmArgs = [
        "call", llmCallingTemplate,
        "--var", "image:text:-"
    ];

    var llmResult = cliCommand("llm-caller", llmArgs, {
        timeout: 300,
        stdin: base64String
    });

    // Clean up temp file
    if (fs.exists(tempImageFile)) {
        var rmResult = fs.rm(tempImageFile);
        if (rmResult.error && verbose) {
            console.warn("⚠️ Warning: Failed to remove temporary file:", rmResult.error);
        } else if (verbose) {
            console.log("🧹 Removed temporary file");
        }
    }

    if (llmResult.error) {
        // Streamlined error reporting
        console.error("❌ LLM classification failed: llm-caller " + llmArgs.join(" "));

        if (llmResult.stderr && llmResult.stderr.trim()) {
            console.error(llmResult.stderr.trim());
        }

        return {
            success: false,
            error: "LLM classification failed: " + llmResult.error
        };
    }

    if (!llmResult.stdout || llmResult.stdout.trim().length === 0) {
        return {
            success: false,
            error: "LLM returned empty result"
        };
    }

    // Step 4: Parse LLM output to get category
    console.log("🔄 Step 4: Parsing classification result...");
    var category = parseClassificationResult(llmResult.stdout);

    if (!category) {
        // Streamlined error reporting
        console.error("❌ Failed to parse LLM output:");
        console.error(llmResult.stdout.trim());

        return {
            success: false,
            error: "Failed to parse classification result"
        };
    }

    console.log("✅ Image classified as: " + category);

    // Step 5: Create category folder and move original image
    console.log("🔄 Step 5: Organizing image into category folder...");

    // Create directory for this category
    var categoryDir = fs.join([outputPath, category]);
    var mkdirResult = fs.mkdir(categoryDir);
    if (!mkdirResult.success) {
        return {
            success: false,
            error: "Failed to create category directory: " + mkdirResult.error
        };
    }

    // Determine destination file path
    var destFile = fs.join([categoryDir, fs.filename(imageFile)]);

    // Check if destination file already exists and generate unique filename if needed
    if (fs.exists(destFile)) {
        // 使用新的 generateUniqueFilename API 自动生成不冲突的文件名
        var originalFilename = fs.filename(imageFile);
        var uniqueResult = fs.generateUniqueFilename(destFile);

        if (!uniqueResult.success) {
            return {
                success: false,
                error: "Failed to generate unique filename: " + uniqueResult.error
            };
        }

        if (verbose) {
            console.log("⚠️ Target file already exists, auto-renamed to: " + fs.filename(uniqueResult.path));
        } else {
            console.log("⚠️ Auto-renamed from '" + originalFilename + "' to '" + fs.filename(uniqueResult.path) + "'");
        }

        // 更新目标文件路径
        destFile = uniqueResult.path;
    }

    // Move file
    var moveResult = fs.move(imageFile, destFile);
    if (moveResult.error) {
        console.error("❌ Failed to move file from " + imageFile + " to " + destFile);
        console.error("Error: " + moveResult.error);

        return {
            success: false,
            error: "Failed to move file: " + moveResult.error
        };
    }

    return {
        success: true,
        category: category,
        destinationFile: fs.filename(destFile)
    };
}

function checkIfResizeNeeded(imageFile, maxSize) {
    // Use ImageMagick to get image dimensions
    var args = ["identify", "-format", "%w %h", imageFile];
    var result = cliCommand("magick", args, { timeout: 30 });

    if (result.error) {
        // Streamlined error reporting
        console.error("❌ Failed to get image dimensions: magick " + args.join(" "));

        if (result.stderr && result.stderr.trim()) {
            console.error(result.stderr.trim());
        }

        return {
            error: result.error,
            needsResize: false
        };
    }

    var dimensions = result.stdout.trim().split(" ");
    if (dimensions.length !== 2) {
        return {
            error: "Invalid dimensions output: " + result.stdout,
            needsResize: false
        };
    }

    var width = parseInt(dimensions[0], 10);
    var height = parseInt(dimensions[1], 10);

    if (isNaN(width) || isNaN(height)) {
        return {
            error: "Failed to parse dimensions: " + result.stdout,
            needsResize: false
        };
    }

    return {
        width: width,
        height: height,
        needsResize: width > maxSize || height > maxSize,
        error: null
    };
}

function resizeImage(sourceFile, destFile, maxSize) {
    // Use ImageMagick to resize the image while maintaining aspect ratio
    var args = [];


    args = [sourceFile, "-resize", maxSize + "x" + maxSize + ">", "-strip", destFile];

    var result = cliCommand("magick", args, { timeout: 60 });

    if (result.error) {
        // Streamlined error reporting
        console.error("❌ Failed to resize image: magick " + args.join(" "));

        if (result.stderr && result.stderr.trim()) {
            console.error(result.stderr.trim());
        }

        return {
            success: false,
            error: result.error
        };
    }

    // Check if the file was created
    if (!fs.exists(destFile)) {
        return {
            success: false,
            error: "Resized file was not created"
        };
    }

    return {
        success: true
    };
}

function convertImage(sourceFile, destFile) {
    // Use ImageMagick to convert the image to PNG format
    var args = [];

    args = [sourceFile, "-strip", destFile];

    var result = cliCommand("magick", args, { timeout: 60 });

    if (result.error) {
        // Streamlined error reporting
        console.error("❌ Failed to convert image: magick " + args.join(" "));

        if (result.stderr && result.stderr.trim()) {
            console.error(result.stderr.trim());
        }

        return {
            success: false,
            error: result.error
        };
    }

    // Check if the file was created
    if (!fs.exists(destFile)) {
        return {
            success: false,
            error: "Converted file was not created"
        };
    }

    return {
        success: true
    };
}

function imageToBase64(imageFile) {
    try {
        // Read image file as binary
        var readResult = fs.read(imageFile, true); // binary mode
        if (readResult.error) {
            return {
                success: false,
                error: "Failed to read image file: " + readResult.error
            };
        }

        // Convert binary data to base64 using encoding module
        var base64 = encoding.base64Encode(readResult.content);
        return {
            success: true,
            base64: base64
        };
    } catch (error) {
        return {
            success: false,
            error: "Exception: " + error.toString()
        };
    }
}

function parseClassificationResult(llmOutput) {
    // Extract type and content values from LLM output
    // Expected format: "类型：type-value\n内容：content-value"

    try {
        var typeMatch = llmOutput.match(/类型：\s*([^\n]+)/);
        var contentMatch = llmOutput.match(/内容：\s*([^\n]+)/);

        if (!typeMatch || !contentMatch) {
            console.error("❌ Unable to parse LLM output:");
            console.error(llmOutput);
            return null;
        }

        var typeValue = typeMatch[1].trim();
        var contentValue = contentMatch[1].trim();

        // Clean values to make them suitable for folder names
        typeValue = sanitizeFolderName(typeValue);
        contentValue = sanitizeFolderName(contentValue);

        // Create category name in format: type_content
        var category = typeValue + "_" + contentValue;

        return category;
    } catch (error) {
        console.error("❌ Error parsing LLM output:", error);
        return null;
    }
}

function sanitizeFolderName(name) {
    // Replace invalid characters with underscores
    return name
        .replace(/[<>:"\/\\|?*\x00-\x1F]/g, "_")  // Invalid chars in most filesystems
        .replace(/\s+/g, "_")                    // Replace spaces with underscores
        .replace(/_{2,}/g, "_")                  // Replace multiple underscores with single
        .replace(/^_+|_+$/g, "")                 // Remove leading/trailing underscores
        .toLowerCase();                          // Convert to lowercase
}

// Execute main function
main(); 