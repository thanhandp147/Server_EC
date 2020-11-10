const route = require('express').Router();
const uuidv5 = require('uuid').v5;
const MY_NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341';
const ORDER_MODEL = require('../models/order');
const CUSTOMER_MODEL = require('../models/customer');
const CATEGORY_MODEL = require('../models/category')
const { sign, verify } = require('../utils/jwt');



route.get('/', async (req, res) => {


    let listCategories = await CATEGORY_MODEL.findAllCategory();
    // console.log(listCategories);

    if (listCategories.error) {
        return res.json({
            error: true,
            message: listCategories.message
        })
    }
    return res.json({
        error: false,
        data: listCategories.data
    })
    // return res.json({ error: true, message: 'cant_create_order' });
});

route.get('/:nameCategory', async (req, res) => {

    let { nameCategory } = req.params;
    let listCategories = await CATEGORY_MODEL.findAllProducuctOneCategory(nameCategory);
    // console.log(listCategories);

    if (listCategories.error) {
        return res.json({
            error: true,
            message: listCategories.message
        })
    }
    return res.json({
        error: false,
        data: listCategories.data
    })
    // return res.json({ error: true, message: 'cant_create_order' });
});


module.exports = route;