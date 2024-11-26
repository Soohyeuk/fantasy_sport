from flask import Flask, request, jsonify
from flask_cors import CORS
import pymysql
import jwt
import datetime
from flask import g
from werkzeug.security import generate_password_hash, check_password_hash
import ignore

########################################
#config starts 
########################################
app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"], supports_credentials=True)

db_config = {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "",
    "database": "fantasysport",
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor
}

JWT_SECRET = ignore.JWT_SECRET_KEY
JWT_REFRESH_SECRET = ignore.JWT_REFRESH_SECRET_KEY
JWT_ALGORITHM = "HS256"

def token_required(f):
    def wrapper(*args, **kwargs):
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"error": "Token is missing"}), 401

        try:
            decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            g.user = decoded
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        return f(*args, **kwargs)
    return wrapper
########################################
#config ends 
########################################


########################################
#login related routes starts 
########################################
@app.route('/login/', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        response = jsonify({"message": "Preflight request successful"})
        response.headers.add("Access-Control-Allow-Origin", "http://localhost:5173")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        return response, 200

    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400

        db = pymysql.connect(**db_config)
        with db.cursor() as cursor:
            query = "SELECT * FROM Users WHERE Username = %s AND Password = %s"
            cursor.execute(query, (username, password))
            user = cursor.fetchone()

        # if user and check_password_hash(user["Password"], password):
        if user:
            # generating jwt-token 
            access_token = jwt.encode(
                {
                    "user_id": int(user["User_ID"]), 
                    "username": user["Username"],
                    "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=15),  
                },
                JWT_SECRET,
                algorithm=JWT_ALGORITHM
            )

            refresh_token = jwt.encode(
                {
                    "user_id": int(user["User_ID"]),
                    "username": user["Username"],
                    "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7),
                },
                JWT_REFRESH_SECRET,
                algorithm=JWT_ALGORITHM
            )

            return jsonify({
                "access": access_token,
                "refresh": refresh_token,
                "message": "Login successful",
            }), 200
        else:
            return jsonify({"error": "Invalid username or password"}), 401

    except pymysql.MySQLError as e:
        print("Database error:", e)
        return jsonify({"error": "Database connection error"}), 500
    except Exception as e:
        print("Server error:", e)
        return jsonify({"error": "An error occurred"}), 500
    finally:
        if 'db' in locals():
            db.close()

@app.route('/refresh/', methods=['POST'])
def refresh():
    try:
        data = request.get_json()
        refresh_token = data.get("refresh")

        if not refresh_token:
            return jsonify({"error": "Refresh token required"}), 400

        decoded = jwt.decode(refresh_token, JWT_REFRESH_SECRET, algorithms=[JWT_ALGORITHM])
        new_access_token = jwt.encode(
            {
                "user_id": decoded["user_id"],
                "username": decoded["username"],
                "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=15),
            },
            JWT_SECRET,
            algorithm=JWT_ALGORITHM
        )

        return jsonify({"access": new_access_token}), 200

    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Refresh token expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid refresh token"}), 401

@app.route('/signin/', methods=['POST'])
def signin():
    try:
        data = request.get_json()
        username = data.get('username')
        email = data.get("email")
        password = data.get('password')

        if not username or not password or not email:
            return jsonify({"error": "Username and password are required"}), 400

        hashed_password = generate_password_hash(password, method="pbkdf2")
        db = pymysql.connect(**db_config)
        with db.cursor() as cursor:
            #checking if user already exists
            query = "SELECT * FROM Users WHERE Username = %s OR email = %s"
            print(len(hashed_password))
            
            cursor.execute(query, (username, email))
            existing_user = cursor.fetchone()
            if existing_user:
                return jsonify({"error": "Username already exists"}), 400

            #if new, insert into the database
            insert_query = "INSERT INTO Users (Username, Email, Password) VALUES (%s, %s, %s)"
            cursor.execute(insert_query, (username, email, password))
            db.commit()

        return jsonify({"message": "User created successfully"}), 201

    except pymysql.MySQLError as e:
        print("Database error:", e)
        return jsonify({"error": "Database connection error"}), 500
    except Exception as e:
        print("Server error:", e)
        return jsonify({"error": "An error occurred"}), 500
    finally:
        if 'db' in locals():
            db.close()



@app.route("/", methods=['GET'])
@token_required
def home():
    return jsonify(simple=12)

if __name__ == "__main__":
    app.run(debug=True)
