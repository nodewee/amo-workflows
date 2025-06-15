//!amo

// Base64 Encoding/Decoding Demo
// Demonstrates the encoding module with base64 functions

function main() {
    console.log("🔄 Base64 Encoding/Decoding Demo");
    console.log("=================================");
    
    // Get input text from runtime variables or use default
    var input = getVar("input") || "Hello, Amo Workflow!";
    console.log("📝 Original text:", input);
    
    // Encode to base64
    console.log("\n🔒 Encoding to Base64");
    var encoded = encoding.base64Encode(input);
    console.log("✅ Base64 encoded:", encoded);
    
    // Decode from base64
    console.log("\n🔓 Decoding from Base64");
    var decodeResult = encoding.base64Decode(encoded);
    
    if (decodeResult.success) {
        console.log("✅ Decoded text:", decodeResult.text);
        
        // Verify round trip
        if (input === decodeResult.text) {
            console.log("✓ Round-trip successful: Decoded text matches original");
        } else {
            console.error("✗ Round-trip failed: Decoded text differs from original");
        }
    } else {
        console.error("❌ Decode failed:", decodeResult.error);
    }
    
    // Demonstrate error handling with invalid base64
    console.log("\n🧪 Testing invalid Base64 input");
    var invalidBase64 = "This is not valid base64!@#";
    var invalidResult = encoding.base64Decode(invalidBase64);
    
    if (!invalidResult.success) {
        console.log("✅ Error correctly detected:", invalidResult.error);
    }
    
    console.log("\n🎯 Usage examples:");
    console.log("  • Encode: var encoded = encoding.base64Encode('your text')");
    console.log("  • Decode: var result = encoding.base64Decode(encoded)");
    console.log("           if (result.success) console.log(result.text)");
    
    return true;
}

// Execute main function
main(); 