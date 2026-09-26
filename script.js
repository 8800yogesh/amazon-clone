// =========================================================
// Configuration & State Management
// =========================================================
const SUPABASE_URL = "https://ubjhthbdjmwgmikwfcih.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViamh0aGJkam13Z21pa3dmY2loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNjg3MzgsImV4cCI6MjEwNTk0NDczOH0.TieBK6755rXXgDTL8Fci_SOpwbZoSqC_2mvjrZZ0BNg";
const GEMINI_API_KEY = "AQ.Ab8RN6IS77NGmNVvT-T7xI7mFrxfQqa43T-T-9mCnQmsfuUziQ";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let productsList = [];
let myCart = [];
let myWishlist = [];
let appliedDiscount = 0;

// Dynamic Delivery Date Generator
function getDeliveryDate() {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// =========================================================
// Database Data Fetching
// =========================================================
async function loadProductsFromDB() {
    try {
        const { data, error } = await db.from('products').select('*');

        if (error) {
            console.error("DB Fetch Error:", error.message);
            showNotification("Failed to load products");
            return;
        }

        productsList = data || [];
        renderProducts(productsList);
    } catch (err) {
        console.error("Server Error:", err);
    }
}

// =========================================================
// Rendering Products Grid
// =========================================================
function renderProducts(items) {
    const container = document.getElementById('products-container');
    container.innerHTML = '';

    if (!items || items.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align:center; padding: 40px; color: #666;">
                <h3>No products found matching your request.</h3>
            </div>`;
        return;
    }

    const etaDate = getDeliveryDate();

    items.forEach(item => {
        const isFav = myWishlist.includes(item.id);
        
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="card-top">
                <span class="category-badge">${item.category || 'General'}</span>
                <button class="wish-btn-card" onclick="handleWishlist('${item.id}')">${isFav ? '❤️' : '🤍'}</button>
            </div>
            <img src="${item.image_url}" alt="${item.title}" onclick="showQuickView('${item.id}')">
            <h3 class="product-title" onclick="showQuickView('${item.id}')">${item.title}</h3>
            
            <div class="rating-stock">
                <span class="rating">★ ${item.rating}</span>
                <span class="stock">Stock: ${item.stock}</span>
            </div>
            
            <div class="delivery-badge">FREE Delivery by <strong>${etaDate}</strong></div>
            <div class="price">$${item.price}</div>
            
            <div class="card-buttons">
                <button class="add-to-cart-btn" onclick="handleAddToCart('${item.id}')">Add to Cart</button>
                <button class="buy-now-btn" onclick="handleBuyNow('${item.id}')">Buy Now</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Wishlist Handler
function handleWishlist(pId) {
    const index = myWishlist.indexOf(pId);
    if (index > -1) {
        myWishlist.splice(index, 1);
        showNotification("Item removed from Wishlist");
    } else {
        myWishlist.push(pId);
        showNotification("Item added to Wishlist ❤️");
    }
    document.getElementById('wish-count').innerText = myWishlist.length;
    applyFilters();
}

// =========================================================
// Search, Category & Sorting Filters
// =========================================================
function applyFilters() {
    const query = document.getElementById('search-input').value.trim().toLowerCase();
    const selCat = document.getElementById('category-filter').value;
    const sortOpt = document.getElementById('sort-filter').value;

    let filtered = productsList.filter(prod => {
        const matchSearch = prod.title.toLowerCase().includes(query) || 
                            (prod.description && prod.description.toLowerCase().includes(query));
        const matchCategory = (selCat === 'All') || (prod.category === selCat);
        return matchSearch && matchCategory;
    });

    if (sortOpt === 'low-high') {
        filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (sortOpt === 'high-low') {
        filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    } else if (sortOpt === 'rating') {
        filtered.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
    }

    renderProducts(filtered);
}

// =========================================================
// REAL AI FEATURE (Google Gemini API)
// =========================================================

async function askAIAssistant(userPrompt) {
    if (!userPrompt || userPrompt.trim() === "") return;

    // Check agar key change nahi hui hai
    if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE" || !GEMINI_API_KEY) {
        showNotification("⚠️ Gemini Key missing! Using Smart Local AI.");
        runLocalAISearch(userPrompt);
        return;
    }
    
    showNotification("🤖 Gemini AI searching...");

    const promptText = `
You are an e-commerce assistant.
Catalog JSON: ${JSON.stringify(productsList.map(p => ({ id: p.id, title: p.title, desc: p.description, cat: p.category })))}

User Query: "${userPrompt}"

Return ONLY a JSON array of matching product ID strings.
Example output format: ["uuid1", "uuid2"]
Do not add markdown formatting or extra text.
`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }]
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error("Gemini API Error Response:", data.error);
            showNotification("⚠️ API Key Error. Switching to Local AI.");
            runLocalAISearch(userPrompt);
            return;
        }

        const rawText = data.candidates[0].content.parts[0].text;
        // Clean JSON response (Markdown wrapper remove karna)
        const cleanJSON = rawText.replace(/```json|```/g, "").trim();
        const matchedIds = JSON.parse(cleanJSON);

        const aiResults = productsList.filter(p => matchedIds.includes(p.id));

        if (aiResults.length > 0) {
            renderProducts(aiResults);
            showNotification(`🤖 AI found ${aiResults.length} matches!`);
        } else {
            runLocalAISearch(userPrompt);
        }

    } catch (err) {
        console.error("AI Fetch Error:", err);
        // Fail hone par auto Local AI chalega
        runLocalAISearch(userPrompt);
    }
}

// Fail-safe Local Smart AI Function
function runLocalAISearch(userPrompt) {
    const query = userPrompt.toLowerCase();
    const words = query.split(/\s+/).filter(w => w.length > 2);

    const aiResults = productsList.filter(p => {
        const text = `${p.title} ${p.description} ${p.category}`.toLowerCase();
        return words.some(word => text.includes(word));
    });

    if (aiResults.length > 0) {
        renderProducts(aiResults);
        showNotification(`🤖 Smart AI found ${aiResults.length} results!`);
    } else {
        showNotification("No matching products found.");
        applyFilters();
    }
}
// =========================================================
// Cart Operations
// =========================================================
function handleAddToCart(pId) {
    const item = productsList.find(p => p.id === pId);
    if (item) {
        myCart.push(item);
        refreshCartUI();
        showNotification(`Added "${item.title}" to cart!`);
    }
}

function handleBuyNow(pId) {
    const item = productsList.find(p => p.id === pId);
    if (item) {
        myCart = [item];
        refreshCartUI();
        openCheckout();
    }
}

function removeCartItem(index) {
    myCart.splice(index, 1);
    refreshCartUI();
}

function refreshCartUI() {
    document.getElementById('cart-count').innerText = myCart.length;
    const list = document.getElementById('cart-items');
    list.innerHTML = '';

    if (myCart.length === 0) {
        list.innerHTML = `<p style="text-align:center; padding: 20px; color:#888;">Your cart is empty.</p>`;
    }

    let subtotal = 0;
    myCart.forEach((prod, idx) => {
        subtotal += parseFloat(prod.price);
        const row = document.createElement('div');
        row.className = 'cart-item';
        row.innerHTML = `
            <div>
                <strong>${prod.title}</strong>
                <p>$${prod.price}</p>
            </div>
            <button onclick="removeCartItem(${idx})" style="background:#e74c3c; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer;">X</button>
        `;
        list.appendChild(row);
    });

    let finalTotal = subtotal - (subtotal * appliedDiscount / 100);
    document.getElementById('cart-total').innerText = finalTotal.toFixed(2);
}

// Promo Code
document.getElementById('apply-coupon-btn').addEventListener('click', () => {
    const code = document.getElementById('coupon-code').value.trim().toUpperCase();
    if (code === 'HACK20') {
        appliedDiscount = 20;
        document.getElementById('discount-text').style.display = 'block';
        refreshCartUI();
        showNotification("Applied HACK20 (20% OFF)!");
    } else {
        alert("Invalid Promo Code! Try using 'HACK20'.");
    }
});

// Checkout Procedure
function openCheckout() {
    if (myCart.length === 0) {
        alert("Your cart is empty!");
        return;
    }
    const finalVal = document.getElementById('cart-total').innerText;
    document.getElementById('checkout-total-price').innerText = `$${finalVal}`;
    document.getElementById('cart-sidebar').classList.remove('open');
    document.getElementById('checkout-modal').style.display = 'flex';
}

// Quick View Modal
function showQuickView(pId) {
    const target = productsList.find(p => p.id === pId);
    if (!target) return;

    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <img src="${target.image_url}" style="width:100%; height:180px; object-fit:contain;">
        <h2 style="font-size:16px; margin-top:10px;">${target.title}</h2>
        <p style="margin:8px 0; color:#555; font-size:12px;">${target.description}</p>
        <p style="font-size:12px;"><strong>Category:</strong> ${target.category}</p>
        <h3 style="color:#B12704; margin-top:10px;">Price: $${target.price}</h3>
        <button class="primary-btn" style="margin-top:15px;" onclick="handleAddToCart('${target.id}')">Add to Cart</button>
    `;
    document.getElementById('product-modal').style.display = 'flex';
}

// =========================================================
// CUSTOM PINCODE MODAL
// =========================================================
const pinModal = document.getElementById('pincode-modal');
const pinInput = document.getElementById('pincode-input');

document.getElementById('delivery-location-btn').onclick = () => {
    pinModal.style.display = 'flex';
    pinInput.value = '110001';
};
document.getElementById('cancel-pincode-btn').onclick = () => pinModal.style.display = 'none';
document.getElementById('apply-pincode-btn').onclick = () => {
    const val = pinInput.value.trim();
    if (val.length === 6 && !isNaN(val)) {
        document.querySelector('.nav-line-1').innerText = `Delivering to Pincode ${val}`;
        showNotification(`Location updated to ${val}`);
        pinModal.style.display = 'none';
    } else {
        alert("Please enter a valid 6-digit pincode.");
    }
};

// AI Budget Finder Widget Event
document.getElementById('ai-find-btn').addEventListener('click', () => {
    const maxBudget = parseFloat(document.getElementById('ai-budget-input').value);
    if (!maxBudget || maxBudget <= 0) {
        alert("Please enter a valid budget amount!");
        return;
    }

    const affordableItems = productsList.filter(p => parseFloat(p.price) <= maxBudget);
    if (affordableItems.length === 0) {
        showNotification("No products found under this budget!");
    } else {
        affordableItems.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
        renderProducts([affordableItems[0]]);
        showNotification(`🤖 AI recommends: ${affordableItems[0].title}`);
    }
});

// Lightning Deal Timer
function startLightningTimer() {
    let duration = 4 * 3600 + 29 * 60 + 55;
    const timerElem = document.getElementById('timer-display');

    setInterval(() => {
        let h = Math.floor(duration / 3600);
        let m = Math.floor((duration % 3600) / 60);
        let s = duration % 60;

        timerElem.innerText = `${h < 10 ? '0' + h : h}h ${m < 10 ? '0' + m : m}m ${s < 10 ? '0' + s : s}s`;

        if (duration > 0) duration--;
    }, 1000);
}

// Toast Function
function showNotification(msg) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.className = "toast show";
    setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
}

// =========================================================
// Global Event Listeners
// =========================================================
document.getElementById('cart-btn').onclick = () => document.getElementById('cart-sidebar').classList.add('open');
document.getElementById('close-cart-btn').onclick = () => document.getElementById('cart-sidebar').classList.remove('open');
document.getElementById('close-modal-btn').onclick = () => document.getElementById('product-modal').style.display = 'none';
document.getElementById('close-checkout-btn').onclick = () => document.getElementById('checkout-modal').style.display = 'none';
document.getElementById('checkout-btn').onclick = openCheckout;

document.getElementById('reset-filters-btn').onclick = () => {
    document.getElementById('search-input').value = '';
    document.getElementById('category-filter').value = 'All';
    document.getElementById('sort-filter').value = 'default';
    renderProducts(productsList);
};

// Search Handlers (Normal Filter + AI Search Trigger)
document.getElementById('search-btn').onclick = () => {
    const query = document.getElementById('search-input').value.trim();
    if (query.length > 3) {
        askAIAssistant(query);
    } else {
        applyFilters();
    }
};

document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('search-btn').click();
    }
});

// Form Submit
document.getElementById('checkout-form').addEventListener('submit', (e) => {
    e.preventDefault();
    showNotification("🎉 Order placed successfully!");
    
    document.getElementById('order-tracker-bar').style.display = 'block';
    document.getElementById('track-date').innerText = getDeliveryDate();

    myCart = [];
    appliedDiscount = 0;
    refreshCartUI();
    document.getElementById('checkout-modal').style.display = 'none';
});

// Category/Sort Change
document.getElementById('category-filter').onchange = applyFilters;
document.getElementById('sort-filter').onchange = applyFilters;

// Initialize
loadProductsFromDB();
startLightningTimer();