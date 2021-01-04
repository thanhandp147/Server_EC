const express = require('express')
const app = express()
var port = process.env.PORT || 3000;

const CUSTOMER_ROUTER = require('./routes/customer');
const PRODUCT_ROUTER = require('./routes/product');
const COMMENT_ROUTER = require('./routes/comment');
const ORDER_ROUTER    = require('./routes/order');
const CATEGORY_ROUTER =require('./routes/category')
const ADMIN_ROUTER = require('./routes/admin')

const bodyParser = require('body-parser');
const uuidv5 = require('uuid').v5;

const MY_NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f0000';

var cors = require('cors');

app.use(cors());
app.options('*', cors());

app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

app.use('/customers', CUSTOMER_ROUTER);
app.use('/products', PRODUCT_ROUTER);
app.use('/comments', COMMENT_ROUTER);
app.use('/orders', ORDER_ROUTER);
app.use('/categories', CATEGORY_ROUTER);
app.use('/admin', ADMIN_ROUTER);



app.get('/', (req, res) => {
    res.send('Hello World! ')
})



app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})