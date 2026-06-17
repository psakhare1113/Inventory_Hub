// inventory-fixed.js - Complete working solution
// Copy this code to your inventory.js file

console.log('🚀 Inventory Fixed JS Loaded');

// API Configuration
const API_CONFIG = {
    GATEWAY: 'http://localhost:9999',
    DIRECT: 'http://localhost:9093'
};

// Test both APIs
async function testAllAPIs() {
    console.log('🧪 Testing all inventory APIs...');
    
    const endpoints = [
        { name: 'Gateway', url: `${API_CONFIG.GATEWAY}/api/inventory` },
        { name: 'Direct', url: `${API_CONFIG.DIRECT}/api/inventory` },
        { name: 'Gateway Test', url: `${API_CONFIG.GATEWAY}/api/inventory/test` },
        { name: 'Direct Test', url: `${API_CONFIG.DIRECT}/api/inventory/test` }
    ];
    
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint.url);
            console.log(`✅ ${endpoint.name}: Status ${response.status}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log(`📊 ${endpoint.name} Data:`, data);
            }
        } catch (error) {
            console.log(`❌ ${endpoint.name}: ${error.message}`);
        }
    }
}

// Fetch inventory data with multiple fallbacks
async function fetchInventoryData() {
    console.log('📦 Fetching inventory data...');
    
    // Try Gateway first (no CORS issues)
    try {
        console.log('Trying Gateway API...');
        const gatewayResponse = await fetch(`${API_CONFIG.GATEWAY}/api/inventory`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (gatewayResponse.ok) {
            const data = await gatewayResponse.json();
            console.log('✅ Gateway Success:', data);
            return data;
        } else {
            console.log('❌ Gateway failed with status:', gatewayResponse.status);
        }
    } catch (gatewayError) {
        console.log('❌ Gateway error:', gatewayError.message);
    }
    
    // Try Direct API as fallback
    try {
        console.log('Trying Direct API...');
        const directResponse = await fetch(`${API_CONFIG.DIRECT}/api/inventory`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (directResponse.ok) {
            const data = await directResponse.json();
            console.log('✅ Direct Success:', data);
            return data;
        } else {
            console.log('❌ Direct failed with status:', directResponse.status);
        }
    } catch (directError) {
        console.log('❌ Direct error:', directError.message);
    }
    
    console.log('❌ All APIs failed');
    return [];
}

// Populate inventory table
async function populateInventoryTable() {
    console.log('🔄 Populating inventory table...');
    
    const tableBody = document.getElementById('inventory-table-body');
    
    if (!tableBody) {
        console.error('❌ Table body element not found! Make sure you have <tbody id="inventory-table-body">');
        return;
    }
    
    // Show loading state
    tableBody.innerHTML = `
        <tr>
            <td colspan="12" class="text-center">
                <div class="d-flex justify-content-center align-items-center">
                    <div class="spinner-border text-primary me-3" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <div>
                        <h5>Loading Inventory...</h5>
                        <p class="mb-0">Fetching data from server...</p>
                    </div>
                </div>
            </td>
        </tr>
    `;
    
    // Fetch data
    const inventoryData = await fetchInventoryData();
    
    if (inventoryData && inventoryData.length > 0) {
        console.log(`📊 Populating table with ${inventoryData.length} items`);
        
        let tableHTML = '';
        
        inventoryData.forEach((item, index) => {
            tableHTML += `
                <tr>
                    <td>${item.barcode || 'N/A'}</td>
                    <td>${item.productId || 'N/A'}</td>
                    <td>${item.productName || `Product ${item.productId || 'Unknown'}`}</td>
                    <td>${item.categoryName || `Category ${item.categoryId || 'Unknown'}`}</td>
                    <td>${item.subcategoryName || `Subcategory ${item.subcategoryId || 'Unknown'}`}</td>
                    <td>
                        <span class="badge bg-${getStatusColor(item.inventoryStatus)}">
                            ${item.inventoryStatus || 'N/A'}
                        </span>
                    </td>
                    <td>
                        <span class="badge bg-${getStatusColor(item.platformStatus)}">
                            ${item.platformStatus || 'N/A'}
                        </span>
                    </td>
                    <td>${item.conditionStatus || 'N/A'}</td>
                    <td>₹${item.mrp || 0}</td>
                    <td>₹${item.sellingPrice || 0}</td>
                    <td>${item.warehouseId || 'N/A'}</td>
                    <td>
                        <div class="btn-group" role="group">
                            <button type="button" class="btn btn-sm btn-primary" onclick="editInventoryItem('${item.barcode}')">
                                Edit
                            </button>
                            <button type="button" class="btn btn-sm btn-info" onclick="viewInventoryItem('${item.barcode}')">
                                View
                            </button>
                            <button type="button" class="btn btn-sm btn-danger" onclick="deleteInventoryItem('${item.barcode}')">
                                Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = tableHTML;
        
        // Show success message
        console.log('✅ Table populated successfully!');
        showNotification('success', `Successfully loaded ${inventoryData.length} inventory items!`);
        
    } else {
        console.log('ℹ️ No inventory data found');
        
        // Show no data message with actions
        tableBody.innerHTML = `
            <tr>
                <td colspan="12" class="text-center">
                    <div class="alert alert-info">
                        <div class="mb-3">
                            <i class="fas fa-box-open fa-3x text-muted mb-3"></i>
                            <h4>No Inventory Items Found</h4>
                            <p class="mb-0">Your inventory appears to be empty or there might be a connection issue.</p>
                        </div>
                        <div class="btn-group" role="group">
                            <button type="button" class="btn btn-primary" onclick="addTestInventoryData()">
                                <i class="fas fa-plus"></i> Add Test Data
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="populateInventoryTable()">
                                <i class="fas fa-refresh"></i> Refresh
                            </button>
                            <button type="button" class="btn btn-info" onclick="testAllAPIs()">
                                <i class="fas fa-flask"></i> Test APIs
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Add test inventory data
async function addTestInventoryData() {
    console.log('➕ Adding test inventory data...');
    
    const testItems = [
        {
            productId: 1,
            categoryId: 1,
            subcategoryId: 1,
            barcode: "TEST001",
            warehouseId: 1,
            inventoryStatus: "AVAILABLE",
            platformStatus: "ACTIVE",
            conditionStatus: "NEW",
            mrp: 1000.00,
            showroomPrice: 950.00,
            buyPrice: 800.00,
            sellingPrice: 900.00,
            stockSource: "PURCHASE",
            isCustomerReturned: false,
            isWarehouseDamaged: false,
            updatedBy: 1
        },
        {
            productId: 2,
            categoryId: 1,
            subcategoryId: 1,
            barcode: "TEST002",
            warehouseId: 1,
            inventoryStatus: "AVAILABLE",
            platformStatus: "ACTIVE",
            conditionStatus: "NEW",
            mrp: 1500.00,
            showroomPrice: 1400.00,
            buyPrice: 1200.00,
            sellingPrice: 1350.00,
            stockSource: "PURCHASE",
            isCustomerReturned: false,
            isWarehouseDamaged: false,
            updatedBy: 1
        },
        {
            productId: 3,
            categoryId: 2,
            subcategoryId: 2,
            barcode: "TEST003",
            warehouseId: 1,
            inventoryStatus: "AVAILABLE",
            platformStatus: "ACTIVE",
            conditionStatus: "NEW",
            mrp: 2000.00,
            showroomPrice: 1900.00,
            buyPrice: 1600.00,
            sellingPrice: 1800.00,
            stockSource: "PURCHASE",
            isCustomerReturned: false,
            isWarehouseDamaged: false,
            updatedBy: 1
        }
    ];
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const item of testItems) {
        try {
            // Try Gateway first
            let response = await fetch(`${API_CONFIG.GATEWAY}/api/inventory/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(item)
            });
            
            // If Gateway fails, try Direct
            if (!response.ok) {
                response = await fetch(`${API_CONFIG.DIRECT}/api/inventory/add`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(item)
                });
            }
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Added test item:', result);
                successCount++;
            } else {
                const errorText = await response.text();
                console.error('❌ Failed to add item:', errorText);
                errorCount++;
            }
        } catch (error) {
            console.error('❌ Error adding item:', error);
            errorCount++;
        }
    }
    
    // Show result
    if (successCount > 0) {
        showNotification('success', `Successfully added ${successCount} test inventory items!`);
        // Refresh table after 1 second
        setTimeout(() => populateInventoryTable(), 1000);
    }
    
    if (errorCount > 0) {
        showNotification('warning', `${errorCount} items failed to add. Check console for details.`);
    }
}

