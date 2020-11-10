const puppeteer = require('puppeteer');
const neo4j = require('neo4j-driver');
const driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('neo4j', '123123123'));
// const queryCypher = require('./cypher_R')

var session = driver.session();



let f = async () => {
    let x = `match (c:Categorys {name:$nameCategory})
    set c.image = $linkImage`

    let y = await session.run(
        x
        , {
            nameCategory: "Xe điện",
            linkImage: `https://salt.tikicdn.com/cache/280x280/ts/product/c1/e2/06/9708d325fb87c10234b6e746608c5af1.jpg`
        }
    );
}

f()