# Amo 工作流开发环境设置指南

本指南将帮助您设置 IDE 自动补全功能，让 amo 工作流开发更加高效。

## 目录

1. [工作流开发概述](#工作流开发概述)
2. [开发环境要求和限制](#开发环境要求和限制)
3. [TypeScript 定义文件设置](#typescript-定义文件设置)
4. [VS Code 设置](#vs-code-设置-可选)
5. [WebStorm/IntelliJ IDEA 设置](#webstormintellijidea-设置-可选)
6. [API 语法介绍](#api-语法介绍)
7. [示例和最佳实践](#示例和最佳实践)
8. [故障排除](#故障排除)

## 工作流开发概述

Amo 工作流是一个强大的自动化解决方案，让您可以创建自定义的自动化脚本来处理各种任务。

### 核心特性

- **JavaScript 语言支持**：工作流完全基于 JavaScript 语言开发
- **丰富的内置 API**：提供文件系统、网络请求、命令行等核心功能
- **类型安全**：通过 TypeScript 定义文件提供完整的 IDE 支持
- **安全模型**：基于白名单的命令和网络访问安全控制
- **跨平台**：在 Windows、macOS 和 Linux 上保持一致的工作方式

## 开发环境要求和限制

### ⚠️ 重要限制

在开发 Amo 工作流时，请务必注意以下限制：

1. **编程语言限制**
   - 只能使用 JavaScript 语言开发工作流
   - 不支持 TypeScript 或其他编程语言

2. **API 使用限制**
   - 只能使用标准的 Web API（如 `JSON`、`Math`、`Date` 等）
   - 只能使用 Amo 工作流引擎提供的专用 API（参考 `amo-workflow.d.ts`）
   - **禁止使用任何第三方库或包**（如 npm 包、Node.js 模块等）

3. **文件和网络操作限制**
   - 所有文件操作必须通过 `fs` API 进行
   - 所有网络请求必须通过 `http` API 进行
   - 不能直接使用浏览器的 `fetch` 或 Node.js 的文件系统模块

4. **安全限制**
   - CLI 命令受白名单限制（配置在 `~/.amo/allowed_cli.txt`）
   - 网络请求限制在允许的域名范围内
   - 文件操作会进行安全验证（禁止路径遍历）

### 可用的 API 类型

Amo 工作流引擎提供以下核心 API：

- **`fs`**：文件系统操作（读写文件、目录操作、路径处理等）
- **`http`**：网络请求（GET、POST、文件下载等）
- **`encoding`**：编码/解码操作（base64 等）
- **`console`**：控制台输出（日志记录）
- **`cliCommand`**：命令行执行（带安全白名单）
- **`getVar`**：获取环境变量和运行时参数

## TypeScript 定义文件设置

### 1. 复制定义文件

将 `amo-workflow.d.ts` 文件复制到您的工作流项目目录中：

```bash
# 在您的工作流项目根目录执行
cp /path/to/amo/amo-workflow.d.ts ./amo-workflow.d.ts
```

### 2. 创建 jsconfig.json（推荐）

在您的工作流项目根目录创建 `jsconfig.json` 文件：

```json
{
  "compilerOptions": {
    "target": "es5",
    "allowJs": true,
    "checkJs": false,
    "declaration": false,
    "noEmit": true,
    "strict": false,
    "typeRoots": ["./"],
    "types": ["amo-workflow"]
  },
  "include": [
    "*.js",
    "**/*.js",
    "amo-workflow.d.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

## VS Code 设置（可选）

### 1. 安装推荐扩展

- JavaScript (ES6) code snippets
- TypeScript Importer
- Path Intellisense

### 2. 工作区设置

在项目根目录创建 `.vscode/settings.json`：

```json
{
  "typescript.preferences.includePackageJsonAutoImports": "off",
  "typescript.suggest.autoImports": false,
  "javascript.suggest.autoImports": false,
  "typescript.validate.enable": true,
  "javascript.validate.enable": true,
  "files.associations": {
    "*.js": "javascript"
  }
}
```

### 3. 验证自动补全

创建一个测试文件 `test.js`：

```javascript
//!amo

// 输入 "fs." 应该显示自动补全提示
fs.| // <- 光标在这里时应显示所有 fs 方法

// 输入 "http." 应该显示网络相关方法
http.| // <- 显示 get、post、getJSON、downloadFile 等方法

// 输入 "encoding." 应该显示编码相关方法
encoding.| // <- 显示 base64Encode、base64Decode 等方法

// 测试路径操作
var testPath = "/home/user/file.txt";
fs.dirname(testPath); // 应该显示自动补全
fs.basename(testPath);
fs.ext(testPath);
```

## WebStorm/IntelliJ IDEA 设置（可选）

### 1. 项目设置

1. 打开 文件 → 设置
2. 进入 语言和框架 → JavaScript
3. 设置 JavaScript 语言版本为 ECMAScript 5.1
4. 确保启用了 TypeScript 语言服务

### 2. 类型定义

1. 右键点击 `amo-workflow.d.ts` 文件
2. 选择 "标记为 TypeScript 定义文件"

### 3. 代码补全测试

和 VS Code 一样，创建测试文件验证自动补全功能。

## API 语法介绍

### 文件系统操作示例

```javascript
//!amo

// 检查文件是否存在
if (fs.exists("./config.json")) {
    // 读取文件内容
    var result = fs.read("./config.json");
    if (result.success) {
        console.log("文件内容:", result.content);
    } else {
        console.error("读取文件失败:", result.error);
    }
}

// 写入文件
var writeResult = fs.write("./output.txt", "Hello, Amo!");
if (writeResult.success) {
    console.log("文件写入成功");
} else {
    console.error("写入失败:", writeResult.error);
}

// 目录操作
var files = fs.readdir("./");
if (files.success) {
    console.log("找到", files.files.length, "个文件:");
    files.files.forEach(function(file) {
        var icon = file.is_dir ? "📁" : "📄";
        console.log(icon + " " + file.name + " (" + file.size + " 字节)");
    });
} else {
    console.error("列出目录失败:", files.error);
}

// 路径操作
var testPath = "/home/user/documents/report.pdf";
console.log("目录:", fs.dirname(testPath));
console.log("基础名:", fs.basename(testPath));
console.log("扩展名:", fs.ext(testPath));

var pathParts = fs.split(testPath);
console.log("分割 - 目录:", pathParts.dir, "文件:", pathParts.file);

// 跨平台路径拼接
var filePath = fs.join(["folder", "subfolder", "file.txt"]);
console.log("拼接路径:", filePath);
```

### 网络请求示例

```javascript
//!amo

// GET 请求
var response = http.get("https://api.example.com/data");
if (response.status_code === 200) {
    console.log("响应内容:", response.body);
} else if (response.error) {
    console.error("请求失败:", response.error);
} else {
    console.error("HTTP 错误:", response.status_code);
}

// POST 请求（带 JSON 数据）
var postData = JSON.stringify({ name: "test", value: 123 });
var postResponse = http.post(
    "https://api.example.com/submit", 
    postData,
    { "Content-Type": "application/json" }
);

if (postResponse.status_code === 200) {
    console.log("POST 成功:", postResponse.body);
}

// JSON 响应处理
var jsonResponse = http.getJSON("https://api.example.com/json");
if (jsonResponse.data) {
    console.log("JSON 数据:", jsonResponse.data);
} else if (jsonResponse.error) {
    console.error("JSON 请求失败:", jsonResponse.error);
}

// 文件下载（带进度）
var downloadResponse = http.downloadFile(
    "https://example.com/large-file.zip",
    "./downloads/file.zip",
    { show_progress: true }
);

if (downloadResponse.status_code === 200) {
    console.log("下载完成:", downloadResponse.body);
} else {
    console.error("下载失败:", downloadResponse.error);
}
```

### 编码/解码示例

```javascript
//!amo

// Base64 编码
var originalText = "你好，Amo 工作流！";
var encoded = encoding.base64Encode(originalText);
console.log("Base64 编码结果:", encoded);  // 5L2g5aW977yMQW1vIOW3peS9nOa1gO+8gQ==

// Base64 解码（带错误处理）
var decodeResult = encoding.base64Decode(encoded);
if (decodeResult.success) {
    console.log("解码后文本:", decodeResult.text);  // 你好，Amo 工作流！
} else {
    console.error("解码失败:", decodeResult.error);
}

// 处理二进制数据（例如图片文件）
var imageResult = fs.read("./image.png", true);  // true 表示二进制模式
if (imageResult.success) {
    // 将二进制图像转换为 base64，用于在 HTML 或 JSON 中嵌入
    var base64Image = encoding.base64Encode(imageResult.content);
    console.log("图片的 base64 表示:", base64Image.substring(0, 50) + "...");
    
    // 保存 base64 数据到文件
    fs.write("./image.b64", base64Image);
    
    // 稍后，将其解码回二进制格式
    var decoded = encoding.base64Decode(base64Image);
    if (decoded.success) {
        // 将解码后的二进制数据保存回文件
        fs.write("./image_copy.png", decoded.text, true);  // true 表示二进制模式
    }
}

// 处理无效的 base64 输入
var invalidResult = encoding.base64Decode("这不是有效的 base64 数据!!!");
if (!invalidResult.success) {
    console.error("检测到无效的 base64:", invalidResult.error);
}
```

### 命令行执行示例

```javascript
//!amo

// 基本命令执行
var result = cliCommand("ls", ["-la"]);
if (result.stdout) {
    console.log("命令输出:", result.stdout);
}
if (result.error) {
    console.error("命令错误:", result.error);
}

// 带选项的命令
var gitResult = cliCommand("git", ["status"], {
    cwd: "/path/to/repo",
    timeout: 3600,
    env: {
        "GIT_AUTHOR_NAME": "Amo Workflow"
    }
});

// 交互式命令（用户输入）
var interactiveResult = cliCommand("nano", ["file.txt"], {
    interactive: true
});
```

## 示例和最佳实践

### 1. 错误处理模式

```javascript
//!amo

function safeFileOperation(filePath) {
    try {
        // 首先检查文件是否存在
        if (!fs.exists(filePath)) {
            console.error("文件不存在:", filePath);
            return null;
        }

        var result = fs.read(filePath);
        if (!result.success) {
            console.error("读取文件失败:", result.error);
            return null;
        }
        
        return result.content;
    } catch (error) {
        console.error("文件操作异常:", error.message);
        return null;
    }
}

// 使用示例
var content = safeFileOperation("./config.json");
if (content) {
    console.log("文件内容加载成功");
}
```

### 2. 环境变量使用

```javascript
//!amo

function main() {
    // 获取环境变量
    var apiKey = getVar("API_KEY");
    var outputDir = getVar("output") || "./output";
    var debug = getVar("debug") === "true";

    if (!apiKey) {
        console.error("未找到 API_KEY 环境变量");
        console.log("用法: amo run workflow.js --var API_KEY=your_key");
        return false;
    }

    if (debug) {
        console.log("调试模式已启用");
        console.log("输出目录:", outputDir);
    }

    // 确保输出目录存在
    if (!fs.exists(outputDir)) {
        var mkdirResult = fs.mkdir(outputDir);
        if (!mkdirResult.success) {
            console.error("创建输出目录失败:", mkdirResult.error);
            return false;
        }
    }

    // 使用环境变量进行请求
    var response = http.get("https://api.example.com/data", {
        "Authorization": "Bearer " + apiKey
    });

    if (response.status_code === 200) {
        var outputFile = fs.join([outputDir, "api_data.json"]);
        var writeResult = fs.write(outputFile, response.body);
        if (writeResult.success) {
            console.log("数据已保存到:", outputFile);
        }
    }

    return true;
}

main();
```

### 3. 批量文件处理

```javascript
//!amo

function processDirectory(dirPath, filePattern) {
    console.log("处理目录:", dirPath);
    
    // 检查目录是否存在
    if (!fs.exists(dirPath) || !fs.isDir(dirPath)) {
        console.error("目录不存在:", dirPath);
        return false;
    }

    // 查找匹配的文件
    var findResult = fs.find(dirPath, filePattern);
    if (!findResult.success) {
        console.error("查找文件失败:", findResult.error);
        return false;
    }

    console.log("找到", findResult.files.length, "个匹配文件");

    // 处理每个文件
    var processedCount = 0;
    findResult.files.forEach(function(filePath) {
        console.log("正在处理:", fs.basename(filePath));
        
        var content = fs.read(filePath);
        if (content.success) {
            // 处理文件内容（示例：转换为大写）
            var processed = content.content.toUpperCase();
            
            // 创建输出文件名
            var outputPath = filePath + '.processed';
            var writeResult = fs.write(outputPath, processed);
            
            if (writeResult.success) {
                processedCount++;
                console.log("✅ 已处理:", fs.basename(filePath));
            } else {
                console.error("❌ 写入失败:", writeResult.error);
            }
        } else {
            console.error("❌ 读取失败:", content.error);
        }
    });

    console.log("处理完成。已处理", processedCount, "个文件");
    return true;
}

// 使用示例
var inputDir = getVar("input") || "./input";
var pattern = getVar("pattern") || "*.txt";

processDirectory(inputDir, pattern);
```

## 故障排除

### 自动补全不工作

1. **检查文件位置**
   - 确保 `amo-workflow.d.ts` 文件在项目根目录
   - 验证 `jsconfig.json` 配置是否正确

2. **IDE 问题**
   - 重启 IDE 或重新加载窗口
   - 确保 TypeScript 语言服务已启用
   - 检查工作区是否正确配置

3. **文件验证**
   - 确保工作流文件以 `//!amo` 开头
   - 检查 JavaScript 代码中的语法错误

### 类型错误提示

TypeScript 定义文件主要用于提供自动补全，如果出现类型错误：

1. 在 `jsconfig.json` 中设置 `"checkJs": false`
2. 或者在文件顶部添加 `// @ts-nocheck`
3. 对特定行使用 `// @ts-ignore` 忽略类型问题

### 常见开发错误

1. **尝试使用第三方库**
   ```javascript
   // ❌ 错误：不能使用第三方库
   const axios = require('axios');
   const fs = require('fs');
   
   // ✅ 正确：使用内置 API
   const response = http.get("https://api.example.com");
   const content = fs.read('./file.txt');
   ```

2. **错误的错误处理**
   ```javascript
   // ❌ 错误：未检查 result.success
   var content = fs.read('./file.txt').content;
   
   // ✅ 正确：总是先检查 success
   var result = fs.read('./file.txt');
   if (result.success) {
       console.log(result.content);
   } else {
       console.error("读取失败:", result.error);
   }
   ```

3. **使用浏览器/Node.js API**
   ```javascript
   // ❌ 错误：不能使用浏览器/Node.js API
   fetch('https://api.example.com');
   require('path').join('a', 'b');
   btoa('编码这个');  // 浏览器 API
   
   // ✅ 正确：使用 Amo 工作流 API
   http.get('https://api.example.com');
   fs.join(['a', 'b']);
   encoding.base64Encode('编码这个');
   ```

4. **路径处理问题**
   ```javascript
   // ❌ 错误：平台特定的路径分隔符
   var path = "folder\\subfolder\\file.txt";
   
   // ✅ 正确：使用 fs.join 处理跨平台路径
   var path = fs.join(["folder", "subfolder", "file.txt"]);
   ```

### 安全相关问题

1. **命令不被允许**
   ```
   Error: command 'xyz' is not in the allowed CLI commands list
   ```
   解决方案：将命令添加到 `~/.amo/allowed_cli.txt`

2. **网络请求被阻止**
   ```
   Error: URL not in allowed hosts whitelist
   ```
   解决方案：检查网络白名单配置

3. **路径遍历错误**
   ```
   Error: path traversal not allowed
   ```
   解决方案：使用不包含 `..` 组件的相对路径

### 性能提示

1. **批量操作**：在单个工作流中处理多个文件，而不是重复调用工作流
2. **提前错误检查**：在工作流开始时检查必要条件
3. **资源清理**：完成后清理临时文件
4. **超时管理**：为长时间运行的命令设置适当的超时