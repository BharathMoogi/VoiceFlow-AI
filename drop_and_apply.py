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
        
        print("Dropping existing tables to prevent foreign key & type conflicts...")
        tables_to_drop = [
            "campaign_contacts",
            "call_logs",
            "campaigns",
            "voice_agent_configurations",
            "contacts",
            "email",
            "message",
            "conversation",
            "profiles",
            "email_verification_tokens",
            "password_reset_tokens",
            "refresh_tokens",
            "user",
            "alembic_version"
        ]
        
        for table in tables_to_drop:
            try:
                print(f"Dropping table: {table}...")
                await conn.execute(f"DROP TABLE IF EXISTS public.{table} CASCADE;")
            except Exception as ex:
                print(f"Could not drop {table}: {ex}")
        
        print("Reading new schema...")
        if not os.path.exists('insforge_schema.sql'):
            print("insforge_schema.sql not found!")
            await conn.close()
            return
            
        with open('insforge_schema.sql', 'r') as f:
            sql = f.read()
            
        # Split statements
        statements = [stmt.strip() for stmt in sql.split(';') if stmt.strip()]
        
        print("Applying new schema with UUIDs and RLS policies...")
        async with conn.transaction():
            for stmt in statements:
                print(f"Executing: {stmt[:60]}...")
                await conn.execute(stmt)
                
        await conn.close()
        print("Database schema successfully recreated and updated!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    asyncio.run(run())
