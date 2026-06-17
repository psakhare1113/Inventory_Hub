// Product validation utilities
export class ProductValidator {
  static formatProductName(name) {
    if (!name) return '';
    
    // Trim and normalize spaces
    const trimmed = name.trim().replace(/\s+/g, ' ');
    
    // Convert to title case
    return trimmed
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  static normalizeForComparison(name) {
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  static validateProductName(name, existingProducts = []) {
    const errors = [];
    
    if (!name || name.trim().length === 0) {
      errors.push('Product name is required');
      return { isValid: false, errors, formatted: '' };
    }

    const trimmed = name.trim();
    
    // Minimum length check
    if (trimmed.length < 3) {
      errors.push('Product name must be at least 3 characters long');
    }

    // Check for only numbers or special characters
    if (!/[a-zA-Z]/.test(trimmed)) {
      errors.push('Product name must contain at least one letter');
    }

    // Check for duplicate names (case-insensitive)
    const normalized = this.normalizeForComparison(trimmed);
    const isDuplicate = existingProducts.some(product => 
      this.normalizeForComparison(product.name) === normalized
    );

    if (isDuplicate) {
      errors.push('A product with this name already exists');
    }

    const formatted = this.formatProductName(trimmed);
    
    return {
      isValid: errors.length === 0,
      errors,
      formatted
    };
  }

  static validateDescription(description) {
    const errors = [];
    const minLength = 50;
    
    if (!description || description.trim().length === 0) {
      errors.push('Product description is required');
      return { isValid: false, errors };
    }

    if (description.trim().length < minLength) {
      errors.push(`Description must be at least ${minLength} characters long`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateSKU(sku, existingProducts = []) {
    const errors = [];
    
    if (!sku || sku.trim().length === 0) {
      errors.push('SKU is required');
      return { isValid: false, errors };
    }

    const trimmedSKU = sku.trim().toUpperCase();
    
    // Check for duplicate SKU
    const isDuplicate = existingProducts.some(product => 
      product.sku && product.sku.toUpperCase() === trimmedSKU
    );

    if (isDuplicate) {
      errors.push('SKU already exists');
    }

    return {
      isValid: errors.length === 0,
      errors,
      formatted: trimmedSKU
    };
  }

  static validatePrices(costPrice, sellingPrice) {
    const errors = [];
    
    if (!costPrice || costPrice <= 0) {
      errors.push('Cost price must be greater than 0');
    }

    if (!sellingPrice || sellingPrice <= 0) {
      errors.push('Selling price must be greater than 0');
    }

    if (costPrice && sellingPrice && sellingPrice < costPrice) {
      errors.push('Selling price cannot be lower than cost price');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateStock(quantity, threshold) {
    const errors = [];
    
    if (quantity < 0) {
      errors.push('Stock quantity cannot be negative');
    }

    if (!threshold || threshold <= 0) {
      errors.push('Threshold quantity must be greater than 0');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateImages(files) {
    const errors = [];
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!files || files.length === 0) {
      errors.push('At least one product image is required');
      return { isValid: false, errors };
    }

    for (let file of files) {
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Only JPG, PNG, and WEBP formats are allowed`);
      }

      if (file.size > maxSize) {
        errors.push(`${file.name}: File size must be less than 5MB`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static generateDescriptionTemplate(brand, category) {
    return `${brand || '[Brand]'} ${category || '[Category]'} made from [material] with [key features], perfect for [usage/occasion].

Key Features:
• [Feature 1]
• [Feature 2]
• [Feature 3]

Specifications:
• Material: [Material type]
• Size: [Size details]
• Color: [Color options]
• Care Instructions: [Care details]`;
  }

  static getNameSuggestions(input) {
    if (!input) return [];
    
    const formatted = this.formatProductName(input);
    const suggestions = [];

    // Add formatted version if different
    if (formatted !== input) {
      suggestions.push({
        text: formatted,
        reason: 'Proper title case formatting'
      });
    }

    // Brand-specific suggestions
    const commonBrands = ['Nike', 'Adidas', 'Puma', 'Biba', 'W', 'Zara', 'H&M'];
    const words = input.toLowerCase().split(' ');
    
    commonBrands.forEach(brand => {
      if (words.some(word => word.includes(brand.toLowerCase()))) {
        const suggestion = input.replace(new RegExp(brand, 'gi'), brand);
        if (suggestion !== input) {
          suggestions.push({
            text: this.formatProductName(suggestion),
            reason: `Correct brand name: ${brand}`
          });
        }
      }
    });

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }
}