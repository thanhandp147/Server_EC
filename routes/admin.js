const route = require('express').Router();
const uuidv5 = require('uuid').v5;
const { v4: uuidv4 } = require('uuid');
const MY_NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341';
const CAMPAIGN_MODEL = require('../models/campaign');
const PRODUCT_MODEL = require('../models/product');

const { sign, verify } = require('../utils/jwt');

route.post('/campaign/new', async (req, res) => {

    let { token } = req.headers;
    let { nameCampaign, urlImage } = req.body;

    let infoUserVerify = await verify(`${token}`)
    let { role, id: idUser } = infoUserVerify.data;

    if (role == 0) {
        let id = uuidv4()

        let newCapaign = await CAMPAIGN_MODEL.insert(id, nameCampaign, urlImage);
        if (newCapaign.error) {
            return res.json({
                error: true,
                message: newCapaign.message
            })
        } else {
            return res.json({
                error: false,
                message: newCapaign.message
            })
        }
    } else {
        return res.json({
            error: true,
            message: "not_permission"
        })
    }
});

route.post('/campaign/remove', async (req, res) => {

    let { token } = req.headers;
    let { idCampaign } = req.body;

    let infoUserVerify = await verify(`${token}`)
    let { role, id: idUser } = infoUserVerify.data;

    if (role == 0) {

        let newCapaign = await CAMPAIGN_MODEL.removeCampaign(idCampaign);
        if (newCapaign.error) {
            return res.json({
                error: true,
                message: newCapaign.message
            })
        } else {
            return res.json({
                error: false,
                message: newCapaign.message
            })
        }
    } else {
        return res.json({
            error: true,
            message: "not_permission"
        })
    }
});



route.post('/campaign/add-product', async (req, res) => {

    let { idCampaign, idProduct, value } = req.body;

    let addProduct = await CAMPAIGN_MODEL.addProduct(idCampaign, idProduct, value);
    if (addProduct.error) {
        return res.json({
            error: true,
            message: addProduct.message
        })
    } else {
        return res.json({
            error: false,
            data: addProduct.data
        })
    }
});

route.post('/crawl/crawl-list-product', async (req, res) => {

    let { nameParent, nameChild, linkCrawl, linkImageCover } = req.body;

    let addProduct = await PRODUCT_MODEL.crawlListProduct({nameParent, nameChild, linkCrawl, linkImageCover});
    if (addProduct.error) {
        return res.json({
            error: true,
            message: addProduct.message
        })
    } else {
        return res.json({
            error: false,
        })
    }
});

route.post('/campaign/remove-product', async (req, res) => {

    let { token } = req.headers;
    let { idCampaign, idProduct } = req.body;

    let infoUserVerify = await verify(`${token}`)
    let { role, id: idUser } = infoUserVerify.data;

    if (role == 0) {
        let addProduct = await CAMPAIGN_MODEL.removeProduct(idCampaign, idProduct);
        if (addProduct.error) {
            return res.json({
                error: true,
                message: addProduct.message
            })
        } else {
            return res.json({
                error: false,
                data: addProduct.data
            })
        }

    } else {
        return res.json({
            error: true,
            message: "not_permission"
        })
    }
});

module.exports = route;