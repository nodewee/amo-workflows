//!amo

// Base64 编码/解码演示
// 演示 encoding 模块的 base64 函数

function main() {
    console.log("🔄 Base64 编码/解码演示");
    console.log("=================================");
    
    // 从运行时变量获取输入文本或使用默认值
    var input = getVar("input") || "Hello, Amo Workflow!";
    console.log("📝 原始文本:", input);
    
    // 编码为 base64
    console.log("\n🔒 正在编码为 Base64");
    var encoded = encoding.base64Encode(input);
    console.log("✅ Base64 编码结果:", encoded);
    
    // 解码 base64
    console.log("\n🔓 正在解码 Base64");
    var decodeResult = encoding.base64Decode(encoded);
    
    if (decodeResult.success) {
        console.log("✅ 解码文本:", decodeResult.text);
        
        // 校验回转
        if (input === decodeResult.text) {
            console.log("✓ 回转成功：解码文本与原始一致");
        } else {
            console.error("✗ 回转失败：解码文本与原始不一致");
        }
    } else {
        console.error("❌ 解码失败:", decodeResult.error);
    }
    
    // 演示无效 base64 的错误处理
    console.log("\n🧪 测试无效 Base64 输入");
    var invalidBase64 = "This is not valid base64!@#";
    var invalidResult = encoding.base64Decode(invalidBase64);
    
    if (!invalidResult.success) {
        console.log("✅ 正确检测到错误:", invalidResult.error);
    }
    
    console.log("\n🎯 用法示例:");
    console.log("  • 编码: var encoded = encoding.base64Encode('your text')");
    console.log("  • 解码: var result = encoding.base64Decode(encoded)");
    console.log("           if (result.success) console.log(result.text)");
    
    return true;
}

// 执行主函数
main(); 