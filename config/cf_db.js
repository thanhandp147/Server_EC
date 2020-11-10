const neo4j = require('neo4j-driver');
// const driver = neo4j.driver('bolt://localhost:11002', neo4j.auth.basic('neo4j', '123456'));
const driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('neo4j', '123123123'));
module.exports = { driver }