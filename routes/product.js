const route = require('express').Router();
const uuidv5 = require('uuid').v5;
const MY_NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341';
const PRODUCT_MODEL = require('../models/product');
const { sign, verify } = require('../utils/jwt');

route.get('/click/:idProduct', async (req, res) => {

    let { token } = req.headers;
    let { idProduct } = req.params

    let infoUserVerify = await verify(`${token}`)
    let { role, id: idUser } = infoUserVerify.data;

    if (infoUserVerify) {
        let makeRelClick = await PRODUCT_MODEL.click({ idUser, idProduct });
        // console.log({makeRelClick});
        
        if (makeRelClick.error) return res.json({
            error: true,
            message: makeRelClick.message
        })

        return res.json({
            error: false,
            data: makeRelClick.data
        })
    }
});

route.get('/random-click', async (req, res) => {

    let { token } = req.headers;

    let infoUserVerify = await verify(`${token}`)
    let { role, id: idUser } = infoUserVerify.data;

    if (infoUserVerify) {
        let data = await PRODUCT_MODEL.randomClick({ idUser});
        // if (makeRelClick.error) return res.json({
        //     error: true,
        //     message: makeRelClick.message
        // })

        return res.json({
            error: false,
            data: data.data
        })
    }
});

route.post('/update-random-score', async (req, res) => {
    // let { token } = req.headers;

    // let infoUserVerify = await verify(`${token}`)
    // let { role, id: idUser } = infoUserVerify.data;
    let { idUser1, idUser2 } = req.body;


    let data = await PRODUCT_MODEL.updateRandomScoreTwoUsers({ idUser1, idUser2 });
    return res.json({
        error: false,
        data: data.data
    })

});

route.get('/get-toplist-products', async (req, res) => {

    let data = await PRODUCT_MODEL.getToplistProducts();
    return res.json({
        error: false,
        data: data.data
    })

});

route.get('/', async (req, res) => {

    let { token } = req.headers;

    let infoUserVerify = await verify(`${token}`)
    let { role, id: idUser } = infoUserVerify.data;

    if (infoUserVerify) {
        let data = await PRODUCT_MODEL.randomClick({ idUser});
        // if (makeRelClick.error) return res.json({
        //     error: true,
        //     message: makeRelClick.message
        // })

        return res.json({
            error: false,
            data: data.data
        })
    }
});





module.exports = route;