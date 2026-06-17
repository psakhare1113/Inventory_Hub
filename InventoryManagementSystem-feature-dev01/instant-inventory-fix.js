// instant-inventory-fix.js
// Copy and paste this in browser console for instant fix

console.log('🚀 INSTANT INVENTORY FIX STARTING...');

// Instant fix function
async function instantInventoryFix() {
    console.log('⚡ Running instant inventory fix...');
    
    // Test Gateway API
    try {
        console.log('Testing Gateway API...');
        const response = await fetch('http://localhost:9999/api/inventory');
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Gateway API Success! Data:', data);
            
            // Find table body
            const tbody = document.getElementById('inventory-table-body');
            
            if (!tbody) {
                console.error('❌ Table body not found! Make sure you have <tbody id="inventory-table-body">');
                return;
            }
            
            if (data && data.length > 0) {
                // Populate table immediately
                tbody.innerHTML = data.map(item => `
                    <tr>
                        <td>${item.barcode || 'N/A'}</td>
                        <td>${item.productId || 'N/A'}</td>
                        <td>Product ${item.productId || 'Unknown'}</td>
                        <td>Category ${item.categoryId || 'Unknown'}</td>
                        <td>Subcategory ${item.subcategoryId || 'Unknown'}</td>
                        <td><span class="badge badge-success">${item.inventoryStatus || 'N/A'}</span></td>
                        <td><span class="badge badge-primary">${item.platformStatus || 'N/A'}</span></td>
                        <td>${item.conditionStatus || 'N/A'}</td>
                        <td>₹${item.mrp || 0}</td>
                        <td>₹${item.sellingPrice || 0}</td>
                        <td>${item.warehouseId || 'N/A'}</td>
                        <td>
                            <button class="btn btn-sm btn-primary">Edit</button>
                            <button class="btn btn-sm btn-info">View</button>
                        </td>
                    </tr>
                `).join('');
                
                console.log(`🎉 SUCCESS! Table populated with ${data.length} items!`);
                alert(`🎉 SUCCESS! Loaded ${data.length} inventory items!`);
                
            } else {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="12" class="text-center">
                            <div class="alert alert-warning">
                                <h5>📦 No Data Found</h5>
                                <p>API is working but no inventory data found.</p>
                                <button onclick="addTestData()" class="btn btn-primary">Add Test Data</button>
                            </div>
                        </td>
                    </tr>
                `;
                console.log('ℹ️ API works but no data found');
            }
            
        } else {
            console.error('❌ Gateway API failed:', response.status);
            tryDirectAPI();
        }
        
    } catch (error) {
        console.error('❌ Gateway API error:', error);
        tryDirectAPI();
    }
}

// Try direct API if gateway fails
async function tryDirectAPI() {
    console.log('Trying Direct API...');
    
    try {
        const response = await fetch('http://localhost:9093/api/inventory');
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Direct API Success! Data:', data);
            
            const tbody = document.getElementById('inventory-table-body');
            if (tbody && data && data.length > 0) {
                tbody.innerHTML = data.map(item => `
                    <tr>
                        <td>${item.barcode}</td>
                        <td>${item.productId}</td>
                        <td>Product ${item.productId}</td>
                        <td>Category ${item.categoryId}</td>
                        <td>Subcategory ${item.subcategoryId}</td>
                        <td><span class="badge badge-success">${item.inventoryStatus}</span></td>
                        <td><span class="badge badge-primary">${item.platformStatus}</span></td>
                        <td>${item.conditionStatus}</td>
                        <td>₹${item.mrp}</td>
                        <td>₹${item.sellingPrice}</td>
                        <td>${item.warehouseId}</td>
                        <td><button class="btn btn-sm btn-primary">Edit</button></td>
                    </tr>
                `).join('');
                
                console.log(`🎉 SUCCESS via Direct API! ${data.length} items loaded!`);
                alert(`🎉 SUCCESS! Loaded ${data.length} items via Direct API!`);
            }
        } else {
            console.error('❌ Direct API also failed:', response.status);
            showError();
        }
    } catch (error) {
        console.error('❌ Direct API error:', error);
        showError();
    }
}

// Show error message
function showError() {
    const tbody = document.getElementById('inventory-table-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="12" class="text-center">
                    <div class="alert alert-danger">
                        <h5>❌ Connection Error</h5>
                        <p>Cannot connect to inventory service.</p>
                        <p>Please check:</p>
                        <ul>
                            <li>Inventory service is running on port 9093</li>
                            <li>API Gateway is running on port 9999</li>
                            <li>Database connection is working</li>
                        </ul>
                        <button onclick="instantInventoryFix()" class="btn btn-primary">Retry</button>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Add test data function
async function addTestData() {
    console.log('Adding test data...');
    
    const testItem = {
        productId: 1,
        categoryId: 1,
        subcategoryId: 1,
        barcode: "INSTANT001",
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
    };
    
    try {
        const response = await fetch('http://localhost:9093/api/inventory/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testItem)
        });
        
        if (response.ok) {
            console.log('✅ Test data added!');
            setTimeout(() => instantInventoryFix(), 1000);
        }
    } catch (error) {
        console.error('❌ Failed to add test data:', error);
    }
}

// Make functions global
window.instantInventoryFix = instantInventoryFix;
window.addTestData = addTestData;

// Auto-run the fix
instantInventoryFix();

console.log('⚡ INSTANT FIX READY! Run instantInventoryFix() anytime!');