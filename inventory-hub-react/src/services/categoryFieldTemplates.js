// Category Field Templates Service
export const categoryFieldTemplates = {
  // Predefined templates for different category types
  templates: {
    'Electronics': [
      { name: 'RAM', options: ['4GB', '8GB', '16GB', '32GB', '64GB'] },
      { name: 'Storage', options: ['64GB', '128GB', '256GB', '512GB', '1TB', '2TB'] },
      { name: 'Camera', options: ['12MP', '48MP', '64MP', '108MP', 'No Camera'] },
      { name: 'Battery', options: ['3000mAh', '4000mAh', '5000mAh', '6000mAh'] },
      { name: 'Processor', options: ['Snapdragon 888', 'A15 Bionic', 'Exynos 2100', 'MediaTek Dimensity'] },
      { name: 'Display', options: ['OLED', 'AMOLED', 'LCD', 'IPS', 'Retina'] },
      { name: 'Screen Size', options: ['5.5\"', '6.1\"', '6.4\"', '6.7\"', '7.0\"'] },
      { name: 'OS', options: ['Android 12', 'Android 13', 'iOS 15', 'iOS 16', 'Windows 11'] }
    ],
    'Furniture': [
      { name: 'Material', options: ['Wood', 'Metal', 'Plastic', 'Glass', 'Fabric', 'Leather'] },
      { name: 'Dimensions', options: [] }, // Free text
      { name: 'Weight', options: ['Under 5kg', '5-10kg', '10-20kg', '20-50kg', 'Over 50kg'] },
      { name: 'Color', options: ['Brown', 'Black', 'White', 'Gray', 'Beige', 'Natural Wood'] },
      { name: 'Warranty', options: ['6 Months', '1 Year', '2 Years', '5 Years', 'Lifetime'] },
      { name: 'Assembly Required', options: ['Yes', 'No', 'Partial'] }
    ],
    'Clothing': [
      { name: 'Size', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
      { name: 'Color', options: ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Pink'] },
      { name: 'Material', options: ['Cotton', 'Polyester', 'Silk', 'Wool', 'Denim', 'Leather'] },
      { name: 'Brand', options: [] }, // Free text
      { name: 'Care Instructions', options: ['Machine Wash', 'Hand Wash', 'Dry Clean Only'] },
      { name: 'Fit Type', options: ['Regular', 'Slim', 'Loose', 'Tight'] }
    ],
    'Home & Garden': [
      { name: 'Material', options: ['Plastic', 'Metal', 'Ceramic', 'Glass', 'Wood'] },
      { name: 'Dimensions', options: [] }, // Free text
      { name: 'Color', options: ['White', 'Black', 'Brown', 'Green', 'Blue', 'Multi-color'] },
      { name: 'Indoor/Outdoor', options: ['Indoor', 'Outdoor', 'Both'] },
      { name: 'Warranty', options: ['6 Months', '1 Year', '2 Years', 'No Warranty'] },
      { name: 'Brand', options: [] } // Free text
    ],
    'Sports & Fitness': [
      { name: 'Brand', options: [] }, // Free text
      { name: 'Size', options: ['Small', 'Medium', 'Large', 'One Size'] },
      { name: 'Material', options: ['Plastic', 'Metal', 'Rubber', 'Fabric', 'Leather'] },
      { name: 'Weight', options: ['Under 1kg', '1-5kg', '5-10kg', '10-20kg', 'Over 20kg'] },
      { name: 'Color', options: ['Black', 'White', 'Red', 'Blue', 'Green', 'Multi-color'] },
      { name: 'Warranty', options: ['6 Months', '1 Year', '2 Years', 'No Warranty'] }
    ],
    'Books & Media': [
      { name: 'Author', options: [] }, // Free text
      { name: 'Genre', options: ['Fiction', 'Non-Fiction', 'Science', 'History', 'Biography', 'Self-Help'] },
      { name: 'Language', options: ['English', 'Hindi', 'Marathi', 'Spanish', 'French'] },
      { name: 'Format', options: ['Hardcover', 'Paperback', 'eBook', 'Audiobook'] },
      { name: 'Publisher', options: [] }, // Free text
      { name: 'Publication Year', options: [] } // Free text
    ]
  },

  // Get template by category name
  getTemplate: function(categoryName) {
    // Try exact match first
    if (this.templates[categoryName]) {
      return this.templates[categoryName];
    }
    
    // Try partial match (case insensitive)
    const lowerCategoryName = categoryName.toLowerCase();
    for (const [templateName, template] of Object.entries(this.templates)) {
      if (templateName.toLowerCase().includes(lowerCategoryName) || 
          lowerCategoryName.includes(templateName.toLowerCase())) {
        return template;
      }
    }
    
    // Default template
    return [
      { name: 'Brand', options: [] },
      { name: 'Model', options: [] },
      { name: 'Color', options: ['Black', 'White', 'Red', 'Blue', 'Green'] },
      { name: 'Size', options: ['Small', 'Medium', 'Large'] },
      { name: 'Material', options: ['Plastic', 'Metal', 'Wood', 'Glass'] },
      { name: 'Warranty', options: ['6 Months', '1 Year', '2 Years'] }
    ];
  },

  // Get all available template names
  getAvailableTemplates: function() {
    return Object.keys(this.templates);
  }
};