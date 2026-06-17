// inventoryFix.js - Complete solution for inventory 500 errors

const API_CONFIG = {
    GATEWAY_URL: 'http://localhost:9999',
    INVENTORY_DIRECT_URL: 'http://localhost:9999', // Route through gateway to avoid CORS
    PRODUCTS_URL: 'http://localhost:9094'
};

// Get auth headers
function getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
}

// Test inventory service connection
async function testInventoryService() {
    console.log('🧪 Testing inventory service...');
    
    try {
        const directResponse = await fetch(`${API_CONFIG.GATEWAY_URL}/api/auth/admin/inventory/test`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        console.log('Gateway test status:', directResponse.status);
        
        if (directResponse.ok) {
            const directData = await directResponse.json();
            console.log('✅ Inventory service working:', directData);
            return { success: true, data: directData };
        } else {
            const errorText = await directResponse.text();
            console.error('❌ Inventory service error:', errorText);
            return { success: false, error: errorText, status: directResponse.status };
        }
    } catch (error) {
        console.error('❌ Inventory service failed:', error);
        return { success: false, error: error.message };
    }
}

// Fetch inventory with comprehensive error handling
async function fetchInventoryData() {
    console.log('📦 Fetching inventory data...');
    
    // Route through API Gateway to avoid CORS issues
    try {
        console.log('Trying inventory API via gateway...');
        const response = await fetch(`${API_CONFIG.GATEWAY_URL}/api/auth/admin/inventory`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        console.log('Direct API response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Gateway API success:', data);
            return { success: true, data: Array.isArray(data) ? data : [] };
        } else if (response.status === 500) {
            const errorText = await response.text();
            console.error('❌ Server error (500):', errorText);
            return { 
                success: false, 
                error: 'Database connection issue. Please check if MySQL is running and inventoryDB exists.',
                status: 500,
                details: errorText
            };
        } else {
            const errorText = await response.text();
            console.error('❌ API error:', response.status, errorText);
            return { 
                success: false, 
                error: `API Error: ${response.status} ${response.statusText}`,
                status: response.status,
                details: errorText
            };
        }
    } catch (error) {
        console.error('❌ Network error:', error);
        return { 
            success: false, 
            error: 'Network Error: Cannot connect to inventory service via gateway. Please check if the API Gateway is running on port 9999.',
            details: error.message
        };
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
            barcode: `TEST${Date.now()}001`,
            warehouseId: 1,
            inventoryStatus: "AVAILABLE",
            platformStatus: "ENABLED",
            conditionStatus: "NEW",
            mrp: 1000.00,
            showroomPrice: 950.00,
            buyPrice: 800.00,
            sellingPrice: 900.00,
            stockSource: "SUPPLIER",
            isCustomerReturned: false,
            isWarehouseDamaged: false,
            createdBy: 1,
            updatedBy: 1
        },
        {
            productId: 2,
            categoryId: 1,
            subcategoryId: 1,
            barcode: `TEST${Date.now()}002`,
            warehouseId: 1,
            inventoryStatus: "AVAILABLE",
            platformStatus: "ENABLED",
            conditionStatus: "NEW",
            mrp: 1500.00,
            showroomPrice: 1400.00,
            buyPrice: 1200.00,
            sellingPrice: 1350.00,
            stockSource: "SUPPLIER",
            isCustomerReturned: false,
            isWarehouseDamaged: false,
            createdBy: 1,
            updatedBy: 1
        }
    ];
    
    let successCount = 0;
    const results = [];
    
    for (const item of testItems) {
        try {
            const response = await fetch(`${API_CONFIG.GATEWAY_URL}/api/auth/admin/inventory/add`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(item)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Added test item:', result);
                results.push(result);
                successCount++;
            } else {
                const errorText = await response.text();
                console.error('❌ Failed to add item:', errorText);
                results.push({ error: errorText, status: response.status });
            }
        } catch (error) {
            console.error('❌ Error adding item:', error);
            results.push({ error: error.message });
        }
    }
    
    return {
        success: successCount > 0,
        successCount,
        totalItems: testItems.length,
        results
    };
}