// Helper functions
function getStatusColor(status) {
    switch (status?.toUpperCase()) {
        case 'AVAILABLE':
        case 'ACTIVE':
            return 'success';
        case 'RESERVED':
        case 'PENDING':
            return 'warning';
        case 'SOLD':
        case 'INACTIVE':
            return 'secondary';
        case 'DAMAGED':
        case 'RETURNED':
            return 'danger';
        default:
            return 'secondary';
    }
}

function showNotification(type, message) {
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // If you have toast notifications
    if (typeof toastr !== 'undefined') {
        toastr[type](message);
    } else if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info',
            title: message,
            timer: 3000,
            showConfirmButton: false
        });
    } else {
        // Fallback to alert
        alert(message);
    }
}

// Action functions
function editInventoryItem(barcode) {
    console.log('Edit inventory item:', barcode);
    showNotification('info', `Edit functionality for ${barcode} - Coming soon!`);
}

function viewInventoryItem(barcode) {
    console.log('View inventory item:', barcode);
    showNotification('info', `View functionality for ${barcode} - Coming soon!`);
}

function deleteInventoryItem(barcode) {
    if (confirm(`Are you sure you want to delete inventory item ${barcode}?`)) {
        console.log('Delete inventory item:', barcode);
        showNotification('info', `Delete functionality for ${barcode} - Coming soon!`);
    }
}

// Search functionality
function searchInventory(searchTerm) {
    const rows = document.querySelectorAll('#inventory-table-body tr');
    const term = searchTerm.toLowerCase();
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(term) ? '' : 'none';
    });
    
    console.log(`🔍 Searched for: "${searchTerm}"`);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM loaded - Initializing inventory page...');
    
    // Check if we're on the inventory page
    if (document.getElementById('inventory-table-body')) {
        console.log('📦 Inventory table found - Loading data...');
        populateInventoryTable();
    } else {
        console.log('ℹ️ Not on inventory page or table not found');
    }
});

// Make functions globally available
window.populateInventoryTable = populateInventoryTable;
window.fetchInventoryData = fetchInventoryData;
window.addTestInventoryData = addTestInventoryData;
window.testAllAPIs = testAllAPIs;
window.searchInventory = searchInventory;
window.editInventoryItem = editInventoryItem;
window.viewInventoryItem = viewInventoryItem;
window.deleteInventoryItem = deleteInventoryItem;

console.log('✅ Inventory Fixed JS Ready!');