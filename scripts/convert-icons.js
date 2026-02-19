const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '..', 'assets', 'icons', 'icon.svg');
const iconsDir = path.join(__dirname, '..', 'assets', 'icons');

async function convertIcons() {
    try {
        // Read SVG file
        const svgBuffer = fs.readFileSync(svgPath);
        
        // Create PNG (1024x1024)
        console.log('Creating icon.png...');
        await sharp(svgBuffer)
            .resize(1024, 1024)
            .png()
            .toFile(path.join(iconsDir, 'icon.png'));
        console.log('✓ icon.png created');
        
        // Create ICO file (Windows icon with multiple sizes)
        console.log('Creating icon.ico...');
        const icoSizes = [256, 128, 64, 48, 32, 16];
        const icoBuffers = [];
        
        for (const size of icoSizes) {
            const pngBuffer = await sharp(svgBuffer)
                .resize(size, size)
                .png()
                .toBuffer();
            icoBuffers.push({ size, buffer: pngBuffer });
        }
        
        // Create simple ICO file (Windows format)
        // ICO file structure: Header + Directory entries + Image data
        let icoData = Buffer.alloc(0);
        
        // ICO Header (6 bytes)
        const header = Buffer.alloc(6);
        header.writeUInt16LE(0, 0); // Reserved
        header.writeUInt16LE(1, 2); // Type: 1 = ICO
        header.writeUInt16LE(icoBuffers.length, 4); // Count
        icoData = Buffer.concat([icoData, header]);
        
        // Calculate offsets
        let offset = 6 + (icoBuffers.length * 16);
        const imageData = [];
        
        // Directory entries
        for (const { size, buffer } of icoBuffers) {
            const entry = Buffer.alloc(16);
            entry.writeUInt8(size >= 256 ? 0 : size, 0); // Width
            entry.writeUInt8(size >= 256 ? 0 : size, 1); // Height
            entry.writeUInt8(0, 2); // Color palette
            entry.writeUInt8(0, 3); // Reserved
            entry.writeUInt16LE(1, 4); // Color planes
            entry.writeUInt16LE(32, 6); // Bits per pixel
            entry.writeUInt32LE(buffer.length, 8); // Size
            entry.writeUInt32LE(offset, 12); // Offset
            icoData = Buffer.concat([icoData, entry]);
            imageData.push(buffer);
            offset += buffer.length;
        }
        
        // Image data
        for (const buffer of imageData) {
            icoData = Buffer.concat([icoData, buffer]);
        }
        
        fs.writeFileSync(path.join(iconsDir, 'icon.ico'), icoData);
        console.log('✓ icon.ico created');
        
        // For Mac ICNS, we'll create a placeholder and provide instructions
        // ICNS format is complex, better to use external tools
        console.log('\n⚠ icon.icns (Mac format) requires manual conversion.');
        console.log('Instructions for Mac:');
        console.log('1. Use icon.png (created above)');
        console.log('2. Use an online converter like https://cloudconvert.com/png-to-icns');
        console.log('3. Or use macOS command: iconutil -c icns icon.iconset');
        console.log('4. Save as assets/icons/icon.icns');
        
        console.log('\n✅ Icon generation complete!');
        console.log('Files created:');
        console.log('  - assets/icons/icon.svg (source)');
        console.log('  - assets/icons/icon.png (1024x1024)');
        console.log('  - assets/icons/icon.ico (Windows)');
        console.log('  - assets/icons/icon.icns (Mac - needs manual conversion)');
        
    } catch (error) {
        console.error('Error converting icons:', error);
        process.exit(1);
    }
}

convertIcons();
