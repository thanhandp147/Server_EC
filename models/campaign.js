const { hash, compare } = require('bcrypt');
const { sign, verify } = require('../utils/jwt');
const { driver } = require('../config/cf_db')
const session = driver.session();


module.exports = class Products {

    static insert(id, nameCampaign , urlImage) {
        return new Promise(async resolve => {
            try {
                // console.log({ id, nameCampaign });
                let queryNewCampaign = `CREATE (a:Campaigns { id : "${id}", name : "${nameCampaign}", image:"${urlImage}" }) RETURN a`;
                let resultQueryNewCampaign = await session.run(queryNewCampaign);

                if (resultQueryNewCampaign.records.length) {
                    return resolve({ error: false, message: "create_sussess" });
                } else {
                    return resolve({ error: false, message: "create_fail" });
                }


            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        })
    }

    static addProduct(idCampaign, idProduct, value) {
        return new Promise(async resolve => {
            try {
                console.log({ idCampaign, idProduct, value });

                let checkProductHasInCampaign = `MATCH (product:Products {id:"${idProduct}"})-[:INCAMPAIGN]->(campaign:Campaigns) RETURN campaign`;
                let rerultCheckProductHasInCampaign = await session.run(checkProductHasInCampaign);

                if (rerultCheckProductHasInCampaign.records.length) {
                    return resolve({ error: true, message: "product_has_already_in_anotherCampaign" });
                } else {
                    let queryAddProductToCampaign = `
                    MATCH (product:Products {id: "${idProduct}"})
                    MATCH (campaign:Campaigns {id:"${idCampaign}"})
                    CREATE (product)-[r:INCAMPAIGN { value : "${value}" }]->(campaign)
                    SET product.newPrice = product.price * (100 - ${Number(value)}) / 100
                    RETURN product,campaign, r
                    `
                    let resultQueryAddProductToCampaign = await session.run(queryAddProductToCampaign);

                    if (resultQueryAddProductToCampaign.records.length) {
                        console.log(resultQueryAddProductToCampaign.records)
                        return resolve({ error: false, data: resultQueryAddProductToCampaign.records });
                    }
                }
            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        })
    }

    static removeProduct(idCampaign, idProduct) {
        return new Promise(async resolve => {
            try {
                console.log({ idCampaign, idProduct });

                let checkProductHasInCampaign = `MATCH (product:Products {id:"${idProduct}"})-[r:INCAMPAIGN]->(campaign:Campaigns {id:"${idCampaign}"})
                DELETE r
                REMOVE product.newPrice
                RETURN product`;
                let rerultCheckProductHasInCampaign = await session.run(checkProductHasInCampaign);

                if (rerultCheckProductHasInCampaign.records.length) {
                    return resolve({ error: false, message: 'remove_success' });
                } else {
                    return resolve({ error: true, message: 'remove_fail' });
                }
            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        })
    }

    static removeCampaign(idCampaign) {
        return new Promise(async resolve => {
            try {
                console.log({ idCampaign });

                let checkProductHasInCampaign = `
                MATCH (products:Products)-[:INCAMPAIGN]->(campaign:Campaigns {id:"${idCampaign}"})
                DETACH DELETE campaign
                RETURN products
                `;
                let rerultCheckProductHasInCampaign = await session.run(checkProductHasInCampaign);

                if (rerultCheckProductHasInCampaign.records.length) {
                    (async () => {
                        for (const item of rerultCheckProductHasInCampaign.records) {
                            let checkProductHasInCampaign1 = `
                            MATCH (n:Products {id:"${item._fields[0].properties.id}"})
                            REMOVE n.newPrice
                            RETURN n
                            `;
                            let rerultCheckProductHasInCampaign1 = await session.run(checkProductHasInCampaign1);

                            if (rerultCheckProductHasInCampaign1.records.length) {
                                return resolve({ error: false, message: 'remove_success' });
                            }else{
                                return resolve({ error: true, message: 'remove_fail' });
                            }
                        }
                    })()
                }
            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        })
    }

}