// Populate inventory table with enhanced error handling
async function populateInventoryTable() {
    console.log('📊 Populating inventory table...');
    
    const tableBody = document.getElementById('inventory-table-body');
    
    if (!tableBody) {
        console.error('❌ Table body element not found!');
        showErrorMessage('Table element not found. Make sure you have element with id="inventory-table-body"');
        return;
    }
    
    // Show loading
    tableBody.innerHTML = `
        <tr>
            <td colspan="12" class="text-center" style="padding: 40px;">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                    <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <p style="margin: 0; color: #666;">Loading inventory data...</p>
                </div>
            </td>
        </tr>
    `;
    
    // Test service first
    const serviceTest = await testInventoryService();
    
    if (!serviceTest.success) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="12" class="text-center" style="padding: 40px;">
                    <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 20px; color: #721c24;">
                        <h5 style="margin-bottom: 15px;">❌ Inventory Service Not Available</h5>
                        <p style="margin-bottom: 10px;">Cannot connect to inventory service via API Gateway.</p>
                        <div style="text-align: left; margin: 15px 0;">
                            <strong>Please check:</strong>
                            <ul style="margin: 10px 0; padding-left: 20px;">
                                <li>Inventory service is running on port 9093</li>
                                <li>MySQL database is running on port 3306</li>
                                <li>Database 'inventoryDB' exists</li>
                                <li>Service Registry (Eureka) is running on port 8761</li>
                            </ul>
                        </div>
                        <div style="margin-top: 20px;">
                            <button onclick="populateInventoryTable()" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-right: 10px;">Retry Connection</button>
                            <button onclick="showDatabaseSetupInstructions()" style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Database Setup</button>
                        </div>
                        ${serviceTest.error ? `<div style="margin-top: 15px; font-size: 12px; color: #856404; background: #fff3cd; padding: 10px; border-radius: 4px;"><strong>Error Details:</strong> ${serviceTest.error}</div>` : ''}
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Fetch inventory data
    const inventoryResult = await fetchInventoryData();
    
    if (inventoryResult.success && inventoryResult.data.length > 0) {
        tableBody.innerHTML = '';
        
        inventoryResult.data.forEach((item, index) => {
            const row = `
                <tr style="border-bottom: 1px solid #dee2e6;">
                    <td style="padding: 12px;">${item.id || index + 1}</td>
                    <td style="padding: 12px; font-family: monospace;">${item.barcode || 'N/A'}</td>
                    <td style="padding: 12px;">${item.productId || 'N/A'}</td>
                    <td style="padding: 12px;">₹${(item.mrp || 0).toFixed(2)}</td>
                    <td style="padding: 12px;">₹${(item.sellingPrice || 0).toFixed(2)}</td>
                    <td style="padding: 12px;">₹${(item.buyPrice || 0).toFixed(2)}</td>
                    <td style="padding: 12px;">${item.conditionStatus || 'N/A'}</td>
                    <td style="padding: 12px;">
                        <span style="background: ${getStatusColor(item.inventoryStatus)}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px;">
                            ${item.inventoryStatus || 'N/A'}
                        </span>
                    </td>
                    <td style="padding: 12px;">
                        <span style="background: ${getStatusColor(item.platformStatus)}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px;">
                            ${item.platformStatus || 'N/A'}
                        </span>
                    </td>
                    <td style="padding: 12px;">
                        <button onclick="editInventory('${item.barcode}')" style="background: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-right: 5px; font-size: 12px;">Edit</button>
                        <button onclick="viewInventory('${item.barcode}')" style="background: #17a2b8; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; font-size: 12px;">View</button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
        
        console.log(`✅ Successfully populated table with ${inventoryResult.data.length} items`);
        showSuccessMessage(`Loaded ${inventoryResult.data.length} inventory items successfully!`);
        
    } else {
        console.log('ℹ️ No inventory data found');
        
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center" style="padding: 40px;">
                    <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 30px; color: #0c5460;">
                        <h5 style="margin-bottom: 15px;">📦 No Inventory Items Found</h5>
                        <p style="margin-bottom: 20px;">Your inventory is empty. Add some items to get started!</p>
                        <div style="margin-top: 20px;">
                            <button onclick="addTestInventoryData().then(() => setTimeout(populateInventoryTable, 1000))" style="background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; margin-right: 10px; font-weight: bold;">Add Test Data</button>
                            <button onclick="populateInventoryTable()" style="background: #6c757d; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; margin-right: 10px;">Refresh</button>
                            <button onclick="testInventoryService().then(result => console.log('Service test:', result))" style="background: #17a2b8; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer;">Test Service</button>
                        </div>
                        ${inventoryResult.error ? `<div style="margin-top: 20px; font-size: 14px; color: #856404; background: #fff3cd; padding: 15px; border-radius: 4px;"><strong>Error Details:</strong> ${inventoryResult.error}</div>` : ''}
                    </div>
                </td>
            </tr>
        `;
    }
}

// Helper functions
function getStatusColor(status) {
    switch(status?.toUpperCase()) {
        case 'AVAILABLE': return '#28a745';
        case 'ENABLED': return '#28a745';
        case 'ACTIVE': return '#28a745';
        case 'RESERVED': return '#ffc107';
        case 'SOLD': return '#6c757d';
        case 'DISABLED': return '#dc3545';
        case 'INACTIVE': return '#dc3545';
        default: return '#6c757d';
    }
}

function showErrorMessage(message) {
    console.error('❌', message);
    if (typeof alert !== 'undefined') {
        alert('Error: ' + message);
    }
}

function showSuccessMessage(message) {
    console.log('✅', message);
    // You can add toast notification here if available
}

function showDatabaseSetupInstructions() {
    const instructions = `
Database Setup Instructions:

1. Start MySQL Server:
   - Windows: Start MySQL service from Services
   - Mac: brew services start mysql
   - Linux: sudo systemctl start mysql

2. Create Database:
   mysql -u root -p
   CREATE DATABASE IF NOT EXISTS inventoryDB;
   USE inventoryDB;
   SHOW TABLES;

3. Restart Inventory Service:
   - Stop the inventory service
   - Start it again to create tables automatically

4. Check Service Status:
   - Inventory Service: http://localhost:9093/api/inventory/test
   - API Gateway: http://localhost:9999
   - Service Registry: http://localhost:8761
    `;
    
    alert(instructions);
    console.log(instructions);
}

// Placeholder functions
function editInventory(barcode) {
    console.log('Edit inventory:', barcode);
    alert(`Edit functionality for barcode: ${barcode}\n(Not implemented yet)`);
}

function viewInventory(barcode) {
    console.log('View inventory:', barcode);
    alert(`View functionality for barcode: ${barcode}\n(Not implemented yet)`);
}

// Make functions globally available
window.populateInventoryTable = populateInventoryTable;
window.addTestInventoryData = addTestInventoryData;
window.testInventoryService = testInventoryService;
window.fetchInventoryData = fetchInventoryData;
window.showDatabaseSetupInstructions = showDatabaseSetupInstructions;
window.editInventory = editInventory;
window.viewInventory = viewInventory;

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🚀 DOM loaded, inventory fix utility ready');
        if (document.getElementById('inventory-table-body')) {
            populateInventoryTable();
        }
    });
} else {
    console.log('🚀 DOM already loaded, inventory fix utility ready');
    if (document.getElementById('inventory-table-body')) {
        populateInventoryTable();
    }
}

// Add CSS for loading animation
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

export {
    populateInventoryTable,
    addTestInventoryData,
    testInventoryService,
    fetchInventoryData,
    showDatabaseSetupInstructions
};