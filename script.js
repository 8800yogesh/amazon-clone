// Catalog Data Store
const products = [
    {
        id: 1,
        title: "Clothes & Apparel",
        image: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=500",
        price: "$29.99"
    },
    {
        id: 2,
        title: "Health & Personal Care",
        image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500",
        price: "$14.50"
    },
    {
        id: 3,
        title: "Furniture & Decor",
        image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500",
        price: "$199.00"
    },
    {
        id: 4,
        title: "Electronics & Gadgets",
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500",
        price: "$89.99"
    }
];

let cartItemCount = 0;

// Application Initialization
document.addEventListener("DOMContentLoaded", () => {
    renderProducts();
    setupEventListeners();
});

// Render Catalog Grid
function renderProducts() {
    const gridContainer = document.getElementById("product-grid");
    if (!gridContainer) return;

    gridContainer.innerHTML = products.map(product => `
        <div class="box">
            <div class="box-content">
                <h2>${product.title}</h2>
                <div class="box-img" style="background-image: url('${product.image}');"></div>
                <p class="price">${product.price}</p>
                <button class="add-to-cart-btn" onclick="handleAddToCart(${product.id})">Add to Cart</button>
            </div>
        </div>
    `).join("");
}

// Interactivity handlers
function handleAddToCart(productId) {
    cartItemCount++;
    const cartCounterEl = document.getElementById("cart-count");
    if (cartCounterEl) {
        cartCounterEl.innerText = cartItemCount;
    }
}

function setupEventListeners() {
    const backToTopBtn = document.getElementById("back-to-top");
    if (backToTopBtn) {
        backToTopBtn.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }
}