const { hash, compare } = require('bcrypt');
const { sign, verify } = require('../utils/jwt');
const { driver } = require('../config/cf_db')
const session = driver.session();

module.exports = class Comments {

    // BINH LUAN SAN PHAM
    static insert(id, authorID, content, productID, authorName, isGoodComment, date) {
        return new Promise(async resolve => {
            try {
                // let queryCheckExitComment 
                const resultPromise = await session.run(
                    `
                        CREATE (comment:Comments { id: $id, author : $authorID, content : $content, productID: $productID, authorName : $authorName, isGoodCmt: $isGoodComment, timeCreate: $timeCreate })
                        RETURN comment`
                    , {
                        id: id,
                        authorID: authorID,
                        content: content,
                        productID: productID,
                        authorName: authorName,
                        isGoodComment: isGoodComment,
                        timeCreate: date
                    }
                );

                await session.run(
                    'MATCH (product:Products { id: $productID }),(comment:Comments { id:$id})CREATE (comment)-[r:HAVECOMMENT]->(product)'
                    , {
                        id: id,
                        content: content,
                        productID: productID
                    }
                );
                await session.run('MATCH (product:Products { id: $productID }),(customer:Customer { id:$authorID}),(comment:Comments { id:$id}) CREATE (customer)-[r:WRITECOMMENT]->(comment)'
                    , {
                        id: id,
                        authorID: authorID,
                        content: content,
                        productID: productID
                    }
                );
                /// chỉnh sủa mối quan hệ  về quan tâm sản phẩm cuả Khách hàng
                let time = 2;
                let queryRe = `MATCH (:Customer { id: $authorID })-[r:FOCUS]->(Products { id: $productID }) RETURN r`;
                let resultFind = await session.run(
                    queryRe,
                    { authorID, productID }
                );
                console.log(resultFind.records);
                if (resultFind.records.length > 0) {
                    console.log('============================join=============================');
                    console.log(resultFind.records[0]._fields[0].properties.Score)
                    let newWatch = Number(resultFind.records[0]._fields[0].properties.Score) + 2;
                    if (!Number(isGoodComment)) {
                        newWatch = 0;
                    }
                    //console.log(resultFind.records[0]._fields[0].properties.WATCH);
                    let queryUpdate = `MATCH (:Customer { id: $authorID })-[r:FOCUS]->(Products { id: $idProduct })
                        SET r.Score = $newWatch
                        RETURN Products`;

                    let resultUpdateRe = await session.run(queryUpdate,
                        {
                            idProduct: productID,
                            authorID: authorID,
                            newWatch: Number(newWatch)
                        });
                    if (!resultUpdateRe) return resolve({ error: true, message: 'cant_get_product' })
                    return resolve({ error: false, message: 'update_relation_customer_Product_success' });
                } else {
                    let query = `MATCH (Customer { id: $idCustomer }),(Products { id: $idProduct })
                        CREATE (Customer)-[r:FOCUS { Score : $time }]->(Products)
                        RETURN Products`;
                    if (!Number(isGoodComment)) {
                        time = 0;
                    }
                    let resultMakeRe = await session.run(query,
                        {
                            idProduct: productID,
                            idCustomer: authorID,
                            time: Number(time)
                        });
                    console.log(resultPromise);
                    if (!resultPromise) return resolve({ error: true, message: 'cant_insert_comment' });
                }
                return resolve({ error: false, data: resultPromise });
            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        });
    }


}