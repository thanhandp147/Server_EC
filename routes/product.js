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
            data: makeRelClick.message
        })
    }
});

route.get('/random-click', async (req, res) => {

    let { token } = req.headers;

    let infoUserVerify = await verify(`${token}`)
    let { role, id: idUser } = infoUserVerify.data;

    if (infoUserVerify) {
        let data = await PRODUCT_MODEL.randomClick({ idUser });
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

route.get('/get-bestsel', async (req, res) => {

    let data = await PRODUCT_MODEL.findBestSell();
    return res.json({
        error: false,
        data: data.data
    })

});

// route.get('/', async (req, res) => {

//     let { token } = req.headers;

//     let infoUserVerify = await verify(`${token}`)
//     let { role, id: idUser } = infoUserVerify.data;

//     if (infoUserVerify) {
//         let data = await PRODUCT_MODEL.randomClick({ idUser });
//         // if (makeRelClick.error) return res.json({
//         //     error: true,
//         //     message: makeRelClick.message
//         // })

//         return res.json({
//             error: false,
//             data: data.data
//         })
//     }
// });

route.get('/get-new-product', async (req, res) => {


    let infoProduct = await PRODUCT_MODEL.getListNewProduct();


    if (infoProduct.error) {
        return res.json({
            error: true,
            message: infoProduct.message
        })
    }
    return res.json({
        error: false,
        data: infoProduct.data
    })
});

route.get('/get-product-same-category/:idProduct', async (req, res) => {
    let { idProduct } = req.params;

    let infoProduct = await PRODUCT_MODEL.findWithCategoryByProductID(idProduct);

    if (infoProduct.error) {
        return res.json({
            error: true,
            message: infoProduct.message
        })
    }
    return res.json({
        error: false,
        data: infoProduct.data
    })
});

route.get('/get-recommend-product-by-similarity', async (req, res) => {
    console.log(`awdawdawdawd`);
    
    let { token } = req.headers;

    let infoUserVerify = await verify(`${token}`)
    let { role, id: idUser } = infoUserVerify.data;

    if (infoUserVerify) {
        let data = await PRODUCT_MODEL.getRecommendProductBySimilarity(idUser);
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



route.get('/info/:idProduct', async (req, res) => {

    let { idProduct } = req.params;
    console.log({idProduct});
    


    let infoProduct = await PRODUCT_MODEL.getInfoById({ idProduct });
    if (infoProduct.error) {
        return res.json({
            error: true,
            message: infoProduct.message
        })
    }
    return res.json({
        error: false,
        data: infoProduct.data
    })
});


route.get('/get-all-product', async (req, res) => {

    let infoProduct = await PRODUCT_MODEL.getAllProducts();
    if (infoProduct.error) {
        return res.json({
            error: true,
            message: infoProduct.message
        })
    }
    return res.json({
        error: false,
        data: infoProduct.data
    })
});

route.get('/get-all-campaign', async (req, res) => {

    let infoProduct = await PRODUCT_MODEL.getAllCampaign();
    if (infoProduct.error) {
        return res.json({
            error: true,
            message: infoProduct.message
        })
    }
    return res.json({
        error: false,
        data: infoProduct.data
    })
});

route.get('/get-all-productByCampaignID/:idCampaign', async (req, res) => {
    let { idCampaign } = req.params
    let infoProduct = await PRODUCT_MODEL.getAllProductByCampaignId(idCampaign);
    if (infoProduct.error) {
        return res.json({
            error: true,
            message: infoProduct.message
        })
    }
    return res.json({
        error: false,
        data: infoProduct.data
    })
});

route.get('/get-all-product-has-new-price', async (req, res) => {

    let infoProduct = await PRODUCT_MODEL.getAllProductHasNewPrice();
    if (infoProduct.error) {
        return res.json({
            error: true,
            message: infoProduct.message
        })
    }
    return res.json({
        error: false,
        data: infoProduct.data
    })
});

route.get('/get-all-product-in-cart-notPay', async (req, res) => {

    let { token } = req.headers;

    let infoUserVerify = await verify(`${token}`)
    let { role, id: idUser } = infoUserVerify.data;

    if (infoUserVerify) {
        let infoProduct = await PRODUCT_MODEL.getAllProductInCartNotPay(idUser);
        if (infoProduct.error) {
            return res.json({
                error: true,
                message: infoProduct.message
            })
        }
        return res.json({
            error: false,
            data: infoProduct.data
        })
    }else{
        return res.json({
            error: true,
            message: "not_found_user"
        })
    }

    
});








module.exports = route;