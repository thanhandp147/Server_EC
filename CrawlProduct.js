const puppeteer = require('puppeteer');
const neo4j = require('neo4j-driver');
const driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('neo4j', '123456'));
// const queryCypher = require('./cypher_R')

var session = driver.session();


// console.log(driver)
let electronicUrl = 'https://tiki.vn/xe-tay-ga/c11878';
(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(electronicUrl);

    let electronicData = await page.evaluate(() => {
        let products = [];
        console.log(`-----`);

        let product_wrapper = document.querySelectorAll('.product-item');
        product_wrapper.forEach((product) => {
            let dataJson = {}
            console.log({ product })
            try {
                console.log({ product })
                let cate = product.getAttribute('data-category');
                dataJson.id = product.getAttribute('data-id');
                dataJson.name = product.getAttribute('data-title');
                dataJson.price = product.getAttribute('data-price');
                dataJson.img = product.querySelector('.image > img').src;
                dataJson.category = cate.slice(cate.indexOf('/') + 1, cate.length);
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

    let query = `MATCH (n) RETURN n`;
    let queryCategory = `MATCH (n:Categorys) WHERE n.name = $categoryName RETURN n `;
    let queryCreateProduct = 'CREATE (a:Products {id: $idProduct, name: $productName, image : $image, decription: $decription, price : $price } ) RETURN a';
    let queryReShipProductCategory = 'MATCH (product:Products { name: $productName }),(category:Categorys { name:$categoryName}) CREATE (product)-[:INSIDE ]->(category)';


    for (const _product of electronicData) {

        const newProduct = await session.run(
            queryCreateProduct, {
            idProduct: _product.id,
            productName: _product.name,
            image: _product.img,
            decription: _product.description,
            price: Number(_product.price)
        });
        const relationshipWithCategory = await session.run(
            queryReShipProductCategory
            , {
                productName: _product.name,
                categoryName: "Xe tay ga"
            }
        );
    }



})();


