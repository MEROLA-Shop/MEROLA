
// =====================================
// MEROLA STORE - SUPABASE VERSION
// =====================================

let products = [];

let cart = JSON.parse(
    localStorage.getItem("merolaCartIds") || "[]"
);


// =====================================
// HTML SAFETY
// =====================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}


// =====================================
// SHIPPING
// =====================================

const LOW_SHIPPING_GOVERNORATES = [
    "Cairo",
    "Alexandria",
    "Giza",
    "Gharbia",
    "Sharqia",
    "Kafr El Sheikh"
];

function getShippingCost(governorate) {
    if (!governorate) return 0;

    return LOW_SHIPPING_GOVERNORATES.includes(governorate)
        ? 50
        : 100;
}

function getCheckoutProductsTotal() {
    const savedCart = JSON.parse(
        localStorage.getItem("merolaCart") || "[]"
    );

    return savedCart.reduce(
        (sum, item) =>
            sum + (Number(item.finalPrice) * Number(item.quantity)),
        0
    );
}

function updateCheckoutTotal() {
    const cityElement = document.getElementById("customer-city");

    if (!cityElement) return;

    const shipping = getShippingCost(cityElement.value);
    const productsTotal = getCheckoutProductsTotal();
    const grandTotal = productsTotal + shipping;

    const shippingElement = document.getElementById("checkout-shipping");
    const totalElement = document.getElementById("checkout-total");

    if (shippingElement) {
        shippingElement.textContent = cityElement.value
            ? shipping
            : "—";
    }

    if (totalElement) {
        totalElement.textContent = grandTotal;
    }
}

const citySelect = document.getElementById("customer-city");

if (citySelect) {
    citySelect.addEventListener("change", updateCheckoutTotal);
}


// =====================================
// LOAD PRODUCTS FROM SUPABASE
// =====================================

async function loadProducts() {
    try {
        const { data, error } = await supabaseClient
            .from("products")
            .select("*")
            .eq("is_active", true);

        if (error) throw error;

        products = data.map(product => ({
            id: product.id,
            name: product.name,
            category: product.category,
            description: product.description,
            price: product.price === null
                ? null
                : Number(product.price),
            oldPrice: product.old_price === null
                ? null
                : Number(product.old_price),
            offerUntil: product.offer_until,
            imageUrl: product.image_url,
            galleryUrls: Array.isArray(product.gallery_urls)
                ? product.gallery_urls
                : []
        }));

        displayProducts();
        displayProductDetails();
        updateCart();
        displayCheckoutSummary();

        console.log("MEROLA Products Loaded Successfully!", products);

    } catch (error) {
        console.error("Error loading products:", error);
        alert("Could not load products. Please check your connection.");
    }
}


// =====================================
// OFFERS
// =====================================

function isOfferActive(product) {
    if (
        product.price === null ||
        product.oldPrice === null ||
        !product.offerUntil ||
        product.oldPrice <= product.price
    ) {
        return false;
    }

    const expiry = new Date(product.offerUntil);

    return expiry >= new Date();
}


function getProductPrice(product) {
    if (product.price === null) return null;

    if (
        product.oldPrice !== null &&
        product.offerUntil &&
        !isOfferActive(product)
    ) {
        return product.oldPrice;
    }

    return product.price;
}


// =====================================
// DISPLAY PRODUCT CARDS
// =====================================

function displayProducts() {
    const hair = document.getElementById("hair-products");
    const skin = document.getElementById("skin-products");
    const offers = document.getElementById("offer-products");

    if (hair) hair.innerHTML = "";
    if (skin) skin.innerHTML = "";
    if (offers) offers.innerHTML = "";

    products.forEach(product => {
        const activeOffer = isOfferActive(product);
        const currentPrice = getProductPrice(product);

        const discount = activeOffer && product.oldPrice
            ? Math.round((1 - currentPrice / product.oldPrice) * 100)
            : 0;

        const priceHTML = currentPrice !== null
            ? `<h4>${currentPrice} EGP</h4>
               ${activeOffer
                    ? `<del>${product.oldPrice} EGP</del>
                       <span class="discount">${discount}% OFF</span>`
                    : ""}`
            : `<h4>Contact for price</h4>`;

        const imageHTML = product.imageUrl
            ? `<img src="${escapeHTML(product.imageUrl)}"
                    alt="${escapeHTML(product.name)}"
                    class="product-photo">`
            : `<div class="product-image">${escapeHTML(product.name)}</div>`;

        const productId = JSON.stringify(String(product.id));

        const detailsLink = `product.html?id=${encodeURIComponent(product.id)}`;

        const card = `
            <div class="product-card">

                ${imageHTML}

                <h3>${escapeHTML(product.name)}</h3>

                ${priceHTML}

                <a href="${detailsLink}" class="details-btn">
                    VIEW DETAILS
                </a>

                <button onclick='addToCart(${productId})'>
                    ADD TO CART
                </button>

            </div>
        `;

        if (product.category === "hair" && hair) {
            hair.innerHTML += card;
        }

        if (product.category === "skin" && skin) {
            skin.innerHTML += card;
        }

        if (activeOffer && offers) {
            offers.innerHTML += card;
        }
    });
}


