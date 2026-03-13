import { Sequelize } from "sequelize";
import dotenv from 'dotenv';
dotenv.config({
    path: './.env'
})

// host: process.env.MYSQLHOST,
//     port: process.env.MYSQLPORT,
//         user: process.env.MYSQLUSER,
//             password: process.env.MYSQLPASSWORD,
//                 database: process.env.MYSQLDATABASE,


// const sequelize = new Sequelize(
//     process.env.DB_NAME,
//     process.env.DB_USER,
//     process.env.DB_PASS,
//     {
//         host: process.env.DB_HOST,
//         port: process.env.DB_PORT,
//         dialect: 'mysql'
//     }
// )


const sequelize = new Sequelize(process.env.DB_URL, {
    dialect: "mysql",
});

const conenctDB = async () => {
    try {
        await sequelize.authenticate()
        console.log('Database connected successfully')
    } catch (err) {
        console.log('Database connection failed: ', err)
        process.exit(1)
    }
}

export {sequelize,conenctDB}