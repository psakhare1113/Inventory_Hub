import { ProductValidator } from '../utils/productValidation';

// Test data
const existingProducts = [
  { name: 'Nike Air Max Shoes', sku: 'NIK-AM-001' },
  { name: 'Adidas Ultraboost', sku: 'ADI-UB-002' },
  { name: 'Biba Anarkali Kurta Set', sku: 'BIB-AK-003' }
];

// Test Product Name Validation
console.log('=== Product Name Validation Tests ===');

// Test 1: Valid product name
console.log('Test 1 - Valid name:');
console.log(ProductValidator.validateProductName('Samsung Galaxy Phone', existingProducts));

// Test 2: Auto-formatting
console.log('\nTest 2 - Auto-formatting:');
console.log(ProductValidator.validateProductName('samsung galaxy phone', existingProducts));

// Test 3: Duplicate detection (case-insensitive)
console.log('\nTest 3 - Duplicate detection:');
console.log(ProductValidator.validateProductName('NIKE AIR MAX SHOES', existingProducts));

// Test 4: Too short
console.log('\nTest 4 - Too short:');
console.log(ProductValidator.validateProductName('AB', existingProducts));

// Test 5: Only numbers
console.log('\nTest 5 - Only numbers:');
console.log(ProductValidator.validateProductName('12345', existingProducts));

// Test 6: Only special characters
console.log('\nTest 6 - Only special characters:');
console.log(ProductValidator.validateProductName('!@#$%', existingProducts));

// Test Description Validation
console.log('\n=== Description Validation Tests ===');

// Test 7: Valid description
console.log('Test 7 - Valid description:');
const validDesc = 'Biba Women\'s Anarkali Kurta Set made from soft cotton fabric with elegant floral print, perfect for festive and casual wear.';
console.log(ProductValidator.validateDescription(validDesc));

// Test 8: Too short description
console.log('\nTest 8 - Too short description:');
console.log(ProductValidator.validateDescription('Short desc'));

// Test SKU Validation
console.log('\n=== SKU Validation Tests ===');

// Test 9: Valid SKU
console.log('Test 9 - Valid SKU:');
console.log(ProductValidator.validateSKU('NEW-SKU-001', existingProducts));

// Test 10: Duplicate SKU
console.log('\nTest 10 - Duplicate SKU:');
console.log(ProductValidator.validateSKU('nik-am-001', existingProducts));

// Test Price Validation
console.log('\n=== Price Validation Tests ===');

// Test 11: Valid prices
console.log('Test 11 - Valid prices:');
console.log(ProductValidator.validatePrices(100, 150));

// Test 12: Selling price lower than cost
console.log('\nTest 12 - Selling price lower than cost:');
console.log(ProductValidator.validatePrices(150, 100));

// Test 13: Negative prices
console.log('\nTest 13 - Negative prices:');
console.log(ProductValidator.validatePrices(-50, 100));

// Test Stock Validation
console.log('\n=== Stock Validation Tests ===');

// Test 14: Valid stock
console.log('Test 14 - Valid stock:');
console.log(ProductValidator.validateStock(100, 10));

// Test 15: Negative stock
console.log('\nTest 15 - Negative stock:');
console.log(ProductValidator.validateStock(-5, 10));

// Test 16: Zero threshold
console.log('\nTest 16 - Zero threshold:');
console.log(ProductValidator.validateStock(100, 0));

// Test Image Validation
console.log('\n=== Image Validation Tests ===');

// Mock file objects for testing
const validImageFile = {
  name: 'product.jpg',
  type: 'image/jpeg',
  size: 2 * 1024 * 1024 // 2MB
};

const invalidTypeFile = {
  name: 'product.gif',
  type: 'image/gif',
  size: 1 * 1024 * 1024
};

const oversizedFile = {
  name: 'product.png',
  type: 'image/png',
  size: 10 * 1024 * 1024 // 10MB
};

// Test 17: Valid images
console.log('Test 17 - Valid images:');
console.log(ProductValidator.validateImages([validImageFile]));

// Test 18: Invalid file type
console.log('\nTest 18 - Invalid file type:');
console.log(ProductValidator.validateImages([invalidTypeFile]));

// Test 19: Oversized file
console.log('\nTest 19 - Oversized file:');
console.log(ProductValidator.validateImages([oversizedFile]));

// Test 20: No images
console.log('\nTest 20 - No images:');
console.log(ProductValidator.validateImages([]));

// Test Name Suggestions
console.log('\n=== Name Suggestions Tests ===');

// Test 21: Formatting suggestions
console.log('Test 21 - Formatting suggestions:');
console.log(ProductValidator.getNameSuggestions('biba kurta set'));

// Test 22: Brand suggestions
console.log('\nTest 22 - Brand suggestions:');
console.log(ProductValidator.getNameSuggestions('nike running shoes'));

// Test Description Template
console.log('\n=== Description Template Tests ===');

// Test 23: Generate template
console.log('Test 23 - Generate template:');
console.log(ProductValidator.generateDescriptionTemplate('Biba', 'Kurta Set'));

// Test Normalization
console.log('\n=== Normalization Tests ===');

// Test 24: Name normalization
console.log('Test 24 - Name normalization:');
console.log('Original: "  NIKE   AIR   MAX  "');
console.log('Normalized:', ProductValidator.normalizeForComparison('  NIKE   AIR   MAX  '));
console.log('Formatted:', ProductValidator.formatProductName('  NIKE   AIR   MAX  '));

// Performance Test
console.log('\n=== Performance Tests ===');

// Test 25: Large dataset validation
console.log('Test 25 - Performance with large dataset:');
const largeProductList = Array.from({ length: 1000 }, (_, i) => ({
  name: `Product ${i}`,
  sku: `SKU-${i}`
}));

const startTime = performance.now();
const result = ProductValidator.validateProductName('New Product Test', largeProductList);
const endTime = performance.now();

console.log('Validation result:', result);
console.log(`Validation time: ${endTime - startTime} milliseconds`);

console.log('\n=== All Tests Completed ===');