// =====================================
// PRODUCT DETAILS PAGE
// =====================================

function displayProductDetails() {
    const detailsContainer = document.getElementById("product-details");

    if (!detailsContainer) return;

    const params = new URLSearchParams(window.location.search);
    const productId = params.get("id");

    const product = products.find(
        p => String(p.id) === String(productId)
    );

    if (!product) {
        detailsContainer.innerHTML = `
            <h2>Product Not Found</h2>
            <p>This product may no longer be available.</p>
            <a href="hair-care.html">Back to Hair Care</a>
        `;
        return;
    }

    const activeOffer = isOfferActive(product);
    const currentPrice = getProductPrice(product);

    const discount = activeOffer && product.oldPrice
        ? Math.round((1 - currentPrice / product.oldPrice) * 100)
        : 0;

    const priceHTML = currentPrice !== null
        ? `<h2>${currentPrice} EGP</h2>
           ${activeOffer
                ? `<del>${product.oldPrice} EGP</del>
                   <span class="discount">${discount}% OFF</span>`
                : ""}`
        : `<h2>Contact for price</h2>`;

    const mainImage = product.imageUrl
        ? `<img id="main-product-image"
                src="${escapeHTML(product.imageUrl)}"
                alt="${escapeHTML(product.name)}">`
        : `<div class="product-image">${escapeHTML(product.name)}</div>`;

    const gallery = [
        ...(product.imageUrl ? [product.imageUrl] : []),
        ...product.galleryUrls
    ].filter((url, index, array) =>
        url && array.indexOf(url) === index
    );

    const galleryHTML = gallery.length > 1
        ? `<div class="product-gallery">
            ${gallery.map(url => `
                <button type="button"
                        class="gallery-image"
                        data-image="${escapeHTML(url)}">
                    <img src="${escapeHTML(url)}"
                         alt="${escapeHTML(product.name)}">
                </button>
            `).join("")}
           </div>`
        : "";

    const productIdJSON = JSON.stringify(String(product.id));

    detailsContainer.innerHTML = `
        <div class="product-details-layout">

            <div class="product-details-images">
                ${mainImage}
                ${galleryHTML}
            </div>

            <div class="product-details-info">

                <span class="product-category">
                    MEROLA ${escapeHTML(product.category).toUpperCase()}
                </span>

                <h1>${escapeHTML(product.name)}</h1>

                <div class="product-details-price">
                    ${priceHTML}
                </div>

                <div class="product-description">
                    ${escapeHTML(product.description || "More product details coming soon.")}
                </div>

                <button type="button"
                        class="details-add-cart"
                        onclick='addToCart(${productIdJSON})'>
                    ADD TO CART
                </button>

                <a href="${product.category === "hair" ? "hair-care.html" : "skin-care.html"}"
                   class="back-to-products">
                    ← BACK TO COLLECTION
                </a>

            </div>

        </div>
    `;

    detailsContainer.querySelectorAll(".gallery-image").forEach(button => {
        button.addEventListener("click", function() {
            const mainImageElement = document.getElementById("main-product-image");

            if (mainImageElement) {
                mainImageElement.src = this.dataset.image;
            }
        });
    });
}


// =====================================
// ADD TO CART
// =====================================

function addToCart(productId) {
    const product = products.find(
        p => String(p.id) === String(productId)
    );

    if (!product || getProductPrice(product) === null) {
        alert("Product price is not available yet!");
        return;
    }

    const existing = cart.find(
        item => String(item.id) === String(productId)
    );

    if (existing) {
        existing.quantity++;
    } else {
        cart.push({
            id: productId,
            quantity: 1
        });
    }

    localStorage.setItem(
        "merolaCartIds",
        JSON.stringify(cart)
    );

    updateCart();

    alert("Added to cart successfully!");
}


// =====================================
// UPDATE CART
// =====================================

