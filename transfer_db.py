import psycopg2
import psycopg2.extras

# Connexion séparée pour éviter le problème du @ dans le mot de passe
SOURCE = {
    "host": "hopper.proxy.rlwy.net",
    "port": 58084,
    "database": "railway",
    "user": "postgres",
    "password": "sMiw@gencyFrAnCe",
    "sslmode": "require"
}

TARGET = {
    "host": "gondola.proxy.rlwy.net",
    "port": 21387,
    "database": "railway",
    "user": "postgres",
    "password": "EXgCuUzWLuvvHmVbvsQDFmCcBGidPFiv",
    "sslmode": "require"
}

def get_tables(cursor):
    cursor.execute("""
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename;
    """)
    return [row[0] for row in cursor.fetchall()]

def get_create_statement(cursor, table):
    cursor.execute(f"""
        SELECT 'CREATE TABLE IF NOT EXISTS ' || quote_ident(tablename) || ' (' ||
        string_agg(
            quote_ident(column_name) || ' ' || data_type ||
            CASE
                WHEN character_maximum_length IS NOT NULL
                THEN '(' || character_maximum_length || ')'
                ELSE ''
            END ||
            CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
            ', '
            ORDER BY ordinal_position
        ) || ');'
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        GROUP BY tablename;
    """, (table,))
    row = cursor.fetchone()
    return row[0] if row else None

def transfer():
    print("Connexion à l'ancienne DB...")
    src_conn = psycopg2.connect(**SOURCE)
    src_cur = src_conn.cursor()

    print("Connexion à la nouvelle DB...")
    tgt_conn = psycopg2.connect(**TARGET)
    tgt_cur = tgt_conn.cursor()

    tables = get_tables(src_cur)
    if not tables:
        print("Aucune table trouvée dans l'ancienne DB.")
        return

    print(f"\nTables trouvées : {tables}\n")

    for table in tables:
        print(f"--- Transfert de '{table}' ---")

        # Créer la table dans la cible
        create_sql = get_create_statement(src_cur, table)
        if create_sql:
            try:
                tgt_cur.execute(create_sql)
                tgt_conn.commit()
                print(f"  Table créée.")
            except Exception as e:
                tgt_conn.rollback()
                print(f"  Table existe déjà ou erreur création : {e}")

        # Copier les données
        src_cur.execute(f'SELECT * FROM "{table}"')
        rows = src_cur.fetchall()

        if not rows:
            print(f"  0 lignes — table vide, skip.")
            continue

        cols = [desc[0] for desc in src_cur.description]
        placeholders = ",".join(["%s"] * len(cols))
        col_names = ",".join([f'"{c}"' for c in cols])
        insert_sql = f'INSERT INTO "{table}" ({col_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING'

        try:
            psycopg2.extras.execute_batch(tgt_cur, insert_sql, rows, page_size=500)
            tgt_conn.commit()
            print(f"  {len(rows)} lignes copiées.")
        except Exception as e:
            tgt_conn.rollback()
            print(f"  Erreur insertion : {e}")

    src_cur.close()
    src_conn.close()
    tgt_cur.close()
    tgt_conn.close()
    print("\nTransfert terminé.")

if __name__ == "__main__":
    transfer()