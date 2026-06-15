import asyncio
import asyncpg
import os

async def run():
    # Read DATABASE_URL from .env
    db_url = None
    if os.path.exists('.env'):
        with open('.env', 'r') as f:
            for line in f:
                if line.startswith('DATABASE_URL='):
                    db_url = line.split('DATABASE_URL=')[1].strip()
                    # Strip quotes if present
                    db_url = db_url.strip('"').strip("'")
                    break
    
    if not db_url:
        print("DATABASE_URL not found in .env")
        return

    print(f"Connecting to database...")
    try:
        conn = await asyncpg.connect(db_url)
        rows = await conn.fetch("SELECT tablename FROM pg_tables WHERE schemaname = 'public';")
        print("Existing tables:")
        for r in rows:
            print(f"- {r['tablename']}")
        await conn.close()
    except Exception as e:
        print(f"Error connecting/querying: {e}")

if __name__ == '__main__':
    asyncio.run(run())
