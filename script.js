
// =====================================
// MEROLA STORE - SUPABASE VERSION
// =====================================

// Products loaded from Supabase
let products = [];

// Cart saved locally
let cart = JSON.parse(
    localStorage.getItem("merolaCartIds") || "[]"
);


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
            galleryUrls: product.gallery_urls || []
        }));

        displayProducts();
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
// DISPLAY PRODUCTS
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
               ${activeOffer ? `<del>${product.oldPrice} EGP</del>
               <span class="discount">${discount}% OFF</span>` : ""}`
            : `<h4>Contact for price</h4>`;

        const imageHTML = product.imageUrl
            ? `<img src="${product.imageUrl}" alt="${product.name}" class="product-photo">`
            : `<div class="product-image">${product.name}</div>`;

        const productId = JSON.stringify(String(product.id));

        const card = `
            <div class="product-card">
                ${imageHTML}
                <h3>${product.name}</h3>
                <p>${product.description || ""}</p>
                ${priceHTML}
                <button onclick='addToCart(${productId})'>ADD TO CART</button>
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

                    <h3>${product.name}</h3>
                    <p>Quantity: ${item.quantity}</p>
                    <p>${subtotal} EGP</p>

                    <button onclick='changeQuantity("${item.id}", -1)'>
                        -
                    </button>

                    <button onclick='changeQuantity("${item.id}", 1)'>
                        +
                    </button>

                    <button onclick='removeFromCart("${item.id}")'>
                        Remove
                    </button>

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

    let total = 0;

    checkoutItems.innerHTML = "";

    savedCart.forEach(item => {
        const subtotal = item.finalPrice * item.quantity;

        total += subtotal;

        checkoutItems.innerHTML += `
            <div class="checkout-product">
                <span>${item.name} × ${item.quantity}</span>
                <span>${subtotal} EGP</span>
            </div>
        `;
    });

    const totalElement = document.getElementById("checkout-total");

    if (totalElement) {
        totalElement.textContent = total;
    }
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

        const order = {
            customer_name: document.getElementById("customer-name").value.trim(),

            phone: document.getElementById("customer-phone").value.trim(),

            city: document.getElementById("customer-city").value.trim(),

            address: document.getElementById("customer-address").value.trim(),

            notes: document.getElementById("customer-notes").value.trim(),

            products: savedCart,

            total: savedCart.reduce(
                (sum, item) =>
                    sum + (Number(item.finalPrice) * Number(item.quantity)),
                0
            ),

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
            submitButton.textContent = "CONFIRM ORDER";
        }
    });
}


// =====================================
// START STORE
// =====================================

loadProducts();
