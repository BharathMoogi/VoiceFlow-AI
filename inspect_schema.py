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
                    db_url = db_url.strip('"').strip("'")
                    break
    
    if not db_url:
        print("DATABASE_URL not found in .env")
        return

    print("Connecting to database...")
    try:
        conn = await asyncpg.connect(db_url)
        # Get all tables
        tables = ['user', 'conversation', 'message', 'email']
        for table in tables:
            print(f"\nColumns for table '{table}':")
            columns = await conn.fetch(f"""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = '{table}';
            """)
            for col in columns:
                print(f"- {col['column_name']} ({col['data_type']}), Nullable: {col['is_nullable']}")
        await conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    asyncio.run(run())
