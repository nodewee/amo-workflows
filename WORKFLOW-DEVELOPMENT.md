# Amo Workflow Development Environment Setup Guide

This guide will help you set up IDE auto-completion functionality to make Amo workflow development more efficient.

## Table of Contents

1. [Workflow Development Overview](#workflow-development-overview)
2. [Development Environment Requirements and Limitations](#development-environment-requirements-and-limitations)
3. [TypeScript Definition File Setup](#typescript-definition-file-setup)
4. [VS Code Setup (Optional)](#vs-code-setup-optional)
5. [WebStorm/IntelliJ IDEA Setup (Optional)](#webstormintellijidea-setup-optional)
6. [API Syntax Introduction](#api-syntax-introduction)
7. [Examples and Best Practices](#examples-and-best-practices)
8. [Troubleshooting](#troubleshooting)

## Workflow Development Overview

Amo Workflow is a powerful automation solution that allows you to create custom automation scripts to handle various tasks.

### Core Features

- **JavaScript Language Support**: Workflows are developed entirely using JavaScript
- **Rich Built-in APIs**: Provides file system, network requests, command line, and other core functionalities
- **Type Safety**: Complete IDE support through TypeScript definition files
- **Security Model**: Whitelist-based security for commands and network access
- **Cross-Platform**: Works consistently across Windows, macOS, and Linux
- **Workflow Management**: Download and share workflows from remote sources (GitHub, GitLab, etc.)

## Development Environment Requirements and Limitations

### ⚠️ Important Limitations

When developing Amo workflows, please pay attention to the following restrictions:

1. **Programming Language Limitations**
   - Only JavaScript language can be used for workflow development
   - TypeScript or other programming languages are not supported

2. **API Usage Limitations**
   - Only standard Web APIs (such as `JSON`, `Math`, `Date`, etc.) can be used
   - Only Amo workflow engine's dedicated APIs can be used (refer to `amo-workflow.d.ts`)
   - **Third-party libraries or packages are strictly prohibited** (such as npm packages, Node.js modules, etc.)

3. **File and Network Operation Limitations**
   - All file operations must be performed through the `fs` API
   - All network requests must be performed through the `http` API
   - Cannot directly use browser's `fetch` or Node.js file system modules

4. **Security Restrictions**
   - CLI commands are restricted to a whitelist (configured in `~/.amo/allowed_cli.txt`)
   - Network requests are limited to allowed domains (for downloads: GitHub, GitLab, Bitbucket, SourceForge)
   - File operations are validated for security (no path traversal)

### Available API Types

The Amo workflow engine provides the following core APIs:

- **`fs`**: File system operations (read/write files, directory operations, path handling, etc.)
- **`http`**: Network requests (GET, POST, file downloads, etc.)
- **`encoding`**: Encoding/decoding operations (base64, etc.)
- **`console`**: Console output (logging)
- **`cliCommand`**: Command line execution (with security whitelist)
- **`getVar`**: Get environment variables and runtime parameters

## TypeScript Definition File Setup

### 1. Copy Definition File

Copy the `amo-workflow.d.ts` file to your workflow project directory:

```bash
# Execute in your workflow project root directory
cp /path/to/amo/amo-workflow.d.ts ./amo-workflow.d.ts
```

### 2. Create jsconfig.json (Recommended)

Create a `jsconfig.json` file in your workflow project root directory:

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

## VS Code Setup (Optional)

### 1. Install Recommended Extensions

- JavaScript (ES6) code snippets
- TypeScript Importer
- Path Intellisense

### 2. Workspace Settings

Create `.vscode/settings.json` in the project root directory:

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

### 3. Verify Auto-completion

Create a test file `test.js`:

```javascript
//!amo

// Typing "fs." should show auto-completion hints
fs.| // <- All fs methods should be displayed when cursor is here

// Typing "http." should show network-related methods
http.| // <- Shows get, post, getJSON, downloadFile and other methods

// Typing "encoding." should show encoding-related methods
encoding.| // <- Shows base64Encode, base64Decode and other methods

// Test path operations
var testPath = "/home/user/file.txt";
fs.dirname(testPath); // Should show auto-completion
fs.basename(testPath);
fs.ext(testPath);
```

## WebStorm/IntelliJ IDEA Setup (Optional)

### 1. Project Settings

1. Open File → Settings
2. Go to Languages & Frameworks → JavaScript
3. Set JavaScript language version to ECMAScript 5.1
4. Ensure TypeScript language service is enabled

### 2. Type Definitions

1. Right-click on the `amo-workflow.d.ts` file
2. Select "Mark as TypeScript Definition File"

### 3. Code Completion Test

Like VS Code, create a test file to verify auto-completion functionality.

## API Syntax Introduction

### File System Operation Examples

```javascript
//!amo

// Check if file exists
if (fs.exists("./config.json")) {
    // Read file content
    var result = fs.read("./config.json");
    if (result.success) {
        console.log("File content:", result.content);
    } else {
        console.error("Failed to read file:", result.error);
    }
}

// Write file
var writeResult = fs.write("./output.txt", "Hello, Amo!");
if (writeResult.success) {
    console.log("File written successfully");
} else {
    console.error("Write failed:", writeResult.error);
}

// Directory operations
var files = fs.readdir("./");
if (files.success) {
    console.log("Found", files.files.length, "files:");
    files.files.forEach(function(file) {
        var icon = file.is_dir ? "📁" : "📄";
        console.log(icon + " " + file.name + " (" + file.size + " bytes)");
    });
} else {
    console.error("Failed to list directory:", files.error);
}

// Path operations
var testPath = "/home/user/documents/report.pdf";
console.log("Directory:", fs.dirname(testPath));
console.log("Basename:", fs.basename(testPath));
console.log("Extension:", fs.ext(testPath));

var pathParts = fs.split(testPath);
console.log("Split - dir:", pathParts.dir, "file:", pathParts.file);

// Join paths cross-platform
var filePath = fs.join(["folder", "subfolder", "file.txt"]);
console.log("Joined path:", filePath);
```

### Network Request Examples

```javascript
//!amo

// GET request
var response = http.get("https://api.example.com/data");
if (response.status_code === 200) {
    console.log("Response content:", response.body);
} else if (response.error) {
    console.error("Request failed:", response.error);
} else {
    console.error("HTTP error:", response.status_code);
}

// POST request with JSON data
var postData = JSON.stringify({ name: "test", value: 123 });
var postResponse = http.post(
    "https://api.example.com/submit", 
    postData,
    { "Content-Type": "application/json" }
);

if (postResponse.status_code === 200) {
    console.log("POST successful:", postResponse.body);
}

// JSON response handling
var jsonResponse = http.getJSON("https://api.example.com/json");
if (jsonResponse.data) {
    console.log("JSON data:", jsonResponse.data);
} else if (jsonResponse.error) {
    console.error("JSON request failed:", jsonResponse.error);
}

// File download with progress
var downloadResponse = http.downloadFile(
    "https://example.com/large-file.zip",
    "./downloads/file.zip",
    { show_progress: true }
);

if (downloadResponse.status_code === 200) {
    console.log("Download completed:", downloadResponse.body);
} else {
    console.error("Download failed:", downloadResponse.error);
}
```

### Encoding/Decoding Examples

```javascript
//!amo

// Base64 encoding
var originalText = "Hello, Amo Workflow!";
var encoded = encoding.base64Encode(originalText);
console.log("Base64 encoded:", encoded);  // SGVsbG8sIEFtbyBXb3JrZmxvdyE=

// Base64 decoding with error handling
var decodeResult = encoding.base64Decode(encoded);
if (decodeResult.success) {
    console.log("Decoded text:", decodeResult.text);  // Hello, Amo Workflow!
} else {
    console.error("Decode failed:", decodeResult.error);
}

// Working with binary data (e.g., image file)
var imageResult = fs.read("./image.png", true);  // true for binary mode
if (imageResult.success) {
    // Convert binary image to base64 for embedding in HTML or JSON
    var base64Image = encoding.base64Encode(imageResult.content);
    console.log("Image as base64:", base64Image.substring(0, 50) + "...");
    
    // Save base64 data to a file
    fs.write("./image.b64", base64Image);
    
    // Later, decode back to binary
    var decoded = encoding.base64Decode(base64Image);
    if (decoded.success) {
        // Save decoded binary back to file
        fs.write("./image_copy.png", decoded.text, true);  // true for binary mode
    }
}

// Handle invalid base64 input
var invalidResult = encoding.base64Decode("This is not valid base64!!!");
if (!invalidResult.success) {
    console.error("Invalid base64 detected:", invalidResult.error);
}
```

### Command Line Execution Examples

```javascript
//!amo

// Basic command execution
var result = cliCommand("echo", ["Hello World"]);
if (result.stdout) {
    console.log("Command output:", result.stdout);
}
if (result.error) {
    console.error("Command error:", result.error);
}

// Command with options
var gitResult = cliCommand("git", ["status"], {
    cwd: "/path/to/repo",
    timeout: 30,
    env: {
        "GIT_AUTHOR_NAME": "Amo Workflow"
    }
});

// Interactive command (for user input)
var interactiveResult = cliCommand("nano", ["file.txt"], {
    interactive: true
});
```

## Examples and Best Practices

### 1. Error Handling Pattern

```javascript
//!amo

function safeFileOperation(filePath) {
    try {
        // First check if file exists
        if (!fs.exists(filePath)) {
            console.error("File does not exist:", filePath);
            return null;
        }

        var result = fs.read(filePath);
        if (!result.success) {
            console.error("Failed to read file:", result.error);
            return null;
        }
        
        return result.content;
    } catch (error) {
        console.error("File operation exception:", error.message);
        return null;
    }
}

// Usage
var content = safeFileOperation("./config.json");
if (content) {
    console.log("File content loaded successfully");
}
```

### 2. Environment Variable Usage

```javascript
//!amo

function main() {
    // Get environment variables
    var apiKey = getVar("API_KEY");
    var outputDir = getVar("output") || "./output";
    var debug = getVar("debug") === "true";

    if (!apiKey) {
        console.error("API_KEY environment variable not found");
        console.log("Usage: amo run workflow.js --var API_KEY=your_key");
        return false;
    }

    if (debug) {
        console.log("Debug mode enabled");
        console.log("Output directory:", outputDir);
    }

    // Ensure output directory exists
    if (!fs.exists(outputDir)) {
        var mkdirResult = fs.mkdir(outputDir);
        if (!mkdirResult.success) {
            console.error("Failed to create output directory:", mkdirResult.error);
            return false;
        }
    }

    // Use environment variables for requests
    var response = http.get("https://api.example.com/data", {
        "Authorization": "Bearer " + apiKey
    });

    if (response.status_code === 200) {
        var outputFile = fs.join([outputDir, "api_data.json"]);
        var writeResult = fs.write(outputFile, response.body);
        if (writeResult.success) {
            console.log("Data saved to:", outputFile);
        }
    }

    return true;
}

main();
```

### 3. Batch File Processing

```javascript
//!amo

function processDirectory(dirPath, filePattern) {
    console.log("Processing directory:", dirPath);
    
    // Check if directory exists
    if (!fs.exists(dirPath) || !fs.isDir(dirPath)) {
        console.error("Directory does not exist:", dirPath);
        return false;
    }

    // Find matching files
    var findResult = fs.find(dirPath, filePattern);
    if (!findResult.success) {
        console.error("Failed to find files:", findResult.error);
        return false;
    }

    console.log("Found", findResult.files.length, "matching files");

    // Process each file
    var processedCount = 0;
    findResult.files.forEach(function(filePath) {
        console.log("Processing:", fs.basename(filePath));
        
        var content = fs.read(filePath);
        if (content.success) {
            // Process file content (example: convert to uppercase)
            var processed = content.content.toUpperCase();
            
            // Create output filename
            var outputPath = filePath + '.processed';
            var writeResult = fs.write(outputPath, processed);
            
            if (writeResult.success) {
                processedCount++;
                console.log("✅ Processed:", fs.basename(filePath));
            } else {
                console.error("❌ Failed to write:", writeResult.error);
            }
        } else {
            console.error("❌ Failed to read:", content.error);
        }
    });

    console.log("Processing complete. Processed", processedCount, "files");
    return true;
}

// Usage
var inputDir = getVar("input") || "./input";
var pattern = getVar("pattern") || "*.txt";

processDirectory(inputDir, pattern);
```

## Command Usage Examples

### Running Workflows

```bash
# Run embedded workflow
amo run file-organizer.js --var source_dir=/Downloads --var target_dir=/Organized

# Run user-downloaded workflow  
amo run my-custom-workflow.js --input /data --output /results

# Run with debug information
amo run workflow.js --debug

# Run with timeout limit
amo run long-workflow.js --timeout 3600

# Show workflow help (if supported)
amo run workflow.js --workflow-help
```

### Managing Workflows

```bash
# List all available workflows
amo workflow list

# Download workflow from GitHub
amo workflow get https://github.com/user/repo/blob/main/workflow.js

# Download with custom filename
amo workflow get https://raw.githubusercontent.com/user/repo/main/workflow.js --filename my-workflow.js

# Download from GitLab
amo workflow get https://gitlab.com/user/repo/-/blob/main/workflow.js
```

### Managing CLI Permissions

```bash
# List allowed commands
amo tool permission list

# Add command to whitelist
amo tool permission add ffmpeg

# Remove command from whitelist  
amo tool permission remove echo
```

## Troubleshooting

### Auto-completion Not Working

1. **Check File Locations**
   - Ensure `amo-workflow.d.ts` file is in the project root directory
   - Verify `jsconfig.json` configuration is correct

2. **IDE Issues**
   - Restart IDE or reload window
   - Ensure TypeScript language service is enabled
   - Check that the workspace is properly configured

3. **File Validation**
   - Ensure your workflow file starts with `//!amo`
   - Check for syntax errors in your JavaScript code

### Type Error Messages

TypeScript definition files are mainly used to provide auto-completion. If type errors occur:

1. Set `"checkJs": false` in `jsconfig.json`
2. Or add `// @ts-nocheck` at the top of the file
3. Use `// @ts-ignore` for specific lines with type issues

### Common Development Errors

1. **Attempting to Use Third-party Libraries**
   ```javascript
   // ❌ Error: Cannot use third-party libraries
   const axios = require('axios');
   const fs = require('fs');
   
   // ✅ Correct: Use built-in APIs
   const response = http.get("https://api.example.com");
   const content = fs.read('./file.txt');
   ```

2. **Incorrect Error Handling**
   ```javascript
   // ❌ Error: Not checking result.success
   var content = fs.read('./file.txt').content;
   
   // ✅ Correct: Always check success first
   var result = fs.read('./file.txt');
   if (result.success) {
       console.log(result.content);
   } else {
       console.error("Read failed:", result.error);
   }
   ```

3. **Using Browser/Node.js APIs**
   ```javascript
   // ❌ Error: Cannot use browser/Node.js APIs
   fetch('https://api.example.com');
   require('path').join('a', 'b');
   btoa('encode this');  // Browser API
   
   // ✅ Correct: Use Amo workflow APIs
   http.get('https://api.example.com');
   fs.join(['a', 'b']);
   encoding.base64Encode('encode this');
   ```

4. **Path Handling Issues**
   ```javascript
   // ❌ Error: Platform-specific path separators
   var path = "folder\\subfolder\\file.txt";
   
   // ✅ Correct: Use fs.join for cross-platform paths
   var path = fs.join(["folder", "subfolder", "file.txt"]);
   ```

### Security-Related Issues

1. **Command Not Allowed**
   ```
   Error: command 'xyz' is not in the allowed CLI commands list
   ```
   Solution: Add the command using `amo tool permission add xyz`

2. **Network Request Blocked**
   ```
   Error: URL not in allowed hosts whitelist
   ```
   Solution: Network requests within workflows are allowed, but downloads are restricted to specific domains

3. **Path Traversal Error**
   ```
   Error: path traversal not allowed
   ```
   Solution: Use relative paths without `..` components

4. **Workflow Download Failed**
   ```
   Error: download failed with status 404
   ```
   Solution: Ensure the URL is correct and from an allowed domain (GitHub, GitLab, Bitbucket, SourceForge)

### Performance Tips

1. **Batch Operations**: Process multiple files in a single workflow rather than calling the workflow repeatedly
2. **Error Early**: Check for required conditions early in your workflow
3. **Resource Cleanup**: Clean up temporary files when done
4. **Timeout Management**: Set appropriate timeouts for long-running commands
5. **Caching**: Use the tool path cache system by ensuring tools are properly installed