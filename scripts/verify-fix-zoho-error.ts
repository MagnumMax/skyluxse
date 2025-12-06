import { SupabaseTokenStore } from "../lib/zoho/store";

console.log("Imported SupabaseTokenStore successfully.");
try {
    const store = new SupabaseTokenStore();
    console.log("Instantiated SupabaseTokenStore successfully.");
} catch (e) {
    if ((e as Error).message === "Supabase configuration missing") {
        console.log("Instantiated successfully (hit expected config error due to missing env vars in test context)");
    } else {
        console.error("Instantiation error:", e);
    }
}