function updateCart() {
    const cartItems = document.getElementById("cart-items");
    const cartCount = document.getElementById("cart-count");
    const cartTotal = document.getElementById("cart-total");

    let total = 0;
    let count = 0;

    if (cartItems) cartItems.innerHTML = "";

    cart = cart.filter(item =>
        products.some(
            product => String(product.id) === String(item.id)
        )
    );

    cart.forEach(item => {
        const product = products.find(
            p => String(p.id) === String(item.id)
        );

        if (!product) return;

        const price = getProductPrice(product);

        if (price === null) return;

        const subtotal = price * item.quantity;

        total += subtotal;
        count += item.quantity;

        if (cartItems) {
            cartItems.innerHTML += `
                <div class="cart-item">
                    <h3>${escapeHTML(product.name)}</h3>
                    <p>Quantity: ${item.quantity}</p>
                    <p>${subtotal} EGP</p>

                    <button onclick='changeQuantity("${escapeHTML(item.id)}", -1)'>-</button>
                    <button onclick='changeQuantity("${escapeHTML(item.id)}", 1)'>+</button>
                    <button onclick='removeFromCart("${escapeHTML(item.id)}")'>Remove</button>
                </div>
            `;
        }
    });

    if (cartCount) cartCount.textContent = count;
    if (cartTotal) cartTotal.textContent = total;

    localStorage.setItem(
        "merolaCartIds",
        JSON.stringify(cart)
    );
}


// =====================================
// CHANGE QUANTITY
// =====================================

function changeQuantity(id, amount) {
    const item = cart.find(
        p => String(p.id) === String(id)
    );

    if (!item) return;

    item.quantity += amount;

    if (item.quantity <= 0) {
        removeFromCart(id);
        return;
    }

    updateCart();
}


// =====================================
// REMOVE PRODUCT
// =====================================

function removeFromCart(id) {
    cart = cart.filter(
        item => String(item.id) !== String(id)
    );

    updateCart();
}


// =====================================
// OPEN AND CLOSE CART
// =====================================

function toggleCart() {
    const box = document.getElementById("cart-box");

    if (!box) return;

    box.style.display =
        box.style.display === "block" ? "none" : "block";
}


// =====================================
// CHECKOUT
// =====================================

function checkout() {
    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    const orderItems = cart.map(item => {
        const product = products.find(
            p => String(p.id) === String(item.id)
        );

        if (!product) return null;

        return {
            ...product,
            quantity: item.quantity,
            finalPrice: getProductPrice(product)
        };

    }).filter(Boolean);

    if (orderItems.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    localStorage.setItem(
        "merolaCart",
        JSON.stringify(orderItems)
    );

    window.location.href = "checkout.html";
}


// =====================================
// CHECKOUT SUMMARY
// =====================================

function displayCheckoutSummary() {
    const checkoutItems = document.getElementById("checkout-items");

    if (!checkoutItems) return;

    const savedCart = JSON.parse(
        localStorage.getItem("merolaCart") || "[]"
    );

    checkoutItems.innerHTML = "";

    savedCart.forEach(item => {
        const subtotal = item.finalPrice * item.quantity;

        checkoutItems.innerHTML += `
            <div class="checkout-product">
                <span>${escapeHTML(item.name)} × ${item.quantity}</span>
                <span>${subtotal} EGP</span>
            </div>
        `;
    });

    updateCheckoutTotal();
}


// =====================================
// CONFIRM ORDER - SUPABASE
// =====================================

const checkoutForm = document.getElementById("checkout-form");

if (checkoutForm) {
    checkoutForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const savedCart = JSON.parse(
            localStorage.getItem("merolaCart") || "[]"
        );

        if (savedCart.length === 0) {
            alert("Your cart is empty!");
            return;
        }

        const governorate = document.getElementById("customer-city").value;

        if (!governorate) {
            alert("Please choose your governorate.");
            return;
        }

        const productsTotal = savedCart.reduce(
            (sum, item) =>
                sum + (Number(item.finalPrice) * Number(item.quantity)),
            0
        );

        const shippingCost = getShippingCost(governorate);

        const order = {
            customer_name: document.getElementById("customer-name").value.trim(),

            phone: document.getElementById("customer-phone").value.trim(),

            city: governorate,

            address: document.getElementById("customer-address").value.trim(),

            notes: document.getElementById("customer-notes").value.trim(),

            products: savedCart,

            shipping_cost: shippingCost,

            total: productsTotal + shippingCost,

            status: "Pending"
        };

        const submitButton = checkoutForm.querySelector(
            'button[type="submit"]'
        );

        submitButton.disabled = true;
        submitButton.textContent = "SENDING ORDER...";

        try {
            const { error } = await supabaseClient
                .from("orders")
                .insert([order]);

            if (error) throw error;

            localStorage.removeItem("merolaCart");
            localStorage.removeItem("merolaCartIds");

            cart = [];

            alert("Your order has been placed successfully!");

            checkoutForm.reset();

            window.location.href = "index.html";

        } catch (error) {
            console.error("MEROLA ORDER ERROR:", error);

            alert(
                "Could not place your order:\n" +
                (error.message || "Unknown error")
            );

        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "PLACE MY ORDER";
        }
    });
}


// =====================================
// START STORE
// =====================================

loadProducts();
