const route = require('express').Router();
const uuidv5 = require('uuid').v5;
const MY_NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341';
const ORDER_MODEL = require('../models/order');
const CUSTOMER_MODEL = require('../models/customer');
const { sign, verify } = require('../utils/jwt');

route.post('/new', async (req, res) => {
    let { productID, amount } = req.body;
    let { token } = req.headers;
    console.log('==========new order=========')
    addressShip = '';
    let status = 0;
    let infoUserVerify = await verify(`${token}`)
    let { role, id: idUser } = infoUserVerify.data;


    if (infoUserVerify) {
        let infoOder = await ORDER_MODEL.findByIdCustomer(idUser);

        // nếu đã có order chưa thnah toán
        if (!infoOder.error) {

            let orderID = infoOder.data[0]._fields[2].properties.id;
            let infoUpdateOrder = await ORDER_MODEL.addNewProduct(orderID, productID, amount, idUser);
            if (!infoUpdateOrder) return res.json({ error: true, message: infoUpdateOrder.message });
            return res.json({ error: false, message: infoUpdateOrder.message })
        } else {
            // nếu chưa có giỏ hàng nào chưa thanh toán thì tạo một giỏ hàng mới
            let timeOrder = Date.now();
            let id = uuidv5(timeOrder.toString(), MY_NAMESPACE);
            let haDInsertOrder = await ORDER_MODEL.insert(id, idUser, productID, timeOrder, addressShip, amount, status);
            if (!haDInsertOrder) return res.json({ error: true, message: haDInsertOrder.message });
            return res.json({ error: false, message: haDInsertOrder.message })
        }
    }

    return res.json({ error: true, message: 'cant_create_order' });
});

route.post('/update-amout-product', async (req, res) => {
    let { productID, amount, orderID } = req.body;
    let { token } = req.headers;
    let infoUserVerify = await verify(`${token}`)
    let { role, id: idUser } = infoUserVerify.data;
    console.log('==========update amout product=========')

    addressShip = '';
    let status = 0;
    if (infoUserVerify) {
        let infoOder = await ORDER_MODEL.updateAmoutProduct(orderID, productID, amount);
        if (infoOder.error) return res.json({ error: true, message: 'cant_update_order' });
        return res.json({ error: false, message: 'update_success' });
    }
    return res.json({ error: true, message: 'cant_update_order' });

});

route.post('/remove-product', async (req, res) => {
    let { productID, orderID } = req.body;
    let { token } = req.headers;
    console.log('==========remove  product=========')
    addressShip = '';
    let status = 0;
    let infoUserVerify = await verify(`${token}`)
    let { role, id: idUser } = infoUserVerify.data;
    if (infoUserVerify) {
        let infoOder = await ORDER_MODEL.removeProduct(orderID, productID, idUser);
        if (infoOder.error) return res.json({ error: true, message: 'cant_remove' });
        return res.json({ error: false, message: 'remove_success' });
    }
    return res.json({ error: true, message: 'cant_remove' });

});

route.post('/remove-order', async (req, res) => {
    let { orderID } = req.body;
    let { token } = req.headers;
    console.log('==========remove  product=========')
    addressShip = '';
    let status = 0;
    let infoUserVerify = await verify(`${token}`)
    let { role, id: idUser } = infoUserVerify.data;
    if (infoUserVerify) {
        let infoOder = await ORDER_MODEL.delete(orderID);
        if (infoOder.error) return res.json({ error: true, message: 'cant_remove' });
        return res.json({ error: false, message: 'remove_success' });
    }
    return res.json({ error: true, message: 'cant_remove' });

});

route.post('/pay', async (req, res) => {
    let { orderID } = req.body;
    let { token } = req.headers;
    console.log('==========pay  order=========')
    addressShip = '';
    let status = 0;
    let infoUserVerify = await verify(`${token}`)
    let { role, id: idUser } = infoUserVerify.data;
    if (infoUserVerify) {

        // infoUser= await CUSTOMER_MODEL.findById(idUser);

        let infoOder = await ORDER_MODEL.findByID(orderID, idUser);
        if (infoOder.error) return res.json({
            infoOder
        })

        // tính tổng tiền của hoá đơn
        let totalPrice = 0;

        infoOder.data.forEach(record => {
            // lấy sản phẩm
            let price = record._fields[2].properties.newPrice
            if (!price)
                price = record._fields[2].properties.price

            let amout = record._fields[1].properties.HAVE;
            console.log({ price, amout })
            if (!amout) amout = 0;
            let sumpriceProduct = Number(price) * Number(amout);
            totalPrice += sumpriceProduct
        })

        // so sánh tiền hiện tại và tổng tiền hoá đơn của user
        // tiến hành thanh toán và trừ tiền user cập nhật lại số trạng thái hoá đơn
        // if (money >= totalPrice) {
        //     let infoOderUpdate = await ORDER_MODEL.updateStatusOrder(authorID, orderID, totalPrice);
        //     if (infoOderUpdate.error) return res.json({ error: true, message: 'cant_update' });
        //     return res.json({ error: false, message: 'pay_success', infoOder });
        // } else {
        //     return res.json({ error: true, message: 'check_money' });
        // }
        let infoOderUpdate = await ORDER_MODEL.updateStatusOrder(idUser, orderID, totalPrice);
        if (infoOderUpdate.error) return res.json({ error: true, message: 'cant_update' });
        return res.json({ error: false, message: 'pay_success', infoOder });

    }
    return res.json({ error: true, message: 'cant_remove' });

});

module.exports = route;