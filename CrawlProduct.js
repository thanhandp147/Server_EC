const puppeteer = require('puppeteer');
const neo4j = require('neo4j-driver');
const driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('neo4j', '123123123'));
// const queryCypher = require('./cypher_R')

var session = driver.session();

const MY_NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341';





// console.log(driver)
let electronicUrl = 'https://tiki.vn/mu-bao-hiem/c11906?src=c.11906.hamburger_menu_fly_out_banner';
(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(electronicUrl);

    let electronicData = await page.evaluate(() => {
        let products = [];
        console.log(`-----`);

        let product_wrapper = document.querySelectorAll('.product-item');
        product_wrapper.forEach((product, i) => {
            if (i > 19) return
            let dataJson = {} 
            try {
                // let cate = product.getAttribute('data-category');
                dataJson.id = product.getAttribute('href').split('.')[0].split('-').reverse()[0];
                dataJson.name = product.querySelector('.name > span').textContent;
                dataJson.price = product.querySelector('.price-discount__price').textContent.split(' ')[0].split('.').join('');
                // dataJson.price = product.getAttribute('data-price');
                dataJson.img = product.querySelector('.thumbnail > img').src;
                // dataJson.category = cate.slice(cate.indexOf('/') + 1, cate.length);
                dataJson.description = 'chưa có mô tả'

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

    // let query = `MATCH (n) RETURN n`;
    // let queryCategory = `MATCH (n:Categorys) WHERE n.name = $categoryName RETURN n `;
    // let queryCreateProduct = 'CREATE (a:Products {id: $idProduct, name: $productName, image : $image, decription: $decription, price : $price } ) RETURN a';
    // let queryReShipProductCategory = 'MATCH (product:Products { name: $productName }),(category:Categorys { name:$categoryName}) CREATE (product)-[:INSIDE ]->(category)';


    // for (const _product of electronicData) {

    //     const newProduct = await session.run(
    //         queryCreateProduct, {
    //         idProduct: _product.id,
    //         productName: _product.name,
    //         image: _product.img,
    //         decription: _product.description,
    //         price: Number(_product.price)
    //     });
    //     const relationshipWithCategory = await session.run(
    //         queryReShipProductCategory
    //         , {
    //             productName: _product.name,
    //             categoryName: "Life Style"
    //         }
    //     );
    // }



})();


