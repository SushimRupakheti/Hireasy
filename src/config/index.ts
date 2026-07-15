import dotenv from 'dotenv';


dotenv.config();

export const PORT:number=
process.env.PORT? parseInt(process.env.PORT):5050;

//ensure PORT is a number, and fallback if not found
//avoid exception if env is missing

export const MONGO_URI:string=
process.env.MONGO_URI || ''

//fallback to local mongo db if env is missing

//application lelevel constants

export const JWT_SECRET: string = process.env.JWT_SECRET || 'defaultsecret';
