const route = require('express').Router();
const uuidv5 = require('uuid').v5;
const MY_NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341';
const COMMENT_MODEL = require('../models/comment');
const { sign, verify } = require('../utils/jwt');

route.post('/new-comment', async (req, res) => {

    let { token } = req.headers;
    let { productID,  content, isGoodComment } = req.body; 

    let infoUserVerify = await verify(`${token}`)
    let { role, id: idUser, name } = infoUserVerify.data;

    if(infoUserVerify){
        let authorID = idUser;
        let authorName = name;

        let date = Date.now();
        let keyuuid =  date.toString() + token
        let id = uuidv5(keyuuid, MY_NAMESPACE);
        console.log(id);
        let hadInsertCategory = await COMMENT_MODEL.insert(id.toString(), authorID, content, productID, authorName, isGoodComment,date);
        console.log(hadInsertCategory)
        if(hadInsertCategory.error) return res.json({ message:hadInsertCategory.message });
        return res.json(hadInsertCategory)
    }
    return res.json({ error : true, message:'cant_create_comment' });

});



module.exports = route;