const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({ 
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: "new" 
  });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  
  const body = await page.evaluate(() => document.body.innerHTML);
  if (body.includes('Something went wrong')) {
    console.log("REACT ERROR DETECTED ON PAGE");
  } else {
    console.log("PAGE LOADED. HTML LENGTH:", body.length);
  }
  
  await browser.close();
})();
