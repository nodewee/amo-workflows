//!amo

// Video to Audio Converter using FFmpeg
// Supports: single file, multiple files, or directory batch processing
// Audio formats: mp3, wav, ogg, aac, flac with optimized parameters

function main() {
    console.log("🎬➡️🎵 Video to Audio Converter");
    console.log("=====================================");

    // Get runtime variables
    var optHelp = getVar("help") === "true"
    var inputPath = getVar("input") || "";
    var outputFormat = getVar("format") || "mp3";
    var outputPath = getVar("output") || "";  // New: unified output parameter
    var outputDir = getVar("output_dir") || "";  // Legacy: keep for backward compatibility
    var quality = getVar("quality") || "standard";
    var overwrite = getVar("overwrite") === "true";

    // Show help message
    if (optHelp) {
        console.log("Convert video files to audio files using FFmpeg");
        console.log("Supported variables:");
        console.log("  --var help=true: Show help message");
        console.log("  --var input=/path/to/video: Input video file or directory");
        console.log("  --var format=mp3: Output format (mp3, wav, ogg, aac, flac)");
        console.log("  --var output=/path/to/output: Output file or directory");
        console.log("  --var output_dir=/path/to/output: Output directory");
        console.log("  --var quality=standard: Quality level (low, standard, high)");
        console.log("  --var overwrite=true: Overwrite existing files");
        
        return false;
    }

    console.log("Input:", inputPath || "Not specified");
    console.log("Format:", outputFormat);
    console.log("Quality:", quality);
    
    // Handle output parameter priority: output > output_dir
    var finalOutputPath = outputPath || outputDir;
    console.log("Output:", finalOutputPath || "Same as input");
    console.log("Overwrite existing:", overwrite ? "Yes" : "No");
    console.log("");

    // Validate required parameters
    if (!inputPath) {
        console.error("❌ Error: Input path is required");
        console.log("Usage: --var input=/path/to/video --var format=mp3 [--var output=/path/to/output]");
        return false;
    }

    // Check if input path exists
    if (!fs.exists(inputPath)) {
        console.error("❌ Error: Input path does not exist:", inputPath);
        return false;
    }

    // Determine if this is batch processing
    var isBatchProcessing = fs.isDir(inputPath);
    console.log("📊 Processing mode:", isBatchProcessing ? "Batch (directory)" : "Single file");

    // Validate output path based on processing mode
    if (finalOutputPath) {
        var outputValidation = validateOutputPath(finalOutputPath, isBatchProcessing);
        if (!outputValidation.valid) {
            console.error("❌ Error:", outputValidation.error);
            return false;
        }
        finalOutputPath = outputValidation.path;
        console.log("✅ Output path validated:", finalOutputPath);
    }
    console.log("");

    // Check if ffmpeg is available
    console.log("🔍 Checking FFmpeg availability...");
    var ffmpegCheck = cliCommand("ffmpeg", [], { timeout: 5 });
    var ffmpegOutput = ffmpegCheck.stderr || ffmpegCheck.stdout || ffmpegCheck.error || "";

    if (ffmpegOutput.indexOf("ffmpeg version") === -1) {
        console.error("❌ FFmpeg not found or not working properly");
        console.error("Error: " + ffmpegOutput);
        return false;
    }
    console.log("✅ FFmpeg is available");

    // Supported video extensions
    var videoExtensions = [
        ".mp4", ".avi", ".mov", ".mkv", ".wmv", ".flv", ".webm", ".m4v", 
        ".mpg", ".mpeg", ".3gp", ".asf", ".rm", ".rmvb", ".vob", ".ts", ".mts"
    ];

    // Audio format configurations
    var audioConfigs = {
        "mp3": {
            codec: "libmp3lame",
            params: getQualityParams("mp3", quality),
            ext: ".mp3"
        },
        "wav": {
            codec: "pcm_s16le",
            params: [],
            ext: ".wav"
        },
        "ogg": {
            codec: "libvorbis",
            params: getQualityParams("ogg", quality),
            ext: ".ogg"
        },
        "aac": {
            codec: "aac",
            params: getQualityParams("aac", quality),
            ext: ".aac"
        },
        "flac": {
            codec: "flac",
            params: [],
            ext: ".flac"
        }
    };

    // Validate output format
    if (!audioConfigs[outputFormat]) {
        console.error("❌ Unsupported audio format:", outputFormat);
        console.log("Supported formats:", Object.keys(audioConfigs).join(", "));
        return false;
    }

    console.log("🎵 Target format:", outputFormat.toUpperCase());
    console.log("");

    // Get list of video files to process
    var videoFiles = getVideoFiles(inputPath, videoExtensions);

    if (videoFiles.length === 0) {
        console.error("❌ No video files found in:", inputPath);
        return false;
    }

    console.log("📁 Found", videoFiles.length, "video file(s) to process:");
    for (var i = 0; i < videoFiles.length; i++) {
        console.log("  " + (i + 1) + ". " + fs.filename(videoFiles[i]));
    }
    console.log("");

    // Process each video file
    var successCount = 0;
    var failureCount = 0;

    for (var i = 0; i < videoFiles.length; i++) {
        var videoFile = videoFiles[i];
        var fileName = fs.basename(videoFile);
        var baseName = getBaseNameWithoutExt(fileName);
        
        console.log("🎬 Processing [" + (i + 1) + "/" + videoFiles.length + "]: " + fileName);
        
        // Determine output file path
        var outputFile = determineOutputPath(videoFile, baseName, audioConfigs[outputFormat].ext, finalOutputPath, isBatchProcessing);
        
        // Check if output file already exists
        if (!overwrite && fs.exists(outputFile)) {
            console.log("⏭️  Skipping (file exists): " + fs.filename(outputFile));
            console.log("");
            continue;
        }
        
        // Convert video to audio
        if (convertVideoToAudio(videoFile, outputFile, audioConfigs[outputFormat], overwrite)) {
            successCount++;
            console.log("✅ Success: " + fs.filename(outputFile));
        } else {
            failureCount++;
            console.log("❌ Failed: " + fileName);
        }
        console.log("");
    }

    // Summary
    console.log("🎯 Conversion Summary:");
    console.log("===================");
    console.log("✅ Successful:", successCount);
    console.log("❌ Failed:", failureCount);
    console.log("📊 Total processed:", videoFiles.length);

    if (successCount > 0) {
        console.log("");
        console.log("🎉 Audio files have been generated successfully!");
        if (finalOutputPath) {
            console.log("📂 Output location:", finalOutputPath);
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

function getQualityParams(format, quality) {
    var qualityMap = {
        "mp3": {
            "low": ["-ab", "128k"],
            "standard": ["-ab", "192k"],
            "high": ["-ab", "320k"]
        },
        "ogg": {
            "low": ["-aq", "2"],
            "standard": ["-aq", "4"],
            "high": ["-aq", "6"]
        },
        "aac": {
            "low": ["-ab", "128k"],
            "standard": ["-ab", "192k"],
            "high": ["-ab", "256k"]
        }
    };
    
    if (qualityMap[format] && qualityMap[format][quality]) {
        return qualityMap[format][quality];
    }
    
    // Default fallback
    return qualityMap[format] ? qualityMap[format]["standard"] : [];
}

function getVideoFiles(inputPath, videoExtensions) {
    var files = [];
    
    // Check if path exists
    if (!fs.exists(inputPath)) {
        console.error("❌ Cannot access:", inputPath);
        return [];
    }
    
    // Check if it's a directory or file
    if (fs.isDir(inputPath)) {
        // It's a directory, find all video files
        var findResult = fs.find(inputPath, "*");
        if (!findResult.error) {
            for (var i = 0; i < findResult.files.length; i++) {
                var file = findResult.files[i];
                if (fs.isFile(file) && isVideoFile(file, videoExtensions)) {
                    files.push(file);
                }
            }
        }
    } else if (fs.isFile(inputPath)) {
        // It's a file, check if it's a video file
        if (isVideoFile(inputPath, videoExtensions)) {
            files.push(inputPath);
        }
    }
    
    return files.sort();
}

function isVideoFile(filepath, videoExtensions) {
    var extension = fs.ext(filepath).toLowerCase();
    for (var i = 0; i < videoExtensions.length; i++) {
        if (extension === videoExtensions[i]) {
            return true;
        }
    }
    return false;
}

function getBaseNameWithoutExt(fileName) {
    return fs.basename(fileName);
}

function determineOutputPath(inputFile, baseName, audioExt, outputPath, isBatchProcessing) {
    if (outputPath) {
        if (isBatchProcessing || fs.isDir(outputPath)) {
            // For batch processing or when output is a directory, put file in the directory
            return fs.join([outputPath, baseName + audioExt]);
        } else {
            // For single file processing with specific file path
            // Check if the output path has an extension
            var outputExt = fs.ext(outputPath);
            if (outputExt) {
                // Use the specified path as-is
                return outputPath;
            } else {
                // No extension specified, add the audio extension
                return outputPath + audioExt;
            }
        }
    } else {
        // No output path specified, use same directory as input file
        var inputDir = fs.dirname(inputFile);
        return fs.join([inputDir, baseName + audioExt]);
    }
}

function convertVideoToAudio(inputFile, outputFile, config, overwrite) {
    // Build ffmpeg command
    var args = [
        "-i", inputFile,
        "-vn",  // No video
        "-acodec", config.codec
    ];
    
    // Add quality parameters
    for (var i = 0; i < config.params.length; i++) {
        args.push(config.params[i]);
    }
    
    // Add overwrite flag if needed
    if (overwrite) {
        args.push("-y");
    }
    
    // Add output file
    args.push(outputFile);
    
    console.log("🔄 Converting...");
    
    // Execute ffmpeg command
    var result = cliCommand("ffmpeg", args, { timeout: 300 });
    
    if (result.error) {
        console.error("❌ Conversion failed:");
        console.error("Command: ffmpeg " + args.join(" "));
        console.error("Error:", result.error);
        if (result.stderr) {
            var errorLines = result.stderr.split("\n");
            for (var i = 0; i < errorLines.length && i < 5; i++) {
                if (errorLines[i].trim()) {
                    console.error("  " + errorLines[i].trim());
                }
            }
        }
        return false;
    }
    
    // Verify output file was created
    if (!fs.exists(outputFile)) {
        console.error("❌ Output file was not created");
        return false;
    }
    
    return true;
}

// Execute main function
main(); 