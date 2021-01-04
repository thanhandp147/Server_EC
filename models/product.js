const { hash, compare } = require('bcrypt');
const { sign, verify } = require('../utils/jwt');
const { driver } = require('../config/cf_db')
const session = driver.session();

const puppeteer = require('puppeteer');
const neo4j = require('neo4j-driver');



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
                        let score = 0;
                        resultQueryCheckProductHasPay.records.map(itemAfterCheck => {
                            count += itemAfterCheck._fields[0].properties.HAVE
                        })

                        let queryCheckScoreProduct = `MATCH (x:Products {id: "${resultQueryGetInfoProduct.records[0]._fields[0].properties.id}" })<-[n:FOCUS]-(y:Customer) RETURN n`;
                        let resultQueryCheckScoreProduct = await session.run(queryCheckScoreProduct);
                        if (resultQueryCheckScoreProduct.records.length > 0) {
                            resultQueryCheckScoreProduct.records.map(item => {
                                score += item._fields[0].properties.Score
                            })
                        }

                        let listComments = []
                        let queryCheckCommentProduct = `MATCH (x:Products {id: "${resultQueryGetInfoProduct.records[0]._fields[0].properties.id}" })<-[:HAVECOMMENT]-(c:Comments) RETURN c`;
                        let resultQueryCheckCommentProduct = await session.run(queryCheckCommentProduct);
                        if (resultQueryCheckCommentProduct.records.length > 0) {
                            resultQueryCheckCommentProduct.records.map(item => {
                                listComments.push(item._fields[0].properties)
                            })
                        }

                        infoProduct = { data: resultQueryGetInfoProduct.records[0]._fields[0].properties, hasPay: count, totalScore: score, comments: listComments.reverse() }
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
                // console.log({ idUser, idProduct });

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

                let query1 = `CALL gds.graph.drop('myGraph')`;

                const result1 = await session.run(query1);

                let listTopProducts = []
                if (result3.records.length) {
                    (async () => {
                        for (const item of result3.records) {
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

                let query1 = `CALL gds.graph.drop('myGraph')`;

                const result1 = await session.run(query1);


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

            listProducts.records = listProducts.records.map(item => {
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

            listProducts.records = listProducts.records.map(item => {
                return item._fields[0].properties
            })
            return resolve({ error: false, message: 'get_success', data: listProducts.records });
        });
    }

    static getRecommendProductBySimilarity(idUser) {
        return new Promise(async resolve => {
            try {
                // console.log(idUser);

                let queryFindListUserSimilarityWithUs = `MATCH (:Customer {id: $id})-[p:SIMILARITY]-> (listUser:Customer) RETURN listUser, p`

                let resultQueryFindListUserSimilarityWithUs = await session.run(queryFindListUserSimilarityWithUs, {
                    id: idUser
                })



                let listProductRecomend = []

                if (resultQueryFindListUserSimilarityWithUs.records.length) {
                    (async () => {
                        for (const item of resultQueryFindListUserSimilarityWithUs.records) {
                            // console.log(item);


                            let queryGetOrderOfUser = `MATCH (order:Orders{ idCustomer : "${item._fields[0].properties.id}", status : 1 })	
                           RETURN order `
                            let resultQueryGetOrderOfUser = await session.run(queryGetOrderOfUser);

                            if (resultQueryGetOrderOfUser.records.length) {

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
                                  RETURN gds.util.asNode(nodeId),score
                                  ORDER BY score DESC`
                                const result3 = await session.run(query3);

                                let query1 = `CALL gds.graph.drop('myGraph')`;
                                const result1 = await session.run(query1);

                                let qureryGetAllProductByIdOrder =
                                    `MATCH (n:Orders {id:"${resultQueryGetOrderOfUser.records[resultQueryGetOrderOfUser.records.length - 1]._fields[0].properties.id}"})-[:HAVE]->(product:Products) 
                                RETURN product`

                                let resultQureryGetAllProductByIdOrder = await session.run(qureryGetAllProductByIdOrder);

                                let arrayIDProduct = resultQureryGetAllProductByIdOrder.records.map(item => {
                                    return item._fields[0].properties.id
                                })

                                let arrayDemo = [];

                                let arrayNew = result3.records.map((item, index) => {
                                    arrayIDProduct.map(itemX => {
                                        if (item._fields[0].properties.id == itemX)
                                            return arrayDemo.push(item)
                                    })
                                })

                                if (item._fields[1].properties.Level.low == 1) {
                                    arrayDemo = arrayDemo.slice(0, 1)
                                }
                                if (item._fields[1].properties.Level.low == 2) {
                                    arrayDemo = arrayDemo.slice(0, 2)
                                }
                                if (item._fields[1].properties.Level.low == 3) {
                                    arrayDemo = arrayDemo.slice(0, 3)
                                }
                                if (item._fields[1].properties.Level.low == 4) {
                                    arrayDemo = arrayDemo.slice(0, 4)
                                }
                                arrayDemo.map(item => {
                                    return listProductRecomend.push(item._fields[0].properties)
                                })
                            } else {
                            }
                        }

                        let listTopProducts = []
                        if (listProductRecomend.length > 0) {
                            (async () => {
                                for (const item of listProductRecomend) {

                                    let count = 0;
                                    let score = 0;
                                    let queryCheckProductHasPay = `MATCH (x:Products {id: "${item.id}" })<-[n:HAVE]-(y:Orders) RETURN n`;
                                    let resultQueryCheckProductHasPay = await session.run(queryCheckProductHasPay);
                                    if (resultQueryCheckProductHasPay.records.length > 0) {
                                        resultQueryCheckProductHasPay.records.map(itemAfterCheck => {
                                            count += itemAfterCheck._fields[0].properties.HAVE
                                        })
                                    }

                                    let queryCheckScoreProduct = `MATCH (x:Products {id: "${item.id}" })<-[n:FOCUS]-(y:Customer) RETURN n`;
                                    let resultQueryCheckScoreProduct = await session.run(queryCheckScoreProduct);
                                    if (resultQueryCheckScoreProduct.records.length > 0) {
                                        resultQueryCheckScoreProduct.records.map(item => {
                                            score += item._fields[0].properties.Score
                                        })
                                    }
                                    listTopProducts.push({ data: item, hasPay: count, totalScore: score });
                                    
                                    
                                }

                                let unique = [...new Map(listTopProducts.map(item => [item['data'].id, item])).values()]
                                return resolve({ error: false, data: unique });
                            })()

                        }
                    })()
                } else {
                    return resolve({ error: false, data: listProductRecomend });
                }

            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        })
    }

    static getRecommendProductBySimilarity2(idUser) {
        return new Promise(async resolve => {
            try {
                // console.log(idUser);

                let queryFindListUserSimilarityWithUs = `MATCH (:Customer {id: $id})-[p:SIMILARITY]-> (listUser:Customer) RETURN listUser, p`

                let resultQueryFindListUserSimilarityWithUs = await session.run(queryFindListUserSimilarityWithUs, {
                    id: idUser
                })



                let listProductRecomend = []

                if (resultQueryFindListUserSimilarityWithUs.records.length) {
                    (async () => {
                        for (const item of resultQueryFindListUserSimilarityWithUs.records) {

                            let queryGetOrderOfUser = `MATCH (order:Orders{ idCustomer : "${item._fields[0].properties.id}", status : 1 })	
                           RETURN order `
                            let resultQueryGetOrderOfUser = await session.run(queryGetOrderOfUser);

                            if (resultQueryGetOrderOfUser.records.length) {

                                let getListProductIFocus = `match (u:Customer {id:'${idUser}'})-[:FOCUS]->(p:Products)<-[:HAVE]-(o:Orders {id:'${resultQueryGetOrderOfUser.records[resultQueryGetOrderOfUser.records.length - 1]._fields[0].properties.id}'})
                                 return p`

                                let resultGetListProductIFocus = await session.run(getListProductIFocus);


                                let arrayDemo = [];

                                let arrayNew = resultGetListProductIFocus.records.map((item, index) => {
                                    return arrayDemo.push(item)
                                })

                                if (item._fields[1].properties.Level.low == 1) {
                                    arrayDemo = arrayDemo.slice(0, 1)
                                }
                                if (item._fields[1].properties.Level.low == 2) {
                                    arrayDemo = arrayDemo.slice(0, 2)
                                }
                                if (item._fields[1].properties.Level.low == 3) {
                                    arrayDemo = arrayDemo.slice(0, 3)
                                }
                                if (item._fields[1].properties.Level.low == 4) {
                                    arrayDemo = arrayDemo.slice(0, 4)
                                }
                                arrayDemo.map(item => {
                                    return listProductRecomend.push(item._fields[0].properties)
                                })
                            } else {
                            }
                        }

                        let listTopProducts = []
                        if (listProductRecomend.length > 0) {
                            (async () => {
                                for (const item of listProductRecomend) {

                                    let count = 0;
                                    let score = 0;
                                    let queryCheckProductHasPay = `MATCH (x:Products {id: "${item.id}" })<-[n:HAVE]-(y:Orders) RETURN n`;
                                    let resultQueryCheckProductHasPay = await session.run(queryCheckProductHasPay);
                                    if (resultQueryCheckProductHasPay.records.length > 0) {
                                        resultQueryCheckProductHasPay.records.map(itemAfterCheck => {
                                            count += itemAfterCheck._fields[0].properties.HAVE
                                        })
                                    }

                                    let queryCheckScoreProduct = `MATCH (x:Products {id: "${item.id}" })<-[n:FOCUS]-(y:Customer) RETURN n`;
                                    let resultQueryCheckScoreProduct = await session.run(queryCheckScoreProduct);
                                    if (resultQueryCheckScoreProduct.records.length > 0) {
                                        resultQueryCheckScoreProduct.records.map(item => {
                                            score += item._fields[0].properties.Score
                                        })
                                    }
                                    listTopProducts.push({ data: item, hasPay: count, totalScore: score });
                                }
                                return resolve({ error: false, data: listTopProducts });
                            })()

                        }
                    })()
                } else {
                    return resolve({ error: false, data: listProductRecomend });
                }

            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        })
    }


    static getAllProducts() {
        return new Promise(async resolve => {
            try {

                let queryFindListUserSimilarityWithUs = `MATCH (n:Products) RETURN n `

                let resultQueryFindListUserSimilarityWithUs = await session.run(queryFindListUserSimilarityWithUs)

                if (resultQueryFindListUserSimilarityWithUs.records) {
                    // (async () => {
                    //     for (const [index,item] of resultQueryFindListUserSimilarityWithUs.records.entries()) {
                    //         console.log(item._fields[0].properties.id);
                    //         console.log(resultQueryFindListUserSimilarityWithUs.records[index]._fields[0].properties.id);
                    //     }
                    // })()
                    resultQueryFindListUserSimilarityWithUs.records = resultQueryFindListUserSimilarityWithUs.records.map(item => {
                        return item._fields[0].properties
                    })

                    // console.log(resultQueryFindListUserSimilarityWithUs.records);

                    let findDuplicates = arr => arr.filter((item, index) => arr.indexOf(item) != index)
                    console.log([...new Set(findDuplicates(resultQueryFindListUserSimilarityWithUs.records))])
                    return resolve({ error: false, data: resultQueryFindListUserSimilarityWithUs.records });

                }

            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        })
    }

    static crawlListProduct(data) {
        return new Promise(async resolve => {
            try {
                let { nameParent, nameChild, linkCrawl, linkImageCover } = data;

                let queryCreateChildCategory = `match (category:Categorys { name:'${nameParent}'}) 
                CREATE (a:Categorys {name: "${nameChild}", image:"${linkImageCover}" } )
                CREATE (a)-[:child_category]->(category)
                RETURN a`

                let resultQueryCreateChildCategory = await session.run(queryCreateChildCategory);

                let electronicUrl = linkCrawl;
                console.log({ electronicUrl });

                (async () => {
                    const browser = await puppeteer.launch({ headless: true });
                    const page = await browser.newPage();
                    await page.goto(electronicUrl);

                    let electronicData = await page.evaluate(() => {
                        let products = [];

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
                                categoryName: nameChild
                            }
                        );
                    }
                })();
                // let queryFindListUserSimilarityWithUs = `MATCH (n:Products) RETURN n `

                // let resultQueryFindListUserSimilarityWithUs = await session.run(queryFindListUserSimilarityWithUs)

                // if (resultQueryFindListUserSimilarityWithUs.records) {
                //     resultQueryFindListUserSimilarityWithUs.records = resultQueryFindListUserSimilarityWithUs.records.map(item => {
                //         console.log(item._fields[0].properties.id);

                //         return item._fields[0].properties
                //     })
                //     return resolve({ error: false, data: resultQueryFindListUserSimilarityWithUs.records });
                // }
                return resolve({ error: false });

            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        })
    }

    static getAllCampaign() {
        return new Promise(async resolve => {
            try {

                let queryFindListUserSimilarityWithUs = `MATCH (n:Campaigns) RETURN n `

                let resultQueryFindListUserSimilarityWithUs = await session.run(queryFindListUserSimilarityWithUs)

                if (resultQueryFindListUserSimilarityWithUs.records.length) {
                    resultQueryFindListUserSimilarityWithUs.records = resultQueryFindListUserSimilarityWithUs.records.map(item => {
                        return item._fields[0].properties
                    })
                    return resolve({ error: false, data: resultQueryFindListUserSimilarityWithUs.records })
                }

            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        })
    }

    static getAllProductByCampaignId(idCampaign) {
        return new Promise(async resolve => {
            try {

                let queryFindListUserSimilarityWithUs = `MATCH (products:Products)-[:INCAMPAIGN]->(campaign:Campaigns {id:"${idCampaign}"}) 
                RETURN products `

                let resultQueryFindListUserSimilarityWithUs = await session.run(queryFindListUserSimilarityWithUs)

                let listTopProducts = []
                if (resultQueryFindListUserSimilarityWithUs.records.length) {
                    (async () => {
                        for (const item of resultQueryFindListUserSimilarityWithUs.records) {
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
                        return resolve({ error: false, data: listTopProducts });
                    })(listTopProducts)
                } else {
                    return resolve({ error: false, data: listTopProducts });
                }

            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        })
    }


    static getAllProductHasNewPrice() {
        return new Promise(async resolve => {
            try {

                let query =
                    `
                        MATCH(n:Products) 
                        where n.newPrice > 0
                        RETURN  n`;
                let listProducts = await session.run(query);

                if (listProducts.records.length > 0) {
                    listProducts.records = listProducts.records.map(item => {
                        // return (100 - (Number(item._fields[0].properties.newPrice / item._fields[0].properties.price * 100)))
                        return item._fields[0].properties

                    })
                    // console.log(listProducts.records);

                    listProducts.records.sort(function (a, b) {
                        return (100 - (Number(b.newPrice / b.price * 100))) - (100 - (Number(a.newPrice / a.price * 100)));
                    });


                    let listTopProducts = []
                    if (listProducts.records.length > 0) {
                        (async () => {
                            for (const item of listProducts.records) {
                                let count = 0;
                                let score = 0;
                                let queryCheckProductHasPay = `MATCH (x:Products {id: "${item.id}" })<-[n:HAVE]-(y:Orders) RETURN n`;
                                let resultQueryCheckProductHasPay = await session.run(queryCheckProductHasPay);
                                if (resultQueryCheckProductHasPay.records.length > 0) {
                                    resultQueryCheckProductHasPay.records.map(itemAfterCheck => {
                                        count += itemAfterCheck._fields[0].properties.HAVE
                                    })
                                }

                                let queryCheckScoreProduct = `MATCH (x:Products {id: "${item.id}" })<-[n:FOCUS]-(y:Customer) RETURN n`;
                                let resultQueryCheckScoreProduct = await session.run(queryCheckScoreProduct);
                                if (resultQueryCheckScoreProduct.records.length > 0) {
                                    resultQueryCheckScoreProduct.records.map(item => {
                                        score += item._fields[0].properties.Score
                                    })
                                }
                                listTopProducts.push({ data: item, hasPay: count, totalScore: score });
                            }
                            return resolve({ error: false, data: listTopProducts });
                        })(listTopProducts)
                    } else {
                        return resolve({ error: false, data: listTopProducts });
                    }
                }


            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        })
    }

    static getAllProductInCartNotPay(idUser) {
        return new Promise(async resolve => {
            try {
                // console.log(idUser);

                // let query =
                //     `
                //         MATCH(n:Products) 
                //         where n.newPrice > 0
                //         RETURN  n`;
                // let listProducts = await session.run(query);

                // if (listProducts.records.length > 0) {
                //     listProducts.records = listProducts.records.map(item => {
                //         // return (100 - (Number(item._fields[0].properties.newPrice / item._fields[0].properties.price * 100)))
                //         return item._fields[0].properties

                //     })
                //     console.log(listProducts.records);

                //     listProducts.records.sort(function (a, b) {
                //         return (100 - (Number(b.newPrice / b.price * 100))) - (100 - (Number(a.newPrice / a.price * 100)));
                //     });


                //     let listTopProducts = []
                //     if (listProducts.records.length > 0) {
                //         (async () => {
                //             for (const item of listProducts.records) {
                //                 let count = 0;
                //                 let score = 0;
                //                 let queryCheckProductHasPay = `MATCH (x:Products {id: "${item.id}" })<-[n:HAVE]-(y:Orders) RETURN n`;
                //                 let resultQueryCheckProductHasPay = await session.run(queryCheckProductHasPay);
                //                 if (resultQueryCheckProductHasPay.records.length > 0) {
                //                     resultQueryCheckProductHasPay.records.map(itemAfterCheck => {
                //                         count += itemAfterCheck._fields[0].properties.HAVE
                //                     })
                //                 }

                //                 let queryCheckScoreProduct = `MATCH (x:Products {id: "${item.id}" })<-[n:FOCUS]-(y:Customer) RETURN n`;
                //                 let resultQueryCheckScoreProduct = await session.run(queryCheckScoreProduct);
                //                 if (resultQueryCheckScoreProduct.records.length > 0) {
                //                     resultQueryCheckScoreProduct.records.map(item => {
                //                         score += item._fields[0].properties.Score
                //                     })
                //                 }
                //                 listTopProducts.push({ data: item, hasPay: count, totalScore: score });
                //             }
                //             return resolve({ error: false, data: listTopProducts });
                //         })(listTopProducts)
                //     } else {
                //         return resolve({ error: false, data: listTopProducts });
                //     }
                // }


            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        })
    }

    static findWithKey(key) {
        return new Promise(async resolve => {
            // session = driver.session();
            let query =
                `   
            MATCH (p:Products)
            WHERE p.name CONTAINS $key
            RETURN p
                `;
            let listProducts = await session.run(query, { key: key });


            let listTopProducts = []
            // listProducts.records = listProducts.records.map(item => {
            //     // return (100 - (Number(item._fields[0].properties.newPrice / item._fields[0].properties.price * 100)))
            //     console.log(item);

            // })
            if (listProducts.records.length > 0) {

                // listProducts.records = listProducts.records.slice(0, 10)
                // listProducts.records = listProducts.records.map(item => {
                //     return item._fields[0].properties
                // })
                (async () => {
                    for (const item of listProducts.records) {
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
                    return resolve({ error: false, data: listTopProducts });
                })(listTopProducts)
            } else {
                return resolve({ error: false, data: listTopProducts });
            }

            // if (!listProducts)
            //     return resolve({ error: true, message: 'get_product_fail' });

            // return resolve({ error: false, data: listProducts.records });
        })
    }

}