
const ADMIN_UID = "d4502d44-fc11-4247-b4aa-070b84e6baf2";
const STORAGE_BUCKET = "MEROLA-image";
const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");
const loginForm = document.getElementById("login-form");
const productForm = document.getElementById("product-form");
const productsContainer = document.getElementById("admin-products");

const imageInput = document.getElementById("product-image");
const imagePreview = document.getElementById("image-preview");
const imagePreviewContainer = document.getElementById("image-preview-container");

let products = [];
let previewObjectUrl = null;

// Image preview
imageInput.addEventListener("change", function () {
    const file = imageInput.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert("Please choose a valid image.");
        imageInput.value = "";
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        alert("Image size must not exceed 5 MB.");
        imageInput.value = "";
        return;
    }

    if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
    }

    previewObjectUrl = URL.createObjectURL(file);
    imagePreview.src = previewObjectUrl;
    imagePreviewContainer.hidden = false;
});

// Show image
function showImage(url) {
    if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = null;
    }

    if (url) {
        imagePreview.src = url;
        imagePreviewContainer.hidden = false;
    } else {
        imagePreview.src = "";
        imagePreviewContainer.hidden = true;
    }
}

// Check login session
async function checkLogin() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        alert(error.message);
        return;
    }

    const user = data.session?.user;

    if (user && user.id === ADMIN_UID) {
        showDashboard();
    } else {
        await supabaseClient.auth.signOut();
        showLogin();
    }
}

function showLogin() {
    loginSection.hidden = false;
    dashboardSection.hidden = true;
}

function showDashboard() {
    loginSection.hidden = true;
    dashboardSection.hidden = false;
    loadProducts();
}

// Login
loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        alert("Login failed: " + error.message);
        return;
    }

    if (data.user.id !== ADMIN_UID) {
        await supabaseClient.auth.signOut();
        alert("You are not authorized to access this dashboard.");
        return;
    }

    loginForm.reset();
    showDashboard();
});

// Logout
document.getElementById("logout-button").addEventListener("click", async function () {
    await supabaseClient.auth.signOut();

    products = [];
    productsContainer.innerHTML = "";

    showLogin();
});

// Load products
async function loadProducts() {
    productsContainer.textContent = "Loading products...";

    const { data, error } = await supabaseClient
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        productsContainer.textContent = "Error: " + error.message;
        return;
    }

    products = data || [];
    renderAdminProducts();
}

// Display products
function renderAdminProducts() {
    productsContainer.innerHTML = "";

    if (products.length === 0) {
        productsContainer.textContent = "No products found.";
        return;
    }

    products.forEach(product => {
        const card = document.createElement("div");
        card.className = "admin-product";

        if (product.image_url) {
            const image = document.createElement("img");
            image.src = product.image_url;
            image.alt = product.name;
            image.style.width = "120px";
            image.style.height = "120px";
            image.style.objectFit = "cover";
            image.style.borderRadius = "10px";
            card.appendChild(image);
        }

        const title = document.createElement("h3");
        title.textContent = product.name;

        const category = document.createElement("p");
        category.textContent = "Category: " + product.category;

        const price = document.createElement("p");
        price.textContent = "Price: " + (product.price ?? "Not set");

        const oldPrice = document.createElement("p");
        oldPrice.textContent = "Original Price: " + (product.old_price ?? "Not set");

        const editButton = document.createElement("button");
        editButton.textContent = "EDIT";
        editButton.addEventListener("click", () => editProduct(product.id));

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "DELETE";
        deleteButton.addEventListener("click", () => deleteProduct(product.id));

        card.append(title, category, price, oldPrice, editButton, deleteButton);
        productsContainer.appendChild(card);
    });
}

