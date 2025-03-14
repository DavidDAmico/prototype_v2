import psycopg2

class DatabaseConnector:

    def __init__(self, connection_string):
        self.connection_string = connection_string
        self.connection = None
        self.cursor = None

    def connect(self):
        self.connection = psycopg2.connect(self.connection_string)
        self.cursor = self.connection.cursor()

    def disconnect(self):
        self.cursor.close()
        self.connection.close()

    def execute_query(self, query):
        self.cursor.execute(query)
        return self.cursor.fetchall()

    def execute_query_with_params(self, query, params):
        self.cursor.execute(query, params)
        return self.cursor.fetchall()

    def execute_update(self, query):
        self.cursor.execute(query)
        self.connection.commit()

    def execute_update_with_params(self, query, params):
        self.cursor.execute(query, params)
        self.connection.commit()