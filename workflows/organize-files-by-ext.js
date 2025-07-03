//!amo

// 按扩展名整理文件到子目录
// 用法：amo run file-organizer.js --var input=/path/to/messy/folder --var output=/path/to/organized/folder

function main() {
    console.log("📂 按扩展名整理文件");
    console.log("===================================================");

    // 获取运行时变量
    var optHelp = getVar("help") === "true"
    var sourceDir = getVar("input") || "";
    var targetDir = getVar("output") || "";
    var dryRun = getVar("dry_run") === "true";
    var includeHidden = getVar("include_hidden") === "true";
    var overwrite = getVar("overwrite") === "true";

    // 显示帮助信息
    if (optHelp) {
        console.log("");
        console.log("支持的变量:");
        console.log("  --var help=true: 显示帮助信息");
        console.log("  --var input=/path/to/messy/folder: 源目录");
        console.log("  --var output=/path/to/organized/folder: 目标目录");
        console.log("  --var dry_run=true: 仅演示（不会实际更改文件）");
        console.log("  --var include_hidden=true: 包含隐藏文件");
        console.log("  --var overwrite=true: 覆盖已存在文件");
        console.log("");
        console.log("示例:");
        console.log("  amo run file-organizer.js --input /Downloads --output /Organized");
        console.log("  amo run file-organizer.js --var input=/Downloads --var output=/Organized --var dry_run=true");

        return true;
    }

    console.log("📁 源目录:", sourceDir || "未指定");
    console.log("📁 目标目录:", targetDir || "未指定");
    console.log("🔄 模式: 移动");
    console.log("👁️ 包含隐藏文件:", includeHidden ? "是" : "否");
    console.log("🔄 覆盖已存在:", overwrite ? "是" : "否");
    console.log("🧪 演示模式:", dryRun ? "是（不会实际更改文件）" : "否");
    console.log("");

    // 校验必需参数
    if (!sourceDir) {
        console.error("❌ 错误：必须指定input参数");
        console.log("用法: --var input=/path/to/source");
        console.log("   或: --input /path/to/source");
        return false;
    }

    if (!targetDir) {
        console.error("❌ 错误：必须指定output参数");
        console.log("用法: --var output=/path/to/target");
        console.log("   或: --output /path/to/target");
        return false;
    }

    // 校验源目录是否存在
    if (!fs.exists(sourceDir)) {
        console.error("❌ 错误：源目录不存在:", sourceDir);
        return false;
    }

    if (!fs.isDir(sourceDir)) {
        console.error("❌ 错误：源路径不是目录:", sourceDir);
        return false;
    }

    // 获取源目录下所有文件（递归）
    console.log("🔍 正在递归查找源目录下的文件...");
    var findResult = fs.find(sourceDir, "*");
    if (!findResult.success) {
        console.error("❌ 扫描源目录失败:", findResult.error);
        return false;
    }

    // 过滤文件并处理隐藏文件
    var files = [];
    var absTargetResult = fs.absolute(targetDir);
    var absTargetDir = absTargetResult.success ? absTargetResult.path : targetDir;

    for (var i = 0; i < findResult.files.length; i++) {
        var filePath = findResult.files[i];

        // 跳过无效文件
        if (typeof filePath !== 'string' || filePath === "") {
            console.warn("⚠️  跳过无效文件:", filePath);
            continue;
        }

        // 跳过目录
        if (!fs.isFile(filePath)) {
            continue;
        }

        // 跳过隐藏文件（如未指定包含）
        var fileName = fs.filename(filePath);
        if (!includeHidden && fileName.startsWith(".")) {
            continue;
        }

        // 跳过已在目标目录下的文件（如目标目录是源目录的子目录）
        var absFileResult = fs.absolute(filePath);
        if (absFileResult.success && absFileResult.path.startsWith(fs.join([absTargetDir, '']))) {
            continue;
        }

        files.push(filePath);
    }

    console.log("📊 共找到", files.length, "个待整理文件");
    console.log("");

    if (files.length === 0) {
        console.log("ℹ️  没有需要整理的文件");
        return true;
    }

    // 按扩展名分组
    var extensionGroups = {};
    var noExtensionFiles = [];

    for (var i = 0; i < files.length; i++) {
        var filePath = files[i];
        var extension = fs.ext(filePath).toLowerCase();
        
        if (extension === "") {
            noExtensionFiles.push(filePath);
        } else {
            // 去掉点
            extension = extension.substring(1);
            
            if (!extensionGroups[extension]) {
                extensionGroups[extension] = [];
            }
            extensionGroups[extension].push(filePath);
        }
    }

    // 显示整理计划
    console.log("📋 整理计划:");
    console.log("---------------------");

    var totalFiles = 0;
    for (var ext in extensionGroups) {
        var count = extensionGroups[ext].length;
        totalFiles += count;
        console.log("📁 " + ext.toUpperCase() + " 文件: " + count + " 个 → " + fs.join([targetDir, ext]));
    }

    if (noExtensionFiles.length > 0) {
        totalFiles += noExtensionFiles.length;
        console.log("📁 无扩展名: " + noExtensionFiles.length + " 个 → " + fs.join([targetDir, "no_extension"]));
    }

    console.log("📊 总计待整理文件:", totalFiles);
    console.log("");

    if (dryRun) {
        console.log("🧪 演示模式 - 不会实际更改文件");
        return true;
    }

    // 创建目标目录（如不存在）
    if (!fs.exists(targetDir)) {
        console.log("📁 正在创建目标目录:", targetDir);
        var createResult = fs.mkdir(targetDir);
        if (!createResult.success) {
            console.error("❌ 创建目标目录失败:", createResult.error);
            return false;
        }
    } else if (!fs.isDir(targetDir)) {
        console.error("❌ 错误：目标路径已存在但不是目录:", targetDir);
        return false;
    }

    // 按扩展名整理文件
    var successCount = 0;
    var errorCount = 0;

    // 处理有扩展名的文件
    for (var ext in extensionGroups) {
        var extFiles = extensionGroups[ext];
        var extDir = fs.join([targetDir, ext]);

        console.log("📁 正在处理 " + ext.toUpperCase() + " 文件（" + extFiles.length + " 个）...");

        // 创建扩展名目录
        if (!fs.exists(extDir)) {
            var createDirResult = fs.mkdir(extDir);
            if (!createDirResult.success) {
                console.error("❌ 创建目录失败 " + extDir + ":", createDirResult.error);
                errorCount += extFiles.length;
                continue;
            }
        }

        var groupSuccess = 0;
        var groupError = 0;
        // 移动文件
        for (var i = 0; i < extFiles.length; i++) {
            var sourcePath = extFiles[i];
            var fileName = fs.filename(sourcePath);
            var targetPath = fs.join([extDir, fileName]);

            // 处理重名
            if (!overwrite && fs.exists(targetPath)) {
                var uniqueResult = fs.generateUniqueFilename(targetPath);
                if (!uniqueResult.success) {
                    console.error("❌ 生成唯一文件名失败 " + targetPath + ":", uniqueResult.error);
                    errorCount++;
                    groupError++;
                    continue;
                }
                targetPath = uniqueResult.path;
                console.log("⚠️  文件名冲突，自动重命名为:", fs.filename(targetPath));
            }

            // 执行移动
            var result = fs.move(sourcePath, targetPath);

            if (!result.success) {
                console.error("❌ 移动失败 " + fileName + ":", result.error);
                errorCount++;
                groupError++;
            } else {
                successCount++;
                groupSuccess++;
            }
        }
        // 本扩展名小结
        console.log("📋 " + ext.toUpperCase() + ": 已移动 " + groupSuccess + " / " + extFiles.length + " 个" + (groupError ? (", " + groupError + " 个错误") : ""));
    }

    // 处理无扩展名文件
    if (noExtensionFiles.length > 0) {
        var noExtDir = fs.join([targetDir, "no_extension"]);
        
        console.log("📁 正在处理无扩展名文件（" + noExtensionFiles.length + " 个）...");

        // 创建 no_extension 目录
        var directoryCreated = true;
        if (!fs.exists(noExtDir)) {
            var createDirResult = fs.mkdir(noExtDir);
            if (!createDirResult.success) {
                console.error("❌ 创建目录失败 " + noExtDir + ":", createDirResult.error);
                errorCount += noExtensionFiles.length;
                directoryCreated = false;
            }
        }

        if (directoryCreated) {
            var groupSuccess = 0;
            var groupError = 0;
            // 移动文件
            for (var i = 0; i < noExtensionFiles.length; i++) {
                var sourcePath = noExtensionFiles[i];
                var fileName = fs.filename(sourcePath);
                var targetPath = fs.join([noExtDir, fileName]);

                // 处理重名
                if (!overwrite && fs.exists(targetPath)) {
                    var uniqueResult = fs.generateUniqueFilename(targetPath);
                    if (!uniqueResult.success) {
                        console.error("❌ 生成唯一文件名失败 " + targetPath + ":", uniqueResult.error);
                        errorCount++;
                        groupError++;
                        continue;
                    }
                    targetPath = uniqueResult.path;
                    console.log("⚠️  文件名冲突，自动重命名为:", fs.filename(targetPath));
                }

                // 执行移动
                var result = fs.move(sourcePath, targetPath);

                if (!result.success) {
                    console.error("❌ 移动失败 " + fileName + ":", result.error);
                    errorCount++;
                    groupError++;
                } else {
                    successCount++;
                    groupSuccess++;
                }
            }
            // 无扩展名文件小结
            console.log("📋 无扩展名: 已移动 " + groupSuccess + " / " + noExtensionFiles.length + " 个" + (groupError ? (", " + groupError + " 个错误") : ""));
        }
    }

    // 总结
    console.log("");
    console.log("📊 整理总结:");
    console.log("========================");
    console.log("✅ 成功处理:", successCount, "个文件");
    console.log("❌ 错误:", errorCount, "个文件");
    console.log("📁 目标目录:", targetDir);

    if (successCount > 0) {
        console.log("");
        console.log("🎉 文件整理完成！");
    }

    return errorCount === 0;
}

// 执行主函数
main(); 