import { DataTypes, Model, Sequelize } from 'sequelize';
import safety from './safety';

const dbConnection = new Sequelize(safety.env.PSG_DATABASE_URL);

export default dbConnection;