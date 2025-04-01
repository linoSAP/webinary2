const bcrypt = require('bcryptjs');
const password = "Sapmekong100";
console.log("Hash à mettre dans .env:");
console.log(bcrypt.hashSync(password, 10));