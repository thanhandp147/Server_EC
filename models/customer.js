const { hash, compare } = require('bcrypt');
const { sign, verify } = require('../utils/jwt');
const { driver } = require('../config/cf_db')
const session = driver.session();

module.exports = class Customers {
    // ADD NEW USER
    static insert(customerId, customerName, password, email, phoneNumber, gender) {
        return new Promise(async resolve => {
            try {
                let role = 0;
                if (gender == '1') {
                    gender = '1';
                } else {
                    if (gender == '0') {
                        gender = '0';
                    } else {
                        gender = '2';
                    }
                }
                console.log({ customerId, customerName, password, email, phoneNumber, gender });

                let queryCheckCustomer = `MATCH (Customer { phone: $phoneNumber })
                RETURN Customer`;
                const checkExist = await session.run(
                    queryCheckCustomer
                    , {
                        phoneNumber: phoneNumber,
                    }
                );
                console.log({ checkExist });

                if (checkExist.records.length != 0)
                    return resolve({ error: true, message: 'phone_existed' });
                let hashPassword = await hash(password, 8);
                console.log(typeof (customerId));
                let queryNewCustomer = 'CREATE (a:Customer { id : $customerId, name : $customerName, email: $email, phone : $phoneNumber, password :$hashPassword, male : $sex, role :$role }) RETURN a';
                const newCustomer = await session.run(
                    queryNewCustomer
                    , {
                        customerId: customerId,
                        customerName: customerName,
                        email: email,
                        phoneNumber: phoneNumber,
                        sex: gender,
                        hashPassword: hashPassword,
                        role: role
                    }
                );

                if (!newCustomer.records.length) return resolve({ error: true, message: 'cant_insert_customer' });
                return resolve({ error: false, message: 'create_susscess' });
            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        });
    }

    // LOGIN
    static signIn(phoneNumber, password) {
        return new Promise(async resolve => {
            try {
                let queryCheckCustomer = `MATCH (Customer { phone: $phoneNumber })
                RETURN Customer`;
                const infoUser = await session.run(
                    queryCheckCustomer
                    , {
                        phoneNumber: phoneNumber,
                    }
                );
                if (infoUser.records.length == 0)
                    return resolve({ error: true, message: 'phone_existed' });
                const checkPass = await compare(password, infoUser.records[0]._fields[0].properties.password);

                if (!checkPass)
                    return resolve({ error: true, message: 'password_not_exist' });
                await delete infoUser.password;
                let token = await sign({ data: infoUser.records[0]._fields[0].properties });
                return resolve({ error: false, data: { infoUser, token } });
            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        });
    }


    // REFESH TOKEN
    static refreshToken(token) {
        return new Promise(async resolve => {
            try {
                let infoUserVerify = await verify(`${token}`)


                let queryCheckCustomer = `MATCH (Customer { id: $id })

                RETURN Customer`;
                const infoUser = await session.run(
                    queryCheckCustomer
                    , {
                        id: infoUserVerify.data.id,
                    }
                );
                await delete infoUser.password;
                let tokenSign = await sign({ data: infoUser.records[0]._fields[0].properties });
                return resolve({
                    error: false,
                    data: { infoUser, token: tokenSign }
                })


            } catch (error) {
                return resolve({ error: true, message: error.message });
            }
        });
    }

    // GET ALL CUSTOMERS
    static getAll() {
        return new Promise(async resolve => {
            try {
                let query = `MATCH (n:Customer) RETURN n `;
                const listCustomers = await session.run(query);

                listCustomers.records.forEach(async (item) => {
                    await delete item._fields[0].properties.password;
                })

                if (!listCustomers.records) return resolve({ error: true, message: 'cant_get_product' })
                return resolve({ error: false, data: listCustomers.records });
            } catch (error) {
                return resolve({ error: true, message: error.message });
            }

        })
    }



}