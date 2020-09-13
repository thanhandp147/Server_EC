const express = require('express')
const app = express()
var port = process.env.PORT || 3000;

const CUSTOMER_ROUTER = require('./routes/customer');
const bodyParser = require('body-parser');
const uuidv5 = require('uuid').v5;

const MY_NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f0000';

app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

app.use('/customers', CUSTOMER_ROUTER);

app.get('/', (req, res) => {
    res.send('Hello World! ')
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})