// Upload image to Supabase Storage
async function uploadProductImage(file) {
    const extension = file.name.split(".").pop().toLowerCase();
    const safeExtension = /^[a-z0-9]+$/.test(extension) ? extension : "jpg";

    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExtension}`;
    const filePath = `products/${fileName}`;

    const { error } = await supabaseClient.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type
        });

    if (error) {
        throw error;
    }

    const { data } = supabaseClient.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

    if (!data?.publicUrl) {
        throw new Error("Could not generate the public image URL.");
    }

    return data.publicUrl;
}

// Add or update product
productForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const id = document.getElementById("product-id").value;
    const priceValue = document.getElementById("product-price").value;
    const oldPriceValue = document.getElementById("product-old-price").value;
    const offerDate = document.getElementById("product-offer-date").value;

    const price = priceValue === "" ? null : Number(priceValue);
    const oldPrice = oldPriceValue === "" ? null : Number(oldPriceValue);

    if (price !== null && price < 0) {
        alert("Price cannot be negative.");
        return;
    }

    if (oldPrice !== null) {
        if (price === null || !offerDate || oldPrice <= price) {
            alert("Original price must be higher than current price, and an expiry date is required.");
            return;
        }
    }

    const name = document.getElementById("product-name").value.trim();
    const description = document.getElementById("product-description").value.trim();

    if (!name || !description) {
        alert("Please complete the product details.");
        return;
    }

    const selectedFile = imageInput.files[0];

    if (selectedFile) {
        if (!selectedFile.type.startsWith("image/")) {
            alert("Please choose a valid image.");
            return;
        }

        if (selectedFile.size > 5 * 1024 * 1024) {
            alert("Image size must not exceed 5 MB.");
            return;
        }
    }

    const saveButton = document.getElementById("save-product");
    const cancelButton = document.getElementById("cancel-edit");

    saveButton.disabled = true;
    saveButton.textContent = selectedFile ? "UPLOADING IMAGE..." : "SAVING...";

    try {
        const existingProduct = id
            ? products.find(item => String(item.id) === String(id))
            : null;

        let imageUrl = existingProduct?.image_url || null;

        if (selectedFile) {
            imageUrl = await uploadProductImage(selectedFile);
        }

        const product = {
            name,
            category: document.getElementById("product-category").value,
            description,
            price,
            old_price: oldPrice,
            offer_until: oldPrice !== null
                ? new Date(offerDate + "T23:59:59").toISOString()
                : null,
            image_url: imageUrl,
            is_active: true
        };

        saveButton.textContent = "SAVING PRODUCT...";

        let result;

        if (id) {
            result = await supabaseClient
                .from("products")
                .update(product)
                .eq("id", id);
        } else {
            result = await supabaseClient
                .from("products")
                .insert([product]);
        }

        if (result.error) {
            throw result.error;
        }

        alert("Product saved successfully!");

        resetProductForm();
        await loadProducts();

    } catch (error) {
        console.error("MEROLA SAVE ERROR:", error);

        alert(
            "Error: " + (error.message || "Unknown error") +
            "\nStatus: " + (error.statusCode || "Unknown") +
            "\nDetails: " + (error.error || "No details") +
            "\nCode: " + (error.code || "Unknown")
        );

    } finally {
        saveButton.disabled = false;

        saveButton.textContent = document.getElementById("product-id").value
            ? "UPDATE PRODUCT"
            : "ADD PRODUCT";

        cancelButton.hidden = !document.getElementById("product-id").value;
    }
});

// Edit product
function editProduct(id) {
    const product = products.find(item => String(item.id) === String(id));

    if (!product) return;

    document.getElementById("product-id").value = product.id;
    document.getElementById("product-name").value = product.name;
    document.getElementById("product-category").value = product.category;
    document.getElementById("product-description").value = product.description || "";
    document.getElementById("product-price").value = product.price ?? "";
    document.getElementById("product-old-price").value = product.old_price ?? "";

    document.getElementById("product-offer-date").value =
        product.offer_until ? product.offer_until.slice(0, 10) : "";

    imageInput.value = "";
    showImage(product.image_url);

    document.getElementById("save-product").textContent = "UPDATE PRODUCT";
    document.getElementById("cancel-edit").hidden = false;

    window.scrollTo({ top: 0, behavior: "smooth" });
}

// Delete product
async function deleteProduct(id) {
    if (!confirm("Are you sure you want to delete this product?")) return;

    const { error } = await supabaseClient
        .from("products")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Could not delete product: " + error.message);
        return;
    }

    alert("Product deleted successfully!");
    await loadProducts();
}

// Reset form
function resetProductForm() {
    productForm.reset();

    document.getElementById("product-id").value = "";
    document.getElementById("save-product").textContent = "ADD PRODUCT";
    document.getElementById("cancel-edit").hidden = true;

    imageInput.value = "";
    showImage(null);
}

// Cancel edit
document.getElementById("cancel-edit").addEventListener("click", resetProductForm);

// Start
checkLogin();
