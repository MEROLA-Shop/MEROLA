
const ordersList = document.getElementById("orders-list");

const ADMIN_UID = "d4502d44-fc11-4247-b4aa-070b84e6baf2";

let orders = [];

const STATUS_OPTIONS = [
    "Pending",
    "Confirmed",
    "Shipped",
    "Delivered",
    "Cancelled"
];

async function checkAdmin() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error || !data.session?.user || data.session.user.id !== ADMIN_UID) {
        ordersList.innerHTML = '<p>Please login as admin first.</p><a href="admin.html">Go to Admin Login</a>';
        return false;
    }

    return true;
}

async function loadOrders() {
    ordersList.textContent = "Loading orders...";

    if (!(await checkAdmin())) return;

    const { data, error } = await supabaseClient
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        ordersList.textContent = error.message;
        return;
    }

    orders = data || [];
    displayOrders();
}

function formatWhatsAppPhone(phone) {
    let number = String(phone || "").replace(/\D/g, "");

    if (number.startsWith("00")) number = number.slice(2);

    if (number.startsWith("01") && number.length === 11) {
        number = "20" + number.slice(1);
    } else if (number.startsWith("1") && number.length === 10) {
        number = "20" + number;
    }

    return number;
}

function displayOrders() {
    if (!orders.length) {
        ordersList.innerHTML = "<p>No orders yet.</p>";
        return;
    }

    ordersList.innerHTML = orders.map(order => {
        const products = Array.isArray(order.products)
            ? order.products.map(item =>
                `<p>${item.name || "Product"} × ${item.quantity || 1}</p>`
            ).join("")
            : "<p>No product details.</p>";

        const whatsapp = formatWhatsAppPhone(order.phone);

        return `
            <div class="admin-product order-card">
                <h3>Order #${order.id}</h3>
                <p>Date: ${order.created_at ? new Date(order.created_at).toLocaleString() : ""}</p>
                <p>Name: ${order.customer_name || ""}</p>
                <p>Phone: ${order.phone || ""}
                    ${whatsapp ? `<a href="https://wa.me/${whatsapp}" target="_blank">WhatsApp</a>` : ""}
                </p>
                <p>City: ${order.city || ""}</p>
                <p>Address: ${order.address || ""}</p>
                <p>Notes: ${order.notes || "None"}</p>

                <h4>Products</h4>
                ${products}

                <h3>Total: ${Number(order.total || 0)} EGP</h3>

                <button type="button" onclick="copyShippingDetails('${order.id}')">
                    COPY SHIPPING DETAILS
                </button>

                <br><br>

                <label>Order Status:</label>

                <select id="status-${order.id}">
                    ${STATUS_OPTIONS.map(status =>
                        `<option value="${status}" ${order.status === status ? "selected" : ""}>${status}</option>`
                    ).join("")}
                </select>

                <button type="button" onclick="saveStatus('${order.id}')">
                    SAVE STATUS
                </button>

                <button type="button" onclick="deleteOrder('${order.id}')">
                    DELETE ORDER
                </button>
            </div>
        `;
    }).join("");
}

async function copyShippingDetails(orderId) {
    const order = orders.find(item => String(item.id) === String(orderId));
    if (!order) return alert("Order not found.");

    const products = Array.isArray(order.products)
        ? order.products.map(item => `${item.name || "Product"} x ${item.quantity || 1}`).join("\n")
        : "No product details";

    const text = [
        "MEROLA - SHIPPING ORDER",
        `Order Number: #${order.id}`,
        `Customer Name: ${order.customer_name || ""}`,
        `Phone: ${order.phone || ""}`,
        `City: ${order.city || ""}`,
        `Address: ${order.address || ""}`,
        "",
        "Products:",
        products,
        "",
        `Total: ${Number(order.total || 0)} EGP`,
        `Notes: ${order.notes || "None"}`
    ].join("\n");

    try {
        await navigator.clipboard.writeText(text);
        alert("Shipping details copied!");
    } catch (error) {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();

        const copied = document.execCommand("copy");
        textarea.remove();

        alert(copied ? "Shipping details copied!" : "Copy failed.");
    }
}

async function saveStatus(orderId) {
    const select = document.getElementById(`status-${orderId}`);
    if (!select) return alert("Status selector not found.");

    const { data, error } = await supabaseClient
        .from("orders")
        .update({ status: select.value })
        .eq("id", orderId)
        .select("id,status");

    if (error) {
        console.error("SAVE ERROR:", error);
        return alert("Could not save: " + error.message);
    }

    if (!data || !data.length) {
        return alert("No order was updated. Check permissions.");
    }

    const order = orders.find(item => String(item.id) === String(orderId));
    if (order) order.status = data[0].status;

    alert("Status saved successfully!");
}

async function deleteOrder(orderId) {
    if (!confirm("Are you sure you want to delete this order?")) return;

    const { error } = await supabaseClient
        .from("orders")
        .delete()
        .eq("id", orderId);

    if (error) {
        console.error("DELETE ERROR:", error);
        return alert("Could not delete: " + error.message);
    }

    alert("Order deleted successfully!");
    await loadOrders();
}

loadOrders();
