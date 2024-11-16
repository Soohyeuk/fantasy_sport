from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from flask_cors import CORS
from flask_restful import Api, Resource
import pymysql 
from flask_cors import CORS 

app = Flask(__name__)
CORS(app)

# try:
#     db = pymysql.connect(host="localhost", 
#                           port=3306,
#                           user="root", 
#                           password="", 
#                           database="fantasysport", 
#                           charset="utf8mb4", 
#                           cursorclass=pymysql.cursors.DictCursor)
#     with db.cursor() as cursor:
#         cursor.execute("SELECT * FROM Users")
#         result = cursor.fetchone()
#         print("Connection successful! MySQL version:", result)
# except pymysql.MySQLError as e:
#     print("Error connecting to the database:", e)

# finally:
#     # Always close the connection
#     if db:
#         db.close()


@app.route('/login')
def home():
    return "Hello, World!"

@app.route('/test', methods=['GET'])
def test(): 
    return jsonify(simple=12)

if __name__ == "__main__":
    app.run(debug=True)