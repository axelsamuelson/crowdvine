const puppeteer = require('puppeteer');
const path = require('path');

async function generatePactSVGOGImage() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Set viewport to exact OG image dimensions
  await page.setViewport({
    width: 1200,
    height: 630,
    deviceScaleFactor: 1,
  });
  
  // Load the HTML file
  const htmlPath = path.join(__dirname, 'create-pact-svg-og.html');
  await page.goto(`file://${htmlPath}`);
  
  // Wait for fonts and images to load
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Take screenshot
  await page.screenshot({
    path: 'public/pact-og-svg.jpg',
    type: 'jpeg',
    quality: 90,
    fullPage: false,
  });
  
  await browser.close();
  console.log('✅ PACT SVG Open Graph image created: public/pact-og-svg.jpg');
}

generatePactSVGOGImage().catch(console.error);
