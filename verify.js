// Test that getDetail and getVideoList work end-to-end
const fs = require('fs');
const src = fs.readFileSync('javascript/anime/src/en/anikototv.js', 'utf-8');

// Check getDetail fetches ep-1
console.log('getDetail fetches ep-1:', src.includes('/ep-1'));
// Check data-id extraction
console.log('data-id extraction:', src.includes("data-id=[\"'](\\d+)[\"']"));
// Check AJAX episode list
console.log('AJAX episode list:', src.includes('/ajax/episode/list/'));
// Check data-num parsing
console.log('data-num parsing:', src.includes("data-num=[\"'](\\d+)[\"'][^>]*data-ids=[\"']([^\"']+)[\"']"));
// Check cached dataIds in URL
console.log('3-part URL format:', src.includes('slug + "||" + epNum + "||" + em[2]'));
// Check getVideoList uses cachedDataIds
console.log('getVideoList uses cachedDataIds:', src.includes('cachedDataIds'));
