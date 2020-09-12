const puppeteer = require('puppeteer');

let electronicUrl = 'https://www.lazada.vn/trang-phuc-nam/?spm=a2o4n.home.cate_9.1.779d6afeYMVgtk';
(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(electronicUrl);

    let electronicData = await page.evaluate(() => {
        let products = [];
        let product_wrapper = document.querySelectorAll('.c2prKC');
        product_wrapper.forEach((product) => {
            let dataJson = {};
            try {
                // dataJson.name = product.querySelector('.c16H9d').innerText;
                // dataJson.price = product.querySelector('.c3gUW0').innerText.split(' ')[0];
                dataJson.image = product.querySelector('.cRjKsc > img').src;
            }
            catch (err) {
                console.log(err)
            }
            products.push(dataJson);
        });
        return products;
    });

    console.log({ electronicData });
    await browser.close();
})();