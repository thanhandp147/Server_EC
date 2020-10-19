const { hash, compare } = require('bcrypt');
const { sign, verify } = require('../utils/jwt');
const { driver } = require('../config/cf_db')
const session = driver.session();

module.exports = class Orders {

    // tìm order của khách hàng theo id khách hàng
    static findByIdCustomer(idCustomer) {
        return new Promise(async resolve => {
            try {
                let query = `MATCH (order:Orders{ idCustomer : $idCustomer, status : 0 })	
                            MATCH (:Orders { id: order.id})-[r]->(product : Products)	
                            RETURN product, r, order `;
                const listOrders = await session.run(query, { idCustomer: idCustomer });

                if (listOrders.records.length == 0) return resolve({ error: true, message: 'cant_get_product', data: [] })
                return resolve({ error: false, data: listOrders.records });

            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        });
    }

    // Tạo Oder
    static insert(idOrder, idCustomer, productId, timeOrder, addressShip, amount, status) {
        return new Promise(async resolve => {
            try {
                console.log('----------------Thêm hoá đơn mới')

                let queryNewOrder = 'CREATE (a:Orders { id:$id, idCustomer : $idCustomer, timeOrder: $timeOrder, addressShip : $ addressShip, totalPrice : $totalPrice, status : $status }) RETURN a'
                let queryProductWithOrders = 'MATCH (product:Products { id: $productId }),(order:Orders { id:$id}) CREATE (order)-[r:HAVE { HAVE : $amount }]->(product)';
                // let queryCustomerWithProduct = 'MATCH (product:Products { id: $productId }),(customer:Customer { id:$idCustomer }) CREATE (customer)-[r:RELTYPE {BUY : $amout} ]->(product)';
                let queryCustomerWithOrders = 'MATCH (customer:Customer { id:$idCustomer  }),(order:Orders { id:$id}) CREATE (order)-[:OF ]->(customer)'
                let queryCheckReShipCustomerProducts = `MATCH (:Customer{id :$idCustomer })-[r]->(:Products { id: $productId })
                RETURN r`;

                let queryInfoProduct = `MATCH(p:Products {id:$idProduct})-->(c:Categorys)
                RETURN  p,c`;

                const infoProduct = await session.run(queryInfoProduct,
                    { idProduct: productId.trim() });
                let totalPrice = Number(amount) * infoProduct.records[0]._fields[0].properties.price;


                const newOrder = await session.run(
                    queryNewOrder
                    , {
                        id: idOrder,
                        idCustomer: idCustomer,
                        timeOrder: timeOrder,
                        addressShip: addressShip,
                        totalPrice: totalPrice,
                        status: status
                    })

                if (!newOrder.records.length) return resolve({ error: true, message: 'cant_create_order' });
                //customer with order
                const relationshipCustomerWithOrder = await session.run(
                    queryCustomerWithOrders,
                    {
                        idCustomer: idCustomer,
                        id: idOrder
                    });

                if (!relationshipCustomerWithOrder) return resolve({ error: true, message: 'cant_make_customer_product' });
                //customer with product
                const IsrelationshipCustomerWithProduct = await session.run(
                    queryCheckReShipCustomerProducts,
                    {
                        idCustomer: idCustomer,
                        productId: productId
                    }
                )
                console.log(IsrelationshipCustomerWithProduct.records);


                // const makeRelationshipCustomerWithProduct = await session.run(
                //     queryCustomerWithProduct,
                //     {
                //         productId: productId,
                //         idCustomer: idCustomer,
                //         amout: Number(amout)

                //     });
                // if (!makeRelationshipCustomerWithProduct) return resolve({ error: true, message: 'cant_make_customer_product' });
                //Product with order  => orderLine
                const relationshipOrderWithProduct = await session.run(
                    queryProductWithOrders
                    , {
                        productId: productId,
                        id: idOrder,
                        amount: Number(amount)
                    });


                // if (!relationshipOrderWithProduct) return resolve({ error: true, message: 'cant_make_relationship' });
                return resolve({ error: false, message: 'true' });
            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        });
    }

    // thêm sản phẩm vào giỏ hàng chưa thnah toán 
    static addNewProduct(orderID, productID, amout, idCustomer) {
        return new Promise(async resolve => {
            let query = `MATCH (order:Orders{ id : $orderID, status : 0 })	
                                    MATCH (product:Products { id: $productId })
                                    CREATE (order)-[r:HAVE { HAVE : $amout }]->(product)
                                    RETURN product, r, order `;

            let queryCheckRelationshipProductOrder = `MATCH (:Orders{id :$orderID })-[r]->(:Products { id: $productId })
                                    RETURN r`;
            const isInOrder = await session.run(queryCheckRelationshipProductOrder, { orderID: orderID, productId: productID });
            if (isInOrder.records.length > 0)
                return resolve({ error: true, message: 'product_had_beend_added', data: [] });

            const listOrders = await session.run(query, { orderID: orderID, productId: productID, amout: Number(amout) });
            if (listOrders.records.length == 0) return resolve({ error: true, message: 'cant_get_product', data: [] })
            return resolve({ error: false, data: listOrders.records });
        })
    }

    // cập nhật số lượng sản phẩm
    static updateAmoutProduct(orderID, productID, amout) {
        return new Promise(async resolve => {
            let query =
                `MATCH (:Orders { id:$orderID , status : 0})-[r]->(product : Products{id :$productID })	
            set r.HAVE = $amout
            RETURN  r`;
            const infoOrders = await session.run(query,
                {
                    orderID: orderID,
                    productID: productID,
                    amout: Number(amout)
                });

            console.log({ infoOrders })
            if (!infoOrders.records.length > 0) {
                return resolve({ error: true, message: 'cant_get_product' })
            }
            return resolve({ error: false, message: 'success' })
        })
    }

    // Xoá  mối quan hệ trong order
    static removeProduct(orderID, productID, authorID) {
        return new Promise(async resolve => {
            let query =
                `MATCH (:Orders { id:$orderID , status : 0, idCustomer : $authorID})-[r:HAVE]->(product : Products{id :$productID })	
            DELETE  r`;
            const infoOrders = await session.run(query,
                {
                    orderID: orderID,
                    productID: productID,
                    authorID: authorID
                });

            console.log({ infoOrders })
            if (!infoOrders) {
                return resolve({ error: true, message: 'cant_get_product' })
            }
            return resolve({ error: false, message: 'success' })
        })
    }

    static delete(idOrder) {
        return new Promise(async resolve => {
            let query = `MATCH (n:Orders{id:$idOrder}) DETACH DELETE n`;
            const resultDelete = await session.run(query, { idOrder: idOrder });


            if (!resultDelete) return resolve({ error: true, message: 'cant_get_order' })
            return resolve({ error: false, message: 'delete_order_success' });
        })
    }

    // thanh toán
    static updateStatusOrder(customerID, orderID, toltalPrice) {
        return new Promise(async resolve => {
            console.log({ customerID });
            // query cap nhat status
            let query = `MATCH (order:Orders{id : $orderID,  idCustomer : $customerID, status : 0 })
                                    set order.status = $status, order.toltalPrice = $toltalPrice
                                    RETURN  order `;

            // query danh sach san pham cua order
            let queryFindListProducts = `MATCH(o:Orders { id:$orderID, idCustomer:$customerID, status:0})-[r:HAVE]-(p:Products)
                                    RETURN  o,r,p`;
            const listProducts = await session.run(queryFindListProducts, { orderID: orderID, customerID: customerID });
            if (listProducts.records) {

                (async () => {
                    const session2 = driver.session();

                    for (const item of listProducts.records) {
                        console.log(item._fields[2].properties.id);
                        let queryCheckExistFocus = `MATCH (:Customer { id: $idCustomer })-[r:FOCUS]->(Products { id: $idProduct })
                        RETURN r`;
                        let resultFind = await session2.run(
                            queryCheckExistFocus,
                            { idCustomer: customerID, idProduct: item._fields[2].properties.id }
                        );

                        if (resultFind.records.length > 0) {
                            console.log('============================join=============================');
                            console.log(resultFind.records[0]._fields[0].properties.Score)
                            let newScore = Number(resultFind.records[0]._fields[0].properties.Score) + 3;

                            let queryUpdate = `MATCH (:Customer { id: $idCustomer })-[r]->(Products { id: $idProduct })
                            SET r.Score = $newScore
                            RETURN Products`;

                            let resultUpdateRe = await session2.run(queryUpdate,
                                {
                                    idProduct: item._fields[2].properties.id,
                                    idCustomer: customerID,
                                    newScore: Number(newScore)
                                });
                        } else {
                            let query = `MATCH (Customer { id: $idCustomer }),(Products { id: $idProduct })
                            CREATE (Customer)-[r:FOCUS { Score : $time }]->(Products)
                            RETURN Products`;
                            let resultMakeRe = await session2.run(query,
                                {
                                    idCustomer: customerID,
                                    idProduct: item._fields[2].properties.id,
                                    time: 3
                                });
                        }
                    }
                    session2.close()
                })()
            }

            const listOrders = await session.run(query, { status: 1, orderID: orderID, customerID: customerID, toltalPrice: Number(toltalPrice) });
            if (listOrders.records.length == 0) return resolve({ error: true, message: 'cant_update_product', data: [] })
            return resolve({ error: false, data: listOrders.records });
        })
    }

    // tìm order

    static findByID(orderID, customerID) {
        return new Promise(async resolve => {
            let query = `MATCH(o:Orders { id:$orderID, idCustomer:$customerID})-[r:HAVE]-(p:Products)
            RETURN  o,r,p`;
            const listOrders = await session.run(query, { orderID: orderID, customerID: customerID });

            if (listOrders.records.length == 0) return resolve({ error: true, message: 'cant_update_product', data: [] })
            return resolve({ error: false, data: listOrders.records });
        })
    }
}