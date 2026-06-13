import asyncio
import asyncpg

async def run():
    conn = await asyncpg.connect('postgresql://postgres.peupumasgzqraqgieqmd:Moogibharath@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require')
    await conn.execute('DELETE FROM message')
    await conn.execute('DELETE FROM email')
    await conn.execute('DELETE FROM conversation')
    await conn.close()
    print("Database cleared successfully!")

if __name__ == '__main__':
    asyncio.run(run())
