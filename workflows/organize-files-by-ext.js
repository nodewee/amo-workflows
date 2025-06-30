//!amo

// Organize files by extension into subdirectories
// Usage: amo run file-organizer.js --var input=/path/to/messy/folder --var output=/path/to/organized/folder

function main() {
    console.log("📂 Organize files by extension");
    console.log("===================================================");

    // Get configuration from runtime variables
    var optHelp = getVar("help") === "true"
    var sourceDir = getVar("input") || "";
    var targetDir = getVar("output") || "";
    var dryRun = getVar("dry_run") === "true";
    var includeHidden = getVar("include_hidden") === "true";
    var overwrite = getVar("overwrite") === "true";

    // Show help message
    if (optHelp) {
        console.log("");
        console.log("Supported variables:");
        console.log("  --var help=true: Show help message");
        console.log("  --var input=/path/to/messy/folder: Source directory");
        console.log("  --var output=/path/to/organized/folder: Target directory");
        console.log("  --var dry_run=true: Dry run mode (no changes will be made)");
        console.log("  --var include_hidden=true: Include hidden files");
        console.log("  --var overwrite=true: Overwrite existing files");
        console.log("");
        console.log("Examples:");
        console.log("  amo run file-organizer.js --input /Downloads --output /Organized");
        console.log("  amo run file-organizer.js --var input=/Downloads --var output=/Organized --var dry_run=true");

        return true;
    }

    console.log("📁 Source directory:", sourceDir || "Not specified");
    console.log("📁 Target directory:", targetDir || "Not specified");
    console.log("🔄 Mode: Move");
    console.log("👁️ Include hidden files:", includeHidden ? "Yes" : "No");
    console.log("🔄 Overwrite existing:", overwrite ? "Yes" : "No");
    console.log("🧪 Dry run:", dryRun ? "Yes (no changes will be made)" : "No");
    console.log("");

    // Validate required parameters
    if (!sourceDir) {
        console.error("❌ Error: input is required");
        console.log("Usage: --var input=/path/to/source");
        console.log("   or: --input /path/to/source");
        return false;
    }

    if (!targetDir) {
        console.error("❌ Error: output is required");
        console.log("Usage: --var output=/path/to/target");
        console.log("   or: --output /path/to/target");
        return false;
    }

    // Validate source directory exists
    if (!fs.exists(sourceDir)) {
        console.error("❌ Error: Source directory does not exist:", sourceDir);
        return false;
    }

    if (!fs.isDir(sourceDir)) {
        console.error("❌ Error: Source path is not a directory:", sourceDir);
        return false;
    }

    // Get list of files in source directory (recursively)
    console.log("🔍 Finding files in source directory (recursively)...");
    var findResult = fs.find(sourceDir, "*");
    if (!findResult.success) {
        console.error("❌ Failed to scan source directory:", findResult.error);
        return false;
    }

    // Filter files and handle hidden files
    var files = [];
    var absTargetResult = fs.absolute(targetDir);
    var absTargetDir = absTargetResult.success ? absTargetResult.path : targetDir;

    for (var i = 0; i < findResult.files.length; i++) {
        var filePath = findResult.files[i];

        // Safety check for valid file path
        if (typeof filePath !== 'string' || filePath === "") {
            console.warn("⚠️  Skipping invalid file entry:", filePath);
            continue;
        }

        // Skip directories
        if (!fs.isFile(filePath)) {
            continue;
        }

        // Skip hidden files if not included
        var fileName = fs.filename(filePath);
        if (!includeHidden && fileName.startsWith(".")) {
            continue;
        }

        // Skip files that are already in the target directory.
        // This is an important edge case when targetDir is a subdirectory of sourceDir.
        var absFileResult = fs.absolute(filePath);
        if (absFileResult.success && absFileResult.path.startsWith(fs.join([absTargetDir, '']))) {
            continue;
        }

        files.push(filePath);
    }

    console.log("📊 Found", files.length, "files to organize");
    console.log("");

    if (files.length === 0) {
        console.log("ℹ️  No files to organize");
        return true;
    }

    // Group files by extension
    var extensionGroups = {};
    var noExtensionFiles = [];

    for (var i = 0; i < files.length; i++) {
        var filePath = files[i];
        var extension = fs.ext(filePath).toLowerCase();
        
        if (extension === "") {
            noExtensionFiles.push(filePath);
        } else {
            // Remove the dot from extension
            extension = extension.substring(1);
            
            if (!extensionGroups[extension]) {
                extensionGroups[extension] = [];
            }
            extensionGroups[extension].push(filePath);
        }
    }

    // Display organization plan
    console.log("📋 Organization Plan:");
    console.log("---------------------");

    var totalFiles = 0;
    for (var ext in extensionGroups) {
        var count = extensionGroups[ext].length;
        totalFiles += count;
        console.log("📁 " + ext.toUpperCase() + " files: " + count + " files → " + fs.join([targetDir, ext]));
    }

    if (noExtensionFiles.length > 0) {
        totalFiles += noExtensionFiles.length;
        console.log("📁 No extension: " + noExtensionFiles.length + " files → " + fs.join([targetDir, "no_extension"]));
    }

    console.log("📊 Total files to organize:", totalFiles);
    console.log("");

    if (dryRun) {
        console.log("🧪 Dry run mode - no changes will be made");
        return true;
    }

    // Create target directory if it doesn't exist (only after confirming files to move)
    if (!fs.exists(targetDir)) {
        console.log("📁 Creating target directory:", targetDir);
        var createResult = fs.mkdir(targetDir);
        if (!createResult.success) {
            console.error("❌ Failed to create target directory:", createResult.error);
            return false;
        }
    } else if (!fs.isDir(targetDir)) {
        console.error("❌ Error: Target path exists and is not a directory:", targetDir);
        return false;
    }

    // Organize files by extension
    var successCount = 0;
    var errorCount = 0;

    // Process files with extensions
    for (var ext in extensionGroups) {
        var extFiles = extensionGroups[ext];
        var extDir = fs.join([targetDir, ext]);

        console.log("📁 Processing " + ext.toUpperCase() + " files (" + extFiles.length + " files)...");

        // Create extension directory if it doesn't exist
        if (!fs.exists(extDir)) {
            var createDirResult = fs.mkdir(extDir);
            if (!createDirResult.success) {
                console.error("❌ Failed to create directory " + extDir + ":", createDirResult.error);
                errorCount += extFiles.length;
                continue;
            }
        }

        var groupSuccess = 0;
        var groupError = 0;
        // Move files
        for (var i = 0; i < extFiles.length; i++) {
            var sourcePath = extFiles[i];
            var fileName = fs.filename(sourcePath);
            var targetPath = fs.join([extDir, fileName]);

            // Handle file name conflicts
            if (!overwrite && fs.exists(targetPath)) {
                var uniqueResult = fs.generateUniqueFilename(targetPath);
                if (!uniqueResult.success) {
                    console.error("❌ Failed to generate unique filename for " + targetPath + ":", uniqueResult.error);
                    errorCount++;
                    groupError++;
                    continue;
                }
                targetPath = uniqueResult.path;
                console.log("⚠️  File name conflict, renaming to:", fs.filename(targetPath));
            }

            // Perform the operation
            var result = fs.move(sourcePath, targetPath);

            if (!result.success) {
                console.error("❌ Failed to move " + fileName + ":", result.error);
                errorCount++;
                groupError++;
            } else {
                successCount++;
                groupSuccess++;
            }
        }
        // Summary for this extension
        console.log("📋 " + ext.toUpperCase() + ": moved " + groupSuccess + " of " + extFiles.length + " files" + (groupError ? (", " + groupError + " errors") : ""));
    }

    // Process files without extensions
    if (noExtensionFiles.length > 0) {
        var noExtDir = fs.join([targetDir, "no_extension"]);
        
        console.log("📁 Processing files without extensions (" + noExtensionFiles.length + " files)...");

        // Create no_extension directory if it doesn't exist
        var directoryCreated = true;
        if (!fs.exists(noExtDir)) {
            var createDirResult = fs.mkdir(noExtDir);
            if (!createDirResult.success) {
                console.error("❌ Failed to create directory " + noExtDir + ":", createDirResult.error);
                errorCount += noExtensionFiles.length;
                directoryCreated = false;
            }
        }

        if (directoryCreated) {
            var groupSuccess = 0;
            var groupError = 0;
            // Move files
            for (var i = 0; i < noExtensionFiles.length; i++) {
                var sourcePath = noExtensionFiles[i];
                var fileName = fs.filename(sourcePath);
                var targetPath = fs.join([noExtDir, fileName]);

                // Handle file name conflicts
                if (!overwrite && fs.exists(targetPath)) {
                    var uniqueResult = fs.generateUniqueFilename(targetPath);
                    if (!uniqueResult.success) {
                        console.error("❌ Failed to generate unique filename for " + targetPath + ":", uniqueResult.error);
                        errorCount++;
                        groupError++;
                        continue;
                    }
                    targetPath = uniqueResult.path;
                    console.log("⚠️  File name conflict, renaming to:", fs.filename(targetPath));
                }

                // Perform the operation
                var result = fs.move(sourcePath, targetPath);

                if (!result.success) {
                    console.error("❌ Failed to move " + fileName + ":", result.error);
                    errorCount++;
                    groupError++;
                } else {
                    successCount++;
                    groupSuccess++;
                }
            }
            // Summary for no-extension files
            console.log("📋 No extension: moved " + groupSuccess + " of " + noExtensionFiles.length + " files" + (groupError ? (", " + groupError + " errors") : ""));
        }
    }

    // Summary
    console.log("");
    console.log("📊 Organization Summary:");
    console.log("========================");
    console.log("✅ Successfully processed:", successCount, "files");
    console.log("❌ Errors:", errorCount, "files");
    console.log("📁 Target directory:", targetDir);

    if (successCount > 0) {
        console.log("");
        console.log("🎉 File organization completed!");
    }

    return errorCount === 0;
}

// Execute main function
main(); 