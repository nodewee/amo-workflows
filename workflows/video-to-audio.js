//!amo

// 视频转音频工具（基于FFmpeg）
// 支持：单文件、多文件或目录批量处理
// 支持音频格式：mp3, wav, ogg, aac, flac，参数已优化

function main() {
    console.log("🎬➡️🎵 视频转音频工具");
    console.log("=====================================");

    // 获取运行时变量
    var optHelp = getVar("help") === "true"
    var inputPath = getVar("input") || "";
    var outputFormat = getVar("format") || "mp3";
    var outputPath = getVar("output") || "";  // 新：统一输出参数
    var outputDir = getVar("output_dir") || "";  // 兼容旧参数
    var quality = getVar("quality") || "standard";
    var overwrite = getVar("overwrite") === "true";

    // 显示帮助信息
    if (optHelp) {
        console.log("将视频文件转换为音频文件（使用FFmpeg）");
        console.log("支持的变量:");
        console.log("  --var help=true: 显示帮助信息");
        console.log("  --var input=/path/to/video: 输入视频文件或目录");
        console.log("  --var format=mp3: 输出格式（mp3, wav, ogg, aac, flac）");
        console.log("  --var output=/path/to/output: 输出文件或目录");
        console.log("  --var output_dir=/path/to/output: 输出目录");
        console.log("  --var quality=standard: 音质（low, standard, high）");
        console.log("  --var overwrite=true: 覆盖已存在文件");
        
        return false;
    }

    console.log("输入:", inputPath || "未指定");
    console.log("格式:", outputFormat);
    console.log("音质:", quality);
    
    // 输出参数优先级：output > output_dir
    var finalOutputPath = outputPath || outputDir;
    console.log("输出:", finalOutputPath || "与输入相同");
    console.log("覆盖已存在:", overwrite ? "是" : "否");
    console.log("");

    // 校验必需参数
    if (!inputPath) {
        console.error("❌ 错误：必须指定输入路径");
        console.log("用法: --var input=/path/to/video --var format=mp3 [--var output=/path/to/output]");
        return false;
    }

    // 检查输入路径是否存在
    if (!fs.exists(inputPath)) {
        console.error("❌ 错误：输入路径不存在:", inputPath);
        return false;
    }

    // 判断是否为批量处理
    var isBatchProcessing = fs.isDir(inputPath);
    console.log("📊 处理模式:", isBatchProcessing ? "批量（目录）" : "单文件");

    // 校验输出路径
    if (finalOutputPath) {
        var outputValidation = validateOutputPath(finalOutputPath, isBatchProcessing);
        if (!outputValidation.valid) {
            console.error("❌ 错误:", outputValidation.error);
            return false;
        }
        finalOutputPath = outputValidation.path;
        console.log("✅ 输出路径校验通过:", finalOutputPath);
    }
    console.log("");

    // 检查FFmpeg可用性
    console.log("🔍 检查FFmpeg可用性...");
    var ffmpegCheck = cliCommand("ffmpeg", [], { timeout: 3600 });
    var ffmpegOutput = ffmpegCheck.stderr || ffmpegCheck.stdout || ffmpegCheck.error || "";

    if (ffmpegOutput.indexOf("ffmpeg version") === -1) {
        console.error("❌ 未找到FFmpeg或不可用");
        console.error("错误: " + ffmpegOutput);
        return false;
    }
    console.log("✅ FFmpeg 可用");

    // 支持的视频扩展名
    var videoExtensions = [
        ".mp4", ".avi", ".mov", ".mkv", ".wmv", ".flv", ".webm", ".m4v", 
        ".mpg", ".mpeg", ".3gp", ".asf", ".rm", ".rmvb", ".vob", ".ts", ".mts"
    ];

    // 音频格式配置
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

    // 校验输出格式
    if (!audioConfigs[outputFormat]) {
        console.error("❌ 不支持的音频格式:", outputFormat);
        console.log("支持的格式:", Object.keys(audioConfigs).join(", "));
        return false;
    }

    console.log("🎵 目标格式:", outputFormat.toUpperCase());
    console.log("");

    // 获取待处理视频文件列表
    var videoFiles = getVideoFiles(inputPath, videoExtensions);

    if (videoFiles.length === 0) {
        console.error("❌ 未找到视频文件:", inputPath);
        return false;
    }

    console.log("📁 共找到", videoFiles.length, "个视频文件:");
    for (var i = 0; i < videoFiles.length; i++) {
        console.log("  " + (i + 1) + ". " + fs.filename(videoFiles[i]));
    }
    console.log("");

    // 处理每个视频文件
    var successCount = 0;
    var failureCount = 0;

    for (var i = 0; i < videoFiles.length; i++) {
        var videoFile = videoFiles[i];
        var fileName = fs.basename(videoFile);
        var baseName = getBaseNameWithoutExt(fileName);
        
        console.log("🎬 正在处理 [" + (i + 1) + "/" + videoFiles.length + "]: " + fileName);
        
        // 计算输出文件路径
        var outputFile = determineOutputPath(videoFile, baseName, audioConfigs[outputFormat].ext, finalOutputPath, isBatchProcessing);
        
        // 检查输出文件是否已存在
        if (!overwrite && fs.exists(outputFile)) {
            console.log("⏭️  跳过（文件已存在）: " + fs.filename(outputFile));
            console.log("");
            continue;
        }
        
        // 转换视频为音频
        if (convertVideoToAudio(videoFile, outputFile, audioConfigs[outputFormat], overwrite)) {
            successCount++;
            console.log("✅ 成功: " + fs.filename(outputFile));
        } else {
            failureCount++;
            console.log("❌ 失败: " + fileName);
        }
        console.log("");
    }

    // 总结
    console.log("🎯 转换总结:");
    console.log("===================");
    console.log("✅ 成功:", successCount);
    console.log("❌ 失败:", failureCount);
    console.log("📊 总计处理:", videoFiles.length);

    if (successCount > 0) {
        console.log("");
        console.log("🎉 音频文件已成功生成！");
        if (finalOutputPath) {
            console.log("📂 输出位置:", finalOutputPath);
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
    var result = cliCommand("ffmpeg", args, { timeout: 3600 });
    
    if (result.error) {
        console.error("❌ Conversion failed:");
        console.error("Command: ffmpeg " + args.join(" "));
        console.error("Error:", result.error);
        
        // Show stderr if available
        if (result.stderr && result.stderr.trim()) {
            console.error("Standard Error Output:");
            var errorLines = result.stderr.split("\n");
            for (var i = 0; i < errorLines.length && i < 10; i++) {
                if (errorLines[i].trim()) {
                    console.error("  " + errorLines[i].trim());
                }
            }
        }
        
        // Show stdout if available (some tools output errors to stdout)
        if (result.stdout && result.stdout.trim()) {
            console.error("Standard Output:");
            var outputLines = result.stdout.split("\n");
            for (var i = 0; i < outputLines.length && i < 10; i++) {
                if (outputLines[i].trim()) {
                    console.error("  " + outputLines[i].trim());
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