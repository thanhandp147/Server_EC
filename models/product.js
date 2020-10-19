const { hash, compare } = require('bcrypt');
const { sign, verify } = require('../utils/jwt');
const { driver } = require('../config/cf_db')
const session = driver.session();

module.exports = class Products {

    // LAY THONG TIN SAN PHAM THEO ID
    static getInfoById(data) {
        return new Promise(async resolve => {
            try {
                let { idProduct } = data;

                let queryGetInfoProduct = `MATCH (n:Products {id:"${idProduct}"}) RETURN n`
                let resultQueryGetInfoProduct = await session.run(queryGetInfoProduct);

                if (resultQueryGetInfoProduct.records.length) {
                    let infoProduct = resultQueryGetInfoProduct.records[0]._fields[0].properties;

                    let queryCheckProductHasPay = `MATCH (x:Products {id: "${resultQueryGetInfoProduct.records[0]._fields[0].properties.id}" })<-[n:HAVE]-(y:Orders) RETURN n`;
                    let resultQueryCheckProductHasPay = await session.run(queryCheckProductHasPay);

                    if (resultQueryCheckProductHasPay.records) {
                        let count = 0;
                        resultQueryCheckProductHasPay.records.map(itemAfterCheck => {
                            count += itemAfterCheck._fields[0].properties.HAVE
                        })
                        infoProduct = { data: resultQueryGetInfoProduct.records[0]._fields[0].properties, hasPay: count }
                    } else {
                        infoProduct = { data: resultQueryGetInfoProduct.records[0]._fields[0].properties, hasPay: 0 }
                    }

                    return resolve({ error: false, data: infoProduct });

                } else {
                    return resolve({ error: true, message: "invalid_param" });
                }

            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        })
    }

    // XEM SAN PHAM
    static click(data) {
        return new Promise(async resolve => {
            try {
                let { idUser, idProduct } = data;
                console.log({ idUser, idProduct });

                let queryRe = `MATCH (:Customer { id: $idCustomer })-[r:FOCUS]->(Products { id: $idProduct })
                RETURN r`;
                let resultFind = await session.run(
                    queryRe,
                    { idCustomer: idUser, idProduct: idProduct }
                );

                if (resultFind.records.length > 0) {
                    console.log('============================join=============================');
                    console.log(resultFind.records[0]._fields[0].properties.Score)
                    let newScore = Number(resultFind.records[0]._fields[0].properties.Score) + 1;

                    let queryUpdate = `MATCH (:Customer { id: $idCustomer })-[r]->(Products { id: $idProduct })
                    SET r.Score = $newScore
                    RETURN Products`;

                    let resultUpdateRe = await session.run(queryUpdate,
                        {
                            idProduct: idProduct,
                            idCustomer: idUser,
                            newScore: Number(newScore)
                        });
                    if (!resultUpdateRe) return resolve({ error: true, message: 'cant_update_score' })
                    return resolve({ error: false, message: 'update_relation_customer_Product_success' });
                }

                let query = `MATCH (Customer { id: $idCustomer }),(Products { id: $idProduct })
                        CREATE (Customer)-[r:FOCUS { Score : $time }]->(Products)
                        RETURN Products`;
                let resultMakeRe = await session.run(query,
                    {
                        idCustomer: idUser,
                        idProduct: idProduct,
                        time: 1
                    });
                if (!resultMakeRe.records.length) return resolve({ error: true, message: 'cant_insert_customer' });
                return resolve({ error: false, message: 'create_susscess' });
            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        });
    }

    // RANDOM CLICK
    static randomClick(data) {
        return new Promise(async resolve => {
            try {
                let { idUser } = data;
                let queryRe = `MATCH (n:Products) RETURN n`;
                let resultFind = await session.run(
                    queryRe
                );
                console.log(resultFind.records.length);

                if (resultFind.records.length > 0) {
                    (async () => {
                        let index = 0;
                        for (const item of resultFind.records) {
                            if (index > 80 && index < 110) {
                                let randomNum = Math.floor((Math.random() * 3) + 1);
                                if (randomNum !== 1) {
                                    let { idUser } = data;
                                    let { id: idProduct } = item._fields[0].properties;
                                    await this.click({ idUser, idProduct })
                                }
                            }
                            index++;
                        }
                    })()
                }

                return resolve({ error: false, message: 'create_susscess' });
            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        });
    }

    // UPDATE RANDOM SCORE
    static updateRandomScoreTwoUsers(data) {

        return new Promise(async resolve => {
            try {
                let { idUser1, idUser2 } = data;
                let query = `match (a:Customer {id:$ID1})-[r:FOCUS]-(b:Products)-[r2:FOCUS]-(c:Customer {id:$ID2})
                RETURN b`;
                const listProducts = await session.run(query, {
                    ID1: idUser1,
                    ID2: idUser2,
                });

                if (listProducts.records.length > 0) {
                    (async () => {
                        let index = 0;
                        for (const item of listProducts.records) {
                            if (index <= 25) {
                                let randomNum = Math.floor((Math.random() * 3) + 1);
                                if (randomNum == 1) {
                                    let { idUser1, idUser2 } = data;
                                    let { id: idProduct } = item._fields[0].properties;
                                    await this.click({ idUser: idUser1, idProduct })
                                    await this.click({ idUser: idUser2, idProduct })
                                }
                                index++;
                            }
                        }
                    })()
                }

                return resolve({ error: false, message: 'create_susscess' });
            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        });
    }

    // TIM SAN PHAM CO DO ANH HUONG CAO NHAT (xem, binh luan , mua)
    static getToplistProducts(data) {

        return new Promise(async resolve => {
            try {
                let query1 = `CALL gds.graph.drop('myGraph')`;

                const result1 = await session.run(query1);

                let query2 = `CALL gds.graph.create(
                    'myGraph',
                    ['Customer', 'Products'],
                    {
                        FOCUS: {
                            type: 'FOCUS',
                            properties: {
                                Score: {
                                    property: 'Score'
                                } 
                            }
                        }
                    }
                )`
                const result2 = await session.run(query2);

                let query3 = `CALL gds.pageRank.stream('myGraph', {
                    maxIterations: 20,
                    dampingFactor: 0.85,
                    relationshipWeightProperty: 'Score'
                  })
                  YIELD nodeId, score
                  WHERE score > 0.15000000000000002
                  RETURN gds.util.asNode(nodeId),score
                  ORDER BY score DESC`
                const result3 = await session.run(query3);

                let listTopProducts = []
                if (result3.records.length) {
                    (async () => {
                        for (const item of result3.records) {
                            // console.log(item._fields[0].properties.id);
                            let count = 0;
                            let queryCheckProductHasPay = `MATCH (x:Products {id: "${item._fields[0].properties.id}" })<-[n:HAVE]-(y:Orders) RETURN n`;
                            let resultQueryCheckProductHasPay = await session.run(queryCheckProductHasPay);
                            if (resultQueryCheckProductHasPay.records.length > 0) {
                                resultQueryCheckProductHasPay.records.map(itemAfterCheck => {

                                    count += itemAfterCheck._fields[0].properties.HAVE
                                })
                            }
                            listTopProducts.push({ data: item._fields[0].properties, hasPay: count });
                        }
                        return resolve({ error: false, data: listTopProducts });
                    })(listTopProducts)
                } else {
                    return resolve({ error: false, data: listTopProducts });
                }
            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        });
    }

    static findBestSell() {
        return new Promise(async resolve => {
            try {
                let query1 = `CALL gds.graph.drop('myGraph')`;

                const result1 = await session.run(query1);

                let query2 = `CALL gds.graph.create(
                    'myGraph',
                    ['Orders', 'Products'],
                    {
                        HAVE: {
                            type: 'HAVE',
                            properties: {
                                HAVE: {
                                    property: 'HAVE'
                                }
                            }
                        }
                    }
                )`
                const result2 = await session.run(query2);

                let query3 = `CALL gds.pageRank.stream('myGraph', {
                    maxIterations: 20,
                    dampingFactor: 0.85,
                    relationshipWeightProperty: 'HAVE'
                  })
                  YIELD nodeId, score
                  WHERE score > 0.15000000000000002
                  RETURN gds.util.asNode(nodeId),score
                  ORDER BY score DESC`
                const result3 = await session.run(query3);


                let listTopProducts = []
                if (result3.records.length) {
                    (async () => {
                        for (const item of result3.records) {
                            let count = 0;
                            let queryCheckProductHasPay = `MATCH (x:Products {id: "${item._fields[0].properties.id}" })<-[n:HAVE]-(y:Orders) RETURN n`;
                            let resultQueryCheckProductHasPay = await session.run(queryCheckProductHasPay);
                            if (resultQueryCheckProductHasPay.records) {
                                resultQueryCheckProductHasPay.records.map(itemAfterCheck => {

                                    count += itemAfterCheck._fields[0].properties.HAVE
                                })
                            }
                            listTopProducts.push({ data: item._fields[0].properties, hasPay: count });
                        }
                        return resolve({ error: false, data: listTopProducts });
                    })()
                } else {
                    return resolve({ error: false, data: listTopProducts });
                }
            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        })
    }

    // Tìm sản phẩm mới
    static getListNewProduct() {
        return new Promise(async resolve => {
            let query =
                `Match (n:Products)
            Return n
            Order by ID(n) desc
            Limit 5`;
            let listProducts = await session.run(query);


            if (!listProducts)
                return resolve({ error: true, message: 'get_product_fail' });

            listProducts.records = listProducts.records.map(item=>{
                return item._fields[0].properties
            })
            return resolve({ error: false, data: listProducts.records });

        })
    }

    //Tìm những sản phẩm cùng danh mục theo ID sản phẩm
    static findWithCategoryByProductID(productID) {
        return new Promise(async resolve => {
            productID = productID.trim()
            let query = `MATCH(:Products {id :"${productID}" })-->(category:Categorys)
            MATCH(category)-[:child_category]->(categoryP :Categorys)
            Match (categoryP)<-[:child_category]-(categoryC :Categorys)
            where not( categoryC.name =  category.name)
             Match (categoryC)<--(p2:Products)
            RETURN p2 Limit 25`;
            let listProducts = await session.run(
                query
            );
            

            if (!listProducts) return resolve({ error: true, message: 'fail' });

            listProducts.records = listProducts.records.map(item=>{
                return item._fields[0].properties
            })
            return resolve({ error: false, message: 'get_success', data: listProducts.records });
        });
    }
}