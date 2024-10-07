const Sequelize = require('sequelize');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    logging: false,
    storage: 'chickensmoothie.db',
});

const PetDB = sequelize.define('ChickenSmoothiePetArchive', {
    petID: {
        type: Sequelize.STRING,
        unique: true,
        primaryKey: true,
    },
    petYear: Sequelize.NUMBER,
    petEvent: Sequelize.STRING,
    petLink: Sequelize.STRING,
}, {
    freezeTableName: true,
    timestamps: false,
});

const ItemDB = sequelize.define('ChickenSmoothieItemArchive', {
    itemLID: {
        type: Sequelize.STRING,
        unique: true,
        primaryKey: true,
    },
    itemRID: {
        type: Sequelize.STRING,
        unique: true,
    },
    itemName: Sequelize.STRING,
    itemYear: Sequelize.NUMBER,
    itemEvent: Sequelize.STRING,
    itemLink: Sequelize.STRING,
}, {
    freezeTableName: true,
    timestamps: false,
});

module.exports = { sequelize, PetDB, ItemDB };