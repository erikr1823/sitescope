import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function sql(query: string, params?: any[]) {
  const res = await pool.query(query, params);
  return res.rows;
}