const { hash, compare } = require('bcrypt');
const { sign, verify } = require('../utils/jwt');
const { driver } = require('../config/cf_db')
const session = driver.session();

module.exports = class Categories {
    // Lấy tất cả category
    static findAllCategory() {
        return new Promise(async resolve => {

            try {
                let query = `MATCH (Ca:Categorys) WHERE NOT (Ca)-[:child_category]->()
                RETURN  Ca`;
                const listCategories = await session.run(query);

                let listCategoriesCustom = []
                if (listCategories.records.length) {
                    (async () => {
                        for (const item of listCategories.records) {
                            let queryFindChildCategory = `match (x:Categorys)-[:child_category]->(y:Categorys {name:'${item._fields[0].properties.name}'})
                            return x`
                            let resultQueryFindChildCategory = await session.run(queryFindChildCategory);

                            let listChildCategory = []
                            if (resultQueryFindChildCategory.records.length > 0) {
                                resultQueryFindChildCategory.records.map(itemchild => {
                                    listChildCategory.push(itemchild._fields[0].properties)
                                })
                            } else {

                            }
                            let newFormat = {
                                name: item._fields[0].properties.name,
                                image: item._fields[0].properties.image,
                                listChild: listChildCategory
                            }
                            console.log(newFormat);
                            listCategoriesCustom.push(newFormat)
                        }
                        return resolve({ error: false, data: listCategoriesCustom });
                    })()
                } else {
                    return resolve({ error: false, data: listCategoriesCustom });
                }
                // if (listOrders.records.length == 0) return resolve({ error: true, message: 'cant_get_product', data: [] })


            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        });
    }

    // Lay tat ca san pham cua 1 danh muc
    static findAllProducuctOneCategory(categoryName) {
        return new Promise(async resolve => {
            let query = `
            MATCH(:Categorys {name : $categoryID})<--(products :Products)
            RETURN products
            ` ;
            let listProducts = await session.run(
                query,
                { categoryID: categoryName }
            );
            if (!listProducts) return resolve({ error: true, message: 'fail' });

            let listTopProducts = []
            if (listProducts.records.length) {
                (async () => {
                    for (const item of listProducts.records) {
                        // console.log(item._fields[0].properties.id);
                        let count = 0;
                        let score = 0;
                        let queryCheckProductHasPay = `MATCH (x:Products {id: "${item._fields[0].properties.id}" })<-[n:HAVE]-(y:Orders) RETURN n`;
                        let resultQueryCheckProductHasPay = await session.run(queryCheckProductHasPay);
                        if (resultQueryCheckProductHasPay.records.length > 0) {
                            resultQueryCheckProductHasPay.records.map(itemAfterCheck => {

                                count += itemAfterCheck._fields[0].properties.HAVE
                            })
                        }
                        let queryCheckScoreProduct = `MATCH (x:Products {id: "${item._fields[0].properties.id}" })<-[n:FOCUS]-(y:Customer) RETURN n`;
                        let resultQueryCheckScoreProduct = await session.run(queryCheckScoreProduct);
                        if (resultQueryCheckScoreProduct.records.length > 0) {
                            resultQueryCheckScoreProduct.records.map(item => {
                                score += item._fields[0].properties.Score
                            })
                        }

                        listTopProducts.push({ data: item._fields[0].properties, hasPay: count, totalScore: score });
                    }
                    // console.log(listTopProducts);
                    
                    return resolve({ error: false, data: listTopProducts });
                })(listTopProducts)
                // listProducts.records = listProducts.records.map(item => {
                //     return item._fields[0].properties

                // })
            }
            // return resolve({ error: false, data: listTopProducts });
        });
    }
}