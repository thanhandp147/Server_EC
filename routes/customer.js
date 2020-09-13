const route = require('express').Router();
const uuidv5 = require('uuid').v5;
const MY_NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341';
const CUSTOMER_MODEL = require('../models/customer');

route.get('/', function (req, res) {
    return
});

// ReFresh TOKEN
route.post('/refresh-token', async (req, res) => {
    let { token } = req.body;

    if (token) {
        let checkRefreshToken = await CUSTOMER_MODEL.refreshToken(token.toString())
        if (checkRefreshToken.error) return res.json({
            error: true,
            message: checkRefreshToken.message
        })

        return res.json({
            error: false,
            data: checkRefreshToken.data
        })
    }
    return res.json({
        error: true,
        message: "token_is_not_required."
    })
});

// Login
route.post('/login', async (req, res) => {
    let { phoneNumber, password } = req.body;
    if (phoneNumber && password) {
        let checkLogin = await CUSTOMER_MODEL.signIn(phoneNumber, password)
        if (checkLogin.error) return res.json({ error: true, message: checkLogin.message });
        return res.json({ error: false, data: checkLogin.data })
    }
    return res.json({
        error: true,
        message: "phone_password_not_existed"
    })
});

// Add new customer
route.post('/new-customer', async (req, res) => {
    let { customerName, email, phoneNumber, sex, password } = req.body;
    if (customerName && phoneNumber) {
        let id = uuidv5(phoneNumber, MY_NAMESPACE)
        let hadInsertCategory = await CUSTOMER_MODEL.insert(id.toString(), customerName, password, email, phoneNumber, sex);
        if (!hadInsertCategory) return res.json({ error: true, message: hadInsertCategory.message });
        return res.json({ error: false, message: hadInsertCategory.message })
    }
    return res.json({ error: true, message: 'cant_create_category' });
});

// Get list Customers
route.get('/list', async (req, res) => {

    let listCustomer = await CUSTOMER_MODEL.getAll();
    if (listCustomer.error) return res.json({ error: true, message: listCustomer.message });
    return res.json({ error: false, data: listCustomer.data })
});



module.exports = route;