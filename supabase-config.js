
// MEROLA - Supabase Connection

const SUPABASE_URL = "https://edjiibuzuomcxcagctic.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_G44KFhiLa9U9AnYgtZXzzw_RXuFNgh1";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

// Test Database Connection
async function testSupabaseConnection() {
    const { data, error } = await supabaseClient
        .from("products")
        .select("id")
        .limit(1);

    if (error) {
        console.error("MEROLA Connection Error:", error);
    } else {
        console.log("MEROLA Connected Successfully!", data);
    }
}

testSupabaseConnection();
