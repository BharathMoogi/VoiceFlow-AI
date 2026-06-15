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

    if not os.path.exists('insforge_schema.sql'):
        print("insforge_schema.sql not found!")
        return

    with open('insforge_schema.sql', 'r') as f:
        sql = f.read()

    # Split by semicolon, filter empty
    # Handle block comments or potential issues with simple splitting if there are internal semicolons
    # Since our schema is clean, simple split is fine
    statements = [stmt.strip() for stmt in sql.split(';') if stmt.strip()]

    print("Connecting to database and executing schema migrations...")
    try:
        conn = await asyncpg.connect(db_url)
        
        # We run inside a transaction
        async with conn.transaction():
            for stmt in statements:
                print(f"Executing: {stmt[:60]}...")
                await conn.execute(stmt)
                
        await conn.close()
        print("Database schema updated successfully!")
    except Exception as e:
        print(f"Error executing schema: {e}")

if __name__ == '__main__':
    asyncio.run(run())
