import { getProduct } from "@/lib/shopify";

async function testGetProduct() {
  console.log("🧪 Testing getProduct function...");

  try {
    const product = await getProduct("extralucide");

    if (product) {
      console.log("✅ Product found:");
      console.log("- Title:", product.title);
      console.log("- Handle:", product.handle);
      console.log(
        "- Price:",
        product.priceRange.minVariantPrice.amount,
        product.priceRange.minVariantPrice.currencyCode,
      );
      console.log("- Available:", product.availableForSale);
    } else {
      console.log("❌ Product not found");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testGetProduct();
