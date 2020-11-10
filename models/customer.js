const { hash, compare } = require('bcrypt');
const { sign, verify } = require('../utils/jwt');
const { driver } = require('../config/cf_db')
const session = driver.session();

module.exports = class Customers {
    // ADD NEW USER
    static insert(customerId, customerName, password, email, phoneNumber, gender) {
        return new Promise(async resolve => {
            try {
                console.log(`awdawdawd`);

                let role = 0;
                if (gender == '1') {
                    gender = '1';
                } else {
                    if (gender == '0') {
                        gender = '0';
                    } else {
                        gender = '2';
                    }
                }
                console.log({ customerId, customerName, password, email, phoneNumber, gender });

                let queryCheckCustomer = `MATCH (Customer { phone: $phoneNumber })
                RETURN Customer`;
                const checkExist = await session.run(
                    queryCheckCustomer
                    , {
                        phoneNumber: phoneNumber,
                    }
                );
                console.log({ checkExist });

                if (checkExist.records.length != 0)
                    return resolve({ error: true, message: 'phone_existed' });
                let hashPassword = await hash(password, 8);
                console.log(typeof (customerId));
                let queryNewCustomer = 'CREATE (a:Customer { id : $customerId, name : $customerName, email: $email, phone : $phoneNumber, password :$hashPassword, male : $sex, role :$role }) RETURN a';
                const newCustomer = await session.run(
                    queryNewCustomer
                    , {
                        customerId: customerId,
                        customerName: customerName,
                        email: email,
                        phoneNumber: phoneNumber,
                        sex: gender,
                        hashPassword: hashPassword,
                        role: role
                    }
                );

                if (!newCustomer.records.length) return resolve({ error: true, message: 'cant_insert_customer' });
                return resolve({ error: false, message: 'create_susscess' });
            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        });
    }

    // LOGIN
    static signIn(phoneNumber, password) {
        return new Promise(async resolve => {
            try {
                let queryCheckCustomer = `MATCH (Customer { phone: $phoneNumber })
                RETURN Customer`;
                const infoUser = await session.run(
                    queryCheckCustomer
                    , {
                        phoneNumber: phoneNumber,
                    }
                );
                if (infoUser.records.length == 0)
                    return resolve({ error: true, message: 'login_fail' });
                const checkPass = await compare(password, infoUser.records[0]._fields[0].properties.password);

                if (!checkPass)
                    return resolve({ error: true, message: 'login_fail' });
                await delete infoUser.password;
                let token = await sign({ data: infoUser.records[0]._fields[0].properties });

                let queryGetOrderOfUSer = `MATCH (u:Customer {id:"${infoUser.records[0]._fields[0].properties.id}"})<-[:OF]- (o:Orders {status:0})
                return o`
                let resultQueryGetOrderOfUSer = await session.run(queryGetOrderOfUSer);

                let listProductOfOrderNotPay = []
                if (resultQueryGetOrderOfUSer.records.length > 0) {
                    // (async () => {
                    //     for (const item of resultQueryGetOrderOfUSer.records) {
                    //         console.log(item._fields[0]);
                    //     }
                    // })()
                    let getListProductOrder = `MATCH (u:Orders {id:"${resultQueryGetOrderOfUSer.records[0]._fields[0].properties.id}"})-[s:HAVE]-> (o:Products)
                    return o,s`
                    let resultGetListProductOrder = await session.run(getListProductOrder);


                    if (resultGetListProductOrder.records.length > 0) {
                        (async () => {
                            for (const item of resultGetListProductOrder.records) {
                                let newFormat = {
                                    data: item._fields[0].properties,
                                    count: item._fields[1].properties.HAVE,
                                    idOrder: resultQueryGetOrderOfUSer.records[0]._fields[0].properties.id
                                }
                                listProductOfOrderNotPay.push(newFormat)
                            }
                        })()
                    }

                }

                return resolve({ error: false, data: { infoUser: infoUser.records[0]._fields[0].properties, token, listProductOfOrderNotPay } });
            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        });
    }


    // REFESH TOKEN
    static refreshToken(token) {
        return new Promise(async resolve => {
            try {
                let infoUserVerify = await verify(`${token}`)


                let queryCheckCustomer = `MATCH (Customer { id: $id })

                RETURN Customer`;
                const infoUser = await session.run(
                    queryCheckCustomer
                    , {
                        id: infoUserVerify.data.id,
                    }
                );
                await delete infoUser.password;
                let tokenSign = await sign({ data: infoUser.records[0]._fields[0].properties });
                let queryGetOrderOfUSer = `MATCH (u:Customer {id:"${infoUser.records[0]._fields[0].properties.id}"})<-[:OF]- (o:Orders {status:0})
                return o`
                let resultQueryGetOrderOfUSer = await session.run(queryGetOrderOfUSer);

                let listProductOfOrderNotPay = []
                if (resultQueryGetOrderOfUSer.records.length > 0) {
                    // (async () => {
                    //     for (const item of resultQueryGetOrderOfUSer.records) {
                    //         console.log(item._fields[0]);
                    //     }
                    // })()
                    let getListProductOrder = `MATCH (u:Orders {id:"${resultQueryGetOrderOfUSer.records[0]._fields[0].properties.id}"})-[s:HAVE]-> (o:Products)
                    return o,s`
                    let resultGetListProductOrder = await session.run(getListProductOrder);


                    if (resultGetListProductOrder.records.length > 0) {
                        (async () => {
                            for (const item of resultGetListProductOrder.records) {
                                let newFormat = {
                                    data: item._fields[0].properties,
                                    count: item._fields[1].properties.HAVE,
                                    idOrder: resultQueryGetOrderOfUSer.records[0]._fields[0].properties.id
                                }
                                listProductOfOrderNotPay.push(newFormat)
                            }
                        })()
                    }

                }
                return resolve({
                    error: false,
                    data: { infoUser: infoUser.records[0]._fields[0].properties, token: tokenSign, listProductOfOrderNotPay }
                })


            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        });
    }

    // GET ALL CUSTOMERS
    static getAll() {
        return new Promise(async resolve => {
            try {
                let query = `MATCH (n:Customer) RETURN n `;
                const listCustomers = await session.run(query);

                listCustomers.records.forEach(async (item) => {
                    await delete item._fields[0].properties.password;
                })

                if (!listCustomers.records) return resolve({ error: true, message: 'cant_get_product' })
                return resolve({ error: false, data: listCustomers.records });
            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        })
    }


    static getJaccardViaLike() {

        return new Promise(async resolve => {
            try {
                let query = `MATCH (p1:Person)-[:LIKE]->(cuisine1)
                WITH p1, collect(id(cuisine1)) AS p1Cuisine
                MATCH (p2:Person)-[:LIKE]->(cuisine2) WHERE p1 <> p2
                WITH p1, p1Cuisine, p2, collect(id(cuisine2)) AS p2Cuisine
                RETURN p1.name AS from,
                       p2.name AS to,
                       gds.alpha.similarity.jaccard(p1Cuisine, p2Cuisine) AS similarity
                ORDER BY to, similarity DESC`;
                const listProducts = await session.run(query);

                if (!listProducts.records) return resolve({ error: true, message: 'cant_get_product' })
                for (let item of listProducts.records) {
                    if (item._fields[2] >= 0.8 && item._fields[2] <= 1) {
                        let queryRe = `MATCH (:Person { name: "${item._fields[0]}" })-[r:SIMILARITY]->(Person { name:"${item._fields[1]}" })
                        RETURN r`;
                        let resultFind = await session.run(
                            queryRe
                        );
                        if (resultFind.records.length > 0) {
                            console.log('============================join=============================');
                            let newScore = 3
                            let queryUpdate = `MATCH (:Person { name:"${item._fields[0]}" })-[r:SIMILARITY]-(Person { name: "${item._fields[1]}" })
                            SET r.score = ${newScore}
                            RETURN Person`;
                            let resultUpdateRe = await session.run(queryUpdate);
                        } else {
                            let queryReShipLV1 =
                                `MATCH (a:Person { name: "${item._fields[0]}" }),(b:Person { name:"${item._fields[1]}"}) 
                                CREATE (a)-[:SIMILARITY {score:3} ]->(b)
                                CREATE (b)-[:SIMILARITY {score:3} ]->(a)
                                `
                                ;
                            const newRelation = await session.run(
                                queryReShipLV1
                            );
                        }
                    }


                    if (item._fields[2] >= 0.6 && item._fields[2] < 0.8) {
                        let queryRe = `MATCH (:Person { name: "${item._fields[0]}" })-[r:SIMILARITY]->(Person { name:"${item._fields[1]}" })
                        RETURN r`;
                        let resultFind = await session.run(
                            queryRe
                        );
                        if (resultFind.records.length > 0) {
                            console.log('============================join=============================');
                            let newScore = 2
                            let queryUpdate = `MATCH (:Person { name:"${item._fields[0]}" })-[r:SIMILARITY]-(Person { name: "${item._fields[1]}" })
                            SET r.score = ${newScore}
                            RETURN Person`;
                            let resultUpdateRe = await session.run(queryUpdate);
                        } else {
                            let queryReShipLV2 =
                                `MATCH (a:Person { name: "${item._fields[0]}" }),(b:Person { name:"${item._fields[1]}"}) 
                                CREATE (a)-[:SIMILARITY {score:2} ]->(b)
                                CREATE (b)-[:SIMILARITY {score:2} ]->(a)
                                `
                                ;
                            const newRelation = await session.run(
                                queryReShipLV2
                            );
                        }
                    }


                    if (item._fields[2] >= 0.5 && item._fields[2] < 0.6) {
                        let queryRe = `MATCH (:Person { name: "${item._fields[0]}" })-[r:SIMILARITY]->(Person { name:"${item._fields[1]}" })
                        RETURN r`;
                        let resultFind = await session.run(
                            queryRe
                        );
                        if (resultFind.records.length > 0) {
                            console.log('============================join=============================');
                            let newScore = 1
                            let queryUpdate = `MATCH (:Person { name:"${item._fields[0]}" })-[r:SIMILARITY]-(Person { name: "${item._fields[1]}" })
                            SET r.score = ${newScore}
                            RETURN Person`;
                            let resultUpdateRe = await session.run(queryUpdate);
                        } else {
                            let queryReShipLV3 =
                                `MATCH (a:Person { name: "${item._fields[0]}" }),(b:Person { name:"${item._fields[1]}"}) 
                                CREATE (a)-[:SIMILARITY {score:1} ]->(b)
                                CREATE (b)-[:SIMILARITY {score:1} ]->(a)
                                `
                                ;
                            const newRelation = await session.run(
                                queryReShipLV3
                            );
                        }
                    }
                    if (item._fields[2] < 0.5) {
                        //  console.log(`${item._fields[0]}-${item._fields[1]}-Not Similarity`);
                    }


                }




                return resolve({ error: false, data: listProducts.records });
            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        })
    }


    static getJaccardViaComment() {
        return new Promise(async resolve => {
            try {
                let query = `MATCH (p1:Person)-[:COMMENT]->(cuisine1)
                WITH p1, collect(id(cuisine1)) AS p1Cuisine
                MATCH (p2:Person)-[:COMMENT]->(cuisine2) WHERE p1 <> p2
                WITH p1, p1Cuisine, p2, collect(id(cuisine2)) AS p2Cuisine
                RETURN p1.name AS from,
                       p2.name AS to,
                       gds.alpha.similarity.jaccard(p1Cuisine, p2Cuisine) AS similarity
                ORDER BY to, similarity DESC`;
                const listProducts = await session.run(query);


                if (!listProducts.records) return resolve({ error: true, message: 'cant_get_product' })
                let isExitUser = [];
                for (let item of listProducts.records) {
                    let isMakeRela = true;
                    isExitUser.forEach(coupple => {
                        if (coupple.includes(item._fields[0]) && coupple.includes(item._fields[1])) {
                            isMakeRela = false;
                            return
                        }
                    })
                    if (isMakeRela) {
                        isExitUser.push([item._fields[0], item._fields[1]])
                        if (item._fields[2] >= 0.8 && item._fields[2] <= 1) {
                            let queryRe = `MATCH (:Person { name: "${item._fields[0]}" })-[r:SIMILARITY]->(Person { name:"${item._fields[1]}" })
                            RETURN r`;
                            let resultFind = await session.run(
                                queryRe
                            );
                            if (resultFind.records.length > 0) {
                                console.log('============================join=============================');
                                let newScore = Number(resultFind.records[0]._fields[0].properties.score.low) + Number(3);
                                let queryUpdate = `MATCH (:Person { name:"${item._fields[0]}" })-[r:SIMILARITY]-(Person { name: "${item._fields[1]}" })
                                SET r.score = ${newScore}
                                RETURN Person`;
                                let resultUpdateRe = await session.run(queryUpdate);
                            } else {
                                let queryReShipLV1 =
                                    `MATCH (a:Person { name: "${item._fields[0]}" }),(b:Person { name:"${item._fields[1]}"}) 
                                    CREATE (a)-[:SIMILARITY {score:3} ]->(b)
                                    CREATE (b)-[:SIMILARITY {score:3} ]->(a)
                                    `
                                    ;
                                const newRelation = await session.run(
                                    queryReShipLV1
                                );
                            }
                        }


                        if (item._fields[2] >= 0.6 && item._fields[2] < 0.8) {
                            let queryRe = `MATCH (:Person { name: "${item._fields[0]}" })-[r:SIMILARITY]->(Person { name:"${item._fields[1]}" })
                            RETURN r`;
                            let resultFind = await session.run(
                                queryRe
                            );
                            if (resultFind.records.length > 0) {
                                console.log('============================join=============================');
                                let newScore = Number(resultFind.records[0]._fields[0].properties.score.low) + Number(2);
                                let queryUpdate = `MATCH (:Person { name:"${item._fields[0]}" })-[r:SIMILARITY]-(Person { name: "${item._fields[1]}" })
                                SET r.score = ${newScore}
                                RETURN Person`;
                                let resultUpdateRe = await session.run(queryUpdate);
                            } else {
                                let queryReShipLV2 =
                                    `MATCH (a:Person { name: "${item._fields[0]}" }),(b:Person { name:"${item._fields[1]}"}) 
                                    CREATE (a)-[:SIMILARITY {score:2} ]->(b)
                                    CREATE (b)-[:SIMILARITY {score:2} ]->(a) 
                                    `
                                    ;
                                const newRelation = await session.run(
                                    queryReShipLV2
                                );
                            }
                        }


                        if (item._fields[2] >= 0.5 && item._fields[2] < 0.6) {
                            let queryRe = `MATCH (:Person { name: "${item._fields[0]}" })-[r:SIMILARITY]->(Person { name:"${item._fields[1]}" })
                            RETURN r`;
                            let resultFind = await session.run(
                                queryRe
                            );
                            if (resultFind.records.length > 0) {
                                console.log('============================join=============================');
                                let newScore = Number(resultFind.records[0]._fields[0].properties.score.low) + Number(1);
                                let queryUpdate = `MATCH (:Person { name:"${item._fields[0]}" })-[r:SIMILARITY]-(Person { name: "${item._fields[1]}" })
                                SET r.score = ${newScore}
                                RETURN Person`;
                                let resultUpdateRe = await session.run(queryUpdate);
                            } else {
                                let queryReShipLV3 =
                                    `MATCH (a:Person { name: "${item._fields[0]}" }),(b:Person { name:"${item._fields[1]}"}) 
                                    CREATE (a)-[:SIMILARITY {score:1} ]->(b)
                                    CREATE (b)-[:SIMILARITY {score:1} ]->(a)
                                    `
                                    ;
                                const newRelation = await session.run(
                                    queryReShipLV3
                                );
                            }
                        }
                        if (item._fields[2] < 0.5) {
                            //  console.log(`${item._fields[0]}-${item._fields[1]}-Not Similarity`);
                        }

                    }

                }

                return resolve({ error: false, data: listProducts.records });
            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        })
    }

    static getJaccardViaBuy() {
        return new Promise(async resolve => {
            try {
                let query = `MATCH (p1:Person)-[:BUY]->(cuisine1)
                WITH p1, collect(id(cuisine1)) AS p1Cuisine
                MATCH (p2:Person)-[:BUY]->(cuisine2) WHERE p1 <> p2
                WITH p1, p1Cuisine, p2, collect(id(cuisine2)) AS p2Cuisine
                RETURN p1.name AS from,
                       p2.name AS to,
                       gds.alpha.similarity.jaccard(p1Cuisine, p2Cuisine) AS similarity
                ORDER BY to, similarity DESC`;
                const listProducts = await session.run(query);


                if (!listProducts.records) return resolve({ error: true, message: 'cant_get_product' })
                let isExitUser = [];
                for (let item of listProducts.records) {
                    let isMakeRela = true;
                    isExitUser.forEach(coupple => {
                        if (coupple.includes(item._fields[0]) && coupple.includes(item._fields[1])) {
                            isMakeRela = false;
                            return
                        }
                    })
                    if (isMakeRela) {
                        isExitUser.push([item._fields[0], item._fields[1]])

                        if (item._fields[2] >= 0.8 && item._fields[2] <= 1) {
                            let queryRe = `MATCH (:Person { name: "${item._fields[0]}" })-[r:SIMILARITY]->(Person { name:"${item._fields[1]}" })
                        RETURN r`;
                            let resultFind = await session.run(
                                queryRe
                            );
                            if (resultFind.records.length > 0) {
                                console.log('============================join=============================');
                                let newScore = Number(resultFind.records[0]._fields[0].properties.score.low) + Number(3);
                                let queryUpdate = `MATCH (:Person { name:"${item._fields[0]}" })-[r:SIMILARITY]-(Person { name: "${item._fields[1]}" })
                            SET r.score = ${newScore}
                            RETURN Person`;
                                let resultUpdateRe = await session.run(queryUpdate);
                            } else {
                                let queryReShipLV1 =
                                    `MATCH (a:Person { name: "${item._fields[0]}" }),(b:Person { name:"${item._fields[1]}"}) 
                                CREATE (a)-[:SIMILARITY {score:3} ]->(b)
                                CREATE (b)-[:SIMILARITY {score:3} ]->(a)
                                `
                                    ;
                                const newRelation = await session.run(
                                    queryReShipLV1
                                );
                            }
                        }


                        if (item._fields[2] >= 0.6 && item._fields[2] < 0.8) {
                            let queryRe = `MATCH (:Person { name: "${item._fields[0]}" })-[r:SIMILARITY]->(Person { name:"${item._fields[1]}" })
                        RETURN r`;
                            let resultFind = await session.run(
                                queryRe
                            );
                            if (resultFind.records.length > 0) {
                                console.log('============================join=============================');
                                let newScore = Number(resultFind.records[0]._fields[0].properties.score.low) + Number(2);
                                let queryUpdate = `MATCH (:Person { name:"${item._fields[0]}" })-[r:SIMILARITY]-(Person { name: "${item._fields[1]}" })
                            SET r.score = ${newScore}
                            RETURN Person`;
                                let resultUpdateRe = await session.run(queryUpdate);
                            } else {
                                let queryReShipLV2 =
                                    `MATCH (a:Person { name: "${item._fields[0]}" }),(b:Person { name:"${item._fields[1]}"}) 
                                CREATE (a)-[:SIMILARITY {score:2} ]->(b)
                                CREATE (b)-[:SIMILARITY {score:2} ]->(a)
                                `
                                    ;
                                const newRelation = await session.run(
                                    queryReShipLV2
                                );
                            }
                        }


                        if (item._fields[2] >= 0.5 && item._fields[2] < 0.6) {
                            let queryRe = `MATCH (:Person { name: "${item._fields[0]}" })-[r:SIMILARITY]->(Person { name:"${item._fields[1]}" })
                        RETURN r`;
                            let resultFind = await session.run(
                                queryRe
                            );
                            if (resultFind.records.length > 0) {
                                console.log('============================join=============================');
                                let newScore = Number(resultFind.records[0]._fields[0].properties.score.low) + Number(1);
                                let queryUpdate = `MATCH (:Person { name:"${item._fields[0]}" })-[r:SIMILARITY]-(Person { name: "${item._fields[1]}" })
                            SET r.score = ${newScore}
                            RETURN Person`;
                                let resultUpdateRe = await session.run(queryUpdate);
                            } else {
                                let queryReShipLV3 =
                                    `MATCH (a:Person { name: "${item._fields[0]}" }),(b:Person { name:"${item._fields[1]}"}) 
                                CREATE (a)-[:SIMILARITY {score:1} ]->(b)
                                CREATE (b)-[:SIMILARITY {score:1} ]->(a)
                                `
                                    ;
                                const newRelation = await session.run(
                                    queryReShipLV3
                                );
                            }
                        }
                        if (item._fields[2] < 0.5) {
                            //  console.log(`${item._fields[0]}-${item._fields[1]}-Not Similarity`);
                        }

                    }

                }

                return resolve({ error: false, data: listProducts.records });
            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        })
    }





    static getJaccardUserSomeHobbies() {

        return new Promise(async resolve => {
            try {
                let query = `MATCH (p1:Person)-[:LIKE]->(cuisine1)
                WITH p1, collect(id(cuisine1)) AS p1Cuisine
                MATCH (p2:Person)-[:LIKE]->(cuisine2) WHERE p1 <> p2
                WITH p1, p1Cuisine, p2, collect(id(cuisine2)) AS p2Cuisine
                RETURN p1.name AS from,
                       p2.name AS to,
                       gds.alpha.similarity.jaccard(p1Cuisine, p2Cuisine) AS similarity
                ORDER BY to, similarity DESC`;
                const listProducts = await session.run(query);

                if (!listProducts.records) return resolve({ error: true, message: 'cant_get_product' });


                let listAdd = [];
                let listAdd1 = [];

                for (let item of listProducts.records) {
                    let isMakeRela = true;
                    let score = 0;
                    if (item._fields[2] >= 0.6 && item._fields[2] < 0.8) {
                        score = 2
                    }
                    if (item._fields[2] >= 0.8 && item._fields[2] < 1) {
                        score = 3
                    }
                    if (item._fields[2] >= 0.5 && item._fields[2] < 0.6) {
                        score = 1;
                    }
                    let arrr = [item._fields[0], item._fields[1], score]
                    listAdd = [...listAdd, arrr]
                }

                console.log({ 1: listAdd })


                let query2 = `MATCH (p1:Person)-[:BUY]->(cuisine1)
                WITH p1, collect(id(cuisine1)) AS p1Cuisine
                MATCH (p2:Person)-[:BUY]->(cuisine2) WHERE p1 <> p2
                WITH p1, p1Cuisine, p2, collect(id(cuisine2)) AS p2Cuisine
                RETURN p1.name AS from,
                       p2.name AS to,
                       gds.alpha.similarity.jaccard(p1Cuisine, p2Cuisine) AS similarity
                ORDER BY to, similarity DESC`;
                const listProducts2 = await session.run(query2);


                if (!listProducts2.records) return resolve({ error: true, message: 'cant_get_product' })
                let isExitUser2 = [];
                let listAdd2 = [];
                for (let item of listProducts2.records) {
                    let isMakeRela = true;
                    let score = 0;
                    if (item._fields[2] >= 0.6 && item._fields[2] < 0.8) {
                        score = 2
                    }
                    if (item._fields[2] >= 0.8 && item._fields[2] < 1) {
                        score = 3
                    }
                    if (item._fields[2] >= 0.5 && item._fields[2] < 0.6) {
                        score = 1;
                    }

                    let arrr = [item._fields[0], item._fields[1], score]
                    listAdd = [...listAdd, arrr]

                    listAdd.forEach(coupple => {
                        console.log({ coupple })
                        if (coupple.includes(item._fields[0]) && coupple.includes(item._fields[1])) {
                            let newScore = score;
                            if (coupple[coupple.length - 1]) {
                                newScore = Number(coupple[coupple.length - 1]) + score;
                            }
                            coupple.push(newScore)
                        }
                    })

                }



                // let query3 = `MATCH (p1:Person)-[:COMMENT]->(cuisine1)
                // WITH p1, collect(id(cuisine1)) AS p1Cuisine
                // MATCH (p2:Person)-[:COMMENT]->(cuisine2) WHERE p1 <> p2
                // WITH p1, p1Cuisine, p2, collect(id(cuisine2)) AS p2Cuisine
                // RETURN p1.name AS from,
                //        p2.name AS to,
                //        gds.alpha.similarity.jaccard(p1Cuisine, p2Cuisine) AS similarity
                // ORDER BY to, similarity DESC`;
                // const listProducts3 = await session.run(query3);


                // if (!listProducts3.records) return resolve({ error: true, message: 'cant_get_product' })
                // let listAdd3= [];
                // for (let item of listProducts3.records) {
                //     let isMakeRela = true;
                //     let score = 0;
                //     if (item._fields[2] >= 0.6 && item._fields[2] < 0.8) {
                //         score = 2
                //     }
                //     if (item._fields[2] >= 0.8 && item._fields[2] < 1) {
                //         score = 3
                //     }
                //     if (item._fields[2] >= 0.5 && item._fields[2] < 0.6) {
                //         score = 1;
                //     }
                //     let isPush = true;

                //     listAdd = [...listAdd,arrr]
                //     listAdd.forEach(coupple => {
                //         if (coupple.includes(item._fields[0]) && coupple.includes(item._fields[1])) {

                //             let newScore = score;
                //             if(coupple[coupple.length-1]){
                //                 newScore =   Number(coupple[coupple.length-1]) + score;
                //             }
                //             coupple.push(newScore) 
                //         }
                //     })

                // }


                listAdd.forEach(item => {
                    if (item.length > 4) {
                        if (item[0].includes('Praveena') || item[1].includes('Praveena')) {
                            console.log({ __________: item })
                        }
                    }
                })
                console.log({ ALL: listAdd })
                return resolve({ error: false, data: listProducts.records });
            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        })
    }

    // TINH SIMULATOR
    static similarity(data) {

        return new Promise(async resolve => {
            try {
                let { idUser } = data;


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

                let query3 = `CALL gds.nodeSimilarity.stream('myGraph', { relationshipWeightProperty: 'Score'})
                YIELD node1, node2, similarity
                RETURN gds.util.asNode(node1).name AS Person1,
                gds.util.asNode(node1).id AS idPerson1,
                gds.util.asNode(node2).name AS Person2,
                gds.util.asNode(node2).id AS idPerson2,
                similarity
                ORDER BY Person1`
                const result3 = await session.run(query3);

                let query1 = `CALL gds.graph.drop('myGraph')`;

                const result1 = await session.run(query1);

                if (result3.records.length) {
                    console.log(`==========`);
                    (async () => {
                        for (const item of result3.records) {


                            console.log(item._fields[0]);
                            console.log(item._fields[2]);
                            console.log(item._fields[4]);

                            if (item._fields[4] >= 0.3) {
                                let queryCheckExist = `MATCH p=(a:Customer {id: $id1})-[r:SIMILARITY]->(b:Customer {id : $id2})
                                 RETURN p`
                                const result = await session.run(queryCheckExist, {
                                    id1: item._fields[1],
                                    id2: item._fields[3]
                                })
                                if (result.records.length) {
                                    console.log("Update");

                                    if (item._fields[4] >= 0.3 && item._fields[4] < 0.5) {
                                        let querySetNewLevel = `MATCH p=(a:Customer {id: $id1})-[r:SIMILARITY]-(b:Customer {id : $id2})
                                        SET r.Level = ${Number(1)}
                                        RETURN p`
                                        const result = await session.run(querySetNewLevel, {
                                            id1: item._fields[1],
                                            id2: item._fields[3]
                                        })
                                    }

                                    if (item._fields[4] >= 0.5 && item._fields[4] < 0.6) {
                                        let querySetNewLevel = `MATCH p=(a:Customer {id: $id1})-[r:SIMILARITY]-(b:Customer {id : $id2})
                                        SET r.Level = ${Number(2)}
                                        RETURN p`
                                        const result = await session.run(querySetNewLevel, {
                                            id1: item._fields[1],
                                            id2: item._fields[3]
                                        })
                                    }

                                    if (item._fields[4] >= 0.6 && item._fields[4] < 0.7) {
                                        let querySetNewLevel = `MATCH p=(a:Customer {id: $id1})-[r:SIMILARITY]-(b:Customer {id : $id2})
                                        SET r.Level = ${Number(3)}
                                        RETURN p`
                                        const result = await session.run(querySetNewLevel, {
                                            id1: item._fields[1],
                                            id2: item._fields[3]
                                        })
                                    }

                                    if (item._fields[4] >= 0.7 && item._fields[4] <= 1) {
                                        let querySetNewLevel = `MATCH p=(a:Customer {id: $id1})-[r:SIMILARITY]-(b:Customer {id : $id2})
                                        SET r.Level = ${Number(4)}
                                        RETURN p`
                                        const result = await session.run(querySetNewLevel, {
                                            id1: item._fields[1],
                                            id2: item._fields[3]
                                        })
                                    }

                                } else {
                                    console.log(`Create New`);

                                    if (item._fields[4] >= 0.3 && item._fields[4] < 0.5) {
                                        let queryReShipProductCategory =
                                            `MATCH (a:Customer { id: $id1 }),(b:Customer { id:$id2})
                                        CREATE (a)-[:SIMILARITY {Level : 1}]->(b)`;

                                        let resultCreateNewSimilarity = await session.run(queryReShipProductCategory, {
                                            id1: item._fields[1],
                                            id2: item._fields[3]
                                        });
                                    }

                                    if (item._fields[4] >= 0.5 && item._fields[4] < 0.6) {
                                        let queryReShipProductCategory =
                                            `MATCH (a:Customer { id: $id1 }),(b:Customer { id:$id2})
                                        CREATE (a)-[:SIMILARITY {Level : 2}]->(b)`;

                                        let resultCreateNewSimilarity = await session.run(queryReShipProductCategory, {
                                            id1: item._fields[1],
                                            id2: item._fields[3]
                                        });
                                    }

                                    if (item._fields[4] >= 0.6 && item._fields[4] < 0.7) {
                                        let queryReShipProductCategory =
                                            `MATCH (a:Customer { id: $id1 }),(b:Customer { id:$id2})
                                        CREATE (a)-[:SIMILARITY {Level : 3}]->(b)`;

                                        let resultCreateNewSimilarity = await session.run(queryReShipProductCategory, {
                                            id1: item._fields[1],
                                            id2: item._fields[3]
                                        });
                                    }

                                    if (item._fields[4] >= 0.7 && item._fields[4] <= 1) {
                                        let queryReShipProductCategory =
                                            `MATCH (a:Customer { id: $id1 }),(b:Customer { id:$id2})
                                        CREATE (a)-[:SIMILARITY {Level : 4}]->(b)`;

                                        let resultCreateNewSimilarity = await session.run(queryReShipProductCategory, {
                                            id1: item._fields[1],
                                            id2: item._fields[3]
                                        });
                                    }
                                }
                            } else {
                                let queryCheckExist = `MATCH p=(a:Customer {id: $id1})-[r:SIMILARITY]-(b:Customer {id : $id2})
                                 RETURN p`
                                const result = await session.run(queryCheckExist, {
                                    id1: item._fields[1],
                                    id2: item._fields[3]
                                })
                                if (result.records.length) {
                                    let queryDeleteRelation = `MATCH p=(a:Customer {id: $id1})-[r:SIMILARITY]-(b:Customer {id : $id2})
                                    DELETE r`
                                    const result = await session.run(queryDeleteRelation, {
                                        id1: item._fields[1],
                                        id2: item._fields[3]
                                    })
                                }
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


    // tìm theo ID khách hàng
    static findById(idCutomer) {
        return new Promise(async resolve => {
            let query = `MATCH (n:Customer{id :$idCutomer}) RETURN n `;
            const listCustomers = await session.run(query,
                { idCutomer: idCutomer });
            if (!listCustomers.records && listCustomers.records.length == 0) return resolve({ error: true, message: 'cant_get_customer' });


            return resolve({ error: false, data: listCustomers.records[0]._fields[0].properties });
        })
    }

}