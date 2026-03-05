import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const connection = await mysql.createPool({
  host:     process.env.DB_HOST     ?? "127.0.0.1",
  port:     Number(process.env.DB_PORT ?? 3306),
  user:     process.env.DB_USER     ?? "beprepared",
  password: process.env.DB_PASSWORD ?? "beprepared",
  database: process.env.DB_NAME     ?? "beprepared",
  waitForConnections: true,
  connectionLimit: 10,
});

export const db = drizzle(connection, { schema, mode: "default" });
export type DB = typeof db;
