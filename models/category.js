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
                            listCategoriesCustom.push(item._fields[0].properties)
                        }
                    })()

                        (async () => {
                            for (const item of listCategories.records) {
                                listCategoriesCustom.push(item._fields[0].properties)
                            }
                        })()

                    return resolve({ error: false, data: listCategories.records });
                } else {
                    return resolve({ error: false, data: listCategories.records });
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
            if (listProducts.records.length) {
                listProducts.records = listProducts.records.map(item => {
                    return item._fields[0].properties

                })
            }
            return resolve({ error: false, data: listProducts.records });
        });
    